/**
 * useBuilderSettings Hook
 * Loads a printer's builder settings for use in public/store builders.
 * 
 * Supports two lookup modes:
 * - By slug: used by WI public builder (builder.dtflayout.com/:printerSlug)
 * - By userId: used by QS storefront builder (more reliable when slugs may differ)
 * 
 * Returns DEFAULT_BUILDER_SETTINGS while loading or on error, so consumers
 * always have a valid settings object.
 * 
 * IMPORTANT: Respects the per-section `_use_defaults` flags. When a section's
 * flag is true, that section's values are replaced with DEFAULT_BUILDER_SETTINGS
 * regardless of what's saved in the database.
 */

import { useState, useEffect } from "react";
import { BuilderSettings, DEFAULT_BUILDER_SETTINGS } from "@/types/builderSettings";
import { getBuilderSettingsBySlug, getBuilderSettingsByUserId } from "@/services/builderSettingsService";

/** Always-valid settings object (defaults until loaded) */
const FALLBACK_SETTINGS: BuilderSettings = {
  id: "",
  printer_id: "",
  ...DEFAULT_BUILDER_SETTINGS,
  created_at: "",
  updated_at: "",
};

/**
 * Apply _use_defaults flags: for any section where the flag is true,
 * override that section's values with DEFAULT_BUILDER_SETTINGS.
 */
function applyDefaults(settings: BuilderSettings): BuilderSettings {
  const result = { ...settings };

  // Only respect per-section _use_defaults flags.
  // The global use_defaults flag is not exposed in the UI, so we skip it.

  // Per-section overrides
  if (settings.uploads_use_defaults) {
    result.auto_resize_to_300dpi = DEFAULT_BUILDER_SETTINGS.auto_resize_to_300dpi;
    result.enable_transparent_pixel_warning = DEFAULT_BUILDER_SETTINGS.enable_transparent_pixel_warning;
    result.enable_trim_warning = DEFAULT_BUILDER_SETTINGS.enable_trim_warning;
  }

  if (settings.sheet_settings_use_defaults) {
    result.size_unit = DEFAULT_BUILDER_SETTINGS.size_unit;
    result.max_height_inches = DEFAULT_BUILDER_SETTINGS.max_height_inches;
    result.max_sheets = DEFAULT_BUILDER_SETTINGS.max_sheets;
    result.default_margin_inches = DEFAULT_BUILDER_SETTINGS.default_margin_inches;
  }

  if (settings.tools_use_defaults) {
    result.image_trim_mode = DEFAULT_BUILDER_SETTINGS.image_trim_mode;
    result.enable_background_remover = DEFAULT_BUILDER_SETTINGS.enable_background_remover;
    result.resolution_optimal_dpi = DEFAULT_BUILDER_SETTINGS.resolution_optimal_dpi;
    result.resolution_good_dpi = DEFAULT_BUILDER_SETTINGS.resolution_good_dpi;
    result.resolution_bad_dpi = DEFAULT_BUILDER_SETTINGS.resolution_bad_dpi;
    result.resolution_terrible_dpi = DEFAULT_BUILDER_SETTINGS.resolution_terrible_dpi;
    result.hide_terrible_resolution = DEFAULT_BUILDER_SETTINGS.hide_terrible_resolution;
    result.disallow_lower_resolution = DEFAULT_BUILDER_SETTINGS.disallow_lower_resolution;
    result.minimum_resolution_dpi = DEFAULT_BUILDER_SETTINGS.minimum_resolution_dpi;
  }

  if (settings.appearance_use_defaults) {
    result.color_background = DEFAULT_BUILDER_SETTINGS.color_background;
    result.color_top_bar = DEFAULT_BUILDER_SETTINGS.color_top_bar;
    result.color_primary = DEFAULT_BUILDER_SETTINGS.color_primary;
    result.color_secondary = DEFAULT_BUILDER_SETTINGS.color_secondary;
    result.color_text = DEFAULT_BUILDER_SETTINGS.color_text;
    result.font_family = DEFAULT_BUILDER_SETTINGS.font_family;
    result.button_style = DEFAULT_BUILDER_SETTINGS.button_style;
    result.toolbox_icon_color = DEFAULT_BUILDER_SETTINGS.toolbox_icon_color;
    result.action_bar_color = DEFAULT_BUILDER_SETTINGS.action_bar_color;
    result.card_background_color = DEFAULT_BUILDER_SETTINGS.card_background_color;
  }

  if (settings.others_use_defaults) {
    result.use_logo_as_loader = DEFAULT_BUILDER_SETTINGS.use_logo_as_loader;
    result.enable_session_saver = DEFAULT_BUILDER_SETTINGS.enable_session_saver;
    result.show_gangsheet_price = DEFAULT_BUILDER_SETTINGS.show_gangsheet_price;
    result.enable_live_chat = DEFAULT_BUILDER_SETTINGS.enable_live_chat;
    result.live_chat_script = DEFAULT_BUILDER_SETTINGS.live_chat_script;
  }

  return result;
}

interface UseBuilderSettingsReturn {
  settings: BuilderSettings;
  isLoading: boolean;
  error: string | null;
}

interface UseBuilderSettingsOptions {
  slug?: string;
  userId?: string;
  context?: 'wi' | 'qs';
}

export function useBuilderSettings(
  slugOrOptions: string | undefined | UseBuilderSettingsOptions
): UseBuilderSettingsReturn {
  // Normalize: support both old signature useBuilderSettings("slug") 
  // and new signature useBuilderSettings({ slug?, userId? })
  const options: UseBuilderSettingsOptions = typeof slugOrOptions === "string"
    ? { slug: slugOrOptions }
    : slugOrOptions || {};

  const { slug, userId, context } = options;
  const lookupKey = userId || slug; // for determining if we should fetch
  const cacheKey = `${userId || ''}_${slug || ''}_${context || ''}`; // for effect dependency

  const [settings, setSettings] = useState<BuilderSettings>(FALLBACK_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lookupKey) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        let result;

        // Try userId lookup first (more reliable for QS where slugs may differ)
        if (userId) {
          console.log("[useBuilderSettings] Trying userId lookup:", userId, "context:", context);
          result = await getBuilderSettingsByUserId(userId, context);
          // Fall back to slug if userId lookup fails (e.g. RLS restrictions)
          if (!result.success && slug) {
            console.warn("[useBuilderSettings] userId lookup failed, trying slug fallback:", slug);
            result = await getBuilderSettingsBySlug(slug, context);
          }
        } else if (slug) {
          console.log("[useBuilderSettings] Using slug lookup:", slug, "context:", context);
          result = await getBuilderSettingsBySlug(slug, context);
        } else {
          return;
        }

        if (cancelled) return;

        if (result.success && result.data) {
          const resolved = applyDefaults(result.data);
          console.log("[useBuilderSettings] Settings loaded and defaults applied");
          setSettings(resolved);
        } else {
          console.warn("[useBuilderSettings] Failed to load, using defaults:", result.error);
          setError(result.error || "Failed to load builder settings");
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("[useBuilderSettings] Exception:", err);
        setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [cacheKey]);

  return { settings, isLoading, error };
}
