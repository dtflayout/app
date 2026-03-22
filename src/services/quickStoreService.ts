/**
 * Quick Store Service
 * CRUD operations for Quick Store management
 */

import { supabase } from "@/lib/supabaseClient";
import { uploadToR2, deleteFromR2 } from "@/lib/r2Client";
import {
  QuickStore,
  QuickStoreInput,
  Testimonial,
  TestimonialInput,
} from "@/types/quickStore";

// ============================================
// QUICK STORE CRUD
// ============================================

/**
 * Get quick store for current user
 */
export async function getQuickStore(
  userId: string
): Promise<{ success: boolean; data?: QuickStore | null; error?: string }> {
  try {
    console.log("[QuickStoreService] Fetching store for user:", userId);

    const { data, error } = await supabase
      .from("quick_stores")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return { success: true, data: null };
      }
      console.error("[QuickStoreService] Error fetching store:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QuickStore };
  } catch (err: any) {
    console.error("[QuickStoreService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get quick store by ID
 */
export async function getQuickStoreById(
  storeId: string
): Promise<{ success: boolean; data?: QuickStore | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_stores")
      .select("*")
      .eq("id", storeId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QuickStore };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Check if slug is available
 */
export async function checkSlugAvailability(
  slug: string,
  excludeUserId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    const normalizedSlug = slug.toLowerCase().trim();

    // Check reserved slugs
    const { data: reserved } = await supabase
      .from("reserved_slugs")
      .select("slug")
      .eq("slug", normalizedSlug)
      .single();

    if (reserved) {
      return { available: false, reason: "This name is reserved" };
    }

    // Check existing stores
    let query = supabase
      .from("quick_stores")
      .select("slug, user_id")
      .eq("slug", normalizedSlug);

    const { data: existing } = await query.single();

    if (existing) {
      // If checking for same user (update case), it's available
      if (excludeUserId && existing.user_id === excludeUserId) {
        return { available: true };
      }
      return { available: false, reason: "This name is already taken" };
    }

    return { available: true };
  } catch (err: any) {
    // PGRST116 means no rows found, which is good
    if (err.code === "PGRST116") {
      return { available: true };
    }
    console.error("[QuickStoreService] Slug check error:", err);
    return { available: true }; // Assume available on error
  }
}

/**
 * Create quick store
 */
export async function createQuickStore(
  userId: string,
  input: QuickStoreInput
): Promise<{ success: boolean; data?: QuickStore; error?: string }> {
  try {
    console.log("[QuickStoreService] Creating store for user:", userId);

    // Validate slug
    const slugCheck = await checkSlugAvailability(input.slug);
    if (!slugCheck.available) {
      return { success: false, error: slugCheck.reason };
    }

    const { data, error } = await supabase
      .from("quick_stores")
      .insert({
        user_id: userId,
        ...input,
        slug: input.slug.toLowerCase().trim(),
      })
      .select()
      .single();

    if (error) {
      console.error("[QuickStoreService] Create error:", error);
      return { success: false, error: error.message };
    }

    console.log("[QuickStoreService] Store created:", data.slug);
    return { success: true, data: data as QuickStore };
  } catch (err: any) {
    console.error("[QuickStoreService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update quick store
 */
export async function updateQuickStore(
  storeId: string,
  input: Partial<QuickStoreInput>
): Promise<{ success: boolean; data?: QuickStore; error?: string }> {
  try {
    console.log("[QuickStoreService] Updating store:", storeId);

    // If updating slug, check availability
    if (input.slug) {
      const { data: current } = await supabase
        .from("quick_stores")
        .select("slug, user_id")
        .eq("id", storeId)
        .single();

      if (current && current.slug !== input.slug.toLowerCase().trim()) {
        const slugCheck = await checkSlugAvailability(input.slug, current.user_id);
        if (!slugCheck.available) {
          return { success: false, error: slugCheck.reason };
        }
      }
      input.slug = input.slug.toLowerCase().trim();
    }

    const { data, error } = await supabase
      .from("quick_stores")
      .update(input)
      .eq("id", storeId)
      .select()
      .single();

    if (error) {
      console.error("[QuickStoreService] Update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QuickStore };
  } catch (err: any) {
    console.error("[QuickStoreService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Publish/unpublish store
 */
export async function setStorePublished(
  storeId: string,
  isPublished: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QuickStoreService] Setting published:", storeId, isPublished);

    const { error } = await supabase
      .from("quick_stores")
      .update({ is_published: isPublished })
      .eq("id", storeId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete quick store
 */
export async function deleteQuickStore(
  storeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QuickStoreService] Deleting store:", storeId);

    const { error } = await supabase
      .from("quick_stores")
      .delete()
      .eq("id", storeId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// TESTIMONIALS CRUD
// ============================================

/**
 * Get testimonials for a store
 */
export async function getTestimonials(
  storeId: string
): Promise<{ success: boolean; data?: Testimonial[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_testimonials")
      .select("*")
      .eq("quick_store_id", storeId)
      .order("display_order", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Testimonial[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Create testimonial
 */
export async function createTestimonial(
  storeId: string,
  input: TestimonialInput
): Promise<{ success: boolean; data?: Testimonial; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_testimonials")
      .insert({ quick_store_id: storeId, ...input })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Testimonial };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update testimonial
 */
export async function updateTestimonial(
  testimonialId: string,
  input: Partial<TestimonialInput>
): Promise<{ success: boolean; data?: Testimonial; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_testimonials")
      .update(input)
      .eq("id", testimonialId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Testimonial };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete testimonial
 */
export async function deleteTestimonial(
  testimonialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("quick_store_testimonials")
      .delete()
      .eq("id", testimonialId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Reorder testimonials
 */
export async function reorderTestimonials(
  testimonialIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (let i = 0; i < testimonialIds.length; i++) {
      await supabase
        .from("quick_store_testimonials")
        .update({ display_order: i })
        .eq("id", testimonialIds[i]);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// FILE UPLOADS
// ============================================

/**
 * Upload store asset (logo, banner, favicon) to R2
 */
export async function uploadStoreAsset(
  storeId: string,
  file: File,
  type: 'logo' | 'banner' | 'favicon' | 'product'
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${storeId}/${type}-${Date.now()}.${fileExt}`;

    console.log("[QuickStoreService] Uploading asset:", path);

    const result = await uploadToR2("store-assets", path, file, file.type || "image/png");

    if (!result.success) {
      console.error("[QuickStoreService] Upload error:", result.error);
      return { success: false, error: result.error };
    }

    console.log("[QuickStoreService] Asset uploaded:", result.publicUrl);
    return { success: true, url: result.publicUrl };
  } catch (err: any) {
    console.error("[QuickStoreService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Delete store asset from R2
 */
export async function deleteStoreAsset(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract the R2 key from the full public URL
    // URL format: https://<R2_PUBLIC_URL>/store-assets/<storeId>/<filename>
    const storeAssetsIdx = filePath.indexOf("store-assets/");
    if (storeAssetsIdx === -1) {
      return { success: false, error: "Invalid file path — not an R2 store-assets URL" };
    }
    const key = filePath.substring(storeAssetsIdx);

    const result = await deleteFromR2([key]);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
