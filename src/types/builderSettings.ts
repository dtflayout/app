/**
 * Types for Printer Builder Settings
 * These settings control how the public builder looks and behaves
 */

/**
 * Image trim mode options
 */
export type ImageTrimMode = 'off' | 'manual' | 'auto';

/**
 * Size unit options for display
 */
export type SizeUnit = 'inch' | 'cm' | 'mm';

/**
 * Button style options
 */
export type ButtonStyle = 'pill' | 'rounded' | 'square';

/**
 * Full builder settings as stored in database
 */
export interface BuilderSettings {
  id: string;
  printer_id: string;
  
  // Global defaults flag
  use_defaults: boolean;
  
  // ============ UPLOADS SECTION ============
  uploads_use_defaults: boolean;
  auto_resize_to_300dpi: boolean;
  enable_transparent_pixel_warning: boolean;
  enable_trim_warning: boolean;
  
  // ============ SHEET SETTINGS SECTION ============
  sheet_settings_use_defaults: boolean;
  size_unit: SizeUnit;
  max_height_inches: number;
  max_sheets: number;
  default_margin_inches: number;
  
  // ============ TOOLS SECTION ============
  tools_use_defaults: boolean;
  image_trim_mode: ImageTrimMode;
  enable_background_remover: boolean;
  
  // Resolution levels
  resolution_optimal_dpi: number;
  resolution_good_dpi: number;
  resolution_bad_dpi: number;
  resolution_terrible_dpi: number;
  hide_terrible_resolution: boolean;
  disallow_lower_resolution: boolean;
  minimum_resolution_dpi: number;
  
  // ============ APPEARANCE SECTION ============
  appearance_use_defaults: boolean;
  color_background: string;
  color_top_bar: string;
  color_primary: string;
  color_secondary: string;
  color_text: string;
  font_family: string;
  button_style: ButtonStyle;
  toolbox_icon_color: string;
  action_bar_color: string;
  card_background_color: string;
  
  // ============ OTHERS SECTION ============
  others_use_defaults: boolean;
  use_logo_as_loader: boolean;
  enable_session_saver: boolean;
  show_gangsheet_price: boolean;
  enable_live_chat: boolean;
  live_chat_script: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Builder settings for create/update (without id and timestamps)
 */
export interface BuilderSettingsInput {
  printer_id: string;
  
  use_defaults?: boolean;
  
  // Uploads
  uploads_use_defaults?: boolean;
  auto_resize_to_300dpi?: boolean;
  enable_transparent_pixel_warning?: boolean;
  enable_trim_warning?: boolean;
  
  // Sheet Settings
  sheet_settings_use_defaults?: boolean;
  size_unit?: SizeUnit;
  max_height_inches?: number;
  max_sheets?: number;
  default_margin_inches?: number;
  
  // Tools
  tools_use_defaults?: boolean;
  image_trim_mode?: ImageTrimMode;
  enable_background_remover?: boolean;
  resolution_optimal_dpi?: number;
  resolution_good_dpi?: number;
  resolution_bad_dpi?: number;
  resolution_terrible_dpi?: number;
  hide_terrible_resolution?: boolean;
  disallow_lower_resolution?: boolean;
  minimum_resolution_dpi?: number;
  
  // Appearance
  appearance_use_defaults?: boolean;
  color_background?: string;
  color_top_bar?: string;
  color_primary?: string;
  color_secondary?: string;
  color_text?: string;
  font_family?: string;
  button_style?: ButtonStyle;
  toolbox_icon_color?: string;
  action_bar_color?: string;
  card_background_color?: string;
  
