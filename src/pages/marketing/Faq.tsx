import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import WaveDivider from "@/components/marketing/WaveDivider";
import GradientButton from "@/components/marketing/GradientButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string | React.ReactNode;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    title: "General Questions",
    items: [
      {
        question: "What is DTF Layout?",
        answer:
          "DTF Layout is an all-in-one tool designed specifically for Direct-to-Film (DTF) printing businesses. It combines intelligent layout generation with powerful image editing tools, so you can prepare, edit, and arrange your designs all in one place — no need for Photoshop, Canva, or any other software.",
      },
      {
        question: "Who is DTF Layout for?",
        answer: (
          <div>
            <p className="mb-3">DTF Layout is built for:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>DTF print shop owners</li>
              <li>Commercial printing operations</li>
              <li>Custom apparel businesses</li>
              <li>Designers who work with DTF printing</li>
            </ul>
          </div>
        ),
      },
      {
        question: "What can I do with DTF Layout?",
        answer: (
          <div>
            <p className="mb-3">DTF Layout offers a complete toolkit for DTF printing:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Layout Generator</strong> - Automatically arrange multiple designs on your print sheet</li>
              <li><strong>Background Remover</strong> - Remove unwanted backgrounds from images</li>
              <li><strong>Auto Detect Image Trimmer</strong> - Trim empty space around designs</li>
              <li><strong>Image Enhancer</strong> - Adjust brightness, contrast, saturation, and more</li>
              <li><strong>Stroke/Outline Tool</strong> - Add outlines to text and designs for easier peeling</li>
              <li><strong>Eraser Tool</strong> - Remove unwanted parts from any design</li>
            </ul>
          </div>
        ),
      },
      {
        question: "Why should I use DTF Layout instead of Photoshop or Canva?",
        answer:
          "DTF Layout is purpose-built for DTF printing workflows. All our tools are designed specifically for print preparation needs. Instead of switching between multiple apps, you can do everything in one place — from editing your designs to generating print-ready layouts.",
      },
      {
        question: "What file formats are supported?",
        answer:
          "DTF Layout supports common image formats including PNG, JPG, and other standard image files used in DTF printing workflows.",
      },
    ],
  },
  {
    title: "Tools & Features",
    items: [
      {
        question: "What is the Layout Generator?",
        answer:
          "The Layout Generator automatically arranges your designs on print sheets. Simply upload your designs, select your film width (23-inch or 11-inch), and DTF Layout creates an efficient layout for you.",
      },
      {
        question: "How does the Background Remover work?",
        answer:
          "Remove unwanted backgrounds from your images before printing. Upload your image and select any color (or multiple colors) to remove. Each color has a tolerance slider to control how much of that color gets removed. Perfect for cleaning up designs that need transparent backgrounds.",
      },
      {
        question: "What is the Auto Detect Image Trimmer?",
        answer:
          "The Auto Detect Image Trimmer automatically detects and removes empty space around your design/artwork. It eliminates wasted space, allows cropping/trimming, and supports aspect ratio changes.",
      },
      {
        question: "What adjustments can I make with the Image Enhancer?",
        answer:
          "The Image Enhancer lets you make visual adjustments to any image for better print results, including: Brightness, Contrast, Vibrance, Saturation, and Hue adjustments.",
      },
      {
        question: "What is the Stroke/Outline Tool?",
        answer:
          "The Stroke/Outline Tool adds an outline around text or designs. This makes thin designs easier to print and peel, and is essential for brand labels and thin-line designs.",
      },
      {
        question: "What can I do with the Eraser Tool?",
        answer:
          "The Eraser Tool lets you remove any unwanted parts from your design with full control over what gets printed.",
      },
    ],
  },
  {
    title: "Pricing & Credits",
    items: [
      {
        question: "What pricing plans are available?",
        answer: (
          <div>
            <ul className="space-y-2 text-slate-600">
              <li><strong>Free:</strong> ₹0 (10,000 sq. inches)</li>
              <li><strong>Lite:</strong> ₹1,000 (1,00,000 sq. inches)</li>
              <li><strong>Advanced:</strong> ₹4,000 (5,00,000 sq. inches)</li>
              <li><strong>Enterprise:</strong> ₹8,000 (20,00,000 sq. inches)</li>
            </ul>
          </div>
        ),
      },
      {
        question: "How does the credit system work?",
        answer:
          "When you purchase a plan, you're recharging your account with credits measured in square inches. These credits are used each time you generate a layout.",
      },
      {
        question: "How is usage calculated?",
        answer:
          "Each time you generate a layout, the total area of your output canvas is deducted from your balance.",
      },
      {
        question: "Are the editing tools included in all plans?",
        answer:
          "Yes! All tools are available to all users. Credits are only deducted when you generate a layout.",
      },
      {
        question: "What happens when my credits run out?",
        answer:
          "Once your credits are finished, you'll need to recharge your account by purchasing a plan to continue generating layouts.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes! New users get a free trial for one week to experience all the tools, plus free credits of 10,000 square inches.",
      },
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept payments through Razorpay, which supports credit cards, debit cards, UPI, net banking, and other popular payment methods in India.",
      },
    ],
  },
  {
    title: "Layout Generation Limits",
    items: [
      {
        question: "Is there a limit to how many images I can upload?",
        answer:
          "You can upload up to 40 images per generation. There's no limit on how many layout files you can create.",
      },
      {
        question: "What are the sheet length limits?",
        answer:
          "At 150 DPI: Maximum 400 inches. At 300 DPI: Maximum 200 inches.",
      },
      {
        question: "What film widths are supported?",
        answer:
          "23-inch (standard wide format) and 11-inch (compact format).",
      },
      {
        question: "How fast is the processing?",
        answer:
          "DTF Layout processes layouts quickly, typically in seconds.",
      },
    ],
  },
  {
    title: "Account & Credits",
    items: [
      {
        question: "How do I create an account?",
        answer: 'Visit dtflayout.com and click "Sign Up" or "Get Started."',
      },
      {
        question: "How do I check my credit balance?",
        answer:
          "Your current credit balance is displayed in your dashboard.",
      },
      {
        question: "Will I get an invoice?",
        answer:
          "Yes, invoices are automatically generated for all purchases.",
      },
    ],
  },
  {
    title: "Technical Questions",
    items: [
      {
        question: "Do I need to install any software?",
        answer:
          "No! DTF Layout is a web-based application. No downloads required.",
      },
      {
        question: "Can I use it on mobile devices?",
        answer:
          "Yes, it's responsive, though desktop/laptop provides the best experience for detailed editing.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Yes, we don't save any of your design data. Your designs are processed and not stored on our servers.",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        question: "How do I get help?",
        answer:
          "Contact support@dtflayout.com for any questions.",
      },
      {
        question: "What if I find a bug or have a feature request?",
        answer:
          "Contact support@dtflayout.com with bugs or feature requests.",
      },
    ],
  },
  {
    title: "Getting Started",
    items: [
      {
        question: "How do I start using DTF Layout?",
        answer: (
          <div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Visit dtflayout.com</li>
              <li>Create a free account</li>
              <li>Start with your free trial or purchase credits</li>
              <li>Use editing tools to prepare designs</li>
              <li>Upload designs to Layout Generator (up to 40)</li>
              <li>Select film width (23" or 11")</li>
              <li>Generate optimized layout</li>
              <li>Download and print!</li>
            </ol>
          </div>
        ),
      },
      {
        question: "Do I need to pay to try DTF Layout?",
        answer:
          "No, you get a one-week free trial plus 10,000 free square inches.",
      },
    ],
  },
];

