import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from './helpers';

// ── Dodo SDK mock ────────────────────────────────────────────────────────
const mockCreate = vi.fn();

vi.mock('dodopayments', () => {
  return {
    default: function MockDodoPayments() {
      return { checkoutSessions: { create: mockCreate } };
    },
  };
});

import handler from '../create-checkout';

describe('POST /api/create-checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      session_id: 'sess_test_123',
      checkout_url: 'https://checkout.dodopayments.com/sess_test_123',
    });
  });

  it('rejects non-POST', async () => {
    const req = mockRequest({ method: 'GET' });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 if required fields missing', async () => {
    const req = mockRequest({ body: { plan_id: 'starter' } });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 400 for invalid plan_id', async () => {
    const req = mockRequest({
      body: {
        plan_id: 'enterprise',
        region: 'india',
        user_email: 'a@b.com',
        user_id: 'u1',
      },
    });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Invalid plan_id/);
  });

  it('returns 400 for invalid region', async () => {
    const req = mockRequest({
      body: {
        plan_id: 'starter',
        region: 'europe',
        user_email: 'a@b.com',
        user_id: 'u1',
      },
    });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Invalid region/);
  });

  it('creates checkout session for india starter plan', async () => {
    const req = mockRequest({
      body: {
        plan_id: 'starter',
        region: 'india',
        user_email: 'test@example.com',
        user_name: 'Test User',
        user_id: 'user-123',
      },
    });
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.checkout_url).toBe('https://checkout.dodopayments.com/sess_test_123');

    // In test mode, product_id should be overridden to test product
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.product_cart[0].product_id).toBe('pdt_0NbB4gGZZa0PUdOs8zDEA');
    expect(createArg.customer.email).toBe('test@example.com');
    expect(createArg.metadata.user_id).toBe('user-123');
    expect(createArg.metadata.plan_id).toBe('starter');
    expect(createArg.metadata.credits).toBe('150000');
  });

  it('creates checkout session for global max plan', async () => {
    const req = mockRequest({
      body: {
        plan_id: 'max',
        region: 'global',
        user_email: 'global@test.com',
        user_id: 'u2',
      },
    });
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.metadata.credits).toBe('2000000');
  });

  it('handles Dodo SDK errors gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('Dodo API timeout'));

    const req = mockRequest({
      body: {
        plan_id: 'starter',
        region: 'india',
        user_email: 'a@b.com',
        user_id: 'u1',
      },
    });
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(500);
    expect(res._json.error).toBe('Failed to create checkout session');
  });

  it('sets CORS headers for allowed origins', async () => {
    const req = mockRequest({
      body: {
        plan_id: 'starter',
        region: 'india',
        user_email: 'a@b.com',
        user_id: 'u1',
      },
      headers: { origin: 'https://dtflayout.com' },
    });
    const res = mockResponse();
    await handler(req, res);

    expect(res._headers['Access-Control-Allow-Origin']).toBe('https://dtflayout.com');
  });

  it('handles OPTIONS preflight', async () => {
    const req = mockRequest({
      method: 'OPTIONS',
      headers: { origin: 'https://dtflayout.com' },
    });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._ended).toBe(true);
  });
});
