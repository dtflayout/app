/**
 * Send OTP API Route
 * Generates a 6-digit OTP via Supabase RPC and sends it via Resend
 * 
 * POST /api/send-otp
 * Body: { storeId: string, email: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { initSentry, Sentry } from './lib/sentry.js';
import { otpEmail } from './lib/email-templates.js';

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

// ── Simple in-memory rate limit (per IP, 3 OTPs per 60s) ─────────────
const otpAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = otpAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    otpAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 3;
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

  // Rate limit by IP
  const ip = (typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : req.headers['x-real-ip'] as string) || '127.0.0.1';

  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, error: 'Too many OTP requests. Please wait a minute.' });
  }

  try {
    const { storeId, email } = req.body || {};

    if (!storeId || !email) {
      return res.status(400).json({ success: false, error: 'storeId and email are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    const supabase = getServiceClient();

    // Verify the store exists and get store name for the email
    const { data: store, error: storeError } = await supabase
      .from('quick_stores')
      .select('id, store_name')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return res.status(400).json({ success: false, error: 'Store not found' });
    }

    // Generate OTP via Supabase RPC
    const { data: otpCode, error: otpError } = await supabase
      .rpc('generate_customer_otp', {
        p_store_id: storeId,
        p_email: normalizedEmail,
      });

    if (otpError || !otpCode) {
      console.error('[SendOTP] RPC error:', otpError);
      Sentry?.captureException(otpError);
      return res.status(500).json({ success: false, error: 'Failed to generate OTP' });
    }

    // Send OTP email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('[SendOTP] Missing RESEND_API_KEY');
      return res.status(500).json({ success: false, error: 'Email service not configured' });
    }

    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: `${store.store_name} <noreply@dtflayout.com>`,
      to: [normalizedEmail],
      subject: `${otpCode} is your verification code`,
      html: otpEmail(otpCode, store.store_name),
    });

    if (emailError) {
      console.error('[SendOTP] Resend error:', emailError);
      Sentry?.captureException(emailError);
      return res.status(500).json({ success: false, error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('[SendOTP] Unexpected error:', err);
    Sentry?.captureException(err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
