-- Migration: Add light/dark action bar color columns to builder_settings
-- Date: 2026-03-28
-- Description: Replace single action_bar_color with dual light/dark colors
--   so printers can configure both themes for the end-user toggle

ALTER TABLE builder_settings
  ADD COLUMN IF NOT EXISTS action_bar_color_light TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS action_bar_color_dark TEXT DEFAULT '';

-- Migrate existing action_bar_color values to action_bar_color_dark
-- (since the old single color was always used on a dark bar)
UPDATE builder_settings
SET action_bar_color_dark = action_bar_color
WHERE action_bar_color IS NOT NULL AND action_bar_color != '';
