import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCredits } from "@/contexts/CreditsContext";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

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
    // If Dodo explicitly says failed, show error immediately
    if (paymentStatus === 'failed') {
      setStatus('failed');
      return;
    }

    // Start polling for credit update
    let attempts = 0;
    const maxAttempts = 10;

    const pollCredits = async () => {
      try {
        await refreshCredits();
        // If we reach here, credits refreshed — webhook likely processed
        if (paymentStatus === 'succeeded') {
          setStatus('success');
        } else {
          setStatus('pending');
        }
      } catch {
        setStatus('pending');
      }
    };

    // Poll every 2 seconds for up to 20 seconds
    // The webhook may take a few seconds to process
    const interval = setInterval(async () => {
      attempts++;
      await pollCredits();
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (status === 'loading') setStatus('pending');
      }
    }, 2000);

    // Initial check
    pollCredits().then(() => {
      if (paymentStatus === 'succeeded') setStatus('success');
      else setStatus('pending');
    });

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h1>
            <p className="text-gray-600">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-2">
              Your credits have been added to your account.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <button
              onClick={() => navigate('/app')}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'pending' && (
          <>
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received</h1>
            <p className="text-gray-600 mb-2">
              Your payment is being processed. Credits will be added to your account shortly.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This usually takes less than a minute. If credits don't appear, please refresh your dashboard.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <button
              onClick={() => navigate('/app')}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-2">
              Your payment could not be processed. No credits have been charged.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please try again or use a different payment method. If the issue persists, contact support.
            </p>
            {paymentId && (
              <p className="text-xs text-gray-400 mb-6">Payment ID: {paymentId}</p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/app')}
                className="w-full bg-white text-gray-700 py-3 px-6 rounded-xl font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default PaymentSuccess;
