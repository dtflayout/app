/**
 * MockOrderAutomation
 * The contents of the mock screenshot. Two-panel layout:
 *   - Left: textarea pre-filled with sample SKU+qty data + disabled "Parse SKUs" button
 *   - Right: 4-card preview grid + summary line + "Generate Sheet" button
 *
 * Entirely decorative. The textarea is set to readOnly. Buttons have no
 * onClick. The whole thing lives inside a MockBrowserFrame to look like
 * a real product screenshot.
 *
 * Design placeholder images are inline SVGs — original abstract patterns
 * with no copyrighted IP. Four distinct designs to imply variety:
 *   - 'burst':      radial geometric burst
 *   - 'wave':       layered wave bands
 *   - 'rose':       concentric petals (loosely floral)
 *   - 'letterform': bold stylized 'B' on a textured ground
 */
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOCK_PREVIEW,
  MOCK_SKU_INPUT,
  MOCK_SUMMARY,
  type MockPreviewItem,
} from "./copy";

// ─── Abstract SVG placeholders ───────────────────────────────────────────────
const PlaceholderBurst = () => (
  <svg viewBox="0 0 100 100" className="h-full w-full">
    <defs>
      <radialGradient id="burst-bg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#EEF2FF" />
        <stop offset="100%" stopColor="#E0E7FF" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="url(#burst-bg)" />
    {/* Star burst rays */}
    <g transform="translate(50 50)" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" fill="none">
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = Math.cos(a) * 8;
        const y1 = Math.sin(a) * 8;
        const x2 = Math.cos(a) * 28;
        const y2 = Math.sin(a) * 28;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
    <circle cx="50" cy="50" r="6" fill="#4F46E5" />
    <circle cx="50" cy="50" r="2" fill="#fff" />
  </svg>
);

const PlaceholderWave = () => (
  <svg viewBox="0 0 100 100" className="h-full w-full">
    <defs>
      <linearGradient id="wave-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F5F3FF" />
        <stop offset="100%" stopColor="#EDE9FE" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#wave-bg)" />
    <path d="M0 38 Q 25 26 50 38 T 100 38 V 50 H 0 Z" fill="#7C3AED" opacity="0.85" />
    <path d="M0 52 Q 25 40 50 52 T 100 52 V 64 H 0 Z" fill="#6D28D9" opacity="0.7" />
    <path d="M0 66 Q 25 54 50 66 T 100 66 V 78 H 0 Z" fill="#4F46E5" opacity="0.85" />
  </svg>
);

const PlaceholderRose = () => (
  <svg viewBox="0 0 100 100" className="h-full w-full">
    <defs>
      <radialGradient id="rose-bg" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor="#FFF1F2" />
        <stop offset="100%" stopColor="#FCE7F3" />
      </radialGradient>
    </defs>
    <rect width="100" height="100" fill="url(#rose-bg)" />
    <g transform="translate(50 50)">
      {Array.from({ length: 6 }).map((_, i) => (
        <ellipse
          key={i}
          cx="0"
          cy="-14"
          rx="11"
          ry="22"
          fill="#E11D48"
          opacity={0.18 + i * 0.05}
          transform={`rotate(${i * 30})`}
        />
      ))}
      <circle cx="0" cy="0" r="6" fill="#9F1239" />
    </g>
  </svg>
);

const PlaceholderLetterform = () => (
  <svg viewBox="0 0 100 100" className="h-full w-full">
    <defs>
      <linearGradient id="letter-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#0F172A" />
        <stop offset="100%" stopColor="#1E1B4B" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#letter-bg)" />
    {/* Faint dot grid texture */}
    {Array.from({ length: 5 }).map((_, r) =>
      Array.from({ length: 5 }).map((_, c) => (
        <circle
          key={`${r}-${c}`}
          cx={15 + c * 18}
          cy={15 + r * 18}
          r="0.7"
          fill="#fff"
          opacity="0.15"
        />
      ))
    )}
    <text
      x="50"
      y="68"
      textAnchor="middle"
      fontFamily="'Bricolage Grotesque', sans-serif"
      fontWeight="800"
      fontSize="56"
      fill="#fff"
      letterSpacing="-2"
    >
      B
    </text>
  </svg>
);

