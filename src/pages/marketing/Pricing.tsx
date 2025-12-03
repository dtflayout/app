import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import { Card } from "@/components/ui/card";
import { Check, Info, Loader2 } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { MobileTooltip } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useOutseta } from "@/contexts/OutsetaContext";
import {
  initiateRazorpayCheckout,
  verifyPaymentAndAddCredits,
  PricingPlan,
  UserInfo,
} from "@/services/paymentService";

// Define pricing data outside component to prevent recreation on every render
// Each plan includes id and priceValue for payment processing
const PLANS = [
    {
      id: "free_trial",
      price: "Rs. 0",
      priceValue: 0,
      credits: "5,000 sq.inch",
      creditsValue: 5000,
      rate: "0 paisa/sq.inch",
      gradient: "linear-gradient(to bottom, #f0f9ff 0%, #f0f9ff 20%, white 50%, white 100%)",  // lightest
      badge: "Free Trial",
      description: "Experience the platform for free before you commit.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>5,000 sq. inch</strong></Highlighter> in credit with this recharge.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "lite",
      price: "Rs. 1,000",
      priceValue: 1000,
      credits: "1 Lac sq.inch",
      creditsValue: 100000,
      rate: "1 paisa/sq.inch",
      gradient: "linear-gradient(to bottom, #e0f2fe 0%, #e0f2fe 20%, white 50%, white 100%)",
      badge: "Lite",
      description: "More savings with a balanced, budget-smart plan.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>1,00,000 sq. inch</strong></Highlighter> in credit with this recharge—<br />equivalent to a rate of <Highlighter action="underline" color="#10b981"><strong>1 paisa per sq. inch</strong></Highlighter>.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "pro",
      price: "Rs. 4,000",
      priceValue: 4000,
      credits: "5 Lac sq.inch",
      creditsValue: 500000,
      rate: "0.8 paisa/sq.inch",
      gradient: "linear-gradient(to bottom, #d6f0fd 0%, #d6f0fd 20%, white 50%, white 100%)",
      badge: "Pro",
      description: "Significantly cheaper per-inch pricing for heavy users.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>5,00,000 sq. inch</strong></Highlighter> in credit with this recharge—<br />equivalent to a rate of <Highlighter action="underline" color="#10b981"><strong>0.8 paisa per sq. inch</strong></Highlighter>.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "enterprise",
      price: "Rs. 8,000",
      priceValue: 8000,
      credits: "16 Lac sq.inch",
      creditsValue: 1600000,
      rate: "0.5 paisa/sq.inch",
      gradient: "linear-gradient(to bottom, #bae6fd 0%, #bae6fd 20%, white 50%, white 100%)",  // darkest
      badge: "Enterprise",
      description: "Our lowest per-inch rates — maximum savings unlocked.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>16,00,000 sq. inch</strong></Highlighter> in credit with this recharge—<br />equivalent to a rate of <Highlighter action="underline" color="#10b981"><strong>0.5 paisa per sq. inch</strong></Highlighter>.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: true,
    },
];

