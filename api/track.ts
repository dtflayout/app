/**
 * POST /api/track
 * 
 * Server-side event logging for critical attribution events.
 * Stores events in Supabase `visit_events` table.
 * 
 * Only critical events are sent here (signup, purchase, etc.)
 * — not every click. PostHog handles high-volume tracking.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Rate limiting via Upstash (reuse existing limiter)
// Import your existing rate limiter if available, or use a simple in-memory one
const RATE_LIMIT = 30; // max events per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  
  entry.count++;
  return entry.count > RATE_LIMIT;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// Allowed event names (prevent arbitrary writes)
const ALLOWED_EVENTS = new Set([
  'page_view',
  'signup_started',
  'signup_completed',
  'onboarding_step',
  'onboarding_completed',
  'first_sheet_created',
  'first_download',
  'credits_purchased',
  'trial_claimed',
  'store_published',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  const origin = req.headers.origin || '';
  if (/^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin) || origin === 'https://dtflayout.com') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  try {
    const body = req.body;
    
    if (!body || !body.event_name) {
      return res.status(400).json({ error: 'event_name required' });
    }
    
    // Validate event name
    if (!ALLOWED_EVENTS.has(body.event_name)) {
      return res.status(400).json({ error: 'Unknown event' });
    }
    
    // Sanitize & insert
    const { error } = await supabase.from('visit_events').insert({
      anonymous_id: String(body.anonymous_id || '').slice(0, 64),
      user_id: body.user_id || null,
      event_name: body.event_name,
      event_properties: body.event_properties || {},
      utm_source: body.utm_source?.slice(0, 50) || null,
      utm_medium: body.utm_medium?.slice(0, 50) || null,
      utm_campaign: body.utm_campaign?.slice(0, 100) || null,
      utm_content: body.utm_content?.slice(0, 100) || null,
      referrer: body.referrer?.slice(0, 2000) || null,
      page_url: body.page_url?.slice(0, 2000) || null,
      session_id: body.session_id?.slice(0, 64) || null,
      device_type: body.device_type?.slice(0, 20) || null,
      browser: body.browser?.slice(0, 50) || null,
      tracked_link_code: body.tracked_link_code?.slice(0, 12) || null,
    });
    
    if (error) {
      console.error('[track] Insert error:', error.message);
      return res.status(500).json({ error: 'Failed to store event' });
    }
    
    return res.status(200).json({ ok: true });
    
  } catch (err) {
    console.error('[track] Error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
