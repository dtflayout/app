import type { VercelRequest, VercelResponse } from '@vercel/node';

// Plan prices for validation (in INR)
const PLAN_PRICES: Record<string, number> = {
  free_trial: 0,
  lite: 1000,
  pro: 4000,
  enterprise: 8000,
};

interface CreateOrderRequest {
  plan_id: string;
  user_email: string;
  outseta_account_id: string;
}

interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { plan_id, user_email, outseta_account_id } = req.body as CreateOrderRequest;

    console.log('[Create Order] Request received:', { plan_id, user_email, outseta_account_id });

    // Validate required fields
    if (!plan_id || !user_email || !outseta_account_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Validate plan exists and is not free trial
    const price = PLAN_PRICES[plan_id];
    if (price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan ID',
      });
    }

    if (price === 0) {
      return res.status(400).json({
        success: false,
        error: 'Free trial does not require payment',
      });
    }

    // Get Razorpay credentials
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('[Create Order] Missing Razorpay credentials');
      return res.status(500).json({
        success: false,
        error: 'Payment system not configured',
      });
    }

    // Create Razorpay order
    const orderData = {
      amount: price * 100, // Convert to paise
      currency: 'INR',
      receipt: `order_${outseta_account_id}_${Date.now()}`,
      notes: {
        plan_id,
        user_email,
        outseta_account_id,
      },
    };

    console.log('[Create Order] Creating Razorpay order:', orderData);

    const auth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Create Order] Razorpay API error:', errorData);
      return res.status(500).json({
        success: false,
        error: 'Failed to create payment order',
      });
    }

    const order: RazorpayOrder = await response.json();

    console.log('[Create Order] Order created successfully:', {
      order_id: order.id,
      amount: order.amount,
      status: order.status,
    });

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('[Create Order] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
