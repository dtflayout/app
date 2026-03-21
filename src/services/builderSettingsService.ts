/**
 * Builder Settings Service
 * CRUD operations for printer builder settings
 */

import { supabase } from "@/lib/supabaseClient";
import { 
  BuilderSettings, 
  BuilderSettingsInput, 
  DEFAULT_BUILDER_SETTINGS 
} from "@/types/builderSettings";

/**
 * Get builder settings for a printer
 * Creates default settings if none exist
 */
export async function getBuilderSettings(
  printerId: string
): Promise<{ success: boolean; data?: BuilderSettings; error?: string }> {
  try {
    console.log("[BuilderSettingsService] Fetching settings for printer:", printerId);

    const { data, error } = await supabase
      .from("printer_builder_settings")
      .select("*")
      .eq("printer_id", printerId)
      .single();

    if (error) {
      // If no settings exist, return defaults (will be created on first save)
      if (error.code === "PGRST116") {
        console.log("[BuilderSettingsService] No settings found, returning defaults");
        return {
          success: true,
          data: {
            id: "",
            printer_id: printerId,
            ...DEFAULT_BUILDER_SETTINGS,
            created_at: "",
            updated_at: "",
          } as BuilderSettings,
        };
      }
      console.error("[BuilderSettingsService] Error fetching settings:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BuilderSettings };
  } catch (err: any) {
    console.error("[BuilderSettingsService] Exception fetching settings:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get builder settings by printer slug (for public builder, no auth required)
 */
export async function getBuilderSettingsBySlug(
  printerSlug: string
): Promise<{ success: boolean; data?: BuilderSettings; error?: string }> {
  try {
    console.log("[BuilderSettingsService] Fetching settings for printer slug:", printerSlug);

    // First get the printer ID
    const { data: printer, error: printerError } = await supabase
      .from("printers")
      .select("id")
      .eq("slug", printerSlug)
      .eq("is_active", true)
      .single();

    if (printerError || !printer) {
      return { success: false, error: "Printer not found" };
    }

    // Then get the settings
    return getBuilderSettings(printer.id);
  } catch (err: any) {
    console.error("[BuilderSettingsService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save builder settings (create or update)
 */
export async function saveBuilderSettings(
  settings: BuilderSettingsInput
): Promise<{ success: boolean; data?: BuilderSettings; error?: string }> {
  try {
    console.log("[BuilderSettingsService] Saving settings for printer:", settings.printer_id);

    // Strip fields that Supabase manages automatically (timestamps, id)
    const { id, created_at, updated_at, ...settingsToSave } = settings as any;

    // Check if settings already exist
    const { data: existing } = await supabase
      .from("printer_builder_settings")
      .select("id")
      .eq("printer_id", settings.printer_id)
      .single();

    let result;

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from("printer_builder_settings")
        .update(settingsToSave)
        .eq("printer_id", settings.printer_id)
        .select()
        .single();

      if (error) {
        console.error("[BuilderSettingsService] Error updating settings:", error);
        return { success: false, error: error.message };
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from("printer_builder_settings")
        .insert(settingsToSave)
        .select()
        .single();

      if (error) {
        console.error("[BuilderSettingsService] Error creating settings:", error);
        return { success: false, error: error.message };
      }
      result = data;
    }

    console.log("[BuilderSettingsService] Settings saved successfully");
    return { success: true, data: result as BuilderSettings };
  } catch (err: any) {
    console.error("[BuilderSettingsService] Exception saving settings:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset builder settings to defaults
 */
export async function resetBuilderSettings(
  printerId: string
): Promise<{ success: boolean; data?: BuilderSettings; error?: string }> {
  try {
    console.log("[BuilderSettingsService] Resetting settings to defaults for printer:", printerId);

    const defaultSettings: BuilderSettingsInput = {
      printer_id: printerId,
      ...DEFAULT_BUILDER_SETTINGS,
    };

    return saveBuilderSettings(defaultSettings);
  } catch (err: any) {
    console.error("[BuilderSettingsService] Exception resetting settings:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset a specific section to defaults
 */
export async function resetSectionToDefaults(
  printerId: string,
  section: 'uploads' | 'sheet_settings' | 'tools' | 'appearance' | 'others'
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[BuilderSettingsService] Resetting section to defaults:", section);

    let updateData: Partial<BuilderSettingsInput> = {};

    switch (section) {
      case 'uploads':
        updateData = {
          uploads_use_defaults: true,
          auto_resize_to_300dpi: DEFAULT_BUILDER_SETTINGS.auto_resize_to_300dpi,
          enable_transparent_pixel_warning: DEFAULT_BUILDER_SETTINGS.enable_transparent_pixel_warning,
          enable_trim_warning: DEFAULT_BUILDER_SETTINGS.enable_trim_warning,
        };
        break;
      case 'sheet_settings':
        updateData = {
          sheet_settings_use_defaults: true,
          size_unit: DEFAULT_BUILDER_SETTINGS.size_unit,
          max_height_inches: DEFAULT_BUILDER_SETTINGS.max_height_inches,
          max_sheets: DEFAULT_BUILDER_SETTINGS.max_sheets,
          default_margin_inches: DEFAULT_BUILDER_SETTINGS.default_margin_inches,
        };
        break;
      case 'tools':
        updateData = {
          tools_use_defaults: true,
          image_trim_mode: DEFAULT_BUILDER_SETTINGS.image_trim_mode,
          enable_background_remover: DEFAULT_BUILDER_SETTINGS.enable_background_remover,
          resolution_optimal_dpi: DEFAULT_BUILDER_SETTINGS.resolution_optimal_dpi,
          resolution_good_dpi: DEFAULT_BUILDER_SETTINGS.resolution_good_dpi,
          resolution_bad_dpi: DEFAULT_BUILDER_SETTINGS.resolution_bad_dpi,
          resolution_terrible_dpi: DEFAULT_BUILDER_SETTINGS.resolution_terrible_dpi,
          hide_terrible_resolution: DEFAULT_BUILDER_SETTINGS.hide_terrible_resolution,
          disallow_lower_resolution: DEFAULT_BUILDER_SETTINGS.disallow_lower_resolution,
          minimum_resolution_dpi: DEFAULT_BUILDER_SETTINGS.minimum_resolution_dpi,
        };
        break;
      case 'appearance':
        updateData = {
          appearance_use_defaults: true,
          color_background: DEFAULT_BUILDER_SETTINGS.color_background,
          color_top_bar: DEFAULT_BUILDER_SETTINGS.color_top_bar,
          color_primary: DEFAULT_BUILDER_SETTINGS.color_primary,
          color_secondary: DEFAULT_BUILDER_SETTINGS.color_secondary,
          color_text: DEFAULT_BUILDER_SETTINGS.color_text,
        };
        break;
      case 'others':
        updateData = {
          others_use_defaults: true,
          use_logo_as_loader: DEFAULT_BUILDER_SETTINGS.use_logo_as_loader,
          enable_session_saver: DEFAULT_BUILDER_SETTINGS.enable_session_saver,
        };
        break;
    }

    const { error } = await supabase
      .from("printer_builder_settings")
      .update(updateData)
      .eq("printer_id", printerId);

    if (error) {
      console.error("[BuilderSettingsService] Error resetting section:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[BuilderSettingsService] Exception:", err);
    return { success: false, error: err.message };
  }
}
