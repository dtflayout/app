/**
 * Types for Quick Store feature
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type HeroStyle = 'fullbleed' | 'split' | 'minimal' | 'cinematic' | 'card';
export type HeroBgType = 'gradient' | 'solid' | 'image' | 'slider';
export type HeroTextAlign = 'left' | 'center' | 'right';

export type FontPairing = 'modern' | 'classic' | 'bold' | 'elegant' | 'clean' | 'friendly';

export interface FontPairingConfig {
  id: FontPairing;
  label: string;
  heading: string;
  body: string;
  googleImport: string; // Google Fonts URL
}

export const FONT_PAIRINGS: FontPairingConfig[] = [
  {
    id: 'modern',
    label: 'Modern',
    heading: 'Inter',
    body: 'Inter',
    googleImport: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  },
  {
    id: 'classic',
    label: 'Classic',
    heading: 'Playfair Display',
    body: 'Source Sans 3',
    googleImport: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap',
  },
  {
    id: 'bold',
    label: 'Bold',
    heading: 'Poppins',
    body: 'Poppins',
    googleImport: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  },
  {
    id: 'elegant',
    label: 'Elegant',
    heading: 'Cormorant Garamond',
    body: 'Lato',
    googleImport: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Lato:wght@400;700&display=swap',
  },
  {
    id: 'clean',
    label: 'Clean',
    heading: 'DM Sans',
    body: 'DM Sans',
    googleImport: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    heading: 'Nunito',
    body: 'Nunito',
    googleImport: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap',
  },
];

export interface HeroSliderImage {
  id: string;
  url: string;
  mobile_url?: string | null;
}
export type FeaturesLayout = 'grid' | 'alternating' | 'bento' | 'iconrow' | 'steps' | 'dark';

export interface FeatureItem {
  id: string;
  icon: string;
  heading: string;
  description: string;
  color: string;
  show_icon?: boolean;
}

export const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    icon: 'LayoutGrid',
    heading: 'Smart Gang Sheet Layouts',
    description: 'Auto-arrange your designs on a single sheet to maximize material usage. Our intelligent packing algorithm reduces wasted film by up to 30%, saving you money on every order.',
    color: '#6366f1',
  },
  {
    id: 'f2',
    icon: 'Scissors',
    heading: 'Built-in Image Tools',
    description: 'Everything you need in one place — enhance image quality, remove or replace colors, trim edges, and add custom text or numbers. No need for Photoshop or external editors.',
    color: '#10b981',
  },
  {
    id: 'f3',
    icon: 'Ruler',
    heading: 'Hours to Minutes',
    description: 'What used to take hours of manual arranging in design software now takes just a few clicks. Upload your images, hit generate, and your print-ready gang sheet is done in under a minute.',
    color: '#f59e0b',
  },
  {
    id: 'f4',
    icon: 'Zap',
    heading: 'Fast Turnaround',
    description: 'Your gang sheets are processed and ready within 24 hours. Perfect for urgent jobs, last-minute orders, and high-volume print runs.',
    color: '#8b5cf6',
  },
];


export type FaqStyle = 'clean' | 'card' | 'bold';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'faq1',
    question: 'What file formats do you accept for DTF printing?',
    answer: 'We accept PNG, JPG, and PDF files. For best results, upload high-resolution PNG files with a transparent background. Minimum 150 DPI is recommended; 300 DPI is ideal for sharp, print-ready output.',
  },
  {
    id: 'faq2',
    question: 'What is a gang sheet and how does it work?',
    answer: 'A gang sheet is a single large film sheet that contains multiple designs arranged together to maximize material usage. You upload your designs, choose your sheet size, and our system automatically arranges everything efficiently — saving you material cost on every order.',
  },
  {
    id: 'faq3',
    question: 'What sizes are available for gang sheets?',
    answer: 'We offer standard widths of 22" and custom lengths based on your order. You can specify exact dimensions when placing your order, or use our builder to auto-calculate the optimal sheet size for your designs.',
  },
  {
    id: 'faq4',
    question: 'How long does processing and delivery take?',
    answer: 'Standard orders are processed and ready within 24 hours. Express options are available for urgent requirements. Delivery timelines depend on your location — typically 1–3 business days for most areas.',
  },
  {
    id: 'faq5',
    question: 'Do you offer bulk discounts?',
    answer: 'Yes! We have tiered pricing that automatically applies discounts as your order size increases. The more you print, the lower your cost per square inch. Contact us for custom quotes on large recurring orders.',
  },
];


export type HeaderColor = 'light' | 'dark' | 'custom';
export type TopBarStyle = 'static' | 'carousel' | 'marquee';


export type PricingBasis = 'length' | 'area';
export type PricingType = 'flat' | 'tiered';
export type TierCalculation = 'incremental' | 'slab';
export type BelowMinimumAction = 'block' | 'charge_minimum';
export type OrderStatus = 'pending' | 'paid' | 'downloaded' | 'completed' | 'cancelled';
export type AnalyticsEventType = 'page_view' | 'product_view' | 'builder_open' | 'order_submit';

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD' | 'CAD';

export const CURRENCY_CONFIG: Record<Currency, { symbol: string; name: string }> = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
};

export const UNIT_LABELS: Record<MeasurementUnit, { singular: string; plural: string; perArea: string }> = {
  inch: { singular: 'inch', plural: 'inches', perArea: 'sq.inch' },
  cm: { singular: 'cm', plural: 'cm', perArea: 'sq.cm' },
  meter: { singular: 'meter', plural: 'meters', perArea: 'sq.meter' },
  feet: { singular: 'foot', plural: 'feet', perArea: 'sq.feet' },
};

export const DEFAULT_DELIVERY_STEPS = [
  { label: 'Order Placed', time: 'Today' },
  { label: 'Printed', time: 'Within 24h' },
  { label: 'Ready', time: '1-2 days' },
];

// Conversion to inches (internal storage)
export const UNIT_TO_INCHES: Record<MeasurementUnit, number> = {
  inch: 1,
  cm: 0.393701,
  meter: 39.3701,
  feet: 12,
};

// Conversion from inches to unit
export const INCHES_TO_UNIT: Record<MeasurementUnit, number> = {
  inch: 1,
  cm: 2.54,
  meter: 0.0254,
  feet: 0.0833333,
};

// Default product images
export const DEFAULT_PRODUCT_IMAGES = [
  '/images/products/dtf-roll-22inch.jpg',
  '/images/products/dtf-roll-13inch.jpg',
  '/images/products/dtf-roll-generic.jpg',
];

// Order status labels for display
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  downloaded: 'Downloaded',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// ============================================
// QUICK STORE
// ============================================

export interface BusinessHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface QuickStore {
  id: string;
  user_id: string;
  
  // Identity
  slug: string;
  store_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  
  // Contact
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  google_maps_url: string | null;
  business_hours: BusinessHours[];
  
  // Header
  header_style: HeaderStyle;
  header_color: HeaderColor;
  footer_style: FooterStyle;
  header_custom_color: string | null;
  topbar_enabled: boolean;
  topbar_style: TopBarStyle;
  topbar_items: string[];
  topbar_bg_color: string | null;
  topbar_text_color: string | null;
  
  // Appearance
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_text: string;
  banner_image_url: string | null;
  
  // Hero
  hero_style: HeroStyle;
  hero_bg_type: HeroBgType;
  hero_gradient_from: string | null;
  hero_gradient_to: string | null;
  hero_gradient_angle: number;
  hero_solid_color: string | null;
  hero_overlay_opacity: number;
  hero_text_color: string;
  hero_cta_enabled: boolean;
  hero_cta_text: string;
  hero_mobile_image_url: string | null;
  hero_slider_images: HeroSliderImage[];
  hero_text_align: HeroTextAlign;
  
  // Homepage
  hero_title: string | null;
  hero_subtitle: string | null;
  about_title: string;
  about_content: string | null;
  faq_enabled: boolean;
  faq_style: FaqStyle;
  faq_title: string | null;
  faq_items: FaqItem[] | null;
  features_enabled: boolean;
  features_layout: FeaturesLayout;
  features_title: string | null;
  features_subtitle: string | null;
  features: FeatureItem[] | null;
  homepage_sections: string[];
  
  // Settings
  currency: Currency;
  measurement_unit: MeasurementUnit;
  font_pairing: FontPairing;
  is_active: boolean;
  is_published: boolean;
  
  // Product Page Settings
  delivery_steps: { label: string; time: string }[];
  show_trust_badges: boolean;
  show_product_faq: boolean;
  
  // SEO
  meta_title: string | null;
  meta_description: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface QuickStoreInput {
  slug: string;
  store_name: string;
  tagline?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  google_maps_url?: string | null;
  business_hours?: BusinessHours[];
  faq_enabled?: boolean;
  faq_style?: FaqStyle;
  faq_title?: string | null;
  faq_items?: FaqItem[] | null;
  features_enabled?: boolean;
  features_layout?: FeaturesLayout;
  features_title?: string | null;
  features_subtitle?: string | null;
  features?: FeatureItem[] | null;
  hero_style?: HeroStyle;
  hero_bg_type?: HeroBgType;
  hero_gradient_from?: string | null;
  hero_gradient_to?: string | null;
  hero_gradient_angle?: number;
  hero_solid_color?: string | null;
  hero_overlay_opacity?: number;
  hero_text_color?: string;
  hero_cta_enabled?: boolean;
  hero_cta_text?: string;
  hero_mobile_image_url?: string | null;
  hero_slider_images?: HeroSliderImage[];
  hero_text_align?: HeroTextAlign;
  header_style?: HeaderStyle;
  header_color?: HeaderColor;
  footer_style?: FooterStyle;
  header_custom_color?: string | null;
  topbar_enabled?: boolean;
  topbar_style?: TopBarStyle;
  topbar_items?: string[];
  topbar_bg_color?: string | null;
  topbar_text_color?: string | null;
  color_primary?: string;
  color_secondary?: string;
  color_background?: string;
  color_text?: string;
  banner_image_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_title?: string;
  about_content?: string | null;
  homepage_sections?: string[];
  currency: Currency;
  measurement_unit?: MeasurementUnit;
  font_pairing?: FontPairing;
  is_active?: boolean;
  is_published?: boolean;
  delivery_steps?: { label: string; time: string }[];
  show_trust_badges?: boolean;
  show_product_faq?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
}

// ============================================
// TESTIMONIALS
// ============================================

export interface Testimonial {
  id: string;
  quick_store_id: string;
  customer_name: string;
  customer_location: string | null;
  content: string;
  rating: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface TestimonialInput {
  customer_name: string;
  customer_location?: string | null;
  content: string;
  rating?: number | null;
  is_active?: boolean;
  display_order?: number;
}

// ============================================
// PRODUCTS
// ============================================

export interface PricingTier {
  min: number;
  max: number | null; // null for unlimited (last tier)
  price: number;
}

export interface QSProduct {
  id: string;
  quick_store_id: string;
  
  // Info
  product_name: string;
  product_slug: string;
  description: string | null;
  image_url: string | null;
  product_images: string[];
  
  // Dimensions
  roll_width_inches: number;
  
  // Pricing
  show_pricing: boolean;
  pricing_basis: PricingBasis;
  pricing_type: PricingType;
  tier_calculation: TierCalculation;
  flat_price: number | null;
  pricing_tiers: PricingTier[];
  
  // Minimum
  minimum_order: number;
  below_minimum_action: BelowMinimumAction;
  
  // Status
  is_active: boolean;
  display_order: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface QSProductInput {
  product_name: string;
  product_slug?: string;
  description?: string | null;
  image_url?: string | null;
  product_images?: string[];
  roll_width_inches: number;
  show_pricing?: boolean;
  pricing_basis: PricingBasis;
  pricing_type: PricingType;
  tier_calculation?: TierCalculation;
  flat_price?: number | null;
  pricing_tiers?: PricingTier[];
  minimum_order?: number;
  below_minimum_action?: BelowMinimumAction;
  is_active?: boolean;
  display_order?: number;
}

// ============================================
// ORDERS
// ============================================

export interface OrderSheet {
  sheet_number: number;
  width_inches: number;
  height_inches: number;
  area_sq_inches: number;
  storage_path: string;
  preview_url: string;
}

export interface QSOrder {
  id: string;
  quick_store_id: string;
  product_id: string | null;
  
  order_code: string;
  
  // Customer
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_notes: string | null;
  
  // Sheets
  sheets: OrderSheet[];
  sheet_count: number;
  total_length_inches: number;
  total_area_sq_inches: number;
  
  // Pricing
  currency: Currency;
  pricing_basis: PricingBasis;
  calculated_price: number | null;
  show_pricing: boolean;
  
  // Status
  status: OrderStatus;
  
  // Timestamps
  created_at: string;
  paid_at: string | null;
  downloaded_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
  
  // Credits
  credits_deducted: number | null;
  deducted_at: string | null;
}

export interface QSOrderInput {
  quick_store_id: string;
  product_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_notes?: string | null;
  sheets: OrderSheet[];
  sheet_count: number;
  total_length_inches: number;
  total_area_sq_inches: number;
  currency: Currency;
  pricing_basis: PricingBasis;
  calculated_price?: number | null;
  show_pricing: boolean;
}

// ============================================
// ANALYTICS
// ============================================

export interface AnalyticsEvent {
  quick_store_id: string;
  event_type: AnalyticsEventType;
  page_path?: string;
  product_id?: string;
  visitor_id?: string;
  user_agent?: string;
  referrer?: string;
}

export interface AnalyticsSummary {
  total_views: number;
  product_views: number;
  builder_opens: number;
  orders_submitted: number;
  views_today: number;
  views_this_week: number;
  orders_this_week: number;
}

// ============================================
// PRICING CALCULATION
// ============================================

export interface PriceBreakdownItem {
  tierLabel: string;
  quantity: number;
  rate: number;
  subtotal: number;
}

export interface PriceCalculationResult {
  totalPrice: number;
  breakdown: PriceBreakdownItem[];
  meetsMinimum: boolean;
  minimumRequired: number;
  effectiveQuantity: number;
  displayQuantity: number;
  displayUnit: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert inches to display unit
 */
