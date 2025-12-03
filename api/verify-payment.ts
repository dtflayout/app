import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Plan credits mapping
const PLAN_CREDITS: Record<string, number> = {
  free_trial: 5000,
  lite: 100000,
  pro: 500000,
  enterprise: 1600000,
};

// Plan prices for validation
const PLAN_PRICES: Record<string, number> = {
  free_trial: 0,
  lite: 1000,
  pro: 4000,
  enterprise: 8000,
};

interface VerifyPaymentRequest {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  plan_id: string;
  outseta_account_id: string;
  user_email: string;
  amount: number;
}

// Initialize Supabase client for server-side
const getSupabaseClient = () => {
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

// Log transaction to Supabase
const logTransaction = async (
  supabase: ReturnType<typeof createClient>,
  data: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    outseta_account_id: string;
    user_email: string;
    plan_id: string;
    amount: number;
    credits: number;
    status: 'success' | 'failed' | 'pending';
    error_message?: string;
  }
) => {
  const { error } = await supabase.from('transactions').insert({
    razorpay_payment_id: data.razorpay_payment_id,
    razorpay_order_id: data.razorpay_order_id || null,
    outseta_account_id: data.outseta_account_id,
    user_email: data.user_email,
    plan_id: data.plan_id,
    amount: data.amount,
    credits: data.credits,
    status: data.status,
    error_message: data.error_message || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[Transaction Log] Error:', error);
  }

  return { error };
};

// Update user credits in Supabase
const updateUserCredits = async (
  supabase: ReturnType<typeof createClient>,
  outsetaAccountId: string,
  userEmail: string,
  creditsToAdd: number
) => {
  // First, try to get existing record
  const { data: existing, error: fetchError } = await supabase
    .from('user_credits')
    .select('*')
    .eq('outseta_account_id', outsetaAccountId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected for new users
    console.error('[User Credits] Fetch error:', fetchError);
    throw fetchError;
  }

  if (existing) {
    // Update existing record
    const newBalance = (existing.credit_balance || 0) + creditsToAdd;
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('outseta_account_id', outsetaAccountId);

    if (updateError) {
      console.error('[User Credits] Update error:', updateError);
      throw updateError;
    }

    return { newBalance };
  } else {
    // Insert new record
    const { error: insertError } = await supabase.from('user_credits').insert({
      outseta_account_id: outsetaAccountId,
      user_email: userEmail,
      credit_balance: creditsToAdd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('[User Credits] Insert error:', insertError);
      throw insertError;
    }

    return { newBalance: creditsToAdd };
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_id,
      outseta_account_id,
      user_email,
      amount,
    } = req.body as VerifyPaymentRequest;

    console.log('[Verify Payment] Request received:', {
      plan_id,
      outseta_account_id,
      user_email,
      amount,
      has_payment_id: !!razorpay_payment_id,
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
    const credits = PLAN_CREDITS[plan_id];
    if (credits === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID',
      });
    }

    const supabase = getSupabaseClient();
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    // For paid plans, verify the signature
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
          error: 'Missing payment verification data',
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

        // Log failed transaction
        await logTransaction(supabase, {
          razorpay_payment_id,
          razorpay_order_id,
          outseta_account_id,
          user_email,
          plan_id,
          amount: amount || PLAN_PRICES[plan_id],
          credits,
          status: 'failed',
          error_message: 'Invalid payment signature',
        });

        return res.status(400).json({
          success: false,
          error: 'Payment verification failed',
        });
      }
    }

    // Signature is valid (or free trial) - add credits
    console.log('[Verify Payment] Signature valid, adding credits:', credits);

    try {
      // Update user credits
      const { newBalance } = await updateUserCredits(
        supabase,
        outseta_account_id,
        user_email,
        credits
      );

      // Log successful transaction
      await logTransaction(supabase, {
        razorpay_payment_id,
        razorpay_order_id,
        outseta_account_id,
        user_email,
        plan_id,
        amount: amount || PLAN_PRICES[plan_id],
        credits,
        status: 'success',
      });

      console.log('[Verify Payment] Success! New balance:', newBalance);

      return res.status(200).json({
        success: true,
        message: 'Payment verified and credits added',
        credits_added: credits,
        new_balance: newBalance,
      });
    } catch (dbError: any) {
      console.error('[Verify Payment] Database error:', dbError);

      // Log failed transaction
      await logTransaction(supabase, {
        razorpay_payment_id,
        razorpay_order_id,
        outseta_account_id,
        user_email,
        plan_id,
        amount: amount || PLAN_PRICES[plan_id],
        credits,
        status: 'failed',
        error_message: dbError.message || 'Database error',
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to update credits',
      });
    }
  } catch (error: any) {
    console.error('[Verify Payment] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
