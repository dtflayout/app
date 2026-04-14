import { initSentry, Sentry } from './lib/sentry.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Webhook } from 'standardwebhooks';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Reverse lookup: Dodo product_id → credits ─────────────────────────────

const PRODUCT_CREDITS: Record<string, { credits: number; plan_id: string; plan_name: string }> = {
  // Global (USD)
  'pdt_0NcfnbgcoWVV5ABkqfd4W': { credits: 150000,  plan_id: 'starter',  plan_name: 'DTF Starter' },
  'pdt_0NbAW1mIzcAq3bTjhkZj1': { credits: 150000,  plan_id: 'starter',  plan_name: 'DTF Starter' },  // old ID, keep for safety
  'pdt_0NbAWS876LqMRwSFSpDBJ': { credits: 500000,  plan_id: 'growth',   plan_name: 'DTF Growth' },
  'pdt_0NbAXNyhPnjF6NOFWU3AV': { credits: 2000000, plan_id: 'max',      plan_name: 'DTF Max' },
  // India (INR)
  'pdt_0NbAZg2ZiDFl8o4J1Ovfa': { credits: 150000,  plan_id: 'starter',  plan_name: 'DTF Starter-India' },
  'pdt_0NbAZtngV3jovZnpXe4WU': { credits: 500000,  plan_id: 'growth',   plan_name: 'DTF Growth-India' },
  'pdt_0NbAa1eGihyujWptwRpf1': { credits: 2000000, plan_id: 'max',      plan_name: 'DTF Max-India' },
  // Test / Live test
  'pdt_0NbB4gGZZa0PUdOs8zDEA': { credits: 150000,  plan_id: 'starter',  plan_name: 'DTF Starter (Test)' },
  'pdt_0NcfoAZDl4R5VccSUczH6': { credits: 150000,  plan_id: 'starter',  plan_name: 'DTF Live Test' },
};

// ── Supabase client ───────────────────────────────────────────────────────

const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, supabaseServiceKey);
};

// ── Read raw body for signature verification ──────────────────────────────

