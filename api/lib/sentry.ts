import * as Sentry from '@sentry/node';

// Initialize Sentry for server-side (Vercel serverless functions)
let isInitialized = false;

export function initSentry() {
  if (isInitialized) return;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN not configured — server-side error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || 'development',
    tracesSampleRate: 0.1,
  });

  isInitialized = true;
}

/**
 * Wrap a Vercel API handler with Sentry error capturing.
 * Usage:
 *   export default withSentry(async function handler(req, res) { ... });
 */
export function withSentry(
  handler: (req: any, res: any) => Promise<any>
) {
  return async (req: any, res: any) => {
    initSentry();
    try {
      return await handler(req, res);
    } catch (error) {
      Sentry.captureException(error);
      await Sentry.flush(2000);
      throw error;
    }
  };
}

export { Sentry };
