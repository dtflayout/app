/**
 * OrderAutomationContent.tsx
 * The body of the Order Automation "Coming Soon" page — all 7 sections,
 * decorative helpers, mouse-tilt teaser. Pure body markup, no chrome.
 *
 * Used by:
 *   - src/pages/OrderAutomation.tsx          → wrapped in <AppLayout>  (dashboard at /app/order-automation)
 *   - src/pages/marketing/OrderAutomation.tsx → wrapped in <MarketingNav> + footer (marketing at /product/order-automation)
 *
 * Sections (top to bottom):
 *   1. Hero — eyebrow, headline, subheading, two CTAs, floating mock teaser
 *   2. 4-step illustrated flow
 *   3. Realistic mock screenshot inside a browser frame
 *   4. Benefits — 3-up bento grid
 *   5. Email capture ("Be first in line")
 *   6. FAQ accordion
 *   7. Footer CTA strip — repeat email capture on dark navy band
 *
 * Copy lives in ./copy.ts — tweak there.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, MoveRight, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import {
  BENEFITS,
  FAQS,
  FEATURE,
  HERO,
  PLATFORM_PILLS,
  STEPS,
  WAITLIST,
} from "./copy";
import { BenefitCard } from "./BenefitCard";
import { MockBrowserFrame } from "./MockBrowserFrame";
import { MockOrderAutomation } from "./MockOrderAutomation";
import { RevealOnScroll } from "./RevealOnScroll";
import { StepCard } from "./StepCard";
import { WaitlistForm } from "./WaitlistForm";

interface OrderAutomationContentProps {
  /**
   * Which surface this content is rendering on. Affects:
   *   - Section scroll offsets (marketing has a fixed top nav, needs more)
   *   - Waitlist `source` tags (so analytics can distinguish)
   */
  pageContext?: "dashboard" | "marketing";
}

// ─── Decorative bits ─────────────────────────────────────────────────────────

