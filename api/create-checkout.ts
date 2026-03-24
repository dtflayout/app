import { applyRateLimit, paymentLimiter } from './lib/rateLimit';
import { initSentry, Sentry } from './lib/sentry';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import DodoPayments from 'dodopayments';

// ── Product mapping: plan_id → Dodo product_id ────────────────────────────
// India products are served to IN users, global products to everyone else.
// The frontend sends `region: 'india' | 'global'` based on IP detection.

const PRODUCT_MAP: Record<string, { india: string; global: string; credits: number }> = {
  starter: {
    india:  'pdt_0NbAZg2ZiDFl8o4J1Ovfa',  // DTF Starter-India ₹1,999
    global: 'pdt_0NbAW1mIzcAq3bTjhkZj1',  // DTF Starter $49
    credits: 150000,
  },
  growth: {
    india:  'pdt_0NbAZtngV3jovZnpXe4WU',  // DTF Growth-India ₹5,999
    global: 'pdt_0NbAWS876LqMRwSFSpDBJ',  // DTF Growth $149
    credits: 500000,
  },
  max: {
    india:  'pdt_0NbAa1eGihyujWptwRpf1',  // DTF Max-India ₹11,999
    global: 'pdt_0NbAXNyhPnjF6NOFWU3AV',  // DTF Max $299
    credits: 2000000,
  },
};

interface CreateCheckoutRequest {
  plan_id: string;         // 'starter' | 'growth' | 'max'
  region: string;          // 'india' | 'global'
  user_email: string;
  user_name?: string;
  user_id: string;
}

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
    const { plan_id, region, user_email, user_name, user_id } = req.body as CreateCheckoutRequest;

    console.log('[Create Checkout] Request received:', {
      plan_id,
      region,
      has_email: !!user_email,
      has_user_id: !!user_id,
    });

    // Validate required fields
    if (!plan_id || !region || !user_email || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields (plan_id, region, user_email, user_id)',
      });
    }

    // Validate plan exists
    const plan = PRODUCT_MAP[plan_id];
    if (!plan) {
      return res.status(400).json({
        success: false,
        error: `Invalid plan_id: ${plan_id}. Valid plans: ${Object.keys(PRODUCT_MAP).join(', ')}`,
      });
    }

    // Validate region
    if (region !== 'india' && region !== 'global') {
      return res.status(400).json({
        success: false,
        error: 'Invalid region. Must be "india" or "global".',
      });
    }

    // Get the correct product_id for the region
    const productId = plan[region as 'india' | 'global'];

    // Check API key
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      console.error('[Create Checkout] DODO_PAYMENTS_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured',
      });
    }

    // Determine environment — use test_mode unless DODO_LIVE_MODE is explicitly set
    const isLive = process.env.DODO_LIVE_MODE === 'true';

    // Create Dodo Payments client
    const client = new DodoPayments({
      bearerToken: apiKey,
      environment: isLive ? 'live_mode' : 'test_mode',
    });

    // Build return URL — user lands here after payment
    const baseUrl = process.env.VERCEL_ENV === 'production'
      ? 'https://dtflayout.com'
      : (req.headers.origin || 'https://dtflayout.com');
    const returnUrl = `${baseUrl}/app/payment-success`;

    console.log('[Create Checkout] Creating Dodo checkout session:', {
      product_id: productId,
      region,
      return_url: returnUrl,
      environment: isLive ? 'live' : 'test',
    });

    // Create checkout session via Dodo SDK
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user_email,
        name: user_name || user_email.split('@')[0],
      },
      return_url: returnUrl,
      metadata: {
        user_id: user_id,
        plan_id: plan_id,
        region: region,
        credits: String(plan.credits),
      },
    });

    console.log('[Create Checkout] Session created successfully:', {
      session_id: session.session_id,
      has_checkout_url: !!session.checkout_url,
    });

    return res.status(200).json({
      success: true,
      checkout_url: session.checkout_url,
      session_id: session.session_id,
    });
  } catch (error: any) {
    console.error('[Create Checkout] Unexpected error:', error);
    Sentry.captureException(error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create checkout session',
    });
  }
}
