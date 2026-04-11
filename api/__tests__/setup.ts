/**
 * Test setup — sets env vars and mocks external dependencies shared across all API tests.
 */
import { vi } from 'vitest';

// ── Env vars (always before any imports that read them) ───────────────────
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.DODO_PAYMENTS_API_KEY = 'test-dodo-key';
process.env.DODO_WEBHOOK_KEY = 'whsec_test_secret';
process.env.DODO_TEST_PRODUCT_ID = 'pdt_0NbB4gGZZa0PUdOs8zDEA';
// Disable rate limiting in tests
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

// ── Mock Sentry (noop) ───────────────────────────────────────────────────
vi.mock('../lib/sentry.js', () => ({
  initSentry: vi.fn(),
  Sentry: { captureException: vi.fn() },
}));

// ── Mock rate limiter (always allow) ─────────────────────────────────────
vi.mock('../lib/rateLimit.js', () => ({
  applyRateLimit: vi.fn().mockResolvedValue(false),
  paymentLimiter: {},
  generalLimiter: {},
  publicLimiter: {},
}));
