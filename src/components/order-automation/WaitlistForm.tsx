/**
 * WaitlistForm
 * Email capture used in two places on the Order Automation page:
 *  - In the main "Be first in line" section (variant: "panel")
 *  - In the footer CTA strip (variant: "strip")
 *
 * Persists to feature_waitlist via waitlistService. Duplicate submissions
 * are surfaced as success — see waitlistService for rationale.
 */
import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { joinFeatureWaitlist } from "@/services/waitlistService";
import { FEATURE, WAITLIST } from "./copy";

interface WaitlistFormProps {
  variant?: "panel" | "strip";
  source: string;
  className?: string;
}

export const WaitlistForm = ({
  variant = "panel",
  source,
  className,
}: WaitlistFormProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setSubmitting(true);
    const result = await joinFeatureWaitlist({
      email: trimmed,
      featureSlug: FEATURE.slug,
      source,
      userId: user?.id ?? null,
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSubmittedEmail(trimmed);
    setEmail("");
  };

  // ── Success state ─────────────────────────────────────────────────────
  if (submittedEmail) {
    if (variant === "strip") {
      return (
        <div
          className={cn(
            "flex items-center justify-center gap-2 text-sm font-medium text-emerald-300",
            className
          )}
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
          <span>{WAITLIST.successHeading} — emailing {submittedEmail}.</span>
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 sm:p-6",
          className
        )}
      >
        <div className="flex-shrink-0 rounded-xl bg-emerald-500/15 p-2 text-emerald-600">
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-heading text-base font-bold text-emerald-900">
            {WAITLIST.successHeading}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800/85">
            {WAITLIST.successBody(submittedEmail)}
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────
  if (variant === "strip") {
    // Compact horizontal form — sits inside a dark navy footer band.
    return (
      <form
        onSubmit={onSubmit}
        className={cn(
          "mx-auto flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch",
          className
        )}
        noValidate
      >
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={WAITLIST.placeholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          disabled={submitting}
          aria-label="Email address"
          className={cn(
            "h-12 flex-1 rounded-full border-white/15 bg-white/[0.07] px-5 text-sm",
            "text-white placeholder:text-white/45",
            "focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-0"
          )}
        />
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-full",
            "bg-gradient-to-br from-indigo-500 to-violet-500 px-7",
            "text-sm font-semibold text-white",
            "shadow-[0_6px_22px_rgba(124,58,237,0.4)]",
            "transition-all duration-200 hover:from-indigo-400 hover:to-violet-400 hover:shadow-[0_8px_28px_rgba(124,58,237,0.55)]",
            "disabled:opacity-70 disabled:cursor-not-allowed"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>{WAITLIST.cta}</>
          )}
        </button>
        {error && (
          <p className="basis-full text-center text-xs text-red-300 sm:text-left">
            {error}
          </p>
        )}
      </form>
    );
  }

  // Panel variant — bigger, sits on a light section
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col gap-2.5 sm:flex-row sm:items-stretch",
        className
      )}
      noValidate
    >
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder={WAITLIST.placeholder}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(null);
        }}
        disabled={submitting}
        aria-label="Email address"
        className={cn(
          "h-12 flex-1 rounded-full border-gray-200 bg-white px-5 text-sm",
          "shadow-[0_2px_8px_rgba(15,23,42,0.04)]",
          "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
        )}
      />
      <button
        type="submit"
        disabled={submitting}
        className={cn(
          "inline-flex h-12 flex-shrink-0 items-center justify-center gap-2 rounded-full",
          "bg-gradient-to-br from-indigo-600 to-violet-600 px-7",
          "text-sm font-semibold text-white",
          "shadow-[0_8px_24px_rgba(79,70,229,0.32)]",
          "transition-all duration-200",
          "hover:from-indigo-500 hover:to-violet-500 hover:shadow-[0_10px_30px_rgba(79,70,229,0.42)]",
          "disabled:opacity-70 disabled:cursor-not-allowed"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>{WAITLIST.cta}</>
        )}
      </button>
      {error && (
        <p className="basis-full text-center text-xs text-red-600 sm:text-left">
          {error}
        </p>
      )}
    </form>
  );
};
