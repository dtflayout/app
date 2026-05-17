-- Migration 016: feature_waitlist table
-- Captures email signups for upcoming features ("Coming Soon" pages).
-- First feature: order-automation (launching ~June 2026).
-- This table is a generic launch-waitlist store — future "Coming Soon" pages
-- (SKU Library, Pre-flight Checker, etc.) reuse it via a different `feature_slug`.

-- =============================================================
-- 1. TABLE
-- =============================================================
CREATE TABLE IF NOT EXISTS feature_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  email VARCHAR(255) NOT NULL,
  feature_slug VARCHAR(64) NOT NULL DEFAULT 'order-automation',

  -- If the visitor was logged in when they signed up, capture their auth user.
  -- Nullable because the email-capture form on this page is reachable while
  -- logged-out as well (reused on marketing in the future). ON DELETE SET NULL
  -- so deleting an auth user doesn't lose the waitlist signal.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Light attribution for marketing dashboards. Optional, no PII beyond email.
  source VARCHAR(50),                    -- 'hero_cta', 'footer_cta', 'sidebar', etc.
  user_agent TEXT,
  referrer TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- One signup per (email, feature) pair. Duplicate POSTs become no-ops
  -- (the service uses .upsert with ignoreDuplicates so re-submissions look
  -- successful to the user — see waitlistService.ts).
  CONSTRAINT feature_waitlist_email_feature_unique UNIQUE (email, feature_slug)
);

CREATE INDEX IF NOT EXISTS idx_feature_waitlist_feature_slug
  ON feature_waitlist(feature_slug);

CREATE INDEX IF NOT EXISTS idx_feature_waitlist_created_at
  ON feature_waitlist(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_waitlist_user_id
  ON feature_waitlist(user_id) WHERE user_id IS NOT NULL;

-- =============================================================
-- 2. RLS POLICIES
-- =============================================================
ALTER TABLE feature_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit a waitlist signup.
-- The unique constraint above prevents abuse of the same email twice per feature.
-- Rate limiting is handled at the API/edge layer (publicLimiter, 30 req / 60s).
CREATE POLICY "Anyone can join feature waitlist"
  ON feature_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can read their own waitlist entries (e.g. to show
-- "you're already on the list" UI on revisit). Cross-user reads are blocked.
CREATE POLICY "Users can read their own waitlist entries"
  ON feature_waitlist FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No UPDATE / DELETE policies for users. Admin/cleanup happens via service role.
