import { applyRateLimit, paymentLimiter } from './lib/rateLimit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FREE_TRIAL_CREDITS = 20000; // 20,000 sq.inches

// ── Disposable email domain blocklist ─────────────────────────────────
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'tempmail.com',
  'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
  'guerrillamailblock.com', 'grr.la', 'dispostable.com', 'yopmail.com',
  'trashmail.com', 'trashmail.net', 'trashmail.org', 'mailnesia.com',
  'maildrop.cc', 'discard.email', 'tempail.com', 'tempr.email',
  'temp-mail.io', 'mohmal.com', 'burnermail.io', 'mailcatch.com',
  'mintemail.com', 'tempinbox.com', 'emailondeck.com', 'harakirimail.com',
  'getnada.com', 'mailsac.com', 'inboxkitten.com', '10minutemail.com',
  '10minutemail.net', 'minutemail.com', 'tempmailo.com', 'tempmailaddress.com',
  'throwawaymail.com', 'mailtemp.net', 'emailfake.com', 'crazymailing.com',
  'armyspy.com', 'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com',
  'jourrapide.com', 'rhyta.com', 'superrito.com', 'teleworm.us',
  'tmpmail.net', 'tmpmail.org', 'mailnator.com', 'getairmail.com',
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false;
}

// ── Supabase clients ──────────────────────────────────────────────────

const getServiceClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_KEY');
  return createClient(supabaseUrl, supabaseServiceKey);
};

const getAnonClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
  if (!supabaseAnonKey) throw new Error('Missing SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, supabaseAnonKey);
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

  // CORS headers
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    if (!allowedOrigin) return res.status(403).json({ error: 'Origin not allowed' });
    return res.status(200).end();
  }
  if (await applyRateLimit(req, res, paymentLimiter)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── ISSUE #1 FIX: Validate JWT instead of trusting client-supplied user_id ──
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = getAnonClient();
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[Free Trial] Auth error:', authError?.message);
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const user_id = user.id;
    const user_email = user.email || '';

    // Block disposable email domains from claiming free trial
    if (isDisposableEmail(user_email)) {
      console.log('[Free Trial] Blocked disposable email domain');
      return res.status(400).json({
        success: false,
        error: 'Free trial is not available for temporary email addresses. Please use a permanent email.',
      });
    }

    console.log('[Free Trial] Authenticated request for user');

    // Initialize service client for DB operations
    let supabase: SupabaseClient;
    try {
      supabase = getServiceClient();
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // ── Use atomic RPC for the entire claim ──
    const { data: newBalance, error: rpcError } = await supabase
      .rpc('claim_free_trial_atomic', {
        p_user_id: user_id,
        p_credits: FREE_TRIAL_CREDITS,
      });

    if (rpcError) {
      if (rpcError.message.includes('already claimed')) {
        console.log('[Free Trial] Already claimed by user');
        return res.status(400).json({
          success: false,
          error: 'Free trial already claimed',
          already_claimed: true,
        });
      }
      console.error('[Free Trial] RPC error:', rpcError);
      return res.status(500).json({ success: false, error: 'Failed to claim trial' });
    }

    // Log to credit_transactions (non-critical)
    const previousBalance = (newBalance as number) - FREE_TRIAL_CREDITS;
    await supabase.from('credit_transactions').insert({
      user_id,
      email: user_email,
      type: 'recharge',
      plan_id: 'free_trial',
      plan_name: 'Free Trial',
      amount: 0,
      currency: 'USD',
      credits_added: FREE_TRIAL_CREDITS,
      credits_before: Math.max(0, previousBalance),
      credits_after: newBalance,
      status: 'success',
      description: 'Free trial activation',
      created_at: new Date().toISOString(),
    });

    console.log('[Free Trial] Activated. New balance:', newBalance);

    return res.status(200).json({
      success: true,
      message: 'Free trial activated',
      credits_added: FREE_TRIAL_CREDITS,
      new_balance: newBalance,
    });
  } catch (error: any) {
    console.error('[Free Trial] Unexpected error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
