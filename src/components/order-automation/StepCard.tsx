/**
 * StepCard
 * One numbered step in the 4-step illustrated flow. Designed to look
 * good both in a horizontal row (desktop) and stacked vertically (mobile).
 */
import { cn } from "@/lib/utils";
import type { Step } from "./copy";

interface StepCardProps {
  step: Step;
}

export const StepCard = ({ step }: StepCardProps) => {
  const { number, title, description, Icon } = step;

  return (
    <div
      className={cn(
        "group relative h-full rounded-2xl bg-white",
        "border border-indigo-100/80",
        "px-6 py-7 sm:p-7",
        "shadow-[0_2px_8px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.06)]",
        "transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(79,70,229,0.12),0_2px_6px_rgba(15,23,42,0.04)]",
        "hover:border-indigo-200"
      )}
    >
      {/* Big translucent number watermark in the corner */}
      <span
        aria-hidden
        className="font-heading absolute right-4 top-3 select-none text-[44px] sm:text-[56px] font-extrabold leading-none tracking-tight text-indigo-50 transition-colors duration-300 group-hover:text-indigo-100"
      >
        {number}
      </span>

      {/* Icon block — `flex` (not `inline-flex`) so it sits on its own line */}
      <div className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-[0_6px_18px_rgba(79,70,229,0.3)]">
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>

      {/* Step number tag (small) — block-level wrapper */}
      <div className="relative z-10 mb-2 flex items-center gap-2">
        <span className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600">
          Step {number}
        </span>
      </div>

      <h3 className="font-heading relative z-10 mb-2 text-lg font-bold leading-tight tracking-tight text-gray-900">
        {title}
      </h3>

      <p className="relative z-10 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
};
