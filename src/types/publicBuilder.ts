/**
 * Types for the Public Builder (Website Integration)
 */

import { ImageObject } from "@/components/CollageCreator";
import { PositionedImage } from "@/utils/layoutAlgorithm";

/**
 * Printer data for public builder (subset of full Printer interface)
 */
export interface PublicPrinter {
  id: string;
  store_id: string;  // Unique store identifier for storage organization
  slug: string;
  store_name: string;
  store_url: string;
  logo_url: string | null;
  currency: string;
}

/**
 * Product data for public builder
 */
export interface PublicProduct {
  id: string;
  printer_id: string;
  product_name: string;
  product_slug: string;
  size_unit: "mm" | "cm" | "inch" | "feet" | "meter";
  sheet_width_inches: number;
  shopify_product_url: string;
  variants: PublicVariant[];
}

/**
 * Variant data for public builder
 */
export interface PublicVariant {
  id: string;
  shopify_variant_id: string;
  variant_name: string | null;
  size_value: number;
  price: number;
  cart_url: string;
}

/**
 * Sheet data for a single generated sheet
 */
export interface SheetData {
  sheet_number: number;
  images: ImageObject[];
  layout: PositionedImage[];
  width_inches: number;
  height_inches: number;
  matched_variant: PublicVariant | null;
  storage_path?: string;
}

/**
 * Serialized sheet data for database storage (without image blobs)
 */
export interface SerializedSheetData {
  sheet_number: number;
  image_count: number;
  width_inches: number;
  height_inches: number;
  variant_id: string;
  variant_name: string;
  variant_price: number;
  storage_path: string;
}

/**
 * Design record for database
 */
export interface Design {
  id: string;
  printer_id: string;
  printer_product_id: string;
  design_code: string;
  status: "pending" | "paid" | "downloaded" | "expired";
  sheets: SerializedSheetData[];
  sheet_count: number;
  total_price: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  downloaded_at: string | null;
  expires_at: string;
  customer_email: string | null;
}

/**
 * Design creation payload (without auto-generated fields)
 */
export interface CreateDesignPayload {
  printer_id: string;
  printer_product_id: string;
  sheets: SerializedSheetData[];
  sheet_count: number;
  total_price: number;
  currency: string;
  customer_email?: string;
}

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  code: string;
  symbol: string;
  label: string;
}

/**
 * Available currencies
 */
export const CURRENCIES: CurrencyConfig[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "CNY", symbol: "CN¥", label: "Chinese Yuan" },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso" },
  { code: "BRL", symbol: "R$", label: "Brazilian Real" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
];

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.symbol || "$";
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  
  // Format number with 2 decimal places
  const formattedAmount = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return `${symbol}${formattedAmount}`;
}

/**
 * Size unit conversion factors to inches
 */
export const SIZE_UNIT_TO_INCHES: Record<string, number> = {
  inch: 1,
  cm: 0.393701,
  mm: 0.0393701,
  feet: 12,
  meter: 39.3701,
};

/**
 * Convert size value to inches
 */
export function convertToInches(value: number, unit: string): number {
  const factor = SIZE_UNIT_TO_INCHES[unit] || 1;
  return value * factor;
}

/**
 * Convert inches to size unit
 */
export function convertFromInches(inches: number, unit: string): number {
  const factor = SIZE_UNIT_TO_INCHES[unit] || 1;
  return inches / factor;
}
