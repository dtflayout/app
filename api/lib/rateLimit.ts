// ============================================================================
// Rate Limiting Setup Guide for DTF Layout API Routes
// Uses @upstash/ratelimit + @upstash/redis (free tier: 10k requests/day)
// ============================================================================
//
// SETUP STEPS:
// 1. Create a free Upstash account at https://upstash.com
// 2. Create a Redis database (pick the region closest to your Vercel deployment)
// 3. Copy the REST URL and REST Token from the Upstash dashboard
// 4. Add these env vars in Vercel → Settings → Environment Variables:
//      UPSTASH_REDIS_REST_URL=https://...upstash.io
//      UPSTASH_REDIS_REST_TOKEN=AX...
// 5. Install dependencies:
//      npm install @upstash/ratelimit @upstash/redis
// 6. Copy this file to api/lib/rateLimit.ts
// 7. Add the rate limiter to each API route (see usage examples below)
// ============================================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Redis client (reads from env vars automatically)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ── Rate limiters for different routes ──────────────────────────────────

/**
 * Payment routes (create-order, verify-payment):
 * 5 requests per 60 seconds per IP — tight because these hit Razorpay
 */
export const paymentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '60 s'),
  prefix: 'rl:payment',
  analytics: true, // viewable in Upstash dashboard
});

/**
 * General API routes:
 * 20 requests per 60 seconds per IP
 */
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  prefix: 'rl:general',
  analytics: true,
});

/**
 * Public builder / storefront routes:
 * 30 requests per 60 seconds per IP — more lenient for end-users
 */
export const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
  prefix: 'rl:public',
  analytics: true,
});


// ── Helper to extract a stable identifier from the request ──────────────

function getIdentifier(req: VercelRequest): string {
  // Vercel provides the real IP via x-forwarded-for or x-real-ip
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : req.headers['x-real-ip'] as string || '127.0.0.1';
  return ip;
}


// ── Middleware-style function to apply rate limiting ─────────────────────

/**
 * Apply rate limiting to a Vercel API route handler.
 * Returns true if the request was rate-limited (response already sent).
 * Returns false if the request is allowed to proceed.
 *
 * Usage:
 *   if (await applyRateLimit(req, res, paymentLimiter)) return;
 */
export async function applyRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  limiter: Ratelimit
): Promise<boolean> {
  // Skip rate limiting if Upstash is not configured (graceful degradation)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[RateLimit] Upstash not configured — skipping rate limit check');
    return false;
  }

  try {
    const identifier = getIdentifier(req);
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    // Always set rate limit headers so clients can self-regulate
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
      return true; // request was blocked
    }

    return false; // request is allowed
  } catch (err) {
    // If Redis is down, allow the request through (fail-open)
    console.error('[RateLimit] Redis error, allowing request:', err);
    return false;
  }
}


// ============================================================================
// USAGE EXAMPLES — add to the top of each API route handler
// ============================================================================
//
// ── api/create-order.ts ─────────────────────────────────────────────────
//
//   import { applyRateLimit, paymentLimiter } from './lib/rateLimit';
//
//   export default async function handler(req, res) {
//     // ... CORS headers ...
//
//     // Rate limit check (before any processing)
//     if (await applyRateLimit(req, res, paymentLimiter)) return;
//
//     // ... rest of handler ...
//   }
//
// ── api/verify-payment.ts ───────────────────────────────────────────────
//
//   import { applyRateLimit, paymentLimiter } from './lib/rateLimit';
//
//   export default async function handler(req, res) {
//     // ... CORS headers ...
//     if (await applyRateLimit(req, res, paymentLimiter)) return;
//     // ... rest of handler ...
//   }
//
// ============================================================================
