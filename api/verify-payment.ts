import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Plan credits mapping (in sq.inches)
const PLAN_CREDITS: Record<string, number> = {
  free_trial: 5000,
  lite: 100000,
  pro: 500000,
  enterprise: 1600000,
};

// Plan prices for validation (in INR)
const PLAN_PRICES: Record<string, number> = {
  free_trial: 0,
  lite: 1000,
  pro: 4000,
  enterprise: 8000,
};

// Plan names for display
const PLAN_NAMES: Record<string, string> = {
  free_trial: 'Free Trial',
  lite: 'Lite',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

interface VerifyPaymentRequest {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  plan_id: string;
  outseta_account_id: string; // This is the user_id for Supabase
  user_email: string;
  amount: number;
}

// Initialize Supabase client for server-side
const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
};

// Verify Razorpay signature
const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};

// Get or create user credits from Supabase
const getOrCreateUserCredits = async (
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    // Try to get existing record
    const { data, error: fetchError } = await supabase
      .from('user_credits')
      .select('credit_balance')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('[User Credits] Fetch error:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (data) {
      console.log('[User Credits] Found existing balance:', data.credit_balance);
      return { success: true, balance: data.credit_balance };
    }

    // User doesn't exist, create with 0 credits (will add plan credits next)
    console.log('[User Credits] New user, creating record');
    const { error: insertError } = await supabase
      .from('user_credits')
      .insert({
        user_id: userId,
        email: email,
        credit_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[User Credits] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, balance: 0 };
  } catch (err: any) {
    console.error('[User Credits] Exception:', err);
    return { success: false, error: err.message };
  }
};

// Add credits to user's balance in Supabase
const addCreditsToUser = async (
  supabase: SupabaseClient,
  userId: string,
  email: string,
  creditsToAdd: number
): Promise<{ success: boolean; newBalance?: number; previousBalance?: number; error?: string }> => {
  try {
    // First get or create user record
    const currentResult = await getOrCreateUserCredits(supabase, userId, email);

    if (!currentResult.success) {
      return { success: false, error: currentResult.error };
    }

    const currentBalance = currentResult.balance || 0;
    const newBalance = currentBalance + creditsToAdd;

    console.log('[User Credits] Adding credits:', {
      current: currentBalance,
      adding: creditsToAdd,
      new: newBalance,
    });

    // Update the balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[User Credits] Update error:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('[User Credits] Credits added successfully. New balance:', newBalance);
    return { success: true, newBalance, previousBalance: currentBalance };
  } catch (err: any) {
    console.error('[User Credits] Exception:', err);
    return { success: false, error: err.message };
  }
};

// Log payment to Supabase (for audit trail)
const logPayment = async (
  supabase: SupabaseClient,
  data: {
    user_email: string;
    user_id: string;
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    plan_id: string;
    plan_name: string;
    amount_inr: number;
    credits_added: number;
    credits_before: number;
    credits_after: number;
    status: 'success' | 'failed' | 'pending';
    error_message?: string;
  }
) => {
  try {
    const { error } = await supabase.from('payment_logs').insert({
      user_email: data.user_email,
      user_id: data.user_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_order_id: data.razorpay_order_id || null,
      plan_id: data.plan_id,
      plan_name: data.plan_name,
      amount_inr: data.amount_inr,
      credits_added: data.credits_added,
      credits_before: data.credits_before,
      credits_after: data.credits_after,
      status: data.status,
      error_message: data.error_message || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[Payment Log] Error logging to Supabase:', error);
      // Don't fail the payment if logging fails
    } else {
      console.log('[Payment Log] Payment logged successfully');
    }
  } catch (err) {
    console.error('[Payment Log] Exception:', err);
    // Don't fail the payment if logging fails
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_id,
      outseta_account_id, // This is used as user_id in Supabase
      user_email,
      amount,
    } = req.body as VerifyPaymentRequest;

    console.log('[Verify Payment] Request received:', {
      plan_id,
      user_id: outseta_account_id,
      user_email,
      amount,
      has_payment_id: !!razorpay_payment_id,
      has_order_id: !!razorpay_order_id,
      has_signature: !!razorpay_signature,
    });

    // Validate required fields
    if (!razorpay_payment_id || !plan_id || !outseta_account_id || !user_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate plan exists
    const creditsToAdd = PLAN_CREDITS[plan_id];
    if (creditsToAdd === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID',
      });
    }

    // Get environment variables
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    // Initialize Supabase
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (e) {
      console.error('[Verify Payment] Supabase not configured');
      return res.status(500).json({
        success: false,
        error: 'Database not configured',
      });
    }

    // For paid plans, verify the Razorpay signature
    if (plan_id !== 'free_trial') {
      if (!razorpaySecret) {
        console.error('[Verify Payment] RAZORPAY_KEY_SECRET not configured');
        return res.status(500).json({
          success: false,
          error: 'Payment verification not configured',
        });
      }

      if (!razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing payment verification data (order_id or signature)',
        });
      }

      // Verify Razorpay signature
      const isValidSignature = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        razorpaySecret
      );

      if (!isValidSignature) {
        console.error('[Verify Payment] Invalid signature');

        // Log failed payment
        await logPayment(supabase, {
          user_email,
          user_id: outseta_account_id,
          razorpay_payment_id,
          razorpay_order_id,
          plan_id,
          plan_name: PLAN_NAMES[plan_id],
          amount_inr: amount || PLAN_PRICES[plan_id],
          credits_added: 0,
          credits_before: 0,
          credits_after: 0,
          status: 'failed',
          error_message: 'Invalid signature',
        });

        return res.status(400).json({
          success: false,
          error: 'Payment verification failed - invalid signature',
        });
      }

      console.log('[Verify Payment] Razorpay signature verified successfully');
    }

    // Signature is valid (or free trial) - add credits to Supabase
    console.log('[Verify Payment] Adding credits to Supabase:', creditsToAdd);

    const addResult = await addCreditsToUser(
      supabase,
      outseta_account_id,
      user_email,
      creditsToAdd
    );

    if (!addResult.success) {
      console.error('[Verify Payment] Failed to add credits:', addResult.error);

      // Log failed payment
      await logPayment(supabase, {
        user_email,
        user_id: outseta_account_id,
        razorpay_payment_id,
        razorpay_order_id,
        plan_id,
        plan_name: PLAN_NAMES[plan_id],
        amount_inr: amount || PLAN_PRICES[plan_id],
        credits_added: 0,
        credits_before: 0,
        credits_after: 0,
        status: 'failed',
        error_message: addResult.error,
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to add credits to account',
      });
    }

    // Success! Log the payment
    await logPayment(supabase, {
      user_email,
      user_id: outseta_account_id,
      razorpay_payment_id,
      razorpay_order_id,
      plan_id,
      plan_name: PLAN_NAMES[plan_id],
      amount_inr: amount || PLAN_PRICES[plan_id],
      credits_added: creditsToAdd,
      credits_before: addResult.previousBalance || 0,
      credits_after: addResult.newBalance || creditsToAdd,
      status: 'success',
    });

    console.log('[Verify Payment] Success! New balance:', addResult.newBalance);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and credits added',
      credits_added: creditsToAdd,
      new_balance: addResult.newBalance,
    });
  } catch (error: any) {
    console.error('[Verify Payment] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