const designMap: Record<MockPreviewItem["design"], () => JSX.Element> = {
  burst: PlaceholderBurst,
  wave: PlaceholderWave,
  rose: PlaceholderRose,
  letterform: PlaceholderLetterform,
};

// ─── Preview card ────────────────────────────────────────────────────────────
const PreviewCard = ({ item }: { item: MockPreviewItem }) => {
  const Design = designMap[item.design];
  return (
    <div
      className={cn(
        "group/card relative overflow-hidden rounded-xl border border-gray-200 bg-white",
        "transition-shadow duration-200",
        "hover:shadow-[0_8px_22px_rgba(79,70,229,0.10)]"
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
        <Design />
        {/* Quantity badge — bottom-left */}
        <div className="absolute bottom-2 left-2 rounded-full bg-gray-900/85 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
          ×{item.qty}
        </div>
        {/* Hover delete (×) — top-right */}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-gray-500 opacity-0 shadow-sm transition-opacity duration-150 group-hover/card:opacity-100"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
      {/* Meta */}
      <div className="px-3 py-2.5">
        <div className="font-heading truncate text-[12.5px] font-bold text-gray-900">
          {item.sku}
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-gray-500">
          {item.sizeInches} inches wide
        </div>
      </div>
    </div>
  );
};

// ─── The mock ────────────────────────────────────────────────────────────────
export const MockOrderAutomation = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* ── LEFT panel — Paste your SKUs ─────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-gray-50/40 p-5 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-heading text-[13px] font-bold uppercase tracking-[0.12em] text-gray-500">
            1. Paste your SKUs
          </h4>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            6 lines
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-inner">
          <textarea
            readOnly
            value={MOCK_SKU_INPUT}
            aria-hidden
            tabIndex={-1}
            spellCheck={false}
            className={cn(
              "block h-44 w-full resize-none rounded-xl border-0 bg-transparent p-4",
              "font-mono text-[12.5px] leading-[1.7] text-gray-800",
              "outline-none focus:ring-0",
              "selection:bg-indigo-100"
            )}
          />
        </div>

        <p className="mt-2 text-[11.5px] text-gray-500">
          Tip: copy the <span className="font-semibold text-gray-700">SKU</span>{" "}
          and <span className="font-semibold text-gray-700">Quantity</span>{" "}
          columns from your Shopify export.
        </p>

        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg",
            "border border-gray-200 bg-white px-4 py-2.5",
            "text-[13px] font-semibold text-gray-400",
            "cursor-not-allowed"
          )}
        >
          Parse SKUs →
        </button>
      </div>

      {/* ── RIGHT panel — Preview ────────────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-heading text-[13px] font-bold uppercase tracking-[0.12em] text-gray-500">
            2. Preview
          </h4>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            All matched
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {MOCK_PREVIEW.map((item) => (
            <PreviewCard key={item.sku} item={item} />
          ))}
        </div>

        {/* Summary + CTA */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-violet-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[12.5px] leading-snug text-gray-700">
            <span className="font-heading font-bold text-gray-900">
              {MOCK_SUMMARY.totalTransfers} transfers
            </span>{" "}
            across{" "}
            <span className="font-semibold text-gray-900">
              {MOCK_SUMMARY.uniqueDesigns} designs
            </span>
            {" "}→{" "}
            <span className="font-semibold text-gray-900">
              {MOCK_SUMMARY.sheetCount} sheets
            </span>{" "}
            <span className="text-gray-500">
              at {MOCK_SUMMARY.sheetSize}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              "inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full",
              "bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2.5",
              "text-[13px] font-semibold text-white",
              "shadow-[0_6px_18px_rgba(79,70,229,0.32)]",
              "cursor-default"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            Generate Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
