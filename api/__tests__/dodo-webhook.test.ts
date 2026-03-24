import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from './helpers';

// ── Supabase mock ────────────────────────────────────────────────────────
const mockSelectData = vi.fn();
const mockInsertData = vi.fn();
const mockUpdateData = vi.fn();

const buildChain = () => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: mockSelectData,
      eq: vi.fn().mockReturnValue({
        single: mockSelectData,
      }),
    }),
  }),
  insert: mockInsertData,
  update: vi.fn().mockReturnValue({
    eq: mockUpdateData,
  }),
});

const mockFrom = vi.fn().mockImplementation(() => buildChain());

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

// ── standardwebhooks mock ────────────────────────────────────────────────
const mockVerify = vi.fn();

vi.mock('standardwebhooks', () => ({
  Webhook: function MockWebhook() {
    return { verify: mockVerify };
  },
}));

import handler from '../dodo-webhook';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeWebhookPayload(overrides: Record<string, any> = {}) {
  return {
    type: 'payment.succeeded',
    data: {
      payment_id: 'pay_test_001',
      status: 'succeeded',
      customer: { email: 'buyer@example.com' },
      total_amount: 1999,
      currency: 'INR',
      invoice_url: 'https://dodo.com/inv/123',
      metadata: {
        user_id: 'user-abc',
        plan_id: 'starter',
        region: 'india',
        credits: '150000',
      },
      product_cart: [
        { product_id: 'pdt_0NbAZg2ZiDFl8o4J1Ovfa', quantity: 1 },
      ],
      ...overrides,
    },
  };
}

function webhookRequest(body: any) {
  return mockRequest({
    method: 'POST',
    body,
    headers: {
      'webhook-id': 'wh_test_id',
      'webhook-signature': 'v1,testsig',
      'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
    },
  });
}

describe('POST /api/dodo-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockReturnValue(true); // signature valid

    // Default Supabase behavior per table call:
    let callIndex = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'credit_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'credits') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { balance: 10000 }, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return buildChain();
    });
  });

  it('rejects non-POST', async () => {
    const req = mockRequest({ method: 'GET' });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 on invalid signature', async () => {
    mockVerify.mockImplementation(() => { throw new Error('bad sig'); });
    const payload = makeWebhookPayload();
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toBe('Invalid webhook signature');
  });

  it('processes payment.succeeded — adds credits and logs transaction', async () => {
    const payload = makeWebhookPayload();
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.received).toBe(true);
    expect(res._json.credits_added).toBe(150000);
  });

  it('skips duplicate payments (idempotency)', async () => {
    // Simulate existing successful transaction
    mockFrom.mockImplementation((table: string) => {
      if (table === 'credit_transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { payment_id: 'pay_test_001' }, error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return buildChain();
    });

    const payload = makeWebhookPayload();
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.message).toBe('Already processed');
  });

  it('returns 200 with error if user_id is missing from metadata', async () => {
    const payload = makeWebhookPayload();
    payload.data.metadata = { plan_id: 'starter', credits: '150000' } as any;
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.error).toBe('Missing user identification');
  });

  it('acknowledges payment.failed events', async () => {
    const payload = {
      type: 'payment.failed',
      data: { payment_id: 'pay_fail_001', error_message: 'Card declined' },
    };
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.received).toBe(true);
  });

  it('acknowledges unknown events without error', async () => {
    const payload = { type: 'subscription.created', data: {} };
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.received).toBe(true);
  });

  it('resolves test product ID to correct plan info', async () => {
    const payload = makeWebhookPayload();
    payload.data.product_cart = [
      { product_id: 'pdt_0NbB4gGZZa0PUdOs8zDEA', quantity: 1 },
    ];
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.credits_added).toBe(150000);
  });

  it('falls back to metadata.credits if product not in map', async () => {
    const payload = makeWebhookPayload();
    payload.data.product_cart = [
      { product_id: 'pdt_unknown_product', quantity: 1 },
    ];
    payload.data.metadata.credits = '75000';
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.credits_added).toBe(75000);
  });

  it('returns error if credits cannot be determined at all', async () => {
    const payload = makeWebhookPayload();
    payload.data.product_cart = [
      { product_id: 'pdt_unknown_product', quantity: 1 },
    ];
    delete (payload.data.metadata as any).credits;
    const req = webhookRequest(payload);
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.error).toBe('Could not determine credits');
  });
});
