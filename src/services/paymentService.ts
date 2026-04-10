/**
 * Payment Service for Dodo Payments Integration
 * Handles pricing plans, checkout session creation, and free trial claims.
 *
 * Flow for paid plans:
 *   1. Frontend calls /api/create-checkout with plan_id, region, user info
 *   2. Server creates a Dodo Checkout Session and returns checkout_url
 *   3. Frontend redirects user to checkout_url (Dodo's hosted page)
 *   4. User pays on Dodo's page
 *   5. Dodo sends webhook to /api/dodo-webhook → credits are added
 *   6. User is redirected back to /app/payment-success
 *
 * Flow for free trial:
 *   1. Frontend calls /api/claim-free-trial directly
 *   2. Server checks eligibility, adds 20K credits, returns success
 */

// ── Pricing Plans ─────────────────────────────────────────────────────────

export interface PricingPlan {
  id: string;
  name: string;
  credits: number;
  price: {
    india: number;     // INR
    global: number;    // USD
  };
  badge?: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    credits: 20000,
    price: { india: 0, global: 0 },
    badge: 'Free',
    description: 'Try our service with complimentary credits.',
    features: [
      '20,000 sq.inch credits',
      'Full access to all features',
      'No credit card required',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    credits: 150000,
    price: { india: 1999, global: 49 },
    badge: 'Starter',
    description: 'Perfect for small businesses getting started.',
    features: [
      '1,50,000 sq.inch credits',
      'Full access to all tools',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    credits: 500000,
    price: { india: 5999, global: 149 },
    badge: 'Popular',
    description: 'Best value for growing businesses.',
    features: [
      '5,00,000 sq.inch credits',
      'Full access to all tools',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    credits: 2000000,
    price: { india: 11999, global: 299 },
    badge: 'Best Value',
    description: 'Maximum savings for high-volume users.',
    features: [
      '20,00,000 sq.inch credits',
      'Full access to all tools',
      'Dedicated support',
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────

export interface UserInfo {
  name?: string;
  email?: string;
  userId?: string;
}

export interface CheckoutResult {
  success: boolean;
  checkout_url?: string;
  error?: string;
}

export interface FreeTrialResult {
  success: boolean;
  credits_added?: number;
  new_balance?: number;
  error?: string;
  already_claimed?: boolean;
}

// ── Checkout Session (paid plans) ─────────────────────────────────────────

/**
 * Create a Dodo Checkout Session and return the checkout URL.
 * The caller should redirect the user to checkout_url.
 */
export const createCheckoutSession = async (
  planId: string,
  region: 'india' | 'global',
  userInfo: UserInfo,
  accessToken?: string
): Promise<CheckoutResult> => {
  try {
    console.log('[Payment] Creating checkout session:', { planId, region });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan_id: planId,
        region: region,
        user_name: userInfo.name || '',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    console.log('[Payment] Checkout session created, redirecting...');
    return {
      success: true,
      checkout_url: data.checkout_url,
    };
  } catch (error: any) {
    console.error('[Payment] Checkout error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate payment',
    };
  }
};

// ── Free Trial ────────────────────────────────────────────────────────────

/**
 * Claim free trial credits directly (no Dodo checkout needed).
 * Sends the user's JWT for server-side validation (Issue #1 fix).
 */
export const claimFreeTrial = async (
  userInfo: UserInfo,
  accessToken?: string
): Promise<FreeTrialResult> => {
  try {
    console.log('[Payment] Claiming free trial...');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/claim-free-trial', {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to claim free trial',
        already_claimed: data.already_claimed || false,
      };
    }

    return {
      success: true,
      credits_added: data.credits_added,
      new_balance: data.new_balance,
    };
  } catch (error: any) {
    console.error('[Payment] Free trial error:', error);
    return {
      success: false,
      error: error.message || 'Failed to claim free trial',
    };
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────

export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find((plan) => plan.id === planId);
};

export const formatPrice = (price: number, currency: 'INR' | 'USD' = 'INR'): string => {
  if (price === 0) return 'Free';
  if (currency === 'USD') return `$${price.toLocaleString('en-US')}`;
  return `₹${price.toLocaleString('en-IN')}`;
};

export const formatCredits = (credits: number): string => {
  if (credits >= 100000) {
    const lakhs = credits / 100000;
    return `${lakhs} Lac sq.inch`;
  }
  return `${credits.toLocaleString('en-IN')} sq.inch`;
};
