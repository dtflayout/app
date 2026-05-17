/**
 * copy.ts
 * All editable copy for the Order Automation "Coming Soon" page.
 * Tweak strings here — components consume from this file and don't
 * hardcode any of the marketing copy themselves.
 */

import type { ReactNode } from "react";
import {
  ImagePlus,
  Ruler,
  ClipboardPaste,
  LayoutGrid,
  Clock,
  Globe2,
  Coins,
  type LucideIcon,
} from "lucide-react";

// ─── Feature meta ────────────────────────────────────────────────────────────
export const FEATURE = {
  slug: "order-automation",
  launchLabel: "Launching June 2026",
} as const;

// ─── Hero ────────────────────────────────────────────────────────────────────
export const HERO = {
  eyebrow: "Coming Soon · Launching June 2026",
  // First entry is the headline that renders. Variants 2 & 3 are kept here
  // so the founder can swap by changing index without hunting through JSX.
  headlineVariants: [
    "Your daily orders → gang sheet in seconds",
    "Stop slicing SKUs by hand every morning",
    "Paste your order list. Get a sheet. That's it.",
  ],
  subheadingVariants: [
    "Copy your SKU column from any e-commerce export, paste it into DTF Layout, and get a print-ready gang sheet in seconds. The 30+ minutes you spend every morning hunting designs and resizing for sizes — gone.",
    "What used to take 30+ minutes of pulling images, resizing for each tee size, and arranging on a sheet — now takes one paste and one click.",
  ],
  ctaPrimary: "Notify me when it launches",
  ctaSecondary: "See how it works",
  badgePoints: [
    { label: "Saves 30+ min/day" },
    { label: "Works with Shopify, WooCommerce, Etsy, Wix" },
    { label: "No new fees · uses your credits" },
  ],
} as const;

// ─── 4-step illustrated flow ─────────────────────────────────────────────────
export interface Step {
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

export const STEPS: Step[] = [
  {
    number: "01",
    title: "Upload your designs",
    description:
      "Add each design once and tag it with a SKU prefix. SKULL-TEE-, WAVE-HOODIE-, ROSE-CROP-. Done.",
    Icon: ImagePlus,
  },
  {
    number: "02",
    title: "Set your size mapping",
    description:
      "Tell us what your size suffixes mean: S = 8\", M = 9\", L = 10\", XL = 11\". Set it once, reuse forever.",
    Icon: Ruler,
  },
  {
    number: "03",
    title: "Paste your order SKUs",
    description:
      "Every morning, copy the SKU + Quantity columns from your Shopify export and drop them into the textarea.",
    Icon: ClipboardPaste,
  },
  {
    number: "04",
    title: "Generate your sheet",
    description:
      "We match SKUs to designs, resize for each size, and pack the optimal gang sheet. Review, tweak, download.",
    Icon: LayoutGrid,
  },
];

// ─── Mock screenshot — sample data ───────────────────────────────────────────
// The mock shows pasted SKU data in the left panel and a parsed preview grid
// on the right. None of this is real — it's purely decorative.
export const MOCK_SKU_INPUT = `SKULL-TEE-S    2
SKULL-TEE-M    1
SKULL-TEE-L    3
WAVE-HOODIE-M  1
WAVE-HOODIE-L  2
ROSE-CROP-S    4`;

export interface MockPreviewItem {
  sku: string;            // 'SKULL-TEE'
  sizeInches: number;     // 9
  qty: number;            // 3
  // 'design' picks one of 4 abstract SVG placeholders rendered inline.
  design: "burst" | "wave" | "rose" | "letterform";
}

export const MOCK_PREVIEW: MockPreviewItem[] = [
  { sku: "SKULL-TEE",    sizeInches: 9,  qty: 3, design: "burst" },
  { sku: "WAVE-HOODIE",  sizeInches: 10, qty: 3, design: "wave" },
  { sku: "ROSE-CROP",    sizeInches: 8,  qty: 4, design: "rose" },
  { sku: "BOLD-TEXT",    sizeInches: 9,  qty: 3, design: "letterform" },
];

export const MOCK_SUMMARY = {
  totalTransfers: 13,
  uniqueDesigns: 6,
  sheetCount: 2,
  sheetSize: '22 × 60"',
};

// ─── Benefits ────────────────────────────────────────────────────────────────
export interface Benefit {
  Icon: LucideIcon;
  title: string;
  body: string;
  accent: "indigo" | "violet" | "emerald";
}

export const BENEFITS: Benefit[] = [
  {
    Icon: Clock,
    title: "Save 30+ minutes every morning",
    body:
      "Your morning routine of pulling images, resizing for each size, and arranging on a sheet collapses into one paste-and-click. That's 150+ hours back per year — without hiring or training anyone.",
    accent: "indigo",
  },
  {
    Icon: Globe2,
    title: "Works with any platform",
    body:
      "If your store can export SKUs, you're done. Shopify, WooCommerce, Etsy, Wix, Squarespace, BigCommerce, even your own spreadsheet. No app installs, no integrations, no API keys.",
    accent: "violet",
  },
  {
    Icon: Coins,
    title: "Zero setup, zero new fees",
    body:
      "Uses the credits you already have. No new pricing tier, no monthly subscription, no per-order commission. The same square-inch credits power your standalone sheets, WI orders, Quick Store, and now Order Automation.",
    accent: "emerald",
  },
];

// Small platform pills shown in benefit #2. Generic labels — no logos.
export const PLATFORM_PILLS = [
  "Shopify",
  "WooCommerce",
  "Etsy",
  "Wix",
  "Squarespace",
  "Spreadsheet",
];

// ─── Email capture ───────────────────────────────────────────────────────────
export const WAITLIST = {
  heading: "Be first in line when we launch",
  subheading:
    "Join the early-access list. We'll email you the day it goes live, and the first 50 signups get bonus credits to put it through its paces.",
  placeholder: "you@yourshop.com",
  cta: "Notify me",
  successHeading: "✓ You're on the list",
  successBody: (email: string) =>
    `We'll email you at ${email} the moment Order Automation goes live.`,
  // Footer-strip variant uses tighter copy.
  footerHeading: "Don't miss the launch.",
  footerSubheading: "Get the email the day it goes live.",
} as const;

// ─── FAQ ─────────────────────────────────────────────────────────────────────
export interface FaqItem {
  q: string;
  a: ReactNode;
}

export const FAQS: FaqItem[] = [
  {
    q: "When exactly will it launch?",
    a: "We're targeting June 2026. Waitlist signups get early access a week before public launch — and the first 50 get bonus credits.",
  },
  {
    q: "Do I need a Shopify app or any integration?",
    a: "No. There's nothing to install. You copy your SKU column from any order export, paste it into DTF Layout, and we handle the rest. The same flow works for WooCommerce, Etsy, Wix, Squarespace, BigCommerce — anything that exports SKUs.",
  },
  {
    q: "Will it cost extra?",
    a: "No. There's no new pricing tier and no per-order fee. Order Automation uses the same square-inch credits you already have. If you can run it through the standalone builder, you can run it through Order Automation.",
  },
  {
    q: "What e-commerce platforms work?",
    a: "Anything that exports SKUs — Shopify, WooCommerce, Etsy, Wix, Squarespace, BigCommerce, Magento, even a CSV you keep in Google Sheets. The tool only cares about the SKU + Quantity columns.",
  },
  {
    q: "Can I use it for non-apparel SKUs?",
    a: "Yes. As long as your SKUs include a size suffix (or you map the size manually), Order Automation will resize each design and pack them optimally. Mugs, decals, posters, hats — same flow.",
  },
];
