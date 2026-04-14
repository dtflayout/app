import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Geo Detection API
 * 
 * Returns the user's detected region based on IP geolocation.
 * Uses Vercel's x-vercel-ip-country header (free, automatic on all requests).
 * Falls back to Cloudflare's cf-ipcountry header.
 * Default: 'global' (USD pricing).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const country = (
    (req.headers['x-vercel-ip-country'] as string) ||
    (req.headers['cf-ipcountry'] as string) ||
    ''
  ).toUpperCase();

  const region: 'india' | 'global' = country === 'IN' ? 'india' : 'global';

  // MUST NOT cache at CDN level — response is unique per user IP
  // Client-side caching is handled by useRegion.ts (localStorage, 7 days)
  res.setHeader('Cache-Control', 'private, no-store, no-cache');
  
  return res.status(200).json({ region, country });
}
