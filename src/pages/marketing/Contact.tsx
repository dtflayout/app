import MarketingLayout from "@/components/marketing/MarketingLayout";
import GradientButton from "@/components/marketing/GradientButton";
import WaveDivider from "@/components/marketing/WaveDivider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MessageSquare, Phone } from "lucide-react";

const Contact = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <MarketingLayout>
      {/* Hero Section with Gradient and Pattern */}
      <section
        className="relative bg-gradient-to-br from-emerald-400 via-teal-500 to-blue-600 py-24 md:py-32 overflow-hidden"
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
          <div className="max-w-4xl mx-auto text-center text-white">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold border border-white/30">
                Contact
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              Get in Touch
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed">
              Have questions? We're here to help. Reach out and we'll get back to you within 24 hours.
            </p>
          </div>
        </div>

        <WaveDivider variant="bottom" color="white" />
      </section>

      {/* Contact Cards */}
      <section
        className="py-24 bg-white"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148, 163, 184, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-20">
            <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 border-t-4 border-t-emerald-600 border-x border-b border-slate-100">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Mail className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Email Us
              </h3>
              <p className="text-slate-600 mb-2 font-semibold">
                support@dtfcollage.com
              </p>
              <p className="text-sm text-slate-500">
                We'll respond within 24 hours
              </p>
            </Card>

            <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 border-t-4 border-t-emerald-600 border-x border-b border-slate-100">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Live Chat
              </h3>
              <p className="text-slate-600 mb-2 font-semibold">
                Available 9 AM - 6 PM IST
              </p>
              <p className="text-sm text-slate-500">Monday to Friday</p>
            </Card>

            <Card className="group p-8 text-center bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transform transition-all duration-300 border-t-4 border-t-emerald-600 border-x border-b border-slate-100">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Phone className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Call Us
              </h3>
              <p className="text-slate-600 mb-2 font-semibold">
                +91 XXX XXX XXXX
              </p>
              <p className="text-sm text-slate-500">Business hours only</p>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="p-10 md:p-12 max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl border-t-4 border-t-emerald-600 border-x border-b border-slate-100">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
                Send us a Message
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed">
                Fill out the form below and we'll get back to you shortly
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label
                    htmlFor="name"
                    className="text-slate-900 font-semibold mb-2 block"
                  >
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Your full name"
                    required
                    className="h-12 px-4 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="email"
                    className="text-slate-900 font-semibold mb-2 block"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    className="h-12 px-4 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="company"
                  className="text-slate-900 font-semibold mb-2 block"
                >
                  Company (Optional)
                </Label>
                <Input
                  id="company"
                  placeholder="Your company name"
                  className="h-12 px-4 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                />
              </div>

              <div>
                <Label
                  htmlFor="subject"
                  className="text-slate-900 font-semibold mb-2 block"
                >
                  Subject
                </Label>
                <Input
                  id="subject"
                  placeholder="How can we help?"
                  required
                  className="h-12 px-4 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                />
              </div>

              <div>
                <Label
                  htmlFor="message"
                  className="text-slate-900 font-semibold mb-2 block"
                >
                  Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your inquiry..."
                  rows={6}
                  required
                  className="px-4 py-3 text-base border-slate-200 focus:border-emerald-600 focus:ring-emerald-600 resize-none"
                />
              </div>

              <div className="pt-4">
                <GradientButton
                  variant="hero"
                  size="lg"
                  type="submit"
                  className="w-full md:w-auto group"
                >
                  <span>Send Message</span>
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
            </form>
          </Card>
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="py-24 bg-slate-50">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight">
              We're Here to Help
            </h2>
            <p className="text-xl text-slate-600 leading-relaxed mb-8">
              Our support team is available to answer any questions you have about DTF Collage Creator. Whether you need help getting started, have technical questions, or want to discuss custom solutions, we're just a message away.
            </p>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <Card className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Sales Inquiries
                </h3>
                <p className="text-slate-600">
                  Interested in learning more about our plans or need a custom solution? Our sales team is ready to help you find the perfect fit.
                </p>
              </Card>
              <Card className="group p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Technical Support
                </h3>
                <p className="text-slate-600">
                  Need help with a technical issue? Our support team has deep product knowledge and can resolve most issues quickly.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Contact;
