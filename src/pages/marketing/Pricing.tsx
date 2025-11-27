import { useNavigate } from "react-router-dom";
import { useState } from "react";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";

// Define pricing data outside component to prevent recreation on every render
const INCH_PLANS = [
    {
      name: "Free",
      price: "Rs. 0",
      period: "",
      description: "Experience the platform for free before you commit.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>5,000 sq. inch</strong></Highlighter> of total printing capacity included in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">0 paisa per sq. inch</Highlighter></strong> — completely free to get started.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">217 inches</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">455 inches</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Lite",
      price: "Rs. 500",
      period: "",
      description: "Better value at a starter-friendly price.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>50,000 sq. inch</strong></Highlighter> of total printing capacity unlocked with this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">1 paisa per sq. inch</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">2,175 inches</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">4,545 inches</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Basic",
      price: "Rs. 1,000",
      period: "",
      description: "More savings with a balanced, budget-smart plan.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>1,00,000 sq. inch</strong></Highlighter> of total printing capacity available in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">1 paisa per sq. inch</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">4,348 inches</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">9,091 inches</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Advanced",
      price: "Rs. 2,000",
      period: "",
      description: "Unlock even better rates for regular users.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>2,00,000 sq. inch</strong></Highlighter> of total printing capacity unlocked with this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">1 paisa per sq. inch</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">8,696 inches</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">18,182 inches</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "Rs. 4,000",
      period: "",
      description: "Significantly cheaper per-inch pricing for heavy users.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>6,00,000 sq. inch</strong></Highlighter> of total printing capacity included in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">0.67 paisa per sq. inch</Highlighter></strong> — optimized pricing for scaling operations.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">26,087 inches</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">54,545 inches</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Enterprise",
      price: "Rs. 8,000",
      period: "",
      description: "Our lowest per-inch rates — maximum savings unlocked.",
      features: [
        <><span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span><strong>24,00,000 sq. inch</strong></span> of total printing capacity unlocked with this plan.</>,
        <><span className="relative inline-block"><span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/70 -skew-y-1"></span><strong>0.33 paisa per sq. inch</strong></span> — our most cost-efficient rate for heavy usage.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span>1,04,348 inches</span> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span>2,18,182 inches</span> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: true,
    },
] as const;

const METER_PLANS = [
    {
      name: "Free",
      price: "Rs. 0",
      period: "",
      description: "Experience the platform for free before you commit.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>3.23 meter</strong></Highlighter> of total printing capacity included in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">0 paisa per meter</Highlighter></strong> — completely free to get started.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">5.5 meter</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">11.6 meter</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Lite",
      price: "Rs. 500",
      period: "",
      description: "Better value at a starter-friendly price.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>32.26 meter</strong></Highlighter> of total printing capacity unlocked with this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">15.50 Rs. per meter</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">55 meter</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">115 meter</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Basic",
      price: "Rs. 1,000",
      period: "",
      description: "More savings with a balanced, budget-smart plan.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>64.53 meter</strong></Highlighter> of total printing capacity available in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">15.50 Rs. per meter</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">110 meter</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">230 meter</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Advanced",
      price: "Rs. 2,000",
      period: "",
      description: "Unlock even better rates for regular users.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>129.03 meter</strong></Highlighter> of total printing capacity unlocked with this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">15.50 Rs. per meter</Highlighter></strong> — simple and budget-friendly usage pricing.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">220 meter</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">460 meter</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Pro",
      price: "Rs. 4,000",
      period: "",
      description: "Significantly cheaper per-inch pricing for heavy users.",
      features: [
        <><Highlighter action="highlight" color="#FEF08A"><strong>387.10 meter</strong></Highlighter> of total printing capacity included in this plan.</>,
        <><strong><Highlighter action="underline" color="#10b981">10.39 Rs. per meter</Highlighter></strong> — optimized pricing for scaling operations.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">660 meter</Highlighter> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <Highlighter action="highlight" color="#FEF08A">1,385 meter</Highlighter> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Enterprise",
      price: "Rs. 8,000",
      period: "",
      description: "Our lowest per-meter rates — maximum savings unlocked.",
      features: [
        <><span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span><strong>1,548.39 meter</strong></span> of total printing capacity unlocked with this plan.</>,
        <><span className="relative inline-block"><span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/70 -skew-y-1"></span><strong>5.12 Rs. per meter</strong></span> — our most cost-efficient rate for heavy usage.</>,
        <>If your print file is <strong>23 inches</strong> wide, you can print approx. <span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span>2,650 meter</span> in length with this plan.</>,
        <>If your print file is <strong>11 inches</strong> wide, you can print approx. <span className="relative inline-block"><span className="absolute inset-0 bg-black/70 -skew-y-1 rounded-sm -z-10 -mx-1"></span>5,540 meter</span> in length with this plan.</>,
        "Easy to use drag & drop editor",
        "Full access to all tools — Background Remover, Color Enhancer & Image Resizer included.",
      ],
      cta: "Get Started",
      popular: true,
    },
] as const;

const Pricing3 = () => {
  const navigate = useNavigate();
  const [selectedUnit, setSelectedUnit] = useState<"Inch" | "Meter">("Inch");

  // Simply select which dataset to display - no mutations
  const plans = selectedUnit === "Inch" ? INCH_PLANS : METER_PLANS;

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

        {/* Unit Toggle */}
        <section className="py-8">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="flex justify-center">
              <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-md">
                <button
                  onClick={() => setSelectedUnit("Inch")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                    selectedUnit === "Inch"
                      ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg"
                      : "bg-transparent text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span className="text-lg">📊</span>
                  <span>Inch</span>
                </button>
                <button
                  onClick={() => setSelectedUnit("Meter")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all duration-300 ${
                    selectedUnit === "Meter"
                      ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg"
                      : "bg-transparent text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <span className="text-lg">📏</span>
                  <span>Meter</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 pb-24" key={selectedUnit}>
        <div className="container max-w-[1500px] mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={`${selectedUnit}-${plan.name}`}
                className="relative"
              >
                <Card
                  className={`relative h-full p-10 rounded-3xl shadow-2xl hover:-translate-y-2 transition-transform duration-300 overflow-hidden ${
                    plan.popular
                      ? "text-white border-0"
                      : "bg-white border border-slate-100"
                  }`}
                >
                  {/* Border beam effect - First beam (GREEN/WHITE) with staggered delay */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px]"
                      style={{
                        background: plan.popular
                          ? 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(255, 255, 255, 0) 230deg, rgba(255, 255, 255, 0.9) 260deg, rgba(255, 255, 255, 1) 280deg, rgba(255, 255, 255, 0.9) 300deg, rgba(255, 255, 255, 0) 330deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(16, 185, 129, 0) 230deg, rgba(16, 185, 129, 0.9) 260deg, rgba(52, 211, 153, 1) 280deg, rgba(16, 185, 129, 0.9) 300deg, rgba(16, 185, 129, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                        animation: 'border-beam 8s linear infinite',
                        animationDelay: `${index * 1.3}s`,
                        willChange: 'transform',
                        transform: 'translateZ(0)',
                      }}
                    />
                  </div>

                  {/* Border beam effect - Second beam (BLUE/CYAN) with offset delay */}
                  <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px]"
                      style={{
                        background: plan.popular
                          ? 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(6, 182, 212, 0) 230deg, rgba(6, 182, 212, 0.7) 260deg, rgba(236, 254, 255, 1) 280deg, rgba(6, 182, 212, 0.7) 300deg, rgba(6, 182, 212, 0) 330deg, transparent 360deg)'
                          : 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(59, 130, 246, 0) 230deg, rgba(59, 130, 246, 0.9) 260deg, rgba(37, 99, 235, 1) 280deg, rgba(59, 130, 246, 0.9) 300deg, rgba(59, 130, 246, 0) 330deg, transparent 360deg)',
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
                    style={
                      plan.popular
                        ? {
                            backgroundImage: `
                              radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                              linear-gradient(to bottom right, #3b82f6, #06b6d4, #10b981)
                            `,
                            backgroundSize: '20px 20px, 100% 100%',
                          }
                        : { backgroundColor: 'white' }
                    }
                  />

                  {/* Card content - must be above the mask */}
                  <div className="relative z-10">
                    <div className="text-left mb-4">
                      <h3
                        className={`text-[3rem] font-extrabold mb-2 ${
                          plan.popular ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {plan.name}
                      </h3>
                      <p
                        className={`font-semibold ${
                          plan.popular ? "text-white/95" : "text-slate-600"
                        }`}
                      >
                        {plan.description}
                      </p>
                      <div className="mb-1">
                        <span
                          className={`text-[2.75rem] font-bold ${
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
                    </div>

                    {/* Divider between price and features */}
                    <div className={`h-px mt-0 mb-6 ${plan.popular ? "bg-white/30" : "bg-gray-200"}`}></div>

                    <ul className="space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={`${selectedUnit}-${plan.name}-feature-${idx}`} className="flex items-start">
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
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <p className="text-center mt-12 text-slate-600">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
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
