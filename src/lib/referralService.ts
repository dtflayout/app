import { supabase } from './supabaseClient';

// Types
export interface ReferralCode {
  id: string;
  code: string;
  user_id: string;
  user_email: string;
  is_approved: boolean;
  total_referrals: number;
  total_recharge_value: number;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

export interface ReferralClaim {
  user_email: string;
  recharge_value: number | null;
  earnings: number | null;
  claimed_at: string | null;
}

export interface ReferralStatus {
  hasCreatedCode: boolean;
  hasClaimed: boolean;
  referralCode: ReferralCode | null;
  claimedCode: string | null;
  bonusAmountClaimed: number | null;
  bonusClaimedAt: string | null;
  referralHistory: ReferralClaim[];
}

// Constants
const REFERRAL_BONUS_PERCENTAGE = 0.20; // 20% bonus
const COMMISSION_PERCENTAGE = 0.30; // 30% commission

/**
 * Get user's referral status - whether they've created a code or claimed a bonus
 */
export async function getReferralStatus(userId: string): Promise<ReferralStatus> {
  // Check if user has created a referral code
  const { data: referralCode } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Check if user has claimed a referral bonus
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('referral_bonus_claimed, referred_by_code, has_created_referral_code, bonus_amount_claimed, bonus_claimed_at')
    .eq('user_id', userId)
    .single();

  // Get referral history if user has a referral code
  let referralHistory: ReferralClaim[] = [];
  if (referralCode?.code) {
    const { data: claims } = await supabase
      .from('user_credits')
      .select('email, referral_recharge_value, referral_earnings, bonus_claimed_at')
      .eq('referred_by_code', referralCode.code)
      .order('bonus_claimed_at', { ascending: false });

    if (claims) {
      referralHistory = claims.map(claim => ({
        user_email: claim.email,
        recharge_value: claim.referral_recharge_value,
        earnings: claim.referral_earnings,
        claimed_at: claim.bonus_claimed_at,
      }));
    }
  }

  return {
    hasCreatedCode: userCredits?.has_created_referral_code || false,
    hasClaimed: userCredits?.referral_bonus_claimed || false,
    referralCode: referralCode || null,
    claimedCode: userCredits?.referred_by_code || null,
    bonusAmountClaimed: userCredits?.bonus_amount_claimed || null,
    bonusClaimedAt: userCredits?.bonus_claimed_at || null,
    referralHistory,
  };
}

/**
 * Create a new referral code (pending approval)
 */
export async function createReferralCode(
  userId: string,
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Normalize code - uppercase, no spaces
  const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '_');

  // Validate code format
  if (normalizedCode.length < 3 || normalizedCode.length > 30) {
    return { success: false, error: 'Code must be 3-30 characters' };
  }

  if (!/^[A-Z0-9_]+$/.test(normalizedCode)) {
    return { success: false, error: 'Code can only contain letters, numbers, and underscores' };
  }

  // Check if user has already created a code
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('has_created_referral_code')
    .eq('user_id', userId)
    .single();

  if (userCredits?.has_created_referral_code) {
    return { success: false, error: 'You have already created a referral code' };
  }

  // Check if code already exists
  const { data: existingCode } = await supabase
    .from('referral_codes')
    .select('id')
    .eq('code', normalizedCode)
    .single();

  if (existingCode) {
    return { success: false, error: 'This code is already taken. Please try another.' };
  }

  // Create the referral code
  const { error: insertError } = await supabase
    .from('referral_codes')
    .insert({
      code: normalizedCode,
      user_id: userId,
      user_email: email,
      is_approved: false,
    });

  if (insertError) {
    console.error('Error creating referral code:', insertError);
    return { success: false, error: 'Failed to create code. Please try again.' };
  }

  // Mark user as having created a referral code
  await supabase
    .from('user_credits')
    .update({ has_created_referral_code: true })
    .eq('user_id', userId);

  return { success: true };
}

/**
 * Validate a referral code exists and is approved
 */
export async function validateReferralCode(code: string): Promise<{ valid: boolean; error?: string }> {
  const normalizedCode = code.trim().toUpperCase();

  const { data: referralCode } = await supabase
    .from('referral_codes')
    .select('is_approved')
    .eq('code', normalizedCode)
    .single();

  if (!referralCode) {
    return { valid: false, error: 'Invalid referral code' };
  }

  if (!referralCode.is_approved) {
    return { valid: false, error: 'This referral code is not yet active' };
  }

  return { valid: true };
}

/**
 * Claim a referral bonus - adds 20% of last recharge to user's balance
 */
export async function claimReferralBonus(
  userId: string,
  email: string,
  code: string
): Promise<{ success: boolean; bonusAmount?: number; error?: string }> {
  const normalizedCode = code.trim().toUpperCase();

  // Check if user has already claimed
  const { data: userCredits } = await supabase
    .from('user_credits')
    .select('referral_bonus_claimed, credit_balance')
    .eq('user_id', userId)
    .single();

  if (userCredits?.referral_bonus_claimed) {
    return { success: false, error: 'You have already claimed a referral bonus' };
  }

  // Validate the code
  const validation = await validateReferralCode(normalizedCode);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Get user's last successful transaction to calculate bonus
  const { data: lastTransaction } = await supabase
    .from('transactions')
    .select('credits_added, amount_inr')
    .eq('user_id', userId)
    .eq('status', 'success')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastTransaction) {
    return { success: false, error: 'No purchase found. Make a purchase first to claim your bonus.' };
  }

  const bonusAmount = Math.round(lastTransaction.credits_added * REFERRAL_BONUS_PERCENTAGE);
  const claimedAt = new Date().toISOString();
  const rechargeValue = lastTransaction.amount_inr;
  const earningsForReferrer = rechargeValue * COMMISSION_PERCENTAGE;

  // Add bonus credits to user
  const newBalance = (userCredits?.credit_balance || 0) + bonusAmount;

  const { error: updateError } = await supabase
    .from('user_credits')
    .update({
      credit_balance: newBalance,
      referral_bonus_claimed: true,
      referred_by_code: normalizedCode,
      bonus_amount_claimed: bonusAmount,
      bonus_claimed_at: claimedAt,
      referral_recharge_value: rechargeValue,
      referral_earnings: earningsForReferrer,
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('Error claiming bonus:', updateError);
    return { success: false, error: 'Failed to claim bonus. Please try again.' };
  }

  // Update referrer's stats
  const { data: referralCode } = await supabase
    .from('referral_codes')
    .select('total_referrals, total_recharge_value, total_earnings')
    .eq('code', normalizedCode)
    .single();

  if (referralCode) {
    await supabase
      .from('referral_codes')
      .update({
        total_referrals: (referralCode.total_referrals || 0) + 1,
        total_recharge_value: (referralCode.total_recharge_value || 0) + rechargeValue,
        total_earnings: (referralCode.total_earnings || 0) + earningsForReferrer,
      })
      .eq('code', normalizedCode);
  }

  return { success: true, bonusAmount };
}
