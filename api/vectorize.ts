/**
 * /api/vectorize.ts — AI Vectorization via Vectorizer.AI
 * 
 * Accepts a base64-encoded image, sends it to Vectorizer.AI,
 * returns the SVG content. Requires authenticated user with sufficient credits.
 * 
 * Credits are NOT deducted here — the frontend deducts after successful receipt
 * to prevent charging on network failures.
 */

import { applyRateLimit, generalLimiter } from './lib/rateLimit.js';
import { initSentry, Sentry } from './lib/sentry.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Constants ────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const VECTORIZER_API_URL = 'https://api.vectorizer.ai/api/v1/vectorize';
const REQUEST_TIMEOUT_MS = 60_000; // 60 seconds

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
    const apiId = process.env.VECTORIZER_API_ID;
    const apiSecret = process.env.VECTORIZER_API_SECRET;
    if (!apiId || !apiSecret) {
      console.error('[Vectorize] VECTORIZER_API_ID or VECTORIZER_API_SECRET not configured');
      return res.status(500).json({ success: false, error: 'Vectorization service not configured' });
    }

    // ── Parse request ───────────────────────────────────────────────
    const { image } = req.body || {};

    if (!image) {
      return res.status(400).json({ success: false, error: 'Missing image data' });
    }

    // Validate image size (base64 is ~33% larger than binary)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const estimatedBytes = (base64Data.length * 3) / 4;
    if (estimatedBytes > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, error: 'Image exceeds 30MB limit' });
    }

    // ── Convert base64 to Buffer ────────────────────────────────────
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Detect MIME type from data URI or default to png
    let mimeType = 'image/png';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/\w+);/);
      if (match) mimeType = match[1];
    }

    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';

    // ── Build multipart form data ───────────────────────────────────
    // Node.js 18+ has built-in FormData but Vercel serverless needs
    // manual multipart construction for binary file uploads
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);

    const parts: Buffer[] = [];

    // Image file part
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="input.${ext}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(imageBuffer);
    parts.push(Buffer.from('\r\n'));

    // Output format part
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="output.file_format"\r\n\r\n` +
      `svg\r\n`
    ));

    // End boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    // ── Call Vectorizer.AI ──────────────────────────────────────────
    console.log('[Vectorize] Sending request for user', user.id.substring(0, 8), '... size:', imageBuffer.length);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const apiResponse = await fetch(VECTORIZER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${apiId}:${apiSecret}`).toString('base64')}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('[Vectorize] API error:', apiResponse.status, errText.substring(0, 200));
      Sentry?.captureMessage(`Vectorizer.AI failed: ${apiResponse.status}`);

      if (apiResponse.status === 402) {
        return res.status(502).json({ success: false, error: 'Vectorization credits exhausted. Please contact support.' });
      }
      if (apiResponse.status === 429) {
        return res.status(429).json({ success: false, error: 'Too many requests. Please wait a moment and try again.' });
      }

      return res.status(502).json({ success: false, error: 'Vectorization failed. Please try a different image.' });
    }

    const svgContent = await apiResponse.text();

    // Basic validation — should start with SVG markup
    if (!svgContent.includes('<svg')) {
      console.error('[Vectorize] Response is not valid SVG');
      return res.status(502).json({ success: false, error: 'Vectorization returned invalid output.' });
    }

    console.log('[Vectorize] Success for user', user.id.substring(0, 8), '... SVG size:', svgContent.length);

    return res.status(200).json({
      success: true,
      svg: svgContent,
      svgSize: svgContent.length,
    });

  } catch (err: any) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'Vectorization timed out. Try a smaller or simpler image.' });
    }
    console.error('[Vectorize] Exception:', err);
    Sentry?.captureException(err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
