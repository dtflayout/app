/**
 * Unified Analytics Module for DTF Layout
 * 
 * Single interface that fires events to:
 * 1. PostHog (product analytics, session recording, funnels)
 * 2. GA4 (marketing overview, SEO, Google Ads integration)
 * 3. Custom Supabase (cold email attribution stitching)
 * 
 * Usage:
 *   import { analytics } from '@/lib/analytics';
 *   analytics.track('sheet_created', { sheet_count: 3, total_sq_inches: 450 });
 *   analytics.identify(userId, { email, plan });
 */

import { phTrack, identifyUser, resetUser, setUserPropertiesOnce, registerSuperProperties, getDistinctId } from './posthog';
import { trackEvent as gaTrack } from './ga';  // Your existing GA4 helper

// ─────────────────────────────────────────────
// Anonymous ID management (for pre-signup attribution)
// ─────────────────────────────────────────────

const ANON_ID_KEY = 'dtf_anon_id';
const SESSION_ID_KEY = 'dtf_session_id';

function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// ─────────────────────────────────────────────
// UTM parameter extraction & persistence
// ─────────────────────────────────────────────

interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  ref_code?: string;         // tracked link code from /go/:code redirect
}

const UTM_STORAGE_KEY = 'dtf_first_touch_utm';

function extractUTMFromURL(): UTMParams {
  const params = new URLSearchParams(window.location.search);
  const utm: UTMParams = {};
  
  if (params.get('utm_source')) utm.utm_source = params.get('utm_source')!;
  if (params.get('utm_medium')) utm.utm_medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) utm.utm_campaign = params.get('utm_campaign')!;
  if (params.get('utm_content')) utm.utm_content = params.get('utm_content')!;
  if (params.get('ref')) utm.ref_code = params.get('ref')!;
  
  return utm;
}

/**
 * Capture first-touch UTM (never overwrite).
 * Also capture last-touch UTM (always overwrite).
 */
function persistUTM(utm: UTMParams): void {
  if (Object.keys(utm).length === 0) return;
  
  // First-touch: only set if not already present
  if (!localStorage.getItem(UTM_STORAGE_KEY)) {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }
  
  // Last-touch: always overwrite
  localStorage.setItem('dtf_last_touch_utm', JSON.stringify(utm));
  
  // Also set as PostHog super properties (attached to every event)
  registerSuperProperties({
    last_utm_source: utm.utm_source,
    last_utm_medium: utm.utm_medium,
    last_utm_campaign: utm.utm_campaign,
    last_utm_content: utm.utm_content,
    tracked_link_code: utm.ref_code,
  });
}

function getFirstTouchUTM(): UTMParams {
  try {
    return JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getLastTouchUTM(): UTMParams {
  try {
    return JSON.parse(localStorage.getItem('dtf_last_touch_utm') || '{}');
  } catch {
    return {};
  }
}

// ─────────────────────────────────────────────
// Device detection
// ─────────────────────────────────────────────

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
}

// ─────────────────────────────────────────────
// Server-side event logging (Supabase via API route)
// ─────────────────────────────────────────────

async function logToServer(
  eventName: string,
  properties: Record<string, unknown> = {}
): Promise<void> {
  // Only log critical attribution events to server (keep costs low)
  const SERVER_EVENTS = [
    'page_view',
    'signup_started',
    'signup_completed',
    'onboarding_step',
    'onboarding_completed',
    'first_sheet_created',
    'first_download',
    'credits_purchased',
    'trial_claimed',
    'store_published',
  ];
  
  if (!SERVER_EVENTS.includes(eventName)) return;
  
  try {
    const utm = getLastTouchUTM();
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_properties: properties,
        anonymous_id: getOrCreateAnonId(),
        session_id: getOrCreateSessionId(),
        tracked_link_code: utm.ref_code,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
        referrer: document.referrer,
        page_url: window.location.href,
        device_type: getDeviceType(),
        browser: getBrowser(),
      }),
      keepalive: true,  // Ensure fires even on page unload
    });
  } catch {
    // Silent fail — analytics should never break the app
  }
}

// ─────────────────────────────────────────────
// Main analytics API
// ─────────────────────────────────────────────

