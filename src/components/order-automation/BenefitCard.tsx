/**
 * BenefitCard
 * Card used in the "Why you'll love it" 3-up bento grid. Different
 * accent colors per card (indigo, violet, emerald) tinted into the
 * icon block and a soft corner glow.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Benefit } from "./copy";

interface BenefitCardProps {
  benefit: Benefit;
  children?: ReactNode; // optional extra content (e.g. platform pills)
}

const ACCENT_STYLES: Record<
  Benefit["accent"],
  { iconBg: string; glow: string; pill: string }
> = {
  indigo: {
    iconBg: "from-indigo-600 to-indigo-500",
    glow: "from-indigo-200/60 to-transparent",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-100",
  },
  violet: {
    iconBg: "from-violet-600 to-violet-500",
    glow: "from-violet-200/60 to-transparent",
    pill: "bg-violet-50 text-violet-700 border-violet-100",
  },
  emerald: {
    iconBg: "from-emerald-600 to-emerald-500",
    glow: "from-emerald-200/60 to-transparent",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
};

export const BenefitCard = ({ benefit, children }: BenefitCardProps) => {
  const { Icon, title, body, accent } = benefit;
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl bg-white p-7 sm:p-8",
        "border border-gray-200/70",
        "shadow-[0_2px_10px_rgba(15,23,42,0.04)]",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(79,70,229,0.10)]"
      )}
    >
      {/* Corner glow — subtle accent color leak from top-right */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-radial blur-2xl",
          "bg-gradient-to-br opacity-70",
          styles.glow
        )}
      />

      {/* Icon block — `flex` so it claims its own line consistently */}
      <div
        className={cn(
          "relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white",
          styles.iconBg,
          "shadow-[0_8px_22px_rgba(79,70,229,0.22)]"
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>

      <h3 className="font-heading relative z-10 mb-3 text-xl font-bold leading-tight tracking-tight text-gray-900">
        {title}
      </h3>

      <p className="relative z-10 text-sm leading-relaxed text-gray-600">
        {body}
      </p>

      {children && <div className="relative z-10 mt-5">{children}</div>}
    </div>
  );
};
