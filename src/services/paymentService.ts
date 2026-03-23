/**
 * Payment Service for Razorpay Integration
 * Handles pricing plans and checkout flow
 */

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number; // in paise (₹1 = 100 paise)
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: string, handler: (response: RazorpayErrorResponse) => void) => void;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayErrorResponse {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id?: string;
    payment_id?: string;
  };
}

// Pricing Plans Configuration
export interface PricingPlan {
  id: string;
  name: string;
  price: number; // in INR
  credits: number; // sq.inch credits
  badge?: string;
  description: string;
  features: string[];
  popular?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    price: 0,
    credits: 10000,
    badge: 'Free',
    description: 'Try our service with complimentary credits.',
    features: [
      '10,000 sq.inch credits',
      'Full access to all features',
      'No credit card required',
    ],
  },
  {
    id: 'lite',
    name: 'Lite',
    price: 1000,
    credits: 100000,
    badge: 'Starter',
    description: 'Perfect for small businesses getting started.',
    features: [
      '1,00,000 sq.inch credits',
      '1 paisa per sq.inch',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 4000,
    credits: 500000,
    badge: 'Popular',
    description: 'Best value for growing businesses.',
    features: [
      '5,00,000 sq.inch credits',
      '0.8 paisa per sq.inch',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 8000,
    credits: 1600000,
    badge: 'Best Value',
    description: 'Maximum savings for high-volume users.',
    features: [
      '16,00,000 sq.inch credits',
      '0.5 paisa per sq.inch',
      'Dedicated support',
    ],
  },
];

// Get Razorpay key from environment
const getRazorpayKey = (): string => {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    console.error('VITE_RAZORPAY_KEY_ID is not set in environment variables');
    throw new Error('Payment configuration error. Please contact support.');
  }
  return key;
};

// User info for prefilling checkout
export interface UserInfo {
  name?: string;
  email?: string;
  phone?: string;
  userId?: string;
}

// Payment result
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  signature?: string;
  error?: string;
}

// Create order response
interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

/**
 * Create a Razorpay order via backend API
 */
const createRazorpayOrder = async (
  planId: string,
  userEmail: string,
  userId: string
): Promise<CreateOrderResponse> => {
  try {
    console.log('[Payment] Creating Razorpay order...', { planId, userEmail, userId });

    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        user_email: userEmail,
        user_id: userId,
      }),
    });

    const data = await response.json();
    console.log('[Payment] Create order response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create order');
    }

    return data;
  } catch (error: any) {
    console.error('[Payment] Create order error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment order',
    };
  }
}

/**
 * Initiate Razorpay checkout for a pricing plan
 * @param plan - The pricing plan to purchase
 * @param userInfo - User information for prefilling
 * @returns Promise that resolves with payment details on success
 */
export const initiateRazorpayCheckout = async (
  plan: PricingPlan,
  userInfo: UserInfo
): Promise<PaymentResult> => {
  // Validate Razorpay is loaded
  if (!window.Razorpay) {
    return {
      success: false,
      error: 'Payment system not loaded. Please refresh the page.',
    };
  }

  // Free trial doesn't need payment
  if (plan.price === 0) {
    return {
      success: true,
      paymentId: 'free_trial',
    };
  }

  // Step 1: Create order via backend API
  const orderResult = await createRazorpayOrder(
    plan.id,
    userInfo.email || '',
    userInfo.userId || ''
  );

  if (!orderResult.success || !orderResult.order_id) {
    return {
      success: false,
      error: orderResult.error || 'Failed to create payment order',
    };
  }

  console.log('[Payment] Order created:', orderResult.order_id);

  // Step 2: Open Razorpay checkout with order_id
  return new Promise((resolve, reject) => {
    try {
      const options: RazorpayOptions = {
        key: getRazorpayKey(),
        amount: orderResult.amount || plan.price * 100,
        currency: orderResult.currency || 'INR',
        name: 'Data Canvas Tech',
        description: `${plan.name} Plan - ${plan.credits.toLocaleString('en-IN')} sq.inch credits`,
        order_id: orderResult.order_id, // Important: Pass the order_id
        prefill: {
          name: userInfo.name || '',
          email: userInfo.email || '',
          contact: userInfo.phone || '',
        },
        notes: {
          plan_id: plan.id,
          plan_name: plan.name,
          credits: plan.credits.toString(),
          user_id: userInfo.userId || '',
        },
        theme: {
          color: '#4F46E5', // Emerald green to match our UI
        },
        handler: (response: RazorpaySuccessResponse) => {
          console.log('[Payment] Razorpay success callback:', {
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            console.log('[Payment] Modal dismissed');
            reject({
              success: false,
              error: 'Payment cancelled by user',
            });
          },
          escape: true,
          backdropclose: false,
        },
      };

      console.log('[Payment] Opening Razorpay checkout with options:', {
        key: options.key ? '***' : 'MISSING',
        amount: options.amount,
        order_id: options.order_id,
      });

      const razorpay = new window.Razorpay(options);

      // Handle payment failure
      razorpay.on('payment.failed', (response: RazorpayErrorResponse) => {
        console.error('[Payment] Failed:', response);
        reject({
          success: false,
          error: response.description || 'Payment failed. Please try again.',
        });
      });

      razorpay.open();
    } catch (error) {
      console.error('[Payment] Error initiating checkout:', error);
      reject({
        success: false,
        error: 'Failed to initiate payment. Please try again.',
      });
    }
  });
};

/**
 * Get a plan by its ID
 */
export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find((plan) => plan.id === planId);
};

/**
 * Format price for display
 */
export const formatPrice = (price: number): string => {
  if (price === 0) return 'Free';
  return `₹${price.toLocaleString('en-IN')}`;
};

/**
 * Format credits for display
 */
export const formatCredits = (credits: number): string => {
  if (credits >= 100000) {
    const lakhs = credits / 100000;
    return `${lakhs} Lac sq.inch`;
  }
  return `${credits.toLocaleString('en-IN')} sq.inch`;
};

/**
 * Verify payment and add credits via backend API
 */
export interface VerifyPaymentParams {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  plan_id: string;
  user_id: string;
  user_email: string;
  amount: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  credits_added?: number;
  new_balance?: number;
  error?: string;
}

export const verifyPaymentAndAddCredits = async (
  params: VerifyPaymentParams
): Promise<VerifyPaymentResponse> => {
  try {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Payment verification failed');
    }

    return data;
  } catch (error: any) {
    console.error('[Verify Payment] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to verify payment',
    };
  }
};
