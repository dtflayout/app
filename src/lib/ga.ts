/**
 * GA4 Analytics Helper
 * 
 * Setup: Replace GA_MEASUREMENT_ID in index.html with your actual ID.
 * GA4 auto-tracks: page_view, scroll, click, UTM params, geo, device.
 * This file only adds custom event helpers for manual tracking.
 */

// Check if gtag is loaded
function gtag(...args: any[]) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag(...args);
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  gtag('event', eventName, params);
}

/**
 * Track CTA button click
 */
export function trackCTA(label: string, destination?: string) {
  trackEvent('cta_click', {
    cta_label: label,
    destination: destination || '',
    page_path: window.location.pathname,
  });
}

/**
 * Track calculator interaction
 */
export function trackCalculator(action: string, values?: Record<string, any>) {
  trackEvent('calculator_interact', {
    calc_action: action,
    ...values,
  });
}

/**
 * Track demo builder interaction
 */
export function trackDemoBuilder(action: string, values?: Record<string, any>) {
  trackEvent('demo_builder', {
    builder_action: action,
    ...values,
  });
}

/**
 * Track section view (use with IntersectionObserver)
 */
export function trackSectionView(sectionName: string) {
  trackEvent('section_view', {
    section: sectionName,
    page_path: window.location.pathname,
  });
}