/** Pexo-style dashed-border decorative square. Absolutely positioned. */
const DashedSquare = ({
  size = 80,
  rotate = 12,
  className,
  style,
}: {
  size?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    aria-hidden
    className={cn("pointer-events-none absolute", className)}
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.22,
      border: "1.5px dashed rgba(79,70,229,0.18)",
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  />
);

/** Soft animated orb (radial-gradient blob). */
const Orb = ({
  size = 360,
  color = "rgba(99,102,241,0.18)",
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute rounded-full opacity-80 blur-3xl",
      "animate-float",
      className
    )}
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 65%)`,
      ...style,
    }}
  />
);

/** Dot grid background — exact same pattern as marketing pages. */
const DotGrid = ({
  className,
  opacity = 0.45,
}: {
  className?: string;
  opacity?: number;
}) => (
  <div
    aria-hidden
    className={cn("pointer-events-none absolute inset-0", className)}
    style={{
      opacity,
      backgroundImage:
        "radial-gradient(circle, rgba(79,70,229,0.18) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
    }}
  />
);

/** Dashed connector arrow between steps. Visible on lg+ only. */
const StepConnector = () => (
  <div
    aria-hidden
    className="hidden lg:flex pointer-events-none absolute left-full top-1/2 z-10 w-7 -translate-y-1/2 items-center justify-center"
  >
    <div className="relative flex w-full items-center">
      <div className="h-0 flex-1 border-t-2 border-dashed border-indigo-200" />
      <MoveRight
        className="absolute -right-1 h-4 w-4 text-indigo-300"
        strokeWidth={2.5}
      />
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scrollToSection = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
};

// ─── Content ─────────────────────────────────────────────────────────────────

export const OrderAutomationContent = ({
  pageContext = "dashboard",
}: OrderAutomationContentProps) => {
  const headline = HERO.headlineVariants[0];
  const subheading = HERO.subheadingVariants[0];

  // Marketing has a fixed top nav (~80px). Dashboard has no top header.
  // `scroll-mt-*` ensures hash-anchor scroll targets land below the nav.
  const sectionScrollMt =
    pageContext === "marketing" ? "scroll-mt-24" : "scroll-mt-8";

  // Tag waitlist signups with the surface they came from. Analytics can
  // then split conversion by dashboard-visitor vs marketing-visitor.
  const sourcePrefix = pageContext === "marketing" ? "mkt" : "app";

  // For the floating glassmorphism teaser card in the hero, we very-gently
  // tilt it on mouse-move. Pure decoration. Disabled on touch devices.
  const teaserRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    const el = teaserRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ rx: -py * 4, ry: px * 6 });
    };
    const onLeave = () => setTilt({ rx: 0, ry: 0 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const teaserTransform = useMemo(
    () => `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
    [tilt]
  );

  return (
    <div className="relative">
      {/* ═══════════════════════════════════════════════════════════════
           1. HERO
           ═══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Atmospheric layers */}
          <DotGrid opacity={0.5} />
          <Orb
            size={520}
            color="rgba(99,102,241,0.22)"
            className="-left-40 -top-40"
            style={{ animationDuration: "9s" }}
          />
          <Orb
            size={380}
            color="rgba(167,139,250,0.18)"
            className="-right-20 top-32"
            style={{ animationDuration: "11s", animationDelay: "1.5s" }}
          />
          <DashedSquare size={120} rotate={14} className="left-[8%] top-24 hidden md:block" />
          <DashedSquare size={64} rotate={-22} className="right-[6%] top-10 hidden md:block" />
          <DashedSquare size={96} rotate={32} className="left-[35%] bottom-12 hidden lg:block" style={{ borderColor: "rgba(124,58,237,0.18)" }} />

          <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-14 lg:grid lg:grid-cols-12 lg:gap-12 lg:pb-32 lg:pt-20">
            {/* Left — copy */}
            <div className="relative z-10 lg:col-span-7">
              <RevealOnScroll>
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-indigo-700 shadow-[0_2px_10px_rgba(79,70,229,0.08)] backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
                  </span>
                  {HERO.eyebrow}
                </span>
              </RevealOnScroll>

              <RevealOnScroll delay={80}>
                <h1 className="font-heading mt-6 text-[36px] leading-[1.05] tracking-[-0.025em] text-gray-900 sm:text-[52px] sm:leading-[1.02] lg:text-[64px]">
                  <span className="font-extrabold">{headline.split("→")[0].trim()}</span>
                  {headline.includes("→") && (
                    <>
                      <span
                        aria-hidden
                        className="mx-2 inline-block translate-y-[-4px] text-indigo-400 sm:mx-3"
                      >
                        →
                      </span>
                      <span className="font-extrabold bg-gradient-to-br from-indigo-600 via-violet-600 to-violet-500 bg-clip-text text-transparent">
                        {headline.split("→")[1].trim()}
                      </span>
                    </>
                  )}
                </h1>
              </RevealOnScroll>

              <RevealOnScroll delay={160}>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg">
                  {subheading}
                </p>
              </RevealOnScroll>

              <RevealOnScroll delay={220}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => scrollToSection("waitlist")}
                    className={cn(
                      "group inline-flex items-center justify-center gap-2 rounded-full",
                      "bg-gradient-to-br from-indigo-600 to-violet-600 px-7 py-3.5",
                      "text-[14.5px] font-semibold text-white",
                      "shadow-[0_10px_28px_rgba(79,70,229,0.34)]",
                      "transition-all duration-200",
                      "hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_14px_36px_rgba(79,70,229,0.45)] hover:-translate-y-[1px]"
                    )}
                  >
                    <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                    {HERO.ctaPrimary}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection("how-it-works")}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full",
                      "border border-gray-200 bg-white px-6 py-3.5",
                      "text-[14.5px] font-semibold text-gray-800",
                      "shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
                      "transition-all duration-200",
                      "hover:border-indigo-200 hover:text-indigo-700 hover:shadow-[0_4px_14px_rgba(79,70,229,0.10)]"
                    )}
                  >
                    {HERO.ctaSecondary}
                    <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              </RevealOnScroll>

              <RevealOnScroll delay={300}>
                <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-gray-500">
                  {HERO.badgePoints.map((p) => (
                    <li key={p.label} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      <span className="font-medium text-gray-600">{p.label}</span>
                    </li>
                  ))}
                </ul>
              </RevealOnScroll>
            </div>

            {/* Right — floating glassmorphism teaser card */}
            <div className="relative mt-12 lg:col-span-5 lg:mt-0">
              <RevealOnScroll delay={200} className="relative">
                <div
                  ref={teaserRef}
                  style={{ transform: teaserTransform, transition: "transform 200ms ease-out" }}
                  className="relative mx-auto max-w-md"
                >
                  {/* Decorative dashed squares around the card */}
                  <DashedSquare size={70} rotate={-18} className="-left-6 -top-6" />
                  <DashedSquare size={48} rotate={32} className="-right-3 -bottom-4" style={{ borderColor: "rgba(124,58,237,0.22)" }} />

                  {/* Glassmorphism card */}
                  <div
                    className={cn(
                      "relative rounded-2xl border border-white/60 bg-white/70 p-5 backdrop-blur-md",
                      "shadow-[0_18px_50px_-12px_rgba(79,70,229,0.32),0_4px_14px_rgba(15,23,42,0.06)]"
                    )}
                  >
                    {/* Tiny browser bar inside the card */}
                    <div className="mb-3 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
                      <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
                      <span className="h-2 w-2 rounded-full bg-[#28C840]" />
                      <span className="ml-2 text-[10px] font-medium text-gray-400">
                        order-automation · preview
                      </span>
                    </div>

                    {/* Stylized SKU rows */}
                    <div className="space-y-2">
                      {["SKULL-TEE-S", "SKULL-TEE-M", "WAVE-HOODIE-L", "ROSE-CROP-S"].map(
                        (sku, i) => (
                          <div
                            key={sku}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white/80 px-3 py-2"
                          >
                            <div className="h-7 w-7 flex-shrink-0 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500" />
                            <div className="font-mono flex-1 text-[11px] font-semibold text-gray-800">
                              {sku}
                            </div>
                            <div className="rounded-full bg-gray-900/85 px-2 py-0.5 text-[10px] font-bold text-white">
                              ×{[2, 1, 2, 4][i]}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="my-3 flex items-center justify-center">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.75} />
                      </div>
                    </div>

                    {/* Sheet preview */}
                    <div className="rounded-lg border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/40 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-heading text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                          Sheet 1 of 2
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500">22 × 60"</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square rounded bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
                            style={{
                              background:
                                i % 3 === 0
                                  ? "linear-gradient(135deg,#EEF2FF,#E0E7FF)"
                                  : i % 3 === 1
                                  ? "linear-gradient(135deg,#F5F3FF,#EDE9FE)"
                                  : "linear-gradient(135deg,#FFF1F2,#FCE7F3)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             2. 4-STEP FLOW
             ═══════════════════════════════════════════════════════════════ */}
        <section
          id="how-it-works"
          className={cn(
            "relative border-t border-gray-200/60 bg-gradient-to-b from-white to-[#FBFAFD] py-20 sm:py-28",
            sectionScrollMt
          )}
        >
          <DashedSquare size={88} rotate={18} className="right-[8%] top-12 hidden lg:block" />
          <DashedSquare size={56} rotate={-14} className="left-[10%] bottom-16 hidden lg:block" />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <RevealOnScroll>
              <div className="mx-auto max-w-2xl text-center">
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  How it works
                </span>
                <h2 className="font-heading mt-3 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-[44px]">
                  Four steps. About as long as making coffee.
                </h2>
                <p className="mt-4 text-base text-gray-600 sm:text-lg">
                  Set up your designs and size mapping once. Then every morning,
                  it's just paste-and-go.
                </p>
              </div>
            </RevealOnScroll>

            {/* Step grid */}
            <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, i) => (
                <RevealOnScroll
                  key={step.number}
                  delay={i * 90}
                  className="relative"
                >
                  <StepCard step={step} />
                  {/* Dashed connector arrow — only between steps, not after the last */}
                  {i < STEPS.length - 1 && <StepConnector />}
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             3. MOCK SCREENSHOT
             ═══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden border-t border-gray-200/60 bg-gradient-to-b from-[#FBFAFD] via-indigo-50/40 to-white py-20 sm:py-28">
          <DotGrid opacity={0.35} />
          <Orb
            size={500}
            color="rgba(124,58,237,0.14)"
            className="-right-32 top-20"
            style={{ animationDuration: "12s" }}
          />
          <Orb
            size={420}
            color="rgba(99,102,241,0.16)"
            className="-left-24 bottom-0"
            style={{ animationDuration: "14s", animationDelay: "2s" }}
          />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <RevealOnScroll>
              <div className="mx-auto max-w-2xl text-center">
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">
                  Sneak peek
                </span>
                <h2 className="font-heading mt-3 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-[44px]">
                  Here's what every morning will feel like.
                </h2>
                <p className="mt-4 text-base text-gray-600 sm:text-lg">
                  Paste on the left. Confirm on the right. One click to a
                  print-ready sheet.
                </p>
              </div>
            </RevealOnScroll>

            {/* The mock — wrapped to add a subtle floor glow */}
            <RevealOnScroll delay={100} className="mt-12">
              <div className="relative mx-auto max-w-5xl">
                {/* Soft glow under the browser */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-10 -bottom-10 top-12 -z-10 rounded-[40px] bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-transparent blur-3xl"
                />
                <MockBrowserFrame url="app.dtflayout.com/order-automation">
                  <MockOrderAutomation />
                </MockBrowserFrame>

                {/* "Mockup" tag so people know this is a preview */}
                <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-gray-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400" />
                  <span>Preview of upcoming UI · subject to refinement</span>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             4. BENEFITS
             ═══════════════════════════════════════════════════════════════ */}
        <section className="relative border-t border-gray-200/60 bg-white py-20 sm:py-28">
          <DashedSquare size={72} rotate={-22} className="left-[6%] top-16 hidden lg:block" />
          <DashedSquare size={104} rotate={20} className="right-[7%] bottom-20 hidden lg:block" style={{ borderColor: "rgba(124,58,237,0.18)" }} />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <RevealOnScroll>
              <div className="mx-auto max-w-2xl text-center">
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                  Why you'll love it
                </span>
                <h2 className="font-heading mt-3 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-[44px]">
                  Built for the printer who's already busy.
                </h2>
              </div>
            </RevealOnScroll>

            <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
              {BENEFITS.map((benefit, i) => (
                <RevealOnScroll key={benefit.title} delay={i * 100}>
                  <BenefitCard benefit={benefit}>
                    {/* For the "Works with any platform" card, add platform pills */}
                    {benefit.accent === "violet" && (
                      <div className="flex flex-wrap gap-1.5">
                        {PLATFORM_PILLS.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </BenefitCard>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             5. EMAIL CAPTURE — main waitlist
             ═══════════════════════════════════════════════════════════════ */}
        <section
          id="waitlist"
          className={cn(
            "relative overflow-hidden border-t border-gray-200/60 bg-gradient-to-b from-white via-indigo-50/50 to-white py-20 sm:py-24",
            sectionScrollMt
          )}
        >
          <DotGrid opacity={0.4} />
          <Orb
            size={420}
            color="rgba(99,102,241,0.18)"
            className="left-1/2 top-0 -translate-x-1/2"
            style={{ animationDuration: "10s" }}
          />

          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <RevealOnScroll>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700 backdrop-blur-sm">
                Early access
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={80}>
              <h2 className="font-heading mt-5 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-[44px]">
                {WAITLIST.heading}
              </h2>
            </RevealOnScroll>

            <RevealOnScroll delay={140}>
              <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg">
                {WAITLIST.subheading}
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={200} className="mt-8">
              <WaitlistForm variant="panel" source={`${sourcePrefix}_main_cta`} />
            </RevealOnScroll>

            <RevealOnScroll delay={280}>
              <p className="mt-5 text-[12px] text-gray-500">
                No spam. One email when it launches. Unsubscribe any time.
              </p>
            </RevealOnScroll>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             6. FAQ
             ═══════════════════════════════════════════════════════════════ */}
        <section className="relative border-t border-gray-200/60 bg-white py-20 sm:py-28">
          <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
            <RevealOnScroll>
              <div className="text-center">
                <span className="font-heading text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">
                  Questions
                </span>
                <h2 className="font-heading mt-3 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl">
                  Things printers ask us first.
                </h2>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={120} className="mt-10">
              <Accordion
                type="single"
                collapsible
                className="divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
              >
                {FAQS.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="border-b-0 px-5 sm:px-6"
                  >
                    <AccordionTrigger className="py-5 text-left font-heading text-base font-bold text-gray-900 hover:no-underline sm:text-lg">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-gray-600 sm:text-[15px]">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </RevealOnScroll>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
             7. FOOTER CTA STRIP
             ═══════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0F0D2E] via-[#1E1B4B] to-[#312E81] py-16 sm:py-20">
          {/* Decorative accents on the dark band */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <Orb
            size={500}
            color="rgba(99,102,241,0.35)"
            className="-left-24 top-0"
            style={{ animationDuration: "13s" }}
          />
          <Orb
            size={420}
            color="rgba(167,139,250,0.28)"
            className="-right-12 bottom-0"
            style={{ animationDuration: "11s", animationDelay: "1s" }}
          />
          {/* Dashed accent square — pure decoration */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-[12%] top-12 hidden h-20 w-20 rotate-12 rounded-[18px] border-[1.5px] border-dashed border-white/15 lg:block"
          />

          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
            <RevealOnScroll>
              <h3 className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-[36px]">
                {WAITLIST.footerHeading}
              </h3>
              <p className="mt-3 text-sm text-indigo-200 sm:text-base">
                {WAITLIST.footerSubheading}
              </p>
            </RevealOnScroll>

            <RevealOnScroll delay={120} className="mt-7">
              <WaitlistForm variant="strip" source={`${sourcePrefix}_footer_cta`} />
            </RevealOnScroll>

            <RevealOnScroll delay={200}>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11.5px] font-semibold text-indigo-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                {FEATURE.launchLabel}
              </div>
            </RevealOnScroll>
          </div>
        </section>
    </div>
  );
};

export default OrderAutomationContent;
