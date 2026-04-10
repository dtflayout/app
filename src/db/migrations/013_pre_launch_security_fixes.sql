-- Migration: 013_pre_launch_security_fixes.sql
-- Purpose: Fix RLS gaps identified in security audit (April 2026)
-- Run in: Supabase SQL Editor (production)
--
-- BEFORE RUNNING: Check which tables already have RLS enabled:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--
-- Also check existing policies:
--   SELECT * FROM pg_policies WHERE tablename IN ('credits', 'credit_transactions', 'quick_store_messages', 'quick_store_orders');


-- ═══════════════════════════════════════════════════════════════════════
-- H2. CREDITS TABLE — Enable RLS + restrict client access
--     Credits should only be readable by the owner.
--     All writes happen via service-role RPCs (add_credits_atomic, etc.)
-- ═══════════════════════════════════════════════════════════════════════

-- Check first: SELECT rowsecurity FROM pg_tables WHERE tablename = 'credits';
-- Only run if RLS is NOT already enabled:

ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
CREATE POLICY "Users can view their own credits"
  ON credits FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own credits row (for getOrCreateUserCredits fallback)
DROP POLICY IF EXISTS "Users can insert their own credits" ON credits;
CREATE POLICY "Users can insert their own credits"
  ON credits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Block client-side UPDATE — all balance changes go through atomic RPCs via service role
DROP POLICY IF EXISTS "No direct client updates on credits" ON credits;
CREATE POLICY "No direct client updates on credits"
  ON credits FOR UPDATE
  USING (false);

-- Block client-side DELETE
DROP POLICY IF EXISTS "No direct client deletes on credits" ON credits;
CREATE POLICY "No direct client deletes on credits"
  ON credits FOR DELETE
  USING (false);


-- ═══════════════════════════════════════════════════════════════════════
-- H3. QUICK_STORE_MESSAGES — Enable RLS
--     Public can submit messages, only store owner can read/update them
-- ═══════════════════════════════════════════════════════════════════════

-- Check first if table exists:
--   SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quick_store_messages');

ALTER TABLE quick_store_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a message (contact form)
DROP POLICY IF EXISTS "Anyone can submit messages" ON quick_store_messages;
CREATE POLICY "Anyone can submit messages"
  ON quick_store_messages FOR INSERT
  WITH CHECK (true);

-- Store owners can view their messages
DROP POLICY IF EXISTS "Store owners can view their messages" ON quick_store_messages;
CREATE POLICY "Store owners can view their messages"
  ON quick_store_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_messages.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

-- Store owners can update messages (mark as read)
DROP POLICY IF EXISTS "Store owners can update their messages" ON quick_store_messages;
CREATE POLICY "Store owners can update their messages"
  ON quick_store_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_messages.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );

-- Store owners can delete messages
DROP POLICY IF EXISTS "Store owners can delete their messages" ON quick_store_messages;
CREATE POLICY "Store owners can delete their messages"
  ON quick_store_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_messages.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- H5. QUICK_STORE_ORDERS — Add missing DELETE policy
--     Printers need to delete orders from the dashboard
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can delete their store orders" ON quick_store_orders;
CREATE POLICY "Users can delete their store orders"
  ON quick_store_orders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quick_stores
      WHERE quick_stores.id = quick_store_orders.quick_store_id
      AND quick_stores.user_id = auth.uid()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- M6. CREDIT_TRANSACTIONS — Add unique constraint on payment_id
--     Prevents duplicate credit additions from webhook retries
--     (partial index: only applies where payment_id is NOT NULL)
-- ═══════════════════════════════════════════════════════════════════════

-- This is safe to add even if some rows have NULL payment_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_unique_payment
  ON credit_transactions (payment_id)
  WHERE payment_id IS NOT NULL;


-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES — Run these after the migration to confirm
-- ═══════════════════════════════════════════════════════════════════════

-- Check RLS is enabled on all critical tables:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('credits', 'credit_transactions', 'quick_store_messages',
--                    'quick_store_orders', 'quick_stores', 'designs',
--                    'printers', 'profiles');

-- Check all policies:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('credits', 'credit_transactions', 'quick_store_messages', 'quick_store_orders')
-- ORDER BY tablename, policyname;


-- ═══════════════════════════════════════════════════════════════════════
-- ROLLBACK (if needed)
-- ═══════════════════════════════════════════════════════════════════════
-- DROP POLICY IF EXISTS "Users can view their own credits" ON credits;
-- DROP POLICY IF EXISTS "Users can insert their own credits" ON credits;
-- DROP POLICY IF EXISTS "No direct client updates on credits" ON credits;
-- DROP POLICY IF EXISTS "No direct client deletes on credits" ON credits;
-- ALTER TABLE credits DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Anyone can submit messages" ON quick_store_messages;
-- DROP POLICY IF EXISTS "Store owners can view their messages" ON quick_store_messages;
-- DROP POLICY IF EXISTS "Store owners can update their messages" ON quick_store_messages;
-- DROP POLICY IF EXISTS "Store owners can delete their messages" ON quick_store_messages;
-- ALTER TABLE quick_store_messages DISABLE ROW LEVEL SECURITY;
--
-- DROP POLICY IF EXISTS "Users can delete their store orders" ON quick_store_orders;
--
-- DROP INDEX IF EXISTS idx_credit_transactions_unique_payment;