  // Others
  others_use_defaults?: boolean;
  use_logo_as_loader?: boolean;
  enable_session_saver?: boolean;
  show_gangsheet_price?: boolean;
  enable_live_chat?: boolean;
  live_chat_script?: string;
}

/**
 * Default builder settings values (best practices)
 */
export const DEFAULT_BUILDER_SETTINGS: Omit<BuilderSettings, 'id' | 'printer_id' | 'created_at' | 'updated_at'> = {
  use_defaults: true,
  
  // Uploads
  uploads_use_defaults: true,
  auto_resize_to_300dpi: true,
  enable_transparent_pixel_warning: true,
  enable_trim_warning: true,
  
  // Sheet Settings
  sheet_settings_use_defaults: true,
  size_unit: 'inch',
  max_height_inches: 500,
  max_sheets: 5,
  default_margin_inches: 0.3,
  
  // Tools
  tools_use_defaults: true,
  image_trim_mode: 'auto',
  enable_background_remover: true,
  resolution_optimal_dpi: 300,
  resolution_good_dpi: 150,
  resolution_bad_dpi: 72,
  resolution_terrible_dpi: 1,
  hide_terrible_resolution: false,
  disallow_lower_resolution: false,
  minimum_resolution_dpi: 72,
  
  // Appearance
  appearance_use_defaults: true,
  color_background: '#f1f5f9',
  color_top_bar: '#1e293b',
  color_primary: '#4F46E5',
  color_secondary: '#3b82f6',
  color_text: '#1e293b',
  font_family: 'Inter',
  button_style: 'rounded' as ButtonStyle,
  toolbox_icon_color: '',
  action_bar_color: '',  // Empty = follows top bar color
  card_background_color: '#ffffff',
  
  // Others
  others_use_defaults: true,
  use_logo_as_loader: false,
  enable_session_saver: true,
  show_gangsheet_price: true,
  enable_live_chat: false,
  live_chat_script: '',
};

/**
 * Resolution level configuration for display
 */
export interface ResolutionLevel {
  label: string;
  key: 'optimal' | 'good' | 'bad' | 'terrible';
  color: string;
  colorClass: string;
  defaultDpi: number;
}

/**
 * Resolution levels configuration
 */
export const RESOLUTION_LEVELS: ResolutionLevel[] = [
  { 
    label: 'Optimal Resolution', 
    key: 'optimal', 
    color: '#22c55e', 
    colorClass: 'bg-green-500',
    defaultDpi: 300 
  },
  { 
    label: 'Good Resolution', 
    key: 'good', 
    color: '#f4dc00', 
    colorClass: 'bg-yellow-500',
    defaultDpi: 150 
  },
  { 
    label: 'Bad Resolution', 
    key: 'bad', 
    color: '#ef4444', 
    colorClass: 'bg-red-500',
    defaultDpi: 72 
  },
  { 
    label: 'Terrible Resolution', 
    key: 'terrible', 
    color: '#171717', 
    colorClass: 'bg-neutral-900',
    defaultDpi: 1 
  },
];

/**
 * Sheet width options for products
 */
export const SHEET_WIDTH_OPTIONS = [
  { value: 10.5, label: '10.5 inches' },
  { value: 11, label: '11 inches' },
  { value: 11.5, label: '11.5 inches' },
  { value: 22, label: '22 inches' },
  { value: 22.5, label: '22.5 inches' },
  { value: 23, label: '23 inches' },
];

/**
 * Curated Google Fonts for the font picker
 */
export const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Raleway',
  'Nunito',
  'Source Sans 3',
  'Work Sans',
  'DM Sans',
  'Outfit',
  'Manrope',
  'Plus Jakarta Sans',
  'Playfair Display',
  'Merriweather',
  'Libre Baskerville',
  'Oswald',
  'Bebas Neue',
  'Barlow',
];

/**
 * Button style options
 */
export const BUTTON_STYLE_OPTIONS: { value: ButtonStyle; label: string; preview: string }[] = [
  { value: 'pill', label: 'Pill', preview: '9999px' },
  { value: 'rounded', label: 'Rounded', preview: '8px' },
  { value: 'square', label: 'Square', preview: '2px' },
];
