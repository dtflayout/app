/**
 * PostHog Analytics — initialization, identification, and event tracking.
 * 
 * Setup:
 * 1. Create account at https://posthog.com (free tier)
 * 2. Get your Project API Key from Project Settings
 * 3. Add VITE_POSTHOG_KEY to .env and Vercel env vars
 * 4. PostHog host defaults to https://us.i.posthog.com (US cloud)
 * 
 * This module auto-initializes on first import if the key is set.
 */

import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

/**
 * Initialize PostHog. Called once on app load.
 * Safe to call multiple times — will no-op after first init.
 */
export function initPostHog(): void {
  if (initialized || !POSTHOG_KEY) {
    if (!POSTHOG_KEY) {
      console.warn('[PostHog] VITE_POSTHOG_KEY not set — tracking disabled');
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    
    // Autocapture: clicks, form submissions, pageviews
    autocapture: true,
    
    // Session recording (free: 5,000/month)
    enable_recording_consent: false,  // Set true if you need explicit consent
    
    // Capture page views automatically on route change
    capture_pageview: true,
    capture_pageleave: true,
    
    // Performance
    loaded: (ph) => {
      // In dev mode, you can enable debug
      if (import.meta.env.DEV) {
        ph.debug();
      }
    },
    
    // Privacy
    respect_dnt: false,  // DTF Layout is B2B — DNT not typically expected
    
    // Disable in dev if you want (uncomment below)
    // disabled: import.meta.env.DEV,
    
    persistence: 'localStorage+cookie',
    
    // Bootstrap: capture UTM params from URL automatically
    capture_performance: true,
  });

  initialized = true;
}

/**
 * Identify a logged-in user. Call on login/signup.
 * This stitches anonymous events to the user profile.
 */
export function identifyUser(
  userId: string,
  traits?: {
    email?: string;
    name?: string;
    plan?: string;
    companyName?: string;
    signupDate?: string;
    product?: 'wi' | 'qs' | 'both';
    [key: string]: unknown;
  }
): void {
  if (!POSTHOG_KEY) return;
  posthog.identify(userId, traits);
}

/**
 * Reset identity on logout. Critical for shared devices.
 */
export function resetUser(): void {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

/**
 * Track a custom event.
 */
export function phTrack(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!POSTHOG_KEY) return;
  posthog.capture(eventName, properties);
}

/**
 * Set persistent user properties (survives sessions).
 * Use for things like plan tier, company size, etc.
 */
export function setUserProperties(properties: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.people.set(properties);
}

/**
 * Set properties only once (won't overwrite).
 * Good for: first_seen_at, original_utm_source, signup_campaign
 */
export function setUserPropertiesOnce(properties: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.people.set_once(properties);
}

/**
 * Get the current PostHog distinct ID (anonymous or identified).
 * Useful for server-side event stitching.
 */
export function getDistinctId(): string | undefined {
  if (!POSTHOG_KEY) return undefined;
  return posthog.get_distinct_id();
}

/**
 * Register "super properties" — attached to every subsequent event.
 * Use for: current_product ('wi'|'qs'), current_store_slug, etc.
 */
export function registerSuperProperties(properties: Record<string, unknown>): void {
  if (!POSTHOG_KEY) return;
  posthog.register(properties);
}

/**
 * Check if PostHog is initialized and has a key.
 */
export function isPostHogEnabled(): boolean {
  return !!POSTHOG_KEY && initialized;
}

// Export the raw posthog instance for advanced use cases
export { posthog };