const Pricing3 = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useOutseta();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  // Handle plan purchase
  const handleGetStarted = async (plan: typeof PLANS[number]) => {
    // If user is not logged in, redirect to auth
    if (!user) {
      toast.info("Please sign in to purchase a plan");
      navigate("/auth");
      return;
    }

    // Prevent double-clicks
    if (processingPlanId) return;

    setProcessingPlanId(plan.id);

    try {
      // Prepare user info for Razorpay
      const userInfo: UserInfo = {
        name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email,
        email: user.Email,
        phone: user.PhoneNumber || undefined,
        outsetaAccountId: user.Account?.Uid,
      };

      // Convert plan to PricingPlan format for payment service
      const pricingPlan: PricingPlan = {
        id: plan.id,
        name: plan.badge,
        price: plan.priceValue,
        credits: plan.creditsValue,
        badge: plan.badge,
        description: plan.description,
        features: [], // Not needed for checkout
      };

      // Handle free trial differently
      if (plan.priceValue === 0) {
        // Add free trial credits via backend
        const verifyResult = await verifyPaymentAndAddCredits({
          razorpay_payment_id: `free_trial_${Date.now()}`,
          plan_id: plan.id,
          outseta_account_id: userInfo.outsetaAccountId || '',
          user_email: userInfo.email || '',
          amount: 0,
        });

        if (verifyResult.success) {
          toast.success(`Free trial activated! ${plan.credits} added to your account.`);
          await refreshUser();
          navigate("/app");
        } else {
          toast.error(verifyResult.error || "Failed to activate free trial");
        }
        return;
      }

      // Initiate Razorpay checkout for paid plans
      const result = await initiateRazorpayCheckout(pricingPlan, userInfo);

      if (result.success && result.paymentId) {
        console.log("[Payment] Razorpay success! Verifying payment...");

        // Verify payment and add credits via backend
        const verifyResult = await verifyPaymentAndAddCredits({
          razorpay_payment_id: result.paymentId,
          razorpay_order_id: result.orderId,
          plan_id: plan.id,
          outseta_account_id: userInfo.outsetaAccountId || '',
          user_email: userInfo.email || '',
          amount: plan.priceValue,
        });

        if (verifyResult.success) {
          toast.success(`Payment successful! ${verifyResult.credits_added?.toLocaleString()} sq.inch added to your account.`);
          await refreshUser();
          navigate("/app");
        } else {
          toast.error(verifyResult.error || "Payment verification failed. Please contact support.");
        }
      }
    } catch (error: any) {
      console.error("[Payment] Error:", error);
      if (error?.error !== 'Payment cancelled by user') {
        toast.error(error?.error || "Payment failed. Please try again.");
      }
    } finally {
      setProcessingPlanId(null);
    }
  };

  return (
    <MarketingLayout>
      {/* Pricing Section with Gradient Background */}
      <div
        className="min-h-screen"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ede9fe 50%, #fce7f3 100%)',
        }}
      >
        {/* Hero Section */}
        <section className="pt-12 md:pt-16 pb-8 md:pb-12">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="max-w-5xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-slate-900 leading-snug">
                No Fixed Cost<br />
                Just Recharge & Get Going!
              </h1>
              <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Pick a plan based on your needs — the higher you go, the less you pay per unit.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 pb-24">
        <div className="container max-w-[1500px] mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {PLANS.map((plan, index) => (
              <div
                key={plan.price}
                className="relative"
              >
                <Card
                  className={`relative h-full p-10 rounded-3xl shadow-2xl hover:-translate-y-2 transition-transform duration-300 ${
                    plan.popular
                      ? "border-0 border-teal-200"
                      : "bg-white border border-slate-100"
                  }`}
                >
                  {/* Border beam effect - First beam (GREEN) with staggered delay */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px]"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(16, 185, 129, 0) 230deg, rgba(16, 185, 129, 0.9) 260deg, rgba(52, 211, 153, 1) 280deg, rgba(16, 185, 129, 0.9) 300deg, rgba(16, 185, 129, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                        animation: 'border-beam 8s linear infinite',
                        animationDelay: `${index * 1.3}s`,
                        willChange: 'transform',
                        transform: 'translateZ(0)',
                      }}
                    />
                  </div>

                  {/* Border beam effect - Second beam (BLUE) with offset delay */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px]"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(59, 130, 246, 0) 230deg, rgba(59, 130, 246, 0.9) 260deg, rgba(37, 99, 235, 1) 280deg, rgba(59, 130, 246, 0.9) 300deg, rgba(59, 130, 246, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                        animation: 'border-beam 8s linear infinite',
                        animationDelay: `${index * 1.3 + 4}s`,
                        willChange: 'transform',
                        transform: 'translateZ(0)',
                      }}
                    />
                  </div>

                  {/* Background mask - covers the rotating gradient inside the card */}
                  <div
                    className="absolute inset-[2px] rounded-3xl z-0"
                    style={{ background: plan.gradient }}
                  />

                  {/* Card content - must be above the mask */}
                  <div className="relative z-10">
                    <div className="text-left mb-4">
                      <h3
                        className={`text-[2.5rem] font-[800] mb-1 ${
                          plan.popular ? "text-slate-900" : "text-slate-900"
                        }`}
                      >
                        {plan.price}
                      </h3>
                      <p
                        className={`font-semibold mb-2 ${
                          plan.popular ? "text-slate-600" : "text-slate-600"
                        }`}
                      >
                        {plan.description}
                      </p>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span
                          className={`text-[2.8rem] font-[800] ${
                            plan.popular ? "text-slate-900" : "text-slate-900"
                          }`}
                        >
                          {plan.credits}
                        </span>
                        <span className="text-gray-500 text-[1.75rem] font-[700]">
                          <Highlighter action="underline" color="#10b981">{plan.rate}</Highlighter>
                        </span>
                      </div>
                    </div>

                    {/* Divider between price and features */}
                    <div className="h-px mt-0 mb-6 bg-teal-200"></div>

                    <ul className="space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={`${plan.price}-feature-${idx}`} className="flex items-start">
                          <Check
                            className={`w-6 h-6 mr-3 flex-shrink-0 mt-0.5 ${
                              plan.popular ? "text-teal-600" : "text-emerald-600"
                            }`}
                          />
                          <span
                            className={`${
                              plan.popular ? "text-slate-700" : "text-slate-600"
                            }`}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <GradientButton
                      variant="hero"
                      className="w-full"
                      onClick={() => handleGetStarted(plan)}
                      disabled={processingPlanId !== null}
                    >
                      {processingPlanId === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        plan.cta
                      )}
                    </GradientButton>
                  </div>
                </Card>
              </div>
            ))}
          </div>

        </div>
      </section>
      </div>

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Everything you need to know about our pricing
              </p>
            </div>

            <div className="space-y-6">
              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Is there a free trial?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Yes! All plans come with a 14-day free trial. No credit card required to get started. You'll have full access to all features during your trial period.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Can I change plans later?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Absolutely. You can upgrade, downgrade, or cancel your plan at any time from your account settings. Changes take effect immediately, and we'll prorate any differences.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  What payment methods do you accept?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for Enterprise plans. All payments are processed securely.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-slate-100">
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Do you offer refunds?
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Yes, we offer a 30-day money-back guarantee. If you're not satisfied with our service, contact us within 30 days of purchase for a full refund, no questions asked.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Pricing3;
