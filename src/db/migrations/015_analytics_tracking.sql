-- Migration 015: Analytics tracking infrastructure
-- Adds tracked_links + link_clicks tables for cold email attribution
-- Also adds a visit_events table for lightweight server-side tracking

-- =============================================================
-- 1. TRACKED LINKS (short code → destination with prospect info)
-- =============================================================
CREATE TABLE IF NOT EXISTS tracked_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(12) UNIQUE NOT NULL,           -- short code, e.g. "a1b2c3"
  destination_url TEXT NOT NULL,               -- where to redirect, e.g. /demo/builder
  
  -- UTM params (baked into the redirect)
  utm_source VARCHAR(50) DEFAULT 'instantly',
  utm_medium VARCHAR(50) DEFAULT 'email',
  utm_campaign VARCHAR(100),                   -- e.g. "us_texas_wave1"
  utm_content VARCHAR(100),                    -- e.g. "email_1", "email_2", "email_3"
  
  -- Prospect attribution (from Instantly/Apollo)
  prospect_email VARCHAR(255),
  prospect_company VARCHAR(255),
  prospect_name VARCHAR(255),
  prospect_city VARCHAR(100),
  prospect_state VARCHAR(50),
  
  -- Metadata
  batch_id VARCHAR(100),                       -- group links by send batch
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Index for fast code lookups (the redirect hot path)
CREATE INDEX IF NOT EXISTS idx_tracked_links_code ON tracked_links(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tracked_links_batch ON tracked_links(batch_id);
CREATE INDEX IF NOT EXISTS idx_tracked_links_campaign ON tracked_links(utm_campaign);

-- =============================================================
-- 2. LINK CLICKS (every click logged)
-- =============================================================
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES tracked_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  
  -- Visitor fingerprint
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  
  -- Geo (populated from IP if needed later)
  country VARCHAR(5),
  region VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- =============================================================
-- 3. VISIT EVENTS (lightweight first-party event log)
-- For attribution stitching: anonymous visits → signed-up users
-- =============================================================
CREATE TABLE IF NOT EXISTS visit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identity (one or both will be set)
  anonymous_id VARCHAR(64),                    -- generated client-side, stored in cookie
  user_id UUID REFERENCES auth.users(id),      -- set after signup/login
  
  -- Event
  event_name VARCHAR(100) NOT NULL,
  event_properties JSONB DEFAULT '{}',
  
  -- Attribution
  utm_source VARCHAR(50),
  utm_medium VARCHAR(50),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  referrer TEXT,
  page_url TEXT,
  
  -- Context
  session_id VARCHAR(64),
  device_type VARCHAR(20),                     -- mobile, desktop, tablet
  browser VARCHAR(50),
  
  -- Link attribution (ties back to tracked_links if they came from a cold email)
  tracked_link_code VARCHAR(12),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visit_events_anonymous_id ON visit_events(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_visit_events_user_id ON visit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_events_event_name ON visit_events(event_name);
CREATE INDEX IF NOT EXISTS idx_visit_events_created_at ON visit_events(created_at);
CREATE INDEX IF NOT EXISTS idx_visit_events_tracked_link ON visit_events(tracked_link_code);

-- =============================================================
-- 4. RLS POLICIES
-- =============================================================
ALTER TABLE tracked_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_events ENABLE ROW LEVEL SECURITY;

-- tracked_links: only service role can read/write (admin use only)
-- No public policies — accessed only via API routes with service role key

-- link_clicks: only service role can insert (via API route)
-- No public policies

-- visit_events: anon can insert (for pre-signup tracking), authenticated can insert
CREATE POLICY "Anyone can insert visit events"
  ON visit_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can SELECT visit_events (for admin dashboard queries)
-- Authenticated users should NOT be able to read other users' events

-- =============================================================
-- 5. CLEANUP: Add visit_events to the retention purge
-- Add this to cleanup-expired.ts: DELETE FROM visit_events WHERE created_at < now() - interval '180 days'
-- =============================================================

-- =============================================================
-- 6. HELPER: Generate short codes
-- =============================================================
CREATE OR REPLACE FUNCTION generate_link_code(len INT DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijkmnpqrstuvwxyz23456789';  -- no confusable chars (0/O, 1/l)
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..len LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;
