import { applyRateLimit, paymentLimiter } from './lib/rateLimit';
import { initSentry, Sentry } from './lib/sentry';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Plan credits mapping (in sq.inches)
const PLAN_CREDITS: Record<string, number> = {
  free_trial: 10000,
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
  user_id: string;
  user_email: string;
  amount: number;
}

// Initialize Supabase client for server-side — MUST use service role key
const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable');
  }
  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_KEY environment variable. ' +
      'Server-side routes MUST use the service role key, never the anon key.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey);
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
): Promise<{ success: boolean; balance?: number; freeTrialClaimed?: boolean; error?: string }> => {
  try {
    // Try to get existing record
    const { data, error: fetchError } = await supabase
      .from('credits')
      .select('balance, free_trial_claimed')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected for new users)
      console.error('[User Credits] Fetch error:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (data) {
      console.log('[User Credits] Found existing balance:', data.balance, 'free_trial_claimed:', data.free_trial_claimed);
      return { success: true, balance: data.balance, freeTrialClaimed: data.free_trial_claimed || false };
    }

    // User doesn't exist, create with 0 credits (will add plan credits next)
    console.log('[User Credits] New user, creating record');
    const { error: insertError } = await supabase
      .from('credits')
      .insert({
        user_id: userId,
        email: email,
        balance: 0,
        free_trial_claimed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[User Credits] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, balance: 0, freeTrialClaimed: false };
  } catch (err: any) {
    console.error('[User Credits] Exception:', err);
    return { success: false, error: err.message };
  }
};

// Check if user has already claimed free trial
const hasClaimedFreeTrial = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; claimed?: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('credits')
      .select('free_trial_claimed')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Free Trial Check] Fetch error:', error);
      return { success: false, error: error.message };
    }

    // If user doesn't exist yet, they haven't claimed
    if (!data) {
      return { success: true, claimed: false };
    }

    return { success: true, claimed: data.free_trial_claimed || false };
  } catch (err: any) {
    console.error('[Free Trial Check] Exception:', err);
    return { success: false, error: err.message };
  }
};

// Mark free trial as claimed
const markFreeTrialClaimed = async (
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('credits')
      .update({
        free_trial_claimed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[Free Trial] Failed to mark as claimed:', error);
      return { success: false, error: error.message };
    }

    console.log('[Free Trial] Marked as claimed for user');
    return { success: true };
  } catch (err: any) {
    console.error('[Free Trial] Exception:', err);
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
      .from('credits')
      .update({
        balance: newBalance,
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

// Razorpay Invoice Generation
interface RazorpayInvoiceResult {
  success: boolean;
  invoice_id?: string;
  invoice_url?: string;
  error?: string;
}

const createRazorpayInvoice = async (
  userEmail: string,
  planName: string,
  creditsAdded: number,
  amountInr: number,
  razorpayPaymentId: string
): Promise<RazorpayInvoiceResult> => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.log('[Razorpay Invoice] API keys not configured, skipping invoice generation');
    return { success: false, error: 'Razorpay API keys not configured' };
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const url = 'https://api.razorpay.com/v1/invoices';

    const requestBody = {
      type: 'invoice',
      description: `DTF Layout Credits - ${planName}`,
      customer: {
        email: userEmail,
      },
      line_items: [
        {
          name: `${planName} Plan - ${creditsAdded.toLocaleString()} sq inches`,
          amount: amountInr * 100, // Convert to paise
          quantity: 1,
        },
      ],
      sms_notify: 0,
      email_notify: 1, // Razorpay sends invoice email directly to customer
      currency: 'INR',
      receipt: razorpayPaymentId,
      notes: {
        payment_id: razorpayPaymentId,
        plan: planName,
        credits: String(creditsAdded),
      },
    };

    console.log('[Razorpay Invoice] Creating invoice for plan:', planName);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Razorpay Invoice] Response status:', response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[Razorpay Invoice] Failed to create invoice:', response.status);
      return { success: false, error: `API error: ${response.status}` };
    }

    const invoice = JSON.parse(responseText);
    console.log('[Razorpay Invoice] Invoice created successfully');

    return {
      success: true,
      invoice_id: invoice.id,
      invoice_url: invoice.short_url,
    };
  } catch (err: any) {
    console.error('[Razorpay Invoice] ❌ Exception creating invoice:', err);
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
    razorpay_invoice_id?: string;
    razorpay_invoice_url?: string;
  }
) => {
  // Map to actual transactions table column names
  const insertData: Record<string, any> = {
    email: data.user_email,           // Table uses "email" not "user_email"
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
  };

  // Add invoice fields if available
  if (data.razorpay_invoice_id) {
    insertData.razorpay_invoice_id = data.razorpay_invoice_id;
  }
  if (data.razorpay_invoice_url) {
    insertData.razorpay_invoice_url = data.razorpay_invoice_url;
  }

  console.log('[Payment Log] Logging transaction:', { plan_id: data.plan_id, status: data.status, credits_added: data.credits_added });

  try {
    const { data: insertedData, error } = await supabase
      .from('transactions')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[Payment Log] Error logging to Supabase:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Don't fail the payment if logging fails
    } else {
      console.log('[Payment Log] Payment logged successfully');
    }
  } catch (err: any) {
    console.error('[Payment Log] Exception:', {
      message: err.message,
      stack: err.stack,
    });
    // Don't fail the payment if logging fails
  }
};

