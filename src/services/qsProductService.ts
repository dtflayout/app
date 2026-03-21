/**
 * Quick Store Product Service
 * CRUD operations for Quick Store products
 */

import { supabase } from "@/lib/supabaseClient";
import { QSProduct, QSProductInput, generateSlug } from "@/types/quickStore";

/**
 * Get all products for a store
 */
export async function getQSProducts(
  storeId: string
): Promise<{ success: boolean; data?: QSProduct[]; error?: string }> {
  try {
    console.log("[QSProductService] Fetching products for store:", storeId);

    const { data, error } = await supabase
      .from("quick_store_products")
      .select("*")
      .eq("quick_store_id", storeId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[QSProductService] Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSProduct[] };
  } catch (err: any) {
    console.error("[QSProductService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get single product by ID
 */
export async function getQSProductById(
  productId: string
): Promise<{ success: boolean; data?: QSProduct | null; error?: string }> {
  try {
    console.log("[QSProductService] Fetching product:", productId);

    const { data, error } = await supabase
      .from("quick_store_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get product by slug (for public storefront)
 */
export async function getQSProductBySlug(
  storeId: string,
  productSlug: string
): Promise<{ success: boolean; data?: QSProduct | null; error?: string }> {
  try {
    console.log("[QSProductService] Fetching product by slug:", productSlug);

    const { data, error } = await supabase
      .from("quick_store_products")
      .select("*")
      .eq("quick_store_id", storeId)
      .eq("product_slug", productSlug.toLowerCase())
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSProduct };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if product slug is available within a store
 */
export async function checkProductSlugAvailability(
  storeId: string,
  slug: string,
  excludeProductId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    const normalizedSlug = slug.toLowerCase().trim();

    let query = supabase
      .from("quick_store_products")
      .select("id")
      .eq("quick_store_id", storeId)
      .eq("product_slug", normalizedSlug);

    if (excludeProductId) {
      query = query.neq("id", excludeProductId);
    }

    const { data } = await query.single();

    if (data) {
      return { available: false, reason: "A product with this URL already exists" };
    }

    return { available: true };
  } catch (err: any) {
    // PGRST116 means no rows found
    if (err.code === "PGRST116") {
      return { available: true };
    }
    return { available: true };
  }
}

/**
 * Create product
 */
export async function createQSProduct(
  storeId: string,
  input: QSProductInput
): Promise<{ success: boolean; data?: QSProduct; error?: string }> {
  try {
    console.log("[QSProductService] Creating product for store:", storeId);

    // Generate slug if not provided
    const slug = (input.product_slug || generateSlug(input.product_name)).toLowerCase().trim();

    // Check slug availability
    const slugCheck = await checkProductSlugAvailability(storeId, slug);
    if (!slugCheck.available) {
      return { success: false, error: slugCheck.reason };
    }

    // Get current max display_order
    const { data: maxOrder } = await supabase
      .from("quick_store_products")
      .select("display_order")
      .eq("quick_store_id", storeId)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const displayOrder = (maxOrder?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("quick_store_products")
      .insert({
        quick_store_id: storeId,
        ...input,
        product_slug: slug,
        display_order: input.display_order ?? displayOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("[QSProductService] Create error:", error);
      return { success: false, error: error.message };
    }

    console.log("[QSProductService] Product created:", data.product_slug);
    return { success: true, data: data as QSProduct };
  } catch (err: any) {
    console.error("[QSProductService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update product
 */
export async function updateQSProduct(
  productId: string,
  input: Partial<QSProductInput>
): Promise<{ success: boolean; data?: QSProduct; error?: string }> {
  try {
    console.log("[QSProductService] Updating product:", productId);

    // If updating slug, check availability
    if (input.product_slug) {
      const { data: current } = await supabase
        .from("quick_store_products")
        .select("quick_store_id, product_slug")
        .eq("id", productId)
        .single();

      if (current && current.product_slug !== input.product_slug.toLowerCase().trim()) {
        const slugCheck = await checkProductSlugAvailability(
          current.quick_store_id,
          input.product_slug,
          productId
        );
        if (!slugCheck.available) {
          return { success: false, error: slugCheck.reason };
        }
      }
      input.product_slug = input.product_slug.toLowerCase().trim();
    }

    const { data, error } = await supabase
      .from("quick_store_products")
      .update(input)
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      console.error("[QSProductService] Update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSProduct };
  } catch (err: any) {
    console.error("[QSProductService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete product
 */
export async function deleteQSProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QSProductService] Deleting product:", productId);

    const { error } = await supabase
      .from("quick_store_products")
      .delete()
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Toggle product active status
 */
export async function toggleProductActive(
  productId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("quick_store_products")
      .update({ is_active: isActive })
      .eq("id", productId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Reorder products
 */
export async function reorderQSProducts(
  productIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QSProductService] Reordering products");

    for (let i = 0; i < productIds.length; i++) {
      const { error } = await supabase
        .from("quick_store_products")
        .update({ display_order: i })
        .eq("id", productIds[i]);

      if (error) {
        console.error("[QSProductService] Reorder error:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Duplicate product
 */
export async function duplicateQSProduct(
  productId: string
): Promise<{ success: boolean; data?: QSProduct; error?: string }> {
  try {
    console.log("[QSProductService] Duplicating product:", productId);

    // Get original product
    const { data: original, error: fetchError } = await supabase
      .from("quick_store_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (fetchError || !original) {
      return { success: false, error: "Product not found" };
    }

    // Generate new slug
    let newSlug = `${original.product_slug}-copy`;
    let counter = 1;
    
    while (true) {
      const check = await checkProductSlugAvailability(original.quick_store_id, newSlug);
      if (check.available) break;
      counter++;
      newSlug = `${original.product_slug}-copy-${counter}`;
    }

    // Create duplicate
    const { id, created_at, updated_at, ...productData } = original;
    
    return createQSProduct(original.quick_store_id, {
      ...productData,
      product_name: `${original.product_name} (Copy)`,
      product_slug: newSlug,
    });
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get active products for public storefront
 */
export async function getPublicProducts(
  storeId: string
): Promise<{ success: boolean; data?: QSProduct[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_products")
      .select("*")
      .eq("quick_store_id", storeId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSProduct[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Alias exports for storefront pages
export const getProductById = getQSProductById;
export const getProducts = getQSProducts;
