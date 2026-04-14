/**
 * GET /api/go?c=abc123
 * 
 * Short link redirect for cold email tracking.
 * Looks up the code, logs the click, redirects to destination with UTMs.
 * 
 * Vercel rewrite needed in vercel.json:
 *   { "source": "/go/:code", "destination": "/api/go?c=:code" }
 * 
 * The resulting URL in cold emails: dtflayout.com/go/abc123
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

// Fallback destination if code not found
const FALLBACK_URL = 'https://dtflayout.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const code = (req.query.c as string || '').trim().toLowerCase();
  
  if (!code || code.length > 12) {
    return res.redirect(302, FALLBACK_URL);
  }
  
  try {
    // 1. Look up the tracked link
    const { data: link, error } = await supabase
      .from('tracked_links')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();
    
    if (error || !link) {
      console.warn(`[go] Unknown link code: ${code}`);
      return res.redirect(302, FALLBACK_URL);
    }
    
    // 2. Log the click (fire and forget — don't block redirect)
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket?.remoteAddress
      || null;
    
    supabase
      .from('link_clicks')
      .insert({
        link_id: link.id,
        ip_address: ip,
        user_agent: req.headers['user-agent'] || null,
        referer: req.headers['referer'] || null,
      })
      .then(() => {}) // fire and forget
      .catch(() => {}); // never fail the redirect
    
    // 3. Build the destination URL with UTMs + ref code
    const dest = new URL(link.destination_url, 'https://dtflayout.com');
    
    if (link.utm_source) dest.searchParams.set('utm_source', link.utm_source);
    if (link.utm_medium) dest.searchParams.set('utm_medium', link.utm_medium);
    if (link.utm_campaign) dest.searchParams.set('utm_campaign', link.utm_campaign);
    if (link.utm_content) dest.searchParams.set('utm_content', link.utm_content);
    
    // Add the link code as `ref` param — this lets the client-side analytics
    // stitch this visit back to the prospect
    dest.searchParams.set('ref', code);
    
    // 4. Redirect (302 so we can track every click, not just the first)
    return res.redirect(302, dest.toString());
    
  } catch (err) {
    console.error('[go] Redirect error:', err);
    return res.redirect(302, FALLBACK_URL);
  }
}
