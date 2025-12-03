import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  outseta_account_id: string;
  user_email: string;
  amount: number;
}

// Database types
interface UserCreditsRow {
  user_id: string;
  email: string;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  user_id: string;
  email: string;
  amount_inr: number;
  credits_added: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string;
  status: 'success' | 'failed' | 'pending';
  plan_name: string;
  created_at: string;
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

// Log transaction to Supabase
const logTransaction = async (
  supabase: SupabaseClient,
  data: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    user_id: string;
    email: string;
    plan_id: string;
    amount_inr: number;
    credits_added: number;
    status: 'success' | 'failed' | 'pending';
  }
) => {
  const transactionData: TransactionRow = {
    user_id: data.user_id,
    email: data.email,
    amount_inr: data.amount_inr,
    credits_added: data.credits_added,
    razorpay_order_id: data.razorpay_order_id || null,
    razorpay_payment_id: data.razorpay_payment_id,
    status: data.status,
    plan_name: PLAN_NAMES[data.plan_id] || data.plan_id,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('transactions').insert(transactionData);

  if (error) {
    console.error('[Transaction Log] Error:', error);
  }

  return { error };
};

// Update user credits in Supabase
const updateUserCredits = async (
  supabase: SupabaseClient,
  userId: string,
  email: string,
  creditsToAdd: number
): Promise<{ newBalance: number }> => {
  // First, try to get existing record
  const { data: existing, error: fetchError } = await supabase
    .from('user_credits')
    .select('credit_balance')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is expected for new users
    console.error('[User Credits] Fetch error:', fetchError);
    throw fetchError;
  }

  if (existing) {
    // Update existing record
    const currentBalance = (existing as { credit_balance: number }).credit_balance || 0;
    const newBalance = currentBalance + creditsToAdd;

    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        credit_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[User Credits] Update error:', updateError);
      throw updateError;
    }

    return { newBalance };
  } else {
    // Insert new record
    const newUserCredits: UserCreditsRow = {
      user_id: userId,
      email: email,
      credit_balance: creditsToAdd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('user_credits').insert(newUserCredits);

    if (insertError) {
      console.error('[User Credits] Insert error:', insertError);
      throw insertError;
    }

    return { newBalance: creditsToAdd };
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

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
          user_id: outseta_account_id,
          email: user_email,
          plan_id,
          amount_inr: amount || PLAN_PRICES[plan_id],
          credits_added: credits,
          status: 'failed',
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
        user_id: outseta_account_id,
        email: user_email,
        plan_id,
        amount_inr: amount || PLAN_PRICES[plan_id],
        credits_added: credits,
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
        user_id: outseta_account_id,
        email: user_email,
        plan_id,
        amount_inr: amount || PLAN_PRICES[plan_id],
        credits_added: credits,
        status: 'failed',
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