async function getRawBody(req: VercelRequest): Promise<string> {
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  if (req.body && typeof req.body === 'string') return req.body;
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// ── Credit addition ───────────────────────────────────────────────────────

const addCreditsToUser = async (
  supabase: SupabaseClient, userId: string, email: string, creditsToAdd: number
): Promise<{ success: boolean; newBalance?: number; previousBalance?: number; error?: string }> => {
  try {
    const { data: newBalance, error: rpcError } = await supabase
      .rpc('add_credits_atomic', {
        p_user_id: userId,
        p_amount: creditsToAdd,
      });

    if (rpcError) {
      console.error('[Webhook] RPC error:', rpcError.message);
      if (rpcError.message.includes('User not found')) {
        // User has no credits row yet — create one, then retry
        console.log('[Webhook] No credits record, creating one');
        const { error: insertError } = await supabase.from('credits').insert({
          user_id: userId, email, balance: 0, free_trial_claimed: false,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        if (insertError) return { success: false, error: insertError.message };

        // Retry the atomic add
        const { data: retryBalance, error: retryError } = await supabase
          .rpc('add_credits_atomic', { p_user_id: userId, p_amount: creditsToAdd });
        if (retryError) return { success: false, error: retryError.message };

        console.log('[Webhook] Credits added (after create):', { added: creditsToAdd, new: retryBalance });
        return { success: true, newBalance: retryBalance as number, previousBalance: 0 };
      }
      return { success: false, error: rpcError.message };
    }

    const previousBalance = Math.round((newBalance as number) - creditsToAdd);
    console.log('[Webhook] Credits added:', { previous: previousBalance, added: creditsToAdd, new: newBalance });
    return { success: true, newBalance: newBalance as number, previousBalance };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// ── Transaction logging ───────────────────────────────────────────────────

const logTransaction = async (
  supabase: SupabaseClient,
  data: {
    user_id: string; email: string; dodo_payment_id: string;
    plan_id: string; plan_name: string; amount: number; currency: string;
    credits_added: number; credits_before: number; credits_after: number;
    status: 'success' | 'failed'; error_message?: string; dodo_invoice_url?: string;
  }
) => {
  try {
    const { error } = await supabase.from('credit_transactions').insert({
      user_id: data.user_id, email: data.email, payment_id: data.dodo_payment_id,
      plan_id: data.plan_id, plan_name: data.plan_name,
      amount: data.amount, currency: data.currency,
      credits_added: data.credits_added, credits_before: data.credits_before,
      credits_after: data.credits_after, status: data.status,
      error_message: data.error_message || null,
      invoice_url: data.dodo_invoice_url || null,
      created_at: new Date().toISOString(),
    });
    if (error) console.error('[Webhook] Failed to log transaction:', error);
    else console.log('[Webhook] Transaction logged:', { payment_id: data.dodo_payment_id, status: data.status });
  } catch (err: any) {
    console.error('[Webhook] Exception logging transaction:', err);
  }
};

// ── Handler ───────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  // Webhooks are server-to-server — no CORS needed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Step 1: Verify webhook signature
    const webhookKey = process.env.DODO_WEBHOOK_KEY;
    if (!webhookKey) {
      console.error('[Webhook] DODO_WEBHOOK_KEY not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }

    const rawBody = await getRawBody(req);
    const webhookHeaders = {
      'webhook-id': (req.headers['webhook-id'] as string) || '',
      'webhook-signature': (req.headers['webhook-signature'] as string) || '',
      'webhook-timestamp': (req.headers['webhook-timestamp'] as string) || '',
    };

    const wh = new Webhook(webhookKey);
    try {
      wh.verify(rawBody, webhookHeaders);
    } catch (verifyError) {
      console.error('[Webhook] Signature verification failed:', verifyError);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    console.log('[Webhook] Signature verified');

    // Step 2: Parse payload
    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event_type;
    const paymentData = payload.data || payload;

    console.log('[Webhook] Event:', { type: eventType, payment_id: paymentData.payment_id, status: paymentData.status });

    // Step 3: Handle payment.succeeded
    if (eventType === 'payment.succeeded' || paymentData.status === 'succeeded') {
      const paymentId = paymentData.payment_id;
      const customerEmail = paymentData.customer?.email;
      const totalAmount = (paymentData.total_amount || 0) / 100; // Dodo sends in smallest unit (paise/cents)
      const currency = paymentData.currency || 'USD';
      const invoiceUrl = paymentData.invoice_url || null;
      const metadata = paymentData.metadata || {};
      const productCart = paymentData.product_cart || [];

      const userId = metadata.user_id;
      if (!userId || !customerEmail) {
        console.error('[Webhook] Missing user_id or email:', { has_user_id: !!userId, has_email: !!customerEmail });
        return res.status(200).json({ received: true, error: 'Missing user identification' });
      }

      // Map product_cart to credits
      let totalCredits = 0;
      let planId = metadata.plan_id || 'unknown';
      let planName = 'Unknown Plan';

      for (const item of productCart) {
        const info = PRODUCT_CREDITS[item.product_id];
        if (info) {
          totalCredits += info.credits * (item.quantity || 1);
          planId = info.plan_id;
          planName = info.plan_name;
        } else {
          console.warn('[Webhook] Unknown product_id:', item.product_id);
        }
      }

      // Fallback to metadata
      if (totalCredits === 0 && metadata.credits) {
        totalCredits = parseInt(metadata.credits, 10);
        console.warn('[Webhook] Used metadata credits fallback:', totalCredits);
      }

      if (totalCredits === 0) {
        console.error('[Webhook] Could not determine credits for:', paymentId);
        return res.status(200).json({ received: true, error: 'Could not determine credits' });
      }

      let supabase: SupabaseClient;
      try { supabase = getSupabaseClient(); } catch (e) {
        return res.status(500).json({ error: 'Database not configured' });
      }

      // Idempotency check — skip if already processed
      const { data: existingTx } = await supabase
        .from('credit_transactions').select('payment_id')
        .eq('payment_id', paymentId).eq('status', 'success').single();

      if (existingTx) {
        console.log('[Webhook] Duplicate payment, skipping:', paymentId);
        return res.status(200).json({ received: true, message: 'Already processed' });
      }

      // Add credits
      const addResult = await addCreditsToUser(supabase, userId, customerEmail, totalCredits);

      if (!addResult.success) {
        await logTransaction(supabase, {
          user_id: userId, email: customerEmail, dodo_payment_id: paymentId,
          plan_id: planId, plan_name: planName, amount: totalAmount, currency,
          credits_added: 0, credits_before: 0, credits_after: 0,
          status: 'failed', error_message: addResult.error,
        });
        return res.status(500).json({ error: 'Failed to add credits' });
      }

      await logTransaction(supabase, {
        user_id: userId, email: customerEmail, dodo_payment_id: paymentId,
        plan_id: planId, plan_name: planName, amount: totalAmount, currency,
        credits_added: totalCredits, credits_before: addResult.previousBalance || 0,
        credits_after: addResult.newBalance || totalCredits,
        status: 'success', dodo_invoice_url: invoiceUrl,
      });

      console.log('[Webhook] Success:', { payment_id: paymentId, credits: totalCredits, balance: addResult.newBalance });
      return res.status(200).json({ received: true, credits_added: totalCredits });
    }

    // Handle payment.failed — log and acknowledge
    if (eventType === 'payment.failed') {
      console.log('[Webhook] Payment failed:', {
        payment_id: paymentData.payment_id,
        error: paymentData.error_message,
      });
      return res.status(200).json({ received: true });
    }

    // Unknown event — acknowledge to prevent retries
    console.log('[Webhook] Unhandled event:', eventType);
    return res.status(200).json({ received: true });

  } catch (error: any) {
    console.error('[Webhook] Unexpected error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
