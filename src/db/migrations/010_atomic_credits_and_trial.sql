-- Migration: 010_atomic_credits_and_trial.sql
-- Purpose: Fix race conditions in credit addition + atomic free trial claim
-- Run in: Supabase SQL Editor (production)
-- Date: April 2026

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Atomic credit ADDITION (mirrors deduct_credits_atomic)
--    Prevents race conditions from concurrent webhook/payment calls
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION add_credits_atomic(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: credit record does not exist';
  END IF;

  v_new_balance := ROUND(v_current_balance + p_amount);

  UPDATE credits
    SET balance = v_new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS add_credits_atomic(TEXT, NUMERIC);


-- ═══════════════════════════════════════════════════════════════════════
-- 2. Atomic free trial claim
--    Single atomic operation: check eligibility + add credits + mark claimed
--    Returns new balance, or raises exception if already claimed / not found
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION claim_free_trial_atomic(
  p_user_id UUID,
  p_credits NUMERIC DEFAULT 20000
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance    NUMERIC;
  v_free_trial_claimed BOOLEAN;
  v_new_balance        NUMERIC;
BEGIN
  SELECT balance, free_trial_claimed
    INTO v_current_balance, v_free_trial_claimed
    FROM credits
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    -- No credits row yet (trigger might not have fired) — create one
    INSERT INTO credits (user_id, balance, free_trial_claimed, created_at, updated_at)
      VALUES (p_user_id, p_credits, TRUE, now(), now());
    RETURN p_credits;
  END IF;

  IF v_free_trial_claimed THEN
    RAISE EXCEPTION 'Free trial already claimed';
  END IF;

  v_new_balance := ROUND(v_current_balance + p_credits);

  UPDATE credits
    SET balance = v_new_balance,
        free_trial_claimed = TRUE,
        updated_at = now()
    WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;

-- ROLLBACK:
-- DROP FUNCTION IF EXISTS claim_free_trial_atomic(TEXT, NUMERIC);


-- ═══════════════════════════════════════════════════════════════════════
-- 3. Update deduct_credits_atomic to ROUND the result
--    (fixes floating point artifacts seen in credit_transactions)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  SELECT balance INTO v_current_balance
    FROM credits
    WHERE user_id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: credit record does not exist';
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: have %, need %', v_current_balance, p_amount;
  END IF;

  v_new_balance := ROUND(v_current_balance - p_amount);

  UPDATE credits
    SET balance = v_new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;
