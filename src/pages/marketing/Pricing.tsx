import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      price: "$19",
      period: "/month",
      description: "Perfect for small businesses and freelancers",
      features: [
        "50 collages per month",
        "Up to 100 images per collage",
        "Standard export formats (PNG, PDF)",
        "Email support",
        "Basic templates",
        "Cloud storage (5GB)",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Ideal for busy print shops",
      features: [
        "Unlimited collages",
        "Up to 500 images per collage",
        "All export formats (PNG, PDF, SVG)",
        "Priority support (24/7)",
        "Advanced templates library",
        "Batch processing",
        "Team collaboration (5 users)",
        "Cloud storage (50GB)",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large production facilities",
      features: [
        "Unlimited everything",
        "Unlimited images per collage",
        "White-label options",
        "Dedicated account manager",
        "Custom integrations",
        "Full API access",
        "Unlimited team members",
        "Custom training & onboarding",
        "Cloud storage (unlimited)",
        "SLA guarantee",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="py-24 md:py-32 bg-white">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-slate-900 leading-tight">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Choose the plan that fits your business. Start with a 14-day free trial, no credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 pb-24 bg-white">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative ${
                  plan.popular ? "md:scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                      Most Popular
                    </span>
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-50 rounded-full -z-10" />
                  </div>
                )}

                <Card
                  className={`relative h-full p-10 rounded-3xl shadow-2xl hover:-translate-y-2 transform transition-all duration-300 overflow-hidden ${
                    plan.popular
                      ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 text-white border-0"
                      : "bg-white border border-slate-100"
                  }`}
                  style={
                    plan.popular
                      ? {
                          backgroundImage: `
                            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom right, #3b82f6, #06b6d4, #10b981)
                          `,
                          backgroundSize: '20px 20px, 100% 100%',
                        }
                      : undefined
                  }
                >
                  <div className="text-center mb-8">
                    <h3
                      className={`text-2xl font-bold mb-2 ${
                        plan.popular ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="mb-4">
                      <span
                        className={`text-5xl md:text-6xl font-extrabold ${
                          plan.popular ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className={`text-lg ${
                            plan.popular ? "text-white/90" : "text-slate-600"
                          }`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p
                      className={`${
                        plan.popular ? "text-white/95" : "text-slate-600"
                      }`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check
                          className={`w-6 h-6 mr-3 flex-shrink-0 mt-0.5 ${
                            plan.popular ? "text-white" : "text-emerald-600"
                          }`}
                        />
                        <span
                          className={`${
                            plan.popular ? "text-white/95" : "text-slate-600"
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.popular ? (
                    <GradientButton
                      variant="white"
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      {plan.cta}
                    </GradientButton>
                  ) : (
                    <GradientButton
                      variant="hero"
                      className="w-full"
                      onClick={() => navigate("/auth")}
                    >
                      {plan.cta}
                    </GradientButton>
                  )}
                </Card>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-slate-600">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

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

export default Pricing;
