import MarketingLayout from "@/components/marketing/MarketingLayout";
import FeatureCard from "@/components/marketing/FeatureCard";
import WaveDivider from "@/components/marketing/WaveDivider";
import {
  Image,
  Layers,
  Maximize2,
  Settings,
  FileOutput,
  Clock,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";

const Product = () => {
  return (
    <MarketingLayout>
      {/* Hero Section with Gradient and Pattern */}
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
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />

        <div className="relative container max-w-7xl mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center text-white">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold border border-white/30">
                Product
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              The Complete DTF Collage Solution
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed">
              Professional-grade tools designed specifically for DTF print shops and production facilities. Everything you need, nothing you don't.
            </p>
          </div>
        </div>

        <WaveDivider variant="bottom" color="white" />
      </section>

      {/* Core Features */}
      <section
        className="py-24 bg-white"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold">
                Core Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Powerful tools in one seamless platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Image className="w-8 h-8 text-emerald-600" />}
              title="Bulk Image Processing"
              description="Upload and process hundreds of images at once. Automatic resizing, optimization, and format conversion included."
            />
            <FeatureCard
              icon={<Layers className="w-8 h-8 text-emerald-600" />}
              title="Multi-Layer Collages"
              description="Create complex layouts with multiple layers, grouping, and precise positioning control for perfect results."
            />
            <FeatureCard
              icon={<Maximize2 className="w-8 h-8 text-emerald-600" />}
              title="Custom Canvas Sizes"
              description="Work with any canvas dimensions. Presets for standard DTF sheet sizes and custom sizes supported."
            />
            <FeatureCard
              icon={<Settings className="w-8 h-8 text-emerald-600" />}
              title="Advanced Controls"
              description="Fine-tune spacing, margins, rotation, and alignment with precision tools and real-time previews."
            />
            <FeatureCard
              icon={<FileOutput className="w-8 h-8 text-emerald-600" />}
              title="Multiple Export Formats"
              description="Export as PNG, PDF, or SVG with custom DPI settings. Perfect prints every time, guaranteed."
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8 text-emerald-600" />}
              title="Save & Resume"
              description="Auto-save your work and access your projects from any device, anytime. Never lose progress again."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-slate-50">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold">
                Use Cases
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Built for Print Professionals
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Trusted by businesses of all sizes, from startups to enterprises
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8 text-emerald-600" />}
              title="Small Businesses"
              description="Get started quickly with easy-to-use tools and affordable pricing. Perfect for solo entrepreneurs and small teams."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-emerald-600" />}
              title="Print Shops"
              description="Handle high-volume orders efficiently with batch processing, templates, and team collaboration features."
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8 text-emerald-600" />}
              title="Production Facilities"
              description="Scale your operations with advanced workflow tools, API access, and dedicated support for enterprise needs."
            />
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section
        className="py-24 bg-white"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-semibold">
                Advanced
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
              Pro-Level Capabilities
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              Take your workflow to the next level
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="group bg-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:scale-105 transform">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Smart Templates
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Save your frequently used layouts as templates. Apply them to new projects with one click and maintain consistency across all orders.
              </p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Save unlimited templates
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Share with team members
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Version control included
                </li>
              </ul>
            </div>

            <div className="group bg-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:scale-105 transform">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Batch Processing
              </h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Process multiple collages simultaneously. Perfect for high-volume operations that need to maintain speed without sacrificing quality.
              </p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Queue unlimited jobs
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Background processing
                </li>
                <li className="flex items-start">
                  <span className="text-emerald-600 mr-3 text-lg">✓</span>
                  Priority queue support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Product;
