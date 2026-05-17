/**
 * waitlistService.ts
 * Email-capture for "Coming Soon" feature pages (Order Automation,
 * SKU Library, Pre-flight Checker, ...). Inserts into `feature_waitlist`
 * via the Supabase anon client — RLS policy "Anyone can join feature
 * waitlist" allows the INSERT.
 *
 * Duplicate submissions (same email + feature_slug) are treated as success.
 * The unique constraint on (email, feature_slug) is the safeguard; we use
 * `.upsert` with ignoreDuplicates so we don't surface a confusing error
 * when someone re-submits — the form just shows the success state.
 */

import { supabase } from "@/lib/supabaseClient";

export interface JoinWaitlistInput {
  email: string;
  featureSlug?: string;       // defaults to 'order-automation'
  source?: string;            // 'hero_cta' | 'footer_cta' | etc.
  userId?: string | null;     // auth.users.id when logged in
}

export interface JoinWaitlistResult {
  success: boolean;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinFeatureWaitlist(
  input: JoinWaitlistInput
): Promise<JoinWaitlistResult> {
  const email = input.email?.trim().toLowerCase();

  if (!email) {
    return { success: false, error: "Please enter your email." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const featureSlug = (input.featureSlug ?? "order-automation").trim();

  const row = {
    email,
    feature_slug: featureSlug,
    user_id: input.userId ?? null,
    source: input.source ?? null,
    referrer:
      typeof document !== "undefined" ? document.referrer || null : null,
    user_agent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  };

  const { error } = await supabase
    .from("feature_waitlist")
    .upsert(row, {
      onConflict: "email,feature_slug",
      ignoreDuplicates: true,
    });

  if (error) {
    // Network / RLS / unexpected — don't leak details to the user.
    console.error("[waitlistService] Insert failed:", error.message);
    return {
      success: false,
      error: "Something went wrong. Please try again in a moment.",
    };
  }

  return { success: true };
}
