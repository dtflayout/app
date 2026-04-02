-- ============================================================
-- RLS Policy for `printers` table
-- 
-- Required so the public storefront builder (anonymous user)
-- can look up printer_builder_settings via the printer's user_id.
-- 
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Check existing policies first:
-- SELECT * FROM pg_policies WHERE tablename = 'printers';

-- Allow anonymous SELECT on active printers (needed for public builder + storefront)
CREATE POLICY "Anyone can view active printers"
  ON printers
  FOR SELECT
  USING (is_active = true);

-- If you already have a SELECT policy and it's too restrictive, 
-- you can drop it first:
-- DROP POLICY "existing_policy_name" ON printers;

-- Also ensure printer_builder_settings is readable publicly:
CREATE POLICY "Anyone can view builder settings"
  ON printer_builder_settings
  FOR SELECT
  USING (true);

-- NOTE: These are SELECT-only policies. 
-- INSERT/UPDATE/DELETE should remain restricted to authenticated owners.
