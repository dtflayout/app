import { applyRateLimit, paymentLimiter } from './lib/rateLimit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const FREE_TRIAL_CREDITS = 20000; // 20,000 sq.inches

// ── Supabase client ───────────────────────────────────────────────────────

const getSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
  if (!supabaseServiceKey) throw new Error('Missing SUPABASE_SERVICE_KEY');
  return createClient(supabaseUrl, supabaseServiceKey);
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
    const { user_id, user_email } = req.body as { user_id: string; user_email: string };

    console.log('[Free Trial] Request received:', { has_user_id: !!user_id, has_email: !!user_email });

    if (!user_id || !user_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (user_id, user_email)',
      });
    }

    // Initialize Supabase
    let supabase: SupabaseClient;
    try {
      supabase = getSupabaseClient();
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Database not configured' });
    }

    // Check if user exists and whether free trial is already claimed
    const { data: existing, error: fetchError } = await supabase
      .from('credits')
      .select('balance, free_trial_claimed')
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Free Trial] Fetch error:', fetchError);
      return res.status(500).json({ success: false, error: 'Failed to check trial status' });
    }

    // Already claimed?
    if (existing?.free_trial_claimed) {
      console.log('[Free Trial] Already claimed by user');
      return res.status(400).json({
        success: false,
        error: 'Free trial already claimed',
        already_claimed: true,
      });
    }

    if (existing) {
      // User exists — add credits and mark trial claimed
      const newBalance = (existing.balance || 0) + FREE_TRIAL_CREDITS;
      const { error: updateError } = await supabase
        .from('credits')
        .update({
          balance: newBalance,
          free_trial_claimed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);

      if (updateError) {
        console.error('[Free Trial] Update error:', updateError);
        return res.status(500).json({ success: false, error: 'Failed to add trial credits' });
      }

      console.log('[Free Trial] Credits added to existing user:', { previous: existing.balance, new: newBalance });

      return res.status(200).json({
        success: true,
        message: 'Free trial activated',
        credits_added: FREE_TRIAL_CREDITS,
        new_balance: newBalance,
      });
    } else {
      // New user — create record with trial credits
      const { error: insertError } = await supabase
        .from('credits')
        .insert({
          user_id: user_id,
          email: user_email,
          balance: FREE_TRIAL_CREDITS,
          free_trial_claimed: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[Free Trial] Insert error:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to create trial' });
      }

      console.log('[Free Trial] New user created with trial credits:', FREE_TRIAL_CREDITS);

      return res.status(200).json({
        success: true,
        message: 'Free trial activated',
        credits_added: FREE_TRIAL_CREDITS,
        new_balance: FREE_TRIAL_CREDITS,
      });
    }
  } catch (error: any) {
    console.error('[Free Trial] Unexpected error:', error);
    Sentry.captureException(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
