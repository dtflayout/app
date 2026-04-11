/**
 * Verify OTP API Route
 * Verifies the OTP code and upserts the customer record
 * 
 * POST /api/verify-otp
 * Body: { storeId: string, email: string, otp: string, name?: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { initSentry, Sentry } from './lib/sentry.js';

// ── Supabase service client ───────────────────────────────────────────
function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase config');
  return createClient(url, key);
}

// ── CORS ──────────────────────────────────────────────────────────────
function getAllowedOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  if (origin === 'https://dtflayout.com' || origin === 'http://localhost:5173') return origin;
  if (/^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin)) return origin;
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  // CORS
  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return allowedOrigin ? res.status(200).end() : res.status(403).json({ error: 'Origin not allowed' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { storeId, email, otp, name } = req.body || {};

    if (!storeId || !email || !otp) {
      return res.status(400).json({ success: false, error: 'storeId, email, and otp are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedOtp = otp.trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      return res.status(400).json({ success: false, error: 'OTP must be a 6-digit code' });
    }

    const supabase = getServiceClient();

    // Verify OTP via Supabase RPC
    const { data: isValid, error: verifyError } = await supabase
      .rpc('verify_customer_otp', {
        p_store_id: storeId,
        p_email: normalizedEmail,
        p_otp: trimmedOtp,
      });

    if (verifyError) {
      console.error('[VerifyOTP] RPC error:', verifyError);
      Sentry?.captureException(verifyError);
      return res.status(500).json({ success: false, error: 'Verification failed' });
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired code. Please try again.' });
    }

    // OTP is valid — upsert customer record
    // Check if customer already exists for this store + email
    const { data: existing } = await supabase
      .from('quick_store_customers')
      .select('*')
      .eq('quick_store_id', storeId)
      .eq('email', normalizedEmail)
      .single();

    let customer;

    if (existing) {
      // Existing customer — update verified status and optionally name
      const updates: Record<string, any> = {
        is_verified: true,
        updated_at: new Date().toISOString(),
      };
      // Update name if provided and customer doesn't have one yet
      if (name?.trim() && !existing.name) {
        updates.name = name.trim();
      }

      const { data: updated, error: updateError } = await supabase
        .from('quick_store_customers')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('[VerifyOTP] Update error:', updateError);
        Sentry?.captureException(updateError);
        return res.status(500).json({ success: false, error: 'Failed to update customer' });
      }

      customer = updated;
    } else {
      // New customer — insert
      const { data: created, error: insertError } = await supabase
        .from('quick_store_customers')
        .insert({
          quick_store_id: storeId,
          email: normalizedEmail,
          name: name?.trim() || null,
          is_verified: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[VerifyOTP] Insert error:', insertError);
        Sentry?.captureException(insertError);
        return res.status(500).json({ success: false, error: 'Failed to create customer' });
      }

      customer = created;
    }

    return res.status(200).json({ success: true, customer });
  } catch (err: any) {
    console.error('[VerifyOTP] Unexpected error:', err);
    Sentry?.captureException(err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
