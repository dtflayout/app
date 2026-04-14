/**
 * GA4 Event Tracking Helpers
 * 
 * Updated to export `trackEvent` for use by the unified analytics module.
 * Your existing ga.ts functions (trackCTA, trackCalculator, etc.) still work.
 * 
 * MERGE THIS: If you already have src/lib/ga.ts, just add the `trackEvent` export
 * and keep your existing functions. The key addition is the generic trackEvent wrapper.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Generic event tracker — used by the unified analytics module.
 * Maps directly to gtag('event', ...).
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// ── Your existing helpers (keep these as-is) ──

export function trackCTA(label: string, destination: string): void {
  trackEvent('cta_click', { label, destination });
}

export function trackCalculator(action: string, values?: Record<string, unknown>): void {
  trackEvent('calculator_interaction', { action, ...values });
}

export function trackDemoBuilder(action: string, values?: Record<string, unknown>): void {
  trackEvent('demo_builder_interaction', { action, ...values });
}

export function trackSectionView(section: string): void {
  trackEvent('section_view', { section });
}
