-- Migration: 009_pre_launch_constraints.sql
-- Purpose: Pre-launch safety constraints from Launch Playbook §3.1
-- Run in: Supabase SQL Editor (production)
-- Date: March 2026
--
-- VERIFIED against actual Supabase schema:
--   credits (id, user_id, email, balance, free_trial_claimed, created_at)
--   credit_transactions (id, user_id, type, amount, balance_after, description, design_id, payment_id, created_at)
--   quick_store_analytics (quick_store_id, event_type, created_at, ...)
--   quick_stores (id, ...)

-- ═══════════════════════════════════════════════════════════════════════
-- 1. Prevent negative credit balances at DB level
--    Catches any edge case where application logic fails to check
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE credits
  ADD CONSTRAINT balance_non_negative
  CHECK (balance >= 0);

-- ROLLBACK:
-- ALTER TABLE credits DROP CONSTRAINT balance_non_negative;


-- ═══════════════════════════════════════════════════════════════════════
-- 2. Make credit_transactions table append-only (no UPDATE or DELETE)
--    Financial records should never be modified after creation
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No updates on credit_transactions" ON credit_transactions;
CREATE POLICY "No updates on credit_transactions"
  ON credit_transactions FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No deletes on credit_transactions" ON credit_transactions;
CREATE POLICY "No deletes on credit_transactions"
  ON credit_transactions FOR DELETE
  USING (false);

-- ROLLBACK:
-- DROP POLICY IF EXISTS "No updates on credit_transactions" ON credit_transactions;
-- DROP POLICY IF EXISTS "No deletes on credit_transactions" ON credit_transactions;


-- ═══════════════════════════════════════════════════════════════════════
-- 3. Scoped storage uploads for design-files bucket
--    Only allow uploads to paths starting with a valid UUID or orders/
-- ═══════════════════════════════════════════════════════════════════════

-- NOTE: Check if this policy already exists before running.
-- If your current policy has a different name, drop that one first.

-- DROP POLICY IF EXISTS "Anyone can upload design files" ON storage.objects;

-- CREATE POLICY "Scoped design file uploads"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'design-files'
--     AND (name ~ '^[0-9a-f-]{36}/'
--          OR name ~ '^orders/[a-z0-9-]+/')
--   );

-- ROLLBACK:
-- DROP POLICY IF EXISTS "Scoped design file uploads" ON storage.objects;


-- ═══════════════════════════════════════════════════════════════════════
-- 4. Analytics daily aggregation table (for long-term reporting after
--    raw events are purged at 90 days by the cron job)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quick_store_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quick_store_id UUID NOT NULL REFERENCES quick_stores(id),
  date DATE NOT NULL,
  page_views INT DEFAULT 0,
  product_views INT DEFAULT 0,
  builder_opens INT DEFAULT 0,
  order_submits INT DEFAULT 0,
  UNIQUE(quick_store_id, date)
);

-- ROLLBACK:
-- DROP TABLE IF EXISTS quick_store_analytics_daily;


-- ═══════════════════════════════════════════════════════════════════════
-- DEFERRED: Unique constraint on payment_id
-- Add this AFTER Dodo Payments is integrated and payment_id is populated:
--
--   ALTER TABLE credit_transactions
--     ADD CONSTRAINT unique_payment_per_user
--     UNIQUE (user_id, payment_id);
--
-- Currently all payment_id values are NULL so this constraint
-- would not be useful yet.
-- ═══════════════════════════════════════════════════════════════════════