// Validate and return CORS origin, or null if not allowed
function getAllowedOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  if (origin === 'https://dtflayout.com' || origin === 'http://localhost:5173') return origin;
  if (/^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin)) return origin;
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  // CORS headers — locked to dtflayout.com and subdomains
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    if (!allowedOrigin) return res.status(403).json({ error: 'Origin not allowed' });
    return res.status(200).end();
  }
  if (await applyRateLimit(req, res, paymentLimiter)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan_id,
      user_id,
      user_email,
      amount,
    } = req.body as VerifyPaymentRequest;

    console.log('[Verify Payment] Request received:', {
      plan_id,
      has_user_id: !!user_id,
      has_email: !!user_email,
      amount,
      has_payment_id: !!razorpay_payment_id,
      has_order_id: !!razorpay_order_id,
      has_signature: !!razorpay_signature,
    });

    // Validate required fields
    if (!razorpay_payment_id || !plan_id || !user_id || !user_email) {
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

    // For free trial, check if already claimed
    if (plan_id === 'free_trial') {
      console.log('[Verify Payment] Free trial request, checking if already claimed...');

      const freeTrialCheck = await hasClaimedFreeTrial(supabase, user_id);

      if (!freeTrialCheck.success) {
        console.error('[Verify Payment] Failed to check free trial status:', freeTrialCheck.error);
        return res.status(500).json({
          success: false,
          error: 'Failed to check free trial status',
        });
      }

      if (freeTrialCheck.claimed) {
        console.log('[Verify Payment] Free trial already claimed by user');
        return res.status(400).json({
          success: false,
          error: 'Free trial already claimed',
          already_claimed: true,
        });
      }

      console.log('[Verify Payment] Free trial not yet claimed, proceeding...');
    } else {
      // For paid plans, verify the Razorpay signature
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
          user_id,
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

    // Signature is valid (or free trial eligible) - add credits to Supabase
    console.log('[Verify Payment] Adding credits to Supabase:', creditsToAdd);

    const addResult = await addCreditsToUser(
      supabase,
      user_id,
      user_email,
      creditsToAdd
    );

    if (!addResult.success) {
      console.error('[Verify Payment] Failed to add credits:', addResult.error);

      // Log failed payment
      await logPayment(supabase, {
        user_email,
        user_id,
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

    // If this was a free trial, mark it as claimed
    if (plan_id === 'free_trial') {
      const markResult = await markFreeTrialClaimed(supabase, user_id);
      if (!markResult.success) {
        console.error('[Verify Payment] Warning: Failed to mark free trial as claimed:', markResult.error);
        // Don't fail the request, credits were already added
      }
    }

    // Generate Razorpay invoice for paid plans (not free trial)
    let invoiceResult: RazorpayInvoiceResult = { success: false };
    if (plan_id !== 'free_trial') {
      console.log('[Verify Payment] Generating Razorpay invoice...');
      invoiceResult = await createRazorpayInvoice(
        user_email,
        PLAN_NAMES[plan_id],
        creditsToAdd,
        amount || PLAN_PRICES[plan_id],
        razorpay_payment_id
      );

      if (invoiceResult.success) {
        console.log('[Verify Payment] Invoice generated successfully');
      } else {
        console.log('[Verify Payment] ⚠️ Invoice generation failed:', invoiceResult.error);
        // Don't fail the payment, invoice is a nice-to-have
      }
    }

    // Success! Log the payment with invoice details
    await logPayment(supabase, {
      user_email,
      user_id,
      razorpay_payment_id,
      razorpay_order_id,
      plan_id,
      plan_name: PLAN_NAMES[plan_id],
      amount_inr: amount || PLAN_PRICES[plan_id],
      credits_added: creditsToAdd,
      credits_before: addResult.previousBalance || 0,
      credits_after: addResult.newBalance || creditsToAdd,
      status: 'success',
      razorpay_invoice_id: invoiceResult.invoice_id,
      razorpay_invoice_url: invoiceResult.invoice_url,
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
    Sentry.captureException(error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
