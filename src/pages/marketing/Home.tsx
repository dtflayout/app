import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import FeatureCard from "@/components/marketing/FeatureCard";
import WaveDivider from "@/components/marketing/WaveDivider";
import { Layout, Zap, Upload, Download } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <MarketingLayout>
      {/* Hero Section with Vibrant Gradient and Pattern */}
      <section
        className="relative bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 py-24 md:py-32 lg:py-40 overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom right, #34d399, #14b8a6, #2563eb)
          `,
          backgroundSize: '24px 24px, 100% 100%',
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700" />

        <div className="relative container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-white">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                Create Professional DTF Print Collages in Minutes
              </h1>
              <p className="text-xl md:text-2xl mb-10 text-white/95 leading-relaxed">
                Transform your DTF printing workflow with intelligent collages. Upload hundreds of images, auto-arrange them perfectly, and maximize efficiency like never before.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <GradientButton
                  variant="white"
                  size="xl"
                  onClick={() => navigate("/auth")}
                  className="group"
                >
                  <span>Start Free Trial</span>
                  <svg
                    className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </GradientButton>
                <GradientButton
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/product")}
                >
                  Learn More
                </GradientButton>
              </div>
              <p className="mt-6 text-white/80 text-sm">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>

            {/* Right: Hero Visual/Mockup */}
            <div className="hidden lg:block">
              <div className="relative">
                {/* Floating Animation */}
                <div className="animate-float">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
                    {/* Mockup Placeholder */}
                    <div className="space-y-4">
                      {/* Header Bar */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <div className="flex gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          DTF Collage Creator
                        </div>
                      </div>

                      {/* Grid Preview */}
                      <div className="grid grid-cols-3 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg animate-pulse"
                            style={{ animationDelay: `${i * 100}ms` }}
                          />
                        ))}
                      </div>

                      {/* Action Bar */}
                      <div className="flex gap-2 pt-4">
                        <div className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg" />
                        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-yellow-400 rounded-2xl rotate-12 opacity-80 blur-sm" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-pink-400 rounded-full opacity-60 blur-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <WaveDivider variant="bottom" color="white" />
      </section>

      {/* Features Section with Dot Pattern Background */}
      <section
        className="py-24 bg-white relative"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold">
                Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Powerful Features for Print Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Everything you need to create efficient print layouts and maximize your productivity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Upload className="w-8 h-8 text-emerald-600" />}
              title="Easy Upload"
              description="Drag and drop your images or upload in bulk. Supports all major image formats with instant processing."
            />
            <FeatureCard
              icon={<Layout className="w-8 h-8 text-emerald-600" />}
              title="Smart Layouts"
              description="Auto-arrange images efficiently with our intelligent layout algorithm that maximizes space."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-emerald-600" />}
              title="Lightning Fast"
              description="Process hundreds of images in seconds. No more manual arrangement or wasted time."
            />
            <FeatureCard
              icon={<Download className="w-8 h-8 text-emerald-600" />}
              title="Export Ready"
              description="Download print-ready files with precise measurements, cutting guides, and custom DPI."
            />
          </div>
        </div>
      </section>

      {/* CTA Section with Gradient and Pattern */}
      <section
        className="relative bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 py-24"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom right, #34d399, #14b8a6, #2563eb)
          `,
          backgroundSize: '24px 24px, 100% 100%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        <div className="relative container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-white/95 leading-relaxed">
              Join hundreds of print professionals who save hours every week with our smart collage creator
            </p>
            <GradientButton
              variant="white"
              size="xl"
              onClick={() => navigate("/auth")}
              className="group"
            >
              <span>Get Started Now</span>
              <svg
                className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </GradientButton>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Home;
