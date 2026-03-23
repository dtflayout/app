import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // 'production' or 'development'
  enabled: import.meta.env.PROD, // Only send errors in production builds

  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  // Performance monitoring: sample 10% of transactions
  tracesSampleRate: 0.1,

  // Session replay is not included (paid feature)
  // Add Sentry.replayIntegration() later if needed

  // Don't send errors from localhost
  beforeSend(event) {
    if (window.location.hostname === 'localhost') {
      return null;
    }
    return event;
  },
});
