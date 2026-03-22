/**
 * Public Builder Service
 * Handles data fetching and operations for the public builder page
 * These functions are accessible without authentication (for public builder)
 */

import { supabase } from "@/lib/supabaseClient";
import { uploadToR2 } from "@/lib/r2Client";
import {
  PublicPrinter,
  PublicProduct,
  PublicVariant,
  Design,
  CreateDesignPayload,
  convertFromInches,
} from "@/types/publicBuilder";

/**
 * Fetch printer by slug (public access, no auth required)
 */
export async function getPublicPrinter(
  slug: string
): Promise<{ success: boolean; data?: PublicPrinter; error?: string }> {
  try {
    console.log("[PublicBuilderService] Fetching printer by slug:", slug);

    const { data, error } = await supabase
      .from("printers")
      .select("id, store_id, slug, store_name, store_url, logo_url, currency")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Store not found" };
      }
      console.error("[PublicBuilderService] Error fetching printer:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as PublicPrinter };
  } catch (err: any) {
    console.error("[PublicBuilderService] Exception fetching printer:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch product with variants by slug (public access)
 */
export async function getPublicProduct(
  printerId: string,
  productSlug: string
): Promise<{ success: boolean; data?: PublicProduct; error?: string }> {
  try {
    console.log("[PublicBuilderService] Fetching product:", productSlug, "for printer:", printerId);

    // Get product with printer's store_url
    const { data: product, error: productError } = await supabase
      .from("printer_products")
      .select("id, printer_id, product_name, product_slug, size_unit, sheet_width_inches, shopify_product_url, printers!inner(store_url)")
      .eq("printer_id", printerId)
      .eq("product_slug", productSlug)
      .eq("is_active", true)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") {
        return { success: false, error: "Product not found" };
      }
      console.error("[PublicBuilderService] Error fetching product:", productError);
      return { success: false, error: productError.message };
    }

    // Extract store_url from the joined printers data
    const storeUrl = (product as any).printers?.store_url;
    if (!storeUrl) {
      console.error("[PublicBuilderService] Store URL not found for printer");
      return { success: false, error: "Store URL not found" };
    }

    // Get variants
    const { data: variants, error: variantsError } = await supabase
      .from("printer_variants")
      .select("id, shopify_variant_id, variant_name, size_value, price, cart_url")
      .eq("printer_product_id", product.id)
      .order("size_value", { ascending: true });

    if (variantsError) {
      console.error("[PublicBuilderService] Error fetching variants:", variantsError);
      return { success: false, error: variantsError.message };
    }

    // Auto-generate cart_url for variants that don't have it
    const variantsWithCartUrl = (variants || []).map((v) => {
      if (!v.cart_url && v.shopify_variant_id) {
        return {
          ...v,
          cart_url: `${storeUrl}/cart/add?id=${v.shopify_variant_id}`,
        };
      }
      return v;
    });

    // Filter out variants without price (cart_url is no longer required since we auto-generate it)
    const validVariants = variantsWithCartUrl.filter(
      (v) => v.price != null
    );

    console.log("[PublicBuilderService] Found", validVariants.length, "valid variants");

    // Clean up product object - remove nested printers data
    const { printers, ...cleanProduct } = product as any;

    return {
      success: true,
      data: {
        ...cleanProduct,
        variants: validVariants as PublicVariant[],
      } as PublicProduct,
    };
  } catch (err: any) {
    console.error("[PublicBuilderService] Exception fetching product:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Find the best matching variant for a given sheet height
 * Returns the smallest variant that is >= the sheet height
 */
export function findMatchingVariant(
  heightInches: number,
  variants: PublicVariant[],
  sizeUnit: string
): PublicVariant | null {
  if (!variants.length) {
    console.warn("[PublicBuilderService] No variants available");
    return null;
  }

  // Convert height to the product's size unit for comparison
  const heightInUnit = convertFromInches(heightInches, sizeUnit);

  console.log(
    "[PublicBuilderService] Finding variant for height:",
    heightInches,
    "inches =",
    heightInUnit.toFixed(2),
    sizeUnit
  );

  // Sort variants by size_value ascending
  const sorted = [...variants].sort((a, b) => a.size_value - b.size_value);

  // Find smallest variant where size_value >= height
  const match = sorted.find((v) => v.size_value >= heightInUnit);

  if (match) {
    console.log("[PublicBuilderService] Matched variant:", match.variant_name, "at", match.size_value, sizeUnit);
    return match;
  }

  // If no match found (sheet exceeds all variants), return largest variant
  const largest = sorted[sorted.length - 1];
  console.warn(
    "[PublicBuilderService] Sheet exceeds all variants. Using largest:",
    largest.variant_name,
    "at",
    largest.size_value,
    sizeUnit
  );
  return largest;
}

/**
 * Get the maximum allowed sheet height based on available variants
 */
export function getMaxSheetHeight(
  variants: PublicVariant[],
  sizeUnit: string
): number {
  if (!variants.length) return 0;

  // Find the largest variant
  const maxVariant = variants.reduce((max, v) =>
    v.size_value > max.size_value ? v : max
  );

  // Convert to inches based on size unit
  const SIZE_UNIT_TO_INCHES: Record<string, number> = {
    inch: 1,
    cm: 0.393701,
    mm: 0.0393701,
    feet: 12,
    meter: 39.3701,
  };

  const factor = SIZE_UNIT_TO_INCHES[sizeUnit] || 1;
  return maxVariant.size_value * factor;
}

/**
 * Save design to database
 */
export async function saveDesign(
  payload: CreateDesignPayload
): Promise<{ success: boolean; data?: Design; error?: string }> {
  try {
    console.log("[PublicBuilderService] Saving design:", payload);

    const { data, error } = await supabase
      .from("designs")
      .insert({
        printer_id: payload.printer_id,
        printer_product_id: payload.printer_product_id,
        sheets: payload.sheets,
        sheet_count: payload.sheet_count,
        total_price: payload.total_price,
        currency: payload.currency,
        customer_email: payload.customer_email || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[PublicBuilderService] Error saving design:", error);
      return { success: false, error: error.message };
    }

    console.log("[PublicBuilderService] Design saved with code:", data.design_code);
    return { success: true, data: data as Design };
  } catch (err: any) {
    console.error("[PublicBuilderService] Exception saving design:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get design by design code
 */
export async function getDesignByCode(
  designCode: string
): Promise<{ success: boolean; data?: Design; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("designs")
      .select("*")
      .eq("design_code", designCode)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Design not found" };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Design };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload sheet PNG to R2 via presigned URL
 * Path: design-files/{store_id}/{design_code}/sheet_{n}.png
 */
export async function uploadSheetFile(
  storeId: string,
  designCode: string,
  sheetNumber: number,
  blob: Blob
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  try {
    const path = `${storeId}/${designCode}/sheet_${sheetNumber}.png`;

    const result = await uploadToR2("design-files", path, blob, "image/png");

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      path,
      publicUrl: result.publicUrl,
    };
  } catch (err: any) {
    console.error("[PublicBuilderService] Exception uploading file:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Upload preview PNG to R2 via presigned URL
 * Path: design-files/{store_id}/{design_code}/preview_{n}.png
 */
export async function uploadPreviewFile(
  storeId: string,
  designCode: string,
  sheetNumber: number,
  blob: Blob
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const path = `${storeId}/${designCode}/preview_${sheetNumber}.png`;

    const result = await uploadToR2("design-files", path, blob, "image/png");

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, publicUrl: result.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Build Shopify cart URL for multiple items
 * Uses the /cart/add format with return_to=/cart parameter
 * Properties are attached to EACH line item so they display in cart
 */
export function buildCartUrl(
  variants: PublicVariant[],
  designCode: string,
  properties?: Record<string, string>
): string {
  if (!variants.length) return "";

  const firstCartUrl = variants[0].cart_url;
  let storeUrl: string;
  
  try {
    const url = new URL(firstCartUrl);
    storeUrl = url.origin;
  } catch {
    console.warn("[PublicBuilderService] Could not parse store URL from cart_url");
    return firstCartUrl;
  }

  // For single item
  if (variants.length === 1) {
    const variant = variants[0];
    let cartUrl = `${storeUrl}/cart/add?id=${variant.shopify_variant_id}&quantity=1`;
    
    // Add properties
    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        cartUrl += `&properties[${encodeURIComponent(key)}]=${encodeURIComponent(value)}`;
      });
    }
    
    cartUrl += "&return_to=/cart";
    console.log("[PublicBuilderService] Built cart URL:", cartUrl);
    return cartUrl;
  }

  // For multiple items - properties must be attached to EACH item
  const itemParams = variants
    .map((v, index) => {
      let itemStr = `items[][id]=${v.shopify_variant_id}&items[][quantity]=1`;
      
      // Add properties to each item
      if (properties) {
        Object.entries(properties).forEach(([key, value]) => {
          // For multi-sheet, add sheet number to each item's properties
          if (key === "Sheets") {
            itemStr += `&items[][properties][Sheet]=${index + 1} of ${value}`;
          } else {
            itemStr += `&items[][properties][${encodeURIComponent(key)}]=${encodeURIComponent(value)}`;
          }
        });
      }
      
      return itemStr;
    })
    .join("&");

  const cartUrl = `${storeUrl}/cart/add?${itemParams}&return_to=/cart`;
  console.log("[PublicBuilderService] Built cart URL:", cartUrl);
  return cartUrl;
}

/**
 * Build individual cart add URLs with properties
 * Returns an array of URLs, one per variant
 * This allows adding line item properties but requires multiple redirects
 */
export function buildCartAddUrls(
  variants: PublicVariant[],
  designCode: string,
  sheetNumbers: number[]
): string[] {
  return variants.map((variant, index) => {
    const sheetNum = sheetNumbers[index] || index + 1;
    const totalSheets = variants.length;
    
    // Build URL with properties
    const params = new URLSearchParams({
      id: variant.shopify_variant_id,
      quantity: "1",
      "properties[Design]": designCode,
      "properties[Sheet]": `${sheetNum} of ${totalSheets}`,
    });

    try {
      const storeUrl = new URL(variant.cart_url).origin;
      return `${storeUrl}/cart/add?${params.toString()}`;
    } catch {
      return variant.cart_url;
    }
  });
}

/**
 * Update design status
 */
export async function updateDesignStatus(
  designId: string,
  status: "pending" | "paid" | "downloaded" | "expired",
  additionalFields?: Partial<Design>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = { status };

    if (status === "paid") {
      updateData.paid_at = new Date().toISOString();
    } else if (status === "downloaded") {
      updateData.downloaded_at = new Date().toISOString();
    }

    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    const { error } = await supabase
      .from("designs")
      .update(updateData)
      .eq("id", designId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