const Faq = () => {
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
          backgroundSize: "24px 24px, 100% 100%",
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
                FAQ
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto leading-relaxed">
              Everything you need to know about DTF Layout
            </p>
          </div>
        </div>

        <WaveDivider variant="bottom" color="white" />
      </section>

      {/* FAQ Sections */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container max-w-4xl mx-auto px-6">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-12 last:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 pb-3 border-b-2 border-emerald-500">
                {section.title}
              </h2>
              <Accordion type="single" collapsible className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <AccordionItem
                    key={itemIndex}
                    value={`${sectionIndex}-${itemIndex}`}
                    className="bg-slate-50 rounded-xl border border-slate-200 px-6 data-[state=open]:bg-white data-[state=open]:shadow-lg data-[state=open]:border-emerald-200 transition-all duration-200"
                  >
                    <AccordionTrigger className="text-left text-base md:text-lg font-semibold text-slate-900 hover:text-emerald-600 hover:no-underline py-5">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 text-base leading-relaxed pb-5">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-50">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 md:p-14">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Contact us at{" "}
              <a
                href="mailto:support@dtflayout.com"
                className="text-emerald-600 font-semibold hover:underline"
              >
                support@dtflayout.com
              </a>
            </p>
            <Link to="/contact">
              <GradientButton variant="hero" size="lg" className="group">
                <span>Contact Us</span>
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
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Faq;