export function inchesToUnit(inches: number, unit: MeasurementUnit): number {
  return inches * INCHES_TO_UNIT[unit];
}

/**
 * Convert display unit to inches
 */
export function unitToInches(value: number, unit: MeasurementUnit): number {
  return value * UNIT_TO_INCHES[unit];
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_CONFIG[currency].symbol;
  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

/**
 * Format measurement with unit
 */
export function formatMeasurement(value: number, unit: MeasurementUnit, basis: PricingBasis = 'length'): string {
  const rounded = Math.round(value * 10) / 10;
  const label = basis === 'area' ? UNIT_LABELS[unit].perArea : UNIT_LABELS[unit].plural;
  return `${rounded} ${label}`;
}

/**
 * Generate slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Calculate price based on product configuration
 */
export function calculatePrice(
  product: QSProduct,
  totalLengthInches: number,
  totalAreaSqInches: number
): PriceCalculationResult {
  // Get quantity based on pricing basis
  const quantityInInches = product.pricing_basis === 'length' 
    ? totalLengthInches 
    : totalAreaSqInches;

  // Convert to display unit
  const unit = product.pricing_basis === 'length' 
    ? (product as any).measurement_unit || 'inch'
    : 'inch'; // Area is always in sq.inches for now
    
  const displayQuantity = quantityInInches; // Already in inches/sq.inches
  const minimum = product.minimum_order || 0;
  const meetsMinimum = displayQuantity >= minimum;

  // Effective quantity (apply minimum if needed)
  let effectiveQuantity = displayQuantity;
  if (!meetsMinimum && product.below_minimum_action === 'charge_minimum') {
    effectiveQuantity = minimum;
  }

  // Calculate price
  let totalPrice = 0;
  const breakdown: PriceBreakdownItem[] = [];

  if (!product.show_pricing) {
    return {
      totalPrice: 0,
      breakdown: [],
      meetsMinimum,
      minimumRequired: minimum,
      effectiveQuantity: Math.round(effectiveQuantity),
      displayQuantity: Math.round(displayQuantity),
      displayUnit: product.pricing_basis === 'area' ? 'sq.inches' : 'inches',
    };
  }

  if (product.pricing_type === 'flat') {
    // Flat rate
    totalPrice = Math.round(effectiveQuantity * (product.flat_price || 0));
    breakdown.push({
      tierLabel: 'Flat rate',
      quantity: Math.round(effectiveQuantity),
      rate: product.flat_price || 0,
      subtotal: totalPrice,
    });
  } else {
    // Tiered pricing
    const tiers = product.pricing_tiers || [];

    if (product.tier_calculation === 'slab') {
      // Slab-based: Find applicable tier, apply to entire quantity
      const applicableTier = tiers.find(
        (t) => effectiveQuantity >= t.min && (t.max === null || effectiveQuantity <= t.max)
      ) || tiers[tiers.length - 1];

      if (applicableTier) {
        totalPrice = Math.round(effectiveQuantity * applicableTier.price);
        breakdown.push({
          tierLabel: `${applicableTier.min}-${applicableTier.max ?? '∞'}`,
          quantity: Math.round(effectiveQuantity),
          rate: applicableTier.price,
          subtotal: totalPrice,
        });
      }
    } else {
      // Incremental: Apply each tier to its range
      let remaining = effectiveQuantity;

      for (const tier of tiers) {
        if (remaining <= 0) break;

        const tierMax = tier.max ?? Infinity;
        const tierRange = tierMax - tier.min + 1;
        const quantityInTier = Math.min(remaining, tierRange);

        if (quantityInTier > 0) {
          const subtotal = Math.round(quantityInTier * tier.price);
          totalPrice += subtotal;
          breakdown.push({
            tierLabel: `${tier.min}-${tier.max ?? '∞'}`,
            quantity: Math.round(quantityInTier),
            rate: tier.price,
            subtotal,
          });
          remaining -= quantityInTier;
        }
      }
    }
  }

  return {
    totalPrice,
    breakdown,
    meetsMinimum,
    minimumRequired: minimum,
    effectiveQuantity: Math.round(effectiveQuantity),
    displayQuantity: Math.round(displayQuantity),
    displayUnit: product.pricing_basis === 'area' ? 'sq.inches' : 'inches',
  };
}

// ============================================
// TYPE ALIASES (for component compatibility)
// ============================================
export type QuickStoreProduct = QSProduct;
export type QuickStoreOrder = QSOrder;

// ============================================
// PRICING CONFIG (legacy support)
// ============================================
export interface PricingConfig {
  pricing_type: PricingType;
  pricing_basis: 'per_length' | 'per_area';
  flat_rate: number | null;
  tiers: Array<{
    min_value: number;
    max_value: number;
    rate: number;
  }>;
  tier_calculation: TierCalculation;
  currency: Currency;
  measurement_unit: MeasurementUnit;
}
