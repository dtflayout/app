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
    credits: 5000,
    badge: 'Free',
    description: 'Try our service with complimentary credits.',
    features: [
      '5,000 sq.inch credits',
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
  outsetaAccountId?: string;
}

// Payment result
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  error?: string;
}

/**
 * Initiate Razorpay checkout for a pricing plan
 * @param plan - The pricing plan to purchase
 * @param userInfo - User information for prefilling
 * @returns Promise that resolves with payment details on success
 */
export const initiateRazorpayCheckout = (
  plan: PricingPlan,
  userInfo: UserInfo
): Promise<PaymentResult> => {
  return new Promise((resolve, reject) => {
    // Validate Razorpay is loaded
    if (!window.Razorpay) {
      reject({
        success: false,
        error: 'Payment system not loaded. Please refresh the page.',
      });
      return;
    }

    // Free trial doesn't need payment
    if (plan.price === 0) {
      resolve({
        success: true,
        paymentId: 'free_trial',
      });
      return;
    }

    try {
      const options: RazorpayOptions = {
        key: getRazorpayKey(),
        amount: plan.price * 100, // Convert to paise
        currency: 'INR',
        name: 'Data Canvas Tech',
        description: `${plan.name} Plan - ${plan.credits.toLocaleString()} sq.inch credits`,
        prefill: {
          name: userInfo.name || '',
          email: userInfo.email || '',
          contact: userInfo.phone || '',
        },
        notes: {
          plan_id: plan.id,
          plan_name: plan.name,
          credits: plan.credits.toString(),
          outseta_account_id: userInfo.outsetaAccountId || '',
        },
        theme: {
          color: '#10b981', // Emerald green to match our UI
        },
        handler: (response: RazorpaySuccessResponse) => {
          console.log('[Payment] Success:', response);
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
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
  outseta_account_id: string;
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
