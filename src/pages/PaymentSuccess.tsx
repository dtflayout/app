import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCredits } from "@/contexts/CreditsContext";
import { Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Payment Success Page
 *
 * User lands here after completing payment on Dodo's checkout page.
 * Dodo redirects to: /app/payment-success?payment_id=pay_xxx&status=succeeded
 *
 * Credits are added via webhook (server-to-server), not on this page.
 * This page just shows a success/pending message and polls for credit updates.
 */
const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshCredits } = useCredits();
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');

  const paymentId = searchParams.get('payment_id');
  const paymentStatus = searchParams.get('status');

  useEffect(() => {
    if (paymentStatus === 'failed') {
      setStatus('failed');
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const pollCredits = async () => {
      try {
        await refreshCredits();
        if (paymentStatus === 'succeeded') {
          setStatus('success');
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('pending');
      }
    };

    const interval = setInterval(async () => {
      attempts++;
      await pollCredits();
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (status === 'loading') setStatus('pending');
      }
    }, 2000);

    pollCredits().then(() => {
      if (paymentStatus === 'succeeded') setStatus('success');
      else setStatus('pending');
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.06) 0%, transparent 50%)",
        }}
      />

      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 text-center relative z-10">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-500">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)" }}>
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500 mb-2">
              Your credits have been added to your account.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <button
              onClick={() => navigate('/billing')}
              className="w-full text-white py-3 px-6 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              View Billing & Credits
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)" }}>
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Payment Received</h1>
            <p className="text-gray-500 mb-2">
              Your payment is being processed. Credits will be added to your account shortly.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              This usually takes less than a minute. If credits don't appear, please refresh your dashboard.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <button
              onClick={() => navigate('/billing')}
              className="w-full text-white py-3 px-6 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
            >
              View Billing & Credits
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FEF2F2, #FECACA)" }}>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-500 mb-2">
              Your payment could not be processed. No credits have been charged.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Please try again or use a different payment method. If the issue persists, contact support.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full text-white py-3 px-6 rounded-full font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
                style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/billing')}
                className="w-full bg-white text-gray-700 py-3 px-6 rounded-full font-semibold border-[1.5px] border-gray-200 hover:border-indigo-500 hover:text-indigo-600 transition-all duration-200"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
