import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from './helpers';

// ── Supabase mock ────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn().mockReturnValue({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockResolvedValue({ error: null }),
  update: mockUpdate.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import handler from '../claim-free-trial';

describe('POST /api/claim-free-trial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain: from() → select() → eq() → single()
    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
      insert: mockInsert,
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it('rejects non-POST', async () => {
    const req = mockRequest({ method: 'GET' });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it('returns 400 if user_id or user_email is missing', async () => {
    const req = mockRequest({ body: { user_id: '', user_email: '' } });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.error).toMatch(/Missing required fields/);
  });

  it('returns 400 if trial already claimed', async () => {
    mockSingle.mockResolvedValue({
      data: { balance: 20000, free_trial_claimed: true },
      error: null,
    });

    const req = mockRequest({ body: { user_id: 'u1', user_email: 'a@b.com' } });
    const res = mockResponse();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._json.already_claimed).toBe(true);
  });

  it('adds 20K credits to existing user and logs transaction', async () => {
    mockSingle.mockResolvedValue({
      data: { balance: 5000, free_trial_claimed: false },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });

    const req = mockRequest({ body: { user_id: 'u1', user_email: 'a@b.com' } });
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.success).toBe(true);
    expect(res._json.new_balance).toBe(25000); // 5000 + 20000, rounded
    expect(res._json.credits_added).toBe(20000);

    // Verify credit_transactions insert was called (for the log)
    expect(mockInsert).toHaveBeenCalled();
    const insertCall = mockInsert.mock.calls.find(
      (call: any[]) => call[0]?.plan_id === 'free_trial'
    );
    expect(insertCall).toBeDefined();
    expect(insertCall![0].credits_added).toBe(20000);
  });

  it('creates new user with trial credits and logs transaction', async () => {
    // User doesn't exist — PGRST116
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });
    mockInsert.mockResolvedValue({ error: null });

    const req = mockRequest({ body: { user_id: 'new-user', user_email: 'new@b.com' } });
    const res = mockResponse();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._json.new_balance).toBe(20000);

    // Should have 2 inserts: credits row + credit_transactions row
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('uses Math.round to avoid floating point artifacts', async () => {
    mockSingle.mockResolvedValue({
      data: { balance: 1565669.7000000002, free_trial_claimed: false },
      error: null,
    });
    mockInsert.mockResolvedValue({ error: null });

    const req = mockRequest({ body: { user_id: 'u1', user_email: 'a@b.com' } });
    const res = mockResponse();
    await handler(req, res);

    expect(res._json.new_balance).toBe(1585670); // Math.round(1565669.7 + 20000)
  });
});