export const analytics = {
  /**
   * Initialize analytics. Call once in your app entry point (main.tsx or App.tsx).
   */
  init(): void {
    // Extract and persist UTMs from current URL
    const utm = extractUTMFromURL();
    persistUTM(utm);
    
    // Log initial page view to server
    logToServer('page_view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });
  },
  
  /**
   * Track a custom event. Fires to PostHog + GA4 + server (if critical).
   */
  track(eventName: string, properties: Record<string, unknown> = {}): void {
    // PostHog (primary)
    phTrack(eventName, properties);
    
    // GA4
    gaTrack(eventName, properties);
    
    // Server-side (only for critical attribution events)
    logToServer(eventName, properties);
  },
  
  /**
   * Identify a user after login/signup.
   * Stitches all previous anonymous events to this user.
   */
  identify(
    userId: string,
    traits: {
      email?: string;
      name?: string;
      plan?: string;
      companyName?: string;
      product?: 'wi' | 'qs' | 'both';
      [key: string]: unknown;
    } = {}
  ): void {
    // Add first-touch attribution to user profile (set once, never overwrite)
    const firstTouch = getFirstTouchUTM();
    
    identifyUser(userId, {
      ...traits,
    });
    
    setUserPropertiesOnce({
      first_utm_source: firstTouch.utm_source,
      first_utm_medium: firstTouch.utm_medium,
      first_utm_campaign: firstTouch.utm_campaign,
      first_utm_content: firstTouch.utm_content,
      first_tracked_link_code: firstTouch.ref_code,
      signup_date: new Date().toISOString(),
      anonymous_id: getOrCreateAnonId(),
    });
    
    // Also fire server-side identify
    logToServer('signup_completed', {
      user_id: userId,
      ...traits,
      ...firstTouch,
    });
  },
  
  /**
   * Reset on logout.
   */
  reset(): void {
    resetUser();
    // Don't clear anon_id — it's useful for cross-session attribution
  },
  
  /**
   * Get attribution data (useful for passing to server on signup).
   */
  getAttribution(): {
    anonymousId: string;
    sessionId: string;
    firstTouch: UTMParams;
    lastTouch: UTMParams;
    posthogId?: string;
  } {
    return {
      anonymousId: getOrCreateAnonId(),
      sessionId: getOrCreateSessionId(),
      firstTouch: getFirstTouchUTM(),
      lastTouch: getLastTouchUTM(),
      posthogId: getDistinctId(),
    };
  },
  
  /**
   * Set the current product context. Attaches to all subsequent events.
   */
  setProduct(product: 'wi' | 'qs'): void {
    registerSuperProperties({ current_product: product });
  },
};

// ─────────────────────────────────────────────
// Pre-defined event helpers (type-safe, consistent naming)
// ─────────────────────────────────────────────

export const trackEvents = {
  // ── Onboarding ──
  onboardingStarted: (product: 'wi' | 'qs') =>
    analytics.track('onboarding_started', { product }),
  
  onboardingStep: (product: 'wi' | 'qs', step: number, stepName: string) =>
    analytics.track('onboarding_step', { product, step, step_name: stepName }),
  
  onboardingCompleted: (product: 'wi' | 'qs', duration_seconds?: number) =>
    analytics.track('onboarding_completed', { product, duration_seconds }),
  
  onboardingAbandoned: (product: 'wi' | 'qs', step: number, stepName: string) =>
    analytics.track('onboarding_abandoned', { product, step, step_name: stepName }),
  
  // ── Builder (sheet creation) ──
  builderOpened: (context: 'wi' | 'qs' | 'demo') =>
    analytics.track('builder_opened', { context }),
  
  imageUploaded: (count: number, totalSqInches: number) =>
    analytics.track('image_uploaded', { count, total_sq_inches: totalSqInches }),
  
  sheetCreated: (sheetCount: number, totalSqInches: number, dpi: number) =>
    analytics.track('sheet_created', { sheet_count: sheetCount, total_sq_inches: totalSqInches, dpi }),
  
  sheetDownloaded: (sheetCount: number, totalSqInches: number) =>
    analytics.track('sheet_downloaded', { sheet_count: sheetCount, total_sq_inches: totalSqInches }),
  
  // ── Credits ──
  trialClaimed: () =>
    analytics.track('trial_claimed'),
  
  creditsPurchased: (amount: number, sqInches: number, currency: string) =>
    analytics.track('credits_purchased', { amount, sq_inches: sqInches, currency }),
  
  creditsLow: (balance: number) =>
    analytics.track('credits_low', { balance }),
  
  // ── Quick Store ──
  storePublished: (slug: string) =>
    analytics.track('store_published', { slug }),
  
  storeCustomized: (changes: string[]) =>
    analytics.track('store_customized', { changes }),
  
  orderReceived: (product: 'wi' | 'qs', orderValue?: number) =>
    analytics.track('order_received', { product, order_value: orderValue }),
  
  orderApproved: (product: 'wi' | 'qs', creditsCost: number) =>
    analytics.track('order_approved', { product, credits_cost: creditsCost }),
  
  // ── Website Integration ──
  integrationCodeCopied: () =>
    analytics.track('integration_code_copied'),
  
  // ── Settings ──
  builderSettingsChanged: (product: 'wi' | 'qs', setting: string) =>
    analytics.track('builder_settings_changed', { product, setting }),
  
  // ── Navigation / Engagement ──
  dashboardViewed: (tab: string) =>
    analytics.track('dashboard_viewed', { tab }),
  
  pricingViewed: (source: string) =>
    analytics.track('pricing_viewed', { source }),
  
  ctaClicked: (label: string, destination: string, page: string) =>
    analytics.track('cta_clicked', { label, destination, page }),
  
  // ── Errors ──
  errorEncountered: (error: string, context: string) =>
    analytics.track('error_encountered', { error, context }),
  
  // ── Demo ──
  demoInteraction: (action: string, values?: Record<string, unknown>) =>
    analytics.track('demo_interaction', { action, ...values }),
};
