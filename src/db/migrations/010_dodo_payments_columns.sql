-- Migration 010: Add Dodo Payments columns to credit_transactions
-- Run this BEFORE deploying the Dodo webhook handler.
--
-- The existing credit_transactions table has:
--   id, user_id, type, amount, balance_after, description, design_id, payment_id, created_at
--
-- The Dodo webhook handler needs these additional columns:
--   email, plan_id, plan_name, currency, credits_added, credits_before, credits_after,
--   status, error_message, invoice_url
--
-- This migration adds the missing columns without touching existing data.

-- 1. Add new columns (all nullable so existing rows aren't affected)
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS plan_id text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS plan_name text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS credits_added integer DEFAULT 0;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS credits_before integer DEFAULT 0;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS credits_after integer DEFAULT 0;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS status text DEFAULT 'success';
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS invoice_url text;

-- 2. Add unique constraint on payment_id to prevent duplicate webhook processing.
--    Partial index — only applies to non-null, successful payments.
--    This provides idempotency for the webhook handler.
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_payment_id_success
  ON credit_transactions (payment_id)
  WHERE payment_id IS NOT NULL AND status = 'success';

-- 3. Add index on user_id + created_at for fast transaction history lookups
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON credit_transactions (user_id, created_at DESC);

-- Note: The old verify-payment.ts wrote to a 'transactions' table that doesn't exist.
-- That code has been removed. All payment logs now go to credit_transactions.
