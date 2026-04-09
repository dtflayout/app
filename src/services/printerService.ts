import { supabase } from "@/lib/supabaseClient";

export interface PrinterData {
  storeName: string;
  storeUrl: string;
  slug: string;
  logo_url?: string;
  currency?: string;
  is_active?: boolean;
}

export interface PrinterProductData {
  shopifyProductUrl: string;
  shopifyProductId?: string;
  productName?: string;
  productSlug?: string;
  sizeUnit: "mm" | "cm" | "inch" | "feet" | "meter";
  sheetWidthInches?: number;
  is_active?: boolean;
}

export interface PrinterVariantData {
  shopifyVariantId: string;
  variantName?: string;
  sizeValue: number;
  price?: number;
  cartUrl?: string;
}

export interface Printer {
  id: string;
  user_id: string;
  store_id: string;  // Unique store identifier (STR-XXXXXX format)
  slug: string;
  store_name: string | null;
  store_url: string | null;
  logo_url: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrinterProduct {
  id: string;
  printer_id: string;
  shopify_product_url: string;
  shopify_product_id: string | null;
  product_name: string | null;
  product_slug: string | null;
  size_unit: string;
  sheet_width_inches: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrinterVariant {
  id: string;
  printer_product_id: string;
  shopify_variant_id: string;
  variant_name: string | null;
  size_value: number;
  price: number | null;
  cart_url: string | null;
  created_at: string;
}

export interface ProductWithVariants extends PrinterProduct {
  variants: PrinterVariant[];
}

/**
 * Get printer record for the current user
 */
export async function getPrinter(
  userId: string
): Promise<{ success: boolean; data?: Printer | null; error?: string }> {
  try {
    console.log("[PrinterService] Fetching printer for user:", userId);

    const { data, error } = await supabase
      .from("printers")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned - user doesn't have a printer record yet
        console.log("[PrinterService] No printer record found for user");
        return { success: true, data: null };
      }
      console.error("[PrinterService] Error fetching printer:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Printer };
  } catch (err: any) {
    console.error("[PrinterService] Exception fetching printer:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Create or update printer record
 */
export async function savePrinter(
  userId: string,
  data: PrinterData
): Promise<{ success: boolean; data?: Printer; error?: string }> {
  try {
    console.log("[PrinterService] Saving printer for user:", userId);

    // Check if slug is already taken by another user
    const { data: slugCheck, error: slugError } = await supabase
      .from("printers")
      .select("id, user_id")
      .eq("slug", data.slug)
      .single();

    if (slugError && slugError.code !== "PGRST116") {
      console.error("[PrinterService] Error checking slug:", slugError);
      return { success: false, error: slugError.message };
    }

    if (slugCheck && slugCheck.user_id !== userId) {
      console.log("[PrinterService] Slug already taken:", data.slug);
      return { success: false, error: "This URL slug is already taken" };
    }

    // Check if printer already exists for this user
    const { data: existing } = await supabase
      .from("printers")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      // Update existing printer
      const { data: updated, error } = await supabase
        .from("printers")
        .update({
          store_name: data.storeName,
          store_url: data.storeUrl,
          slug: data.slug,
          logo_url: data.logo_url,
          currency: data.currency ?? 'USD',
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("[PrinterService] Error updating printer:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: updated as Printer };
    } else {
      // Create new printer
      const { data: created, error } = await supabase
        .from("printers")
        .insert({
          user_id: userId,
          store_name: data.storeName,
          store_url: data.storeUrl,
          slug: data.slug,
          logo_url: data.logo_url,
          currency: data.currency ?? 'USD',
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error("[PrinterService] Error creating printer:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: created as Printer };
    }
  } catch (err: any) {
    console.error("[PrinterService] Exception saving printer:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all products with variants for a printer
 */
export async function getProducts(
  printerId: string
): Promise<{ success: boolean; data?: ProductWithVariants[]; error?: string }> {
  try {
    console.log("[PrinterService] Fetching all products for printer:", printerId);

    const { data: products, error: productError } = await supabase
      .from("printer_products")
      .select("*")
      .eq("printer_id", printerId)
      .order("created_at", { ascending: false });

    if (productError) {
      console.error("[PrinterService] Error fetching products:", productError);
      return { success: false, error: productError.message };
    }

    if (!products || products.length === 0) {
      return { success: true, data: [] };
    }

    // Fetch variants for all products
    const productIds = products.map((p) => p.id);
    const { data: allVariants, error: variantsError } = await supabase
      .from("printer_variants")
      .select("*")
      .in("printer_product_id", productIds)
      .order("created_at", { ascending: true });

    if (variantsError) {
      console.error("[PrinterService] Error fetching variants:", variantsError);
    }

    // Map variants to products
    const productsWithVariants: ProductWithVariants[] = products.map((product) => ({
      ...(product as PrinterProduct),
      variants: (allVariants || []).filter(
        (v) => v.printer_product_id === product.id
      ) as PrinterVariant[],
    }));

    return { success: true, data: productsWithVariants };
  } catch (err: any) {
    console.error("[PrinterService] Exception fetching products:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get single product by ID with variants
 */
export async function getProductById(
  productId: string
): Promise<{ success: boolean; data?: ProductWithVariants | null; error?: string }> {
  try {
    console.log("[PrinterService] Fetching product by ID:", productId);

    const { data: product, error: productError } = await supabase
      .from("printer_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") {
        return { success: true, data: null };
      }
      console.error("[PrinterService] Error fetching product:", productError);
      return { success: false, error: productError.message };
    }

    // Fetch variants for this product
    const { data: variants, error: variantsError } = await supabase
      .from("printer_variants")
      .select("*")
      .eq("printer_product_id", product.id)
      .order("created_at", { ascending: true });

    if (variantsError) {
      console.error("[PrinterService] Error fetching variants:", variantsError);
    }

    return {
      success: true,
      data: {
        ...(product as PrinterProduct),
        variants: (variants || []) as PrinterVariant[],
      },
    };
  } catch (err: any) {
    console.error("[PrinterService] Exception fetching product:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get product with variants for a printer (legacy - gets first product)
 * @deprecated Use getProducts or getProductById instead
 */
export async function getProduct(
  printerId: string
): Promise<{ success: boolean; data?: ProductWithVariants | null; error?: string }> {
  try {
    console.log("[PrinterService] Fetching product for printer:", printerId);

    const { data: product, error: productError } = await supabase
      .from("printer_products")
      .select("*")
      .eq("printer_id", printerId)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") {
        // No product found
        console.log("[PrinterService] No product found for printer");
        return { success: true, data: null };
      }
      console.error("[PrinterService] Error fetching product:", productError);
      return { success: false, error: productError.message };
    }

    // Fetch variants for this product
    const { data: variants, error: variantsError } = await supabase
      .from("printer_variants")
      .select("*")
      .eq("printer_product_id", product.id)
      .order("created_at", { ascending: true });

    if (variantsError) {
      console.error("[PrinterService] Error fetching variants:", variantsError);
      // Return product without variants if variants fetch fails
      return {
        success: true,
        data: { ...(product as PrinterProduct), variants: [] },
      };
    }

    return {
      success: true,
      data: {
        ...(product as PrinterProduct),
        variants: (variants || []) as PrinterVariant[],
      },
    };
  } catch (err: any) {
    console.error("[PrinterService] Exception fetching product:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save product (create or update)
 */
export async function saveProduct(
  printerId: string,
  data: PrinterProductData,
  productId?: string
): Promise<{ success: boolean; data?: PrinterProduct; error?: string }> {
  try {
    console.log("[PrinterService] Saving product for printer:", printerId, "productId:", productId);

    // Check if product URL already exists for this printer (prevent duplicates)
    const { data: urlCheck, error: urlError } = await supabase
      .from("printer_products")
      .select("id")
      .eq("printer_id", printerId)
      .eq("shopify_product_url", data.shopifyProductUrl)
      .single();

    if (urlError && urlError.code !== "PGRST116") {
      console.error("[PrinterService] Error checking product URL:", urlError);
      return { success: false, error: urlError.message };
    }

    if (urlCheck && urlCheck.id !== productId) {
      return { success: false, error: "This product is already added. Please edit the existing product instead." };
    }

    // Check if product slug is unique within this printer's products
    if (data.productSlug) {
      const { data: slugCheck, error: slugError } = await supabase
        .from("printer_products")
        .select("id")
        .eq("printer_id", printerId)
        .eq("product_slug", data.productSlug)
        .single();

      if (slugError && slugError.code !== "PGRST116") {
        console.error("[PrinterService] Error checking slug:", slugError);
        return { success: false, error: slugError.message };
      }

      if (slugCheck && slugCheck.id !== productId) {
        return { success: false, error: "This product slug is already in use" };
      }
    }

    if (productId) {
      // Update existing product
      const { data: updated, error } = await supabase
        .from("printer_products")
        .update({
          shopify_product_url: data.shopifyProductUrl,
          shopify_product_id: data.shopifyProductId || null,
          product_name: data.productName || null,
          product_slug: data.productSlug || null,
          size_unit: data.sizeUnit,
          sheet_width_inches: data.sheetWidthInches ?? 22,
          is_active: data.is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .select()
        .single();

      if (error) {
        console.error("[PrinterService] Error updating product:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: updated as PrinterProduct };
    } else {
      // Create new product
      const { data: created, error } = await supabase
        .from("printer_products")
        .insert({
          printer_id: printerId,
          shopify_product_url: data.shopifyProductUrl,
          shopify_product_id: data.shopifyProductId || null,
          product_name: data.productName || null,
          product_slug: data.productSlug || null,
          size_unit: data.sizeUnit,
          sheet_width_inches: data.sheetWidthInches ?? 22,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error("[PrinterService] Error creating product:", error);
        return { success: false, error: error.message };
      }

      return { success: true, data: created as PrinterProduct };
    }
  } catch (err: any) {
    console.error("[PrinterService] Exception saving product:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete product and its variants
 */
export async function deleteProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[PrinterService] Deleting product:", productId);

    // Variants will be cascade deleted due to foreign key constraint
    const { error } = await supabase
      .from("printer_products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("[PrinterService] Error deleting product:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[PrinterService] Exception deleting product:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save variants for a product
 */
export async function saveVariants(
  productId: string,
  variants: PrinterVariantData[]
): Promise<{ success: boolean; data?: PrinterVariant[]; error?: string }> {
  try {
    console.log("[PrinterService] Saving variants for product:", productId);

    // Delete existing variants first
    const { error: deleteError } = await supabase
      .from("printer_variants")
      .delete()
      .eq("printer_product_id", productId);

    if (deleteError) {
      console.error("[PrinterService] Error deleting existing variants:", deleteError);
      return { success: false, error: deleteError.message };
    }

    // Insert new variants
    if (variants.length === 0) {
      return { success: true, data: [] };
    }

    const variantsToInsert = variants.map((v) => ({
      printer_product_id: productId,
      shopify_variant_id: v.shopifyVariantId,
      variant_name: v.variantName || null,
      size_value: v.sizeValue,
      price: v.price || null,
      cart_url: v.cartUrl || null,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("printer_variants")
      .insert(variantsToInsert)
      .select();

    if (insertError) {
      console.error("[PrinterService] Error inserting variants:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, data: inserted as PrinterVariant[] };
  } catch (err: any) {
    console.error("[PrinterService] Exception saving variants:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch variants from Shopify product URL
 */
export async function fetchShopifyVariants(
  productUrl: string
): Promise<{ success: boolean; variants?: Array<{ id: string; title: string; price: string }>; productName?: string; error?: string }> {
  try {
    console.log("[PrinterService] Fetching Shopify variants from:", productUrl);

    // Validate URL contains /products/
    if (!productUrl.includes("/products/")) {
      return { success: false, error: "Invalid product URL. Must contain /products/" };
    }

    // Convert to JSON endpoint
    const jsonUrl = productUrl.endsWith(".json")
      ? productUrl
      : productUrl.endsWith("/")
      ? `${productUrl}.json`
      : `${productUrl}.json`;

    console.log("[PrinterService] Fetching from JSON endpoint:", jsonUrl);

    // Fetch the JSON data
    const response = await fetch(jsonUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: "Product not found. Please check the URL." };
      }
      if (response.status === 0 || response.status === 403) {
        return {
          success: false,
          error: "CORS error: Unable to fetch product data. The store may have CORS restrictions. Please verify the product URL is correct.",
        };
      }
      return { success: false, error: `Failed to fetch product: ${response.statusText}` };
    }

    const data = await response.json();

    if (!data.product) {
      return { success: false, error: "Invalid product data received." };
    }

    const product = data.product;
    const variants = product.variants || [];

    if (variants.length === 0) {
      return { success: false, error: "No variants found for this product." };
    }

    // Format variants
    const formattedVariants = variants.map((variant: any) => ({
      id: variant.id?.toString() || "",
      title: variant.title || variant.name || "Untitled Variant",
      price: variant.price || "0.00",
    }));

    console.log("[PrinterService] Fetched variants:", formattedVariants.length);

    return {
      success: true,
      variants: formattedVariants,
      productName: product.title || null,
    };
  } catch (err: any) {
    console.error("[PrinterService] Exception fetching Shopify variants:", err);
    
    // Check if it's a CORS or network error
    if (err.message?.includes("CORS") || err.message?.includes("Failed to fetch") || err.name === "TypeError") {
      return {
        success: false,
        error: "Network error: Unable to fetch product data. This may be due to CORS restrictions. Please verify the product URL is correct and accessible.",
      };
    }

    return { success: false, error: err.message || "Failed to fetch product variants" };
  }
}
