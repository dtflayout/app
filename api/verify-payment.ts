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
  outseta_account_id: string;
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

// Get current credits balance from Outseta
const getOutsetaCredits = async (
  accountId: string,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    const domain = process.env.OUTSETA_DOMAIN || 'data-canvas-tech.outseta.com';
    const url = `https://${domain}/api/v1/crm/accounts/${accountId}`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Outseta API] Get account error:', response.status, errorText);
      return { success: false, error: `Failed to get account: ${response.status}` };
    }

    const data = await response.json();
    const balance = data.CreditsBalance ?? 0;

    console.log('[Outseta API] Current credits balance:', balance);
    return { success: true, balance };
  } catch (error: any) {
    console.error('[Outseta API] Exception:', error);
    return { success: false, error: error.message };
  }
};

// Update credits balance in Outseta
const updateOutsetaCredits = async (
  accountId: string,
  newBalance: number,
  apiKey: string,
  apiSecret: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const domain = process.env.OUTSETA_DOMAIN || 'data-canvas-tech.outseta.com';
    const url = `https://${domain}/api/v1/crm/accounts/${accountId}`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    console.log('[Outseta API] Updating credits to:', newBalance);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        CreditsBalance: newBalance,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Outseta API] Update error:', response.status, errorText);
      return { success: false, error: `Failed to update credits: ${response.status}` };
    }

    console.log('[Outseta API] Credits updated successfully to:', newBalance);
    return { success: true };
  } catch (error: any) {
    console.error('[Outseta API] Exception:', error);
    return { success: false, error: error.message };
  }
};

// Log payment to Supabase (for audit trail)
const logPayment = async (
  supabase: SupabaseClient,
  data: {
    user_email: string;
    outseta_account_id: string;
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
      outseta_account_id: data.outseta_account_id,
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
    const outsetaApiKey = process.env.OUTSETA_API_KEY;
    const outsetaApiSecret = process.env.OUTSETA_API_SECRET;

    // Initialize Supabase (for logging only)
    let supabase: SupabaseClient | null = null;
    try {
      supabase = getSupabaseClient();
    } catch (e) {
      console.warn('[Verify Payment] Supabase not configured, skipping logging');
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
        if (supabase) {
          await logPayment(supabase, {
            user_email,
            outseta_account_id,
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
        }

        return res.status(400).json({
          success: false,
          error: 'Payment verification failed - invalid signature',
        });
      }

      console.log('[Verify Payment] Razorpay signature verified successfully');
    }

    // Signature is valid (or free trial) - now add credits to Outseta
    console.log('[Verify Payment] Adding credits:', creditsToAdd);

    // Check if Outseta credentials are configured
    if (!outsetaApiKey || !outsetaApiSecret) {
      console.error('[Verify Payment] Outseta API credentials not configured');

      // Log the issue but still return success (payment was verified)
      // The frontend should handle this by refreshing user data
      if (supabase) {
        await logPayment(supabase, {
          user_email,
          outseta_account_id,
          razorpay_payment_id,
          razorpay_order_id,
          plan_id,
          plan_name: PLAN_NAMES[plan_id],
          amount_inr: amount || PLAN_PRICES[plan_id],
          credits_added: creditsToAdd,
          credits_before: 0,
          credits_after: creditsToAdd,
          status: 'pending',
          error_message: 'Outseta API not configured - credits need manual addition',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified. Credits will be added shortly.',
        credits_added: creditsToAdd,
        pending_outseta_update: true,
      });
    }

    // Get current balance from Outseta
    const currentBalanceResult = await getOutsetaCredits(
      outseta_account_id,
      outsetaApiKey,
      outsetaApiSecret
    );

    if (!currentBalanceResult.success) {
      console.error('[Verify Payment] Failed to get current balance:', currentBalanceResult.error);

      // Log but don't fail - payment was verified
      if (supabase) {
        await logPayment(supabase, {
          user_email,
          outseta_account_id,
          razorpay_payment_id,
          razorpay_order_id,
          plan_id,
          plan_name: PLAN_NAMES[plan_id],
          amount_inr: amount || PLAN_PRICES[plan_id],
          credits_added: creditsToAdd,
          credits_before: 0,
          credits_after: creditsToAdd,
          status: 'pending',
          error_message: `Failed to get balance: ${currentBalanceResult.error}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified. Credits will be added shortly.',
        credits_added: creditsToAdd,
        pending_outseta_update: true,
      });
    }

    const currentBalance = currentBalanceResult.balance || 0;
    const newBalance = currentBalance + creditsToAdd;

    console.log('[Verify Payment] Updating Outseta balance:', {
      current: currentBalance,
      adding: creditsToAdd,
      new: newBalance,
    });

    // Update credits in Outseta
    const updateResult = await updateOutsetaCredits(
      outseta_account_id,
      newBalance,
      outsetaApiKey,
      outsetaApiSecret
    );

    if (!updateResult.success) {
      console.error('[Verify Payment] Failed to update Outseta:', updateResult.error);

      // Log the partial success
      if (supabase) {
        await logPayment(supabase, {
          user_email,
          outseta_account_id,
          razorpay_payment_id,
          razorpay_order_id,
          plan_id,
          plan_name: PLAN_NAMES[plan_id],
          amount_inr: amount || PLAN_PRICES[plan_id],
          credits_added: creditsToAdd,
          credits_before: currentBalance,
          credits_after: currentBalance, // Not updated
          status: 'pending',
          error_message: `Failed to update Outseta: ${updateResult.error}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Payment verified. Credits will be added shortly.',
        credits_added: creditsToAdd,
        pending_outseta_update: true,
      });
    }

    // Success! Log the payment
    if (supabase) {
      await logPayment(supabase, {
        user_email,
        outseta_account_id,
        razorpay_payment_id,
        razorpay_order_id,
        plan_id,
        plan_name: PLAN_NAMES[plan_id],
        amount_inr: amount || PLAN_PRICES[plan_id],
        credits_added: creditsToAdd,
        credits_before: currentBalance,
        credits_after: newBalance,
        status: 'success',
      });
    }

    console.log('[Verify Payment] Success! New balance:', newBalance);

    return res.status(200).json({
      success: true,
      message: 'Payment verified and credits added',
      credits_added: creditsToAdd,
      new_balance: newBalance,
    });
  } catch (error: any) {
    console.error('[Verify Payment] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
