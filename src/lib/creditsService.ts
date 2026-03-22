import { supabase } from './supabaseClient';
import { logCreditTransaction } from './creditLedgerService';

const FREE_TRIAL_CREDITS = 10000;
const LOW_CREDITS_THRESHOLD = 1000; // sq.inches
const LOW_CREDITS_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface UserCredits {
  user_id: string;
  email: string;
  balance: number;
  free_trial_claimed: boolean;
  created_at: string;
}

/**
 * Get user credits from Supabase
 * If user doesn't exist, creates a new record with 0 credits (free trial must be claimed separately)
 */
export async function getOrCreateUserCredits(
  userId: string,
  email: string
): Promise<{ success: boolean; credits?: number; freeTrialClaimed?: boolean; error?: string; isNewUser?: boolean }> {
  try {
    console.log('[Credits] Fetching credits for user');

    // Try to get existing record
    const { data, error: fetchError } = await supabase
      .from('credits')
      .select('balance, free_trial_claimed')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('[Credits] Fetch error:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (data) {
      // User exists, return their balance
      console.log('[Credits] User found, balance:', data.balance);
      return {
        success: true,
        credits: data.balance,
        freeTrialClaimed: data.free_trial_claimed || false,
        isNewUser: false
      };
    }

    // User doesn't exist, create with 10,000 free trial credits automatically
    console.log('[Credits] New user, creating with 10,000 free trial credits');

    const { error: insertError } = await supabase
      .from('credits')
      .insert({
        user_id: userId,
        email: email,
        balance: FREE_TRIAL_CREDITS,
        free_trial_claimed: true,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[Credits] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // Log the free trial credit transaction
    await logCreditTransaction(
      userId,
      email,
      'free_trial',
      FREE_TRIAL_CREDITS,
      FREE_TRIAL_CREDITS,
      'Welcome bonus - Free trial credits'
    );

    console.log('[Credits] New user created with 10,000 free trial credits');
    return { success: true, credits: FREE_TRIAL_CREDITS, freeTrialClaimed: true, isNewUser: true };
  } catch (err: any) {
    console.error('[Credits] Exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get user credits (read-only, doesn't create new user)
 */
export async function getUserCredits(
  userId: string
): Promise<{ success: boolean; credits?: number; freeTrialClaimed?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credits')
      .select('balance, free_trial_claimed')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Credits] Fetch error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      credits: data?.balance ?? 0,
      freeTrialClaimed: data?.free_trial_claimed ?? false
    };
  } catch (err: any) {
    console.error('[Credits] Exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if user has claimed free trial
 */
export async function checkFreeTrialClaimed(
  userId: string
): Promise<{ success: boolean; claimed?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credits')
      .select('free_trial_claimed')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Credits] Fetch error:', error);
      return { success: false, error: error.message };
    }

    // If user doesn't exist, they haven't claimed
    if (!data) {
      return { success: true, claimed: false };
    }

    return { success: true, claimed: data.free_trial_claimed || false };
  } catch (err: any) {
    console.error('[Credits] Exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Deduct credits from user's balance using atomic Postgres RPC
 * Prevents double-spending via SELECT ... FOR UPDATE inside the function
 */
export async function deductCredits(
  userId: string,
  amount: number,
  email: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    console.log('[Credits] Deducting credits from user (atomic)');

    const { data, error: rpcError } = await supabase
      .rpc('deduct_credits_atomic', {
        p_user_id: userId,
        p_amount: amount,
      });

    if (rpcError) {
      console.error('[Credits] RPC error:', rpcError.message);
      // The RPC raises exceptions for insufficient credits / user not found
      if (rpcError.message.includes('Insufficient credits')) {
        return { success: false, error: 'Insufficient credits' };
      }
      if (rpcError.message.includes('User not found')) {
        return { success: false, error: 'User credit record not found' };
      }
      return { success: false, error: rpcError.message };
    }

    const newBalance = data as number;

    // Log the usage deduction transaction
    await logCreditTransaction(
      userId,
      email,
      'usage',
      -amount,
      newBalance,
      'Sheet generation'
    );

    console.log('[Credits] Deduction successful. New balance:', newBalance);
    return { success: true, newBalance };
  } catch (err: any) {
    console.error('[Credits] Exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Check if user should receive a low credits alert
 * Returns true if balance is below threshold AND no alert was sent in the last 24 hours
 *
 * NOTE: This requires a 'last_low_credit_alert' column on the credits table.
 * If you haven't added it yet, run:
 *   ALTER TABLE credits ADD COLUMN last_low_credit_alert TIMESTAMPTZ;
 */
export async function shouldSendLowCreditsAlert(
  userId: string,
  currentBalance: number
): Promise<{ shouldSend: boolean; error?: string }> {
  try {
    // Check if balance is below threshold
    if (currentBalance >= LOW_CREDITS_THRESHOLD) {
      return { shouldSend: false };
    }

    // Check last alert timestamp
    const { data, error } = await supabase
      .from('credits')
      .select('last_low_credit_alert')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Credits] Error checking low credit alert:', error);
      return { shouldSend: false, error: error.message };
    }

    const lastAlert = data?.last_low_credit_alert;
    if (!lastAlert) {
      // No previous alert, should send
      console.log('[Credits] No previous low credit alert, should send');
      return { shouldSend: true };
    }

    // Check if 24 hours have passed since last alert
    const lastAlertTime = new Date(lastAlert).getTime();
    const now = Date.now();
    const timeSinceLastAlert = now - lastAlertTime;

    if (timeSinceLastAlert >= LOW_CREDITS_ALERT_COOLDOWN_MS) {
      console.log('[Credits] Low credit alert cooldown passed, should send');
      return { shouldSend: true };
    }

    console.log('[Credits] Low credit alert sent recently, skipping');
    return { shouldSend: false };
  } catch (err: any) {
    console.error('[Credits] Exception checking low credit alert:', err);
    return { shouldSend: false, error: err.message };
  }
}

/**
 * Update the last low credit alert timestamp
 *
 * NOTE: This requires a 'last_low_credit_alert' column on the credits table.
 * If you haven't added it yet, run:
 *   ALTER TABLE credits ADD COLUMN last_low_credit_alert TIMESTAMPTZ;
 */
export async function updateLowCreditAlertTimestamp(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('credits')
      .update({
        last_low_credit_alert: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[Credits] Error updating low credit alert timestamp:', error);
      return { success: false, error: error.message };
    }

    console.log('[Credits] Low credit alert timestamp updated');
    return { success: true };
  } catch (err: any) {
    console.error('[Credits] Exception updating low credit alert timestamp:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get the low credits threshold constant
 */
export function getLowCreditsThreshold(): number {
  return LOW_CREDITS_THRESHOLD;
}

/**
 * Add credits to user's balance (used by payment system)
 */
export async function addCredits(
  userId: string,
  amount: number,
  email: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    console.log('[Credits] Adding', amount, 'credits to user');

    // First get current balance (or create user if doesn't exist)
    const { data, error: fetchError } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Credits] Fetch error:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (data) {
      // User exists, update balance
      const newBalance = (data.balance ?? 0) + amount;

      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: newBalance,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Credits] Update error:', updateError);
        return { success: false, error: updateError.message };
      }

      // Log the recharge transaction
      await logCreditTransaction(
        userId,
        email,
        'recharge',
        amount,
        newBalance,
        'Plan recharge'
      );

      console.log('[Credits] Credits added. New balance:', newBalance);
      return { success: true, newBalance };
    } else {
      // User doesn't exist, create with the added amount
      const { error: insertError } = await supabase
        .from('credits')
        .insert({
          user_id: userId,
          email: email,
          balance: amount,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Credits] Insert error:', insertError);
        return { success: false, error: insertError.message };
      }

      // Log the recharge transaction for new user
      await logCreditTransaction(
        userId,
        email,
        'recharge',
        amount,
        amount,
        'Plan recharge'
      );

      console.log('[Credits] New user created with', amount, 'credits');
      return { success: true, newBalance: amount };
    }
  } catch (err: any) {
    console.error('[Credits] Exception:', err);
    return { success: false, error: err.message };
  }
}
