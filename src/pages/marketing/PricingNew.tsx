import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";

// Import Swiper styles
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const PricingNew = () => {
  const navigate = useNavigate();
  const [isMeter, setIsMeter] = useState(true);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  // Inch Pricing Data
  const inchPlans = [
    {
      name: "Enterprise",
      icon: "🏢",
      price: "₹8,000",
      description: "Maximum value",
      features: [
        "24,00,000 sq.inch",
        "0.33 paisa per sq.inch",
        "23 inch File ~1,04,348 inch",
        "11 inch File ~2,18,182 inch",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      icon: "👑",
      price: "₹4,000",
      description: "Larger operations",
      features: [
        "6,00,000 sq.inch",
        "0.67 paisa per sq.inch",
        "23 inch File ~26,087 inch",
        "11 inch File ~54,545 inch",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Advanced",
      icon: "🚀",
      price: "₹2,000",
      description: "Growing teams",
      features: [
        "2,00,000 sq.inch",
        "1 paisa per sq.inch",
        "23 inch File ~8,696 inch",
        "11 inch File ~18,182 inch",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Basic",
      icon: "💼",
      price: "₹1,000",
      description: "Small businesses",
      features: [
        "1,00,000 sq.inch",
        "1 paisa per sq.inch",
        "23 inch File ~4,348 inch",
        "11 inch File ~9,091 inch",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Lite",
      icon: "⭐",
      price: "₹500",
      description: "For starters",
      features: [
        "50,000 sq.inch",
        "1 paisa per sq.inch",
        "23 inch File ~2,174 inch",
        "11 inch File ~4,545 inch",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Free",
      icon: "🎨",
      price: "₹0",
      description: "Try it out",
      features: [
        "5000 sq.inch",
        "Free",
        "23 inch File ~217 inch",
        "11 inch File ~455 inch",
        "Access to other tools",
      ],
      cta: "Get Started",
      popular: false,
    },
  ];

  // Meter Pricing Data
  const meterPlans = [
    {
      name: "Enterprise",
      icon: "🏢",
      price: "₹8,000",
      description: "Maximum value",
      features: [
        "1,548.39 meter",
        "5.12 Rs. per meter",
        "23 inch File ~2,650 meter",
        "11 inch File ~5,540 meter",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Pro",
      icon: "👑",
      price: "₹4,000",
      description: "Larger operations",
      features: [
        "387.10 meter",
        "10.39 Rs. per meter",
        "23 inch File ~660 meter",
        "11 inch File ~1,385 meter",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Advanced",
      icon: "🚀",
      price: "₹2,000",
      description: "Growing teams",
      features: [
        "129.03 meter",
        "15.50 Rs. per meter",
        "23 inch File ~220 meter",
        "11 inch File ~460 meter",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Basic",
      icon: "💼",
      price: "₹1,000",
      description: "Small businesses",
      features: [
        "64.53 meter",
        "15.50 Rs. per meter",
        "23 inch File ~110 meter",
        "11 inch File ~230 meter",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Lite",
      icon: "⭐",
      price: "₹500",
      description: "For starters",
      features: [
        "32.26 meter",
        "15.50 Rs. per meter",
        "23 inch File ~55 meter",
        "11 inch File ~115 meter",
        "Access to other tools",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Free",
      icon: "🎨",
      price: "₹0",
      description: "Try it out",
      features: [
        "3.23 meter",
        "Free",
        "23 inch File ~5.5 meter",
        "11 inch File ~11.6 meter",
        "Access to other tools",
      ],
      cta: "Get Started",
      popular: false,
    },
  ];

  // Get current plans based on toggle
  const plans = isMeter ? meterPlans : inchPlans;

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

      {/* Pricing Carousel */}
      <section className="py-12 pb-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container max-w-7xl mx-auto px-6">
          {/* Inch/Meter Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => setIsMeter(false)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  !isMeter
                    ? "bg-white text-slate-900 shadow-lg"
                    : "text-white hover:text-white/80"
                }`}
              >
                Inch
              </button>
              <button
                onClick={() => setIsMeter(true)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isMeter
                    ? "bg-white text-slate-900 shadow-lg"
                    : "text-white hover:text-white/80"
                }`}
              >
                Meter
              </button>
            </div>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-6xl mx-auto">
            {/* Navigation Arrows */}
            <button
              onClick={() => swiperInstance?.slidePrev()}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 flex items-center justify-center text-white shadow-xl hover:scale-110"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => swiperInstance?.slideNext()}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-300 flex items-center justify-center text-white shadow-xl hover:scale-110"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            {/* Swiper Carousel */}
            <Swiper
              modules={[Navigation, Pagination, Keyboard]}
              spaceBetween={20}
              slidesPerView={1.15}
              centeredSlides={false}
              initialSlide={0}
              pagination={{
                clickable: true,
                el: '.custom-pagination',
                bulletClass: 'custom-bullet',
                bulletActiveClass: 'custom-bullet-active',
              }}
              keyboard={{
                enabled: true,
              }}
              onSwiper={setSwiperInstance}
              breakpoints={{
                640: {
                  slidesPerView: 1.15,
                  spaceBetween: 20,
                  centeredSlides: false,
                },
                1024: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                  centeredSlides: false,
                },
              }}
              className="!pb-16"
            >
              {plans.map((plan) => (
                <SwiperSlide key={plan.name}>
                  <div className="px-4 pb-8">
                    <div
                      className={`relative ${
                        plan.popular ? "md:scale-105" : ""
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
                          <span className="bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                            MOST POPULAR
                          </span>
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-50 rounded-full -z-10" />
                        </div>
                      )}

                      <Card
                        className={`relative h-full p-8 rounded-3xl shadow-2xl transform transition-all duration-300 overflow-hidden ${
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
                        {/* Plan Name */}
                        <div className="text-center mb-4">
                          <h3
                            className={`text-2xl font-bold ${
                              plan.popular ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {plan.name}
                          </h3>
                        </div>

                        {/* Pricing */}
                        <div className="text-center mb-3">
                          <div className="mb-2">
                            <span
                              className={`text-5xl md:text-6xl font-extrabold ${
                                plan.popular ? "text-white" : "text-slate-900"
                              }`}
                            >
                              {plan.price}
                            </span>
                          </div>
                        </div>

                        {/* Tagline */}
                        <div className="text-center mb-6">
                          <p
                            className={`text-sm ${
                              plan.popular ? "text-white/95" : "text-slate-600"
                            }`}
                          >
                            {plan.description}
                          </p>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 mb-8">
                          {plan.features.map((feature, idx) => {
                            const featureEmojis = ["📊", "💰", "✂️", "✂️", "🚀"];
                            return (
                              <li key={idx} className="flex items-start">
                                <span className="text-xl mr-3 flex-shrink-0">
                                  {featureEmojis[idx]}
                                </span>
                                <span
                                  className={`text-sm ${
                                    plan.popular ? "text-white/95" : "text-slate-600"
                                  }`}
                                >
                                  {feature}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        {/* CTA Button */}
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
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Pagination Dots */}
            <div className="custom-pagination flex justify-center gap-2 mt-8"></div>
          </div>

          <p className="text-center mt-12 text-white/80">
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

      {/* Custom Styles for Pagination */}
      <style>{`
        .custom-bullet {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .custom-bullet-active {
          background: white;
          width: 32px;
          border-radius: 6px;
        }

        .custom-bullet:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </MarketingLayout>
  );
};

export default PricingNew;
