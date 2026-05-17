/**
 * /api/enhance.ts — AI Image Enhancement via Real-ESRGAN (Replicate)
 * 
 * Accepts a base64-encoded image, sends it to Replicate's Real-ESRGAN model,
 * returns the upscaled image URL. Requires authenticated user with sufficient credits.
 * 
 * Credits are NOT deducted here — the frontend deducts after successful download
 * to prevent charging on network failures.
 */

import { applyRateLimit, generalLimiter } from './lib/rateLimit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Constants ────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
const REPLICATE_MODEL_VERSION = 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa';
const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40; // ~60 seconds max wait

// ── Supabase clients ─────────────────────────────────────────────────

const getAnonClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL');
  if (!supabaseAnonKey) throw new Error('Missing SUPABASE_ANON_KEY');
  return createClient(supabaseUrl, supabaseAnonKey);
};

// ── CORS ─────────────────────────────────────────────────────────────

function getAllowedOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (!origin) return null;
  if (origin === 'https://dtflayout.com' || origin === 'http://localhost:5173') return origin;
  if (/^https:\/\/[\w-]+\.dtflayout\.com$/.test(origin)) return origin;
  return null;
}

// ── Handler ──────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  initSentry();

  // CORS
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

  if (await applyRateLimit(req, res, generalLimiter)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const anonClient = getAnonClient();
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // ── Validate env ────────────────────────────────────────────────
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      console.error('[Enhance] REPLICATE_API_TOKEN not configured');
      return res.status(500).json({ success: false, error: 'AI service not configured' });
    }

    // ── Parse request ───────────────────────────────────────────────
    const { image, scale = 4, faceEnhance = false } = req.body || {};

    if (!image) {
      return res.status(400).json({ success: false, error: 'Missing image data' });
    }

    // Validate scale
    if (![2, 4].includes(scale)) {
      return res.status(400).json({ success: false, error: 'Scale must be 2 or 4' });
    }

    // Validate image size (base64 is ~33% larger than binary)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const estimatedBytes = (base64Data.length * 3) / 4;
    if (estimatedBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, error: 'Image exceeds 30MB limit' });
    }

    // ── Create prediction ───────────────────────────────────────────
    console.log('[Enhance] Creating prediction for user', user.id.substring(0, 8), '... scale:', scale);

    const dataUri = image.startsWith('data:') ? image : `data:image/png;base64,${image}`;

    const createResponse = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          image: dataUri,
          scale,
          face_enhance: faceEnhance,
        },
      }),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error('[Enhance] Replicate create error:', createResponse.status, errText);
      Sentry?.captureMessage(`Replicate create failed: ${createResponse.status}`);
      return res.status(502).json({ success: false, error: 'AI service error. Please try again.' });
    }

    let prediction = await createResponse.json();

    // ── Poll for result if not immediately completed ────────────────
    if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      let attempts = 0;
      while (attempts < MAX_POLL_ATTEMPTS && prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
        
        const pollResponse = await fetch(prediction.urls.get, {
          headers: { 'Authorization': `Bearer ${replicateToken}` },
        });

        if (!pollResponse.ok) {
          console.error('[Enhance] Poll error:', pollResponse.status);
          break;
        }

        prediction = await pollResponse.json();
        attempts++;
      }
    }

    // ── Return result ───────────────────────────────────────────────
    if (prediction.status === 'succeeded') {
      const outputUrl = prediction.output;
      console.log('[Enhance] Success for user', user.id.substring(0, 8));
      return res.status(200).json({
        success: true,
        url: outputUrl,
        scale,
        metrics: prediction.metrics,
      });
    }

    if (prediction.status === 'failed') {
      console.error('[Enhance] Prediction failed:', prediction.error);
      Sentry?.captureMessage(`Replicate prediction failed: ${prediction.error}`);
      return res.status(502).json({ success: false, error: 'Image enhancement failed. Try a different image.' });
    }

    // Timed out
    console.error('[Enhance] Prediction timed out');
    return res.status(504).json({ success: false, error: 'Enhancement timed out. Try a smaller image.' });

  } catch (err: any) {
    console.error('[Enhance] Exception:', err);
    Sentry?.captureException(err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
