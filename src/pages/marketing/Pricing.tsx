import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import { Card } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import {
  createCheckoutSession,
  claimFreeTrial,
  UserInfo,
} from "@/services/paymentService";

// Detect if user is in India based on timezone
const detectRegion = (): 'india' | 'global' => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'india';
  } catch {}
  return 'global';
};

// Define pricing data outside component to prevent recreation on every render
const PLANS = [
    {
      id: "free_trial",
      price: { india: "₹0", global: "$0" },
      credits: "20,000 sq.inch",
      creditsValue: 20000,
      rate: "Free",
      gradient: "linear-gradient(to bottom, #f0f9ff 0%, #f0f9ff 20%, white 50%, white 100%)",
      badge: "Free Trial",
      description: "Experience the platform for free before you commit.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>20,000 sq. inch</strong></Highlighter> in credit with this recharge.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "starter",
      price: { india: "₹1,999", global: "$49" },
      credits: "1.5 Lac sq.inch",
      creditsValue: 150000,
      rate: { india: "1.33 paisa/sq.inch", global: "$0.00033/sq.inch" },
      gradient: "linear-gradient(to bottom, #e0f2fe 0%, #e0f2fe 20%, white 50%, white 100%)",
      badge: "Starter",
      description: "More savings with a balanced, budget-smart plan.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>1,50,000 sq. inch</strong></Highlighter> in credit with this recharge.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "growth",
      price: { india: "₹5,999", global: "$149" },
      credits: "5 Lac sq.inch",
      creditsValue: 500000,
      rate: { india: "1.2 paisa/sq.inch", global: "$0.0003/sq.inch" },
      gradient: "linear-gradient(to bottom, #d6f0fd 0%, #d6f0fd 20%, white 50%, white 100%)",
      badge: "Growth",
      description: "Significantly cheaper per-inch pricing for heavy users.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>5,00,000 sq. inch</strong></Highlighter> in credit with this recharge.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      id: "max",
      price: { india: "₹11,999", global: "$299" },
      credits: "20 Lac sq.inch",
      creditsValue: 2000000,
      rate: { india: "0.6 paisa/sq.inch", global: "$0.00015/sq.inch" },
      gradient: "linear-gradient(to bottom, #bae6fd 0%, #bae6fd 20%, white 50%, white 100%)",
      badge: "Max",
      description: "Our lowest per-inch rates — maximum savings unlocked.",
      features: [
        <>Get <Highlighter action="highlight" color="#FEF08A"><strong>20,00,000 sq. inch</strong></Highlighter> in credit with this recharge.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Image Enhancer & Trimmer and many other tools included.",
      ],
      cta: "Get Started",
      popular: true,
    },
];

const Pricing3 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshCredits, freeTrialClaimed } = useCredits();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const region = detectRegion();

  // Handle plan purchase
  const handleGetStarted = async (plan: typeof PLANS[number]) => {
    // If user is not logged in, redirect to signup
    if (!user) {
      toast.info("Please sign up to get started");
      navigate("/signup");
      return;
    }

    // Prevent double-clicks
    if (processingPlanId) return;

    setProcessingPlanId(plan.id);

    try {
      const userInfo: UserInfo = {
        name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
        email: user?.email || '',
        userId: user?.id,
      };

      // Handle free trial — direct server call, no Dodo checkout
      if (plan.id === 'free_trial') {
        if (freeTrialClaimed) {
          toast.error("You have already claimed your free trial");
          setProcessingPlanId(null);
          return;
        }

        const result = await claimFreeTrial(userInfo);

        if (result.success) {
          toast.success(`Free trial activated! ${plan.credits} added to your account.`);
          await refreshCredits();
          navigate("/app");
        } else if (result.already_claimed) {
          toast.error("You have already claimed your free trial");
        } else {
          toast.error(result.error || "Failed to activate free trial");
        }
        return;
      }

      // Paid plans — create Dodo Checkout Session and redirect
      const result = await createCheckoutSession(plan.id, region, userInfo);

      if (result.success && result.checkout_url) {
        // Redirect to Dodo's hosted checkout page
        window.location.href = result.checkout_url;
        // Don't reset processingPlanId — user is leaving the page
        return;
      } else {
        toast.error(result.error || "Failed to initiate payment. Please try again.");
      }
    } catch (error: any) {
      console.error("[Payment] Error:", error);
      toast.error(error?.message || "Payment failed. Please try again.");
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
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-gray-900 leading-snug">
                No Fixed Cost<br />
                Just Recharge & Get Going!
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
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
                key={plan.id}
                className="relative"
              >
                <Card
                  className={`relative h-full p-10 rounded-3xl shadow-2xl hover:-translate-y-2 transition-transform duration-300 ${
                    plan.popular
                      ? "border-0 border-teal-200"
                      : "bg-white border border-gray-100"
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
                          plan.popular ? "text-gray-900" : "text-gray-900"
                        }`}
                      >
                        {typeof plan.price === 'object' ? plan.price[region] : plan.price}
                      </h3>
                      <p
                        className={`font-semibold mb-2 ${
                          plan.popular ? "text-gray-600" : "text-gray-600"
                        }`}
                      >
                        {plan.description}
                      </p>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span
                          className={`text-[2.8rem] font-[800] ${
                            plan.popular ? "text-gray-900" : "text-gray-900"
                          }`}
                        >
                          {plan.credits}
                        </span>
                        <span className="text-gray-500 text-[1.75rem] font-[700]">
                          <Highlighter action="underline" color="#4F46E5">{typeof plan.rate === 'object' ? plan.rate[region] : plan.rate}</Highlighter>
                        </span>
                      </div>
                    </div>

                    {/* Divider between price and features */}
                    <div className="h-px mt-0 mb-6 bg-indigo-200"></div>

                    <ul className="space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={`${plan.id}-feature-${idx}`} className="flex items-start">
                          <Check
                            className={`w-6 h-6 mr-3 flex-shrink-0 mt-0.5 ${
                              plan.popular ? "text-indigo-600" : "text-indigo-600"
                            }`}
                          />
                          <span
                            className={`${
                              plan.popular ? "text-gray-700" : "text-gray-600"
                            }`}
                          >
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <GradientButton
                      variant="hero"
                      className={`w-full ${plan.id === 'free_trial' && user && freeTrialClaimed ? 'opacity-60 cursor-not-allowed' : ''}`}
                      onClick={() => handleGetStarted(plan)}
                      disabled={processingPlanId !== null || (plan.id === 'free_trial' && user && freeTrialClaimed)}
                    >
                      {processingPlanId === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </span>
                      ) : plan.id === 'free_trial' && user && freeTrialClaimed ? (
                        'Already Claimed'
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
      <section className="py-24 bg-gray-50">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Everything you need to know about our pricing
              </p>
            </div>

            <div className="space-y-6">
              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Is there a free trial?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Yes! All plans come with a 14-day free trial. No credit card required to get started. You'll have full access to all features during your trial period.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Can I change plans later?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Absolutely. You can upgrade, downgrade, or cancel your plan at any time from your account settings. Changes take effect immediately, and we'll prorate any differences.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for Enterprise plans. All payments are processed securely.
                </p>
              </Card>

              <Card className="p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Do you offer refunds?
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Yes, we offer a 30-day money-back guarantee. If you're not satisfied with our service, contact us within 30 days of purchase for a full refund, no questions asked.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Full-screen overlay when processing payment */}
      {processingPlanId && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">Processing payment...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait, do not close this page</p>
            </div>
          </div>
        </div>
      )}
    </MarketingLayout>
  );
};

export default Pricing3;
