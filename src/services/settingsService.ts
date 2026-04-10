/**
 * Settings Service
 * CRUD operations for user profile/settings
 */

import { supabase } from "@/lib/supabaseClient";

export interface ProfileSettings {
  id: string;
  email: string;
  full_name: string | null;
  business_name: string | null;
  country: string | null;
  currency: string;
  phone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  business_name?: string;
  country?: string;
  currency?: string;
  phone?: string;
  onboarding_completed?: boolean;
}

/**
 * Get full profile for the current user
 */
export async function getProfile(
  userId: string
): Promise<{ success: boolean; data?: ProfileSettings | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ProfileSettings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update profile settings
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdateData
): Promise<{ success: boolean; data?: ProfileSettings; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ProfileSettings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Change password (verify old password first)
 */
export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify current password by attempting sign-in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete user account
 * Note: This signs out the user. Actual data deletion 
 * should be handled by a Supabase Edge Function or admin API
 * since client-side cannot delete auth users.
 */
export async function requestAccountDeletion(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Mark profile as deleted (soft delete)
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: "[DELETED]",
        business_name: null,
        phone: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get connected stores summary (WI + QS)
 */
export async function getConnectedStores(
  userId: string
): Promise<{
  success: boolean;
  data?: {
    websiteIntegration: { store_name: string; slug: string; is_active: boolean; product_count: number } | null;
    quickStore: { store_name: string; slug: string; is_active: boolean; product_count: number } | null;
  };
  error?: string;
}> {
  try {
    // Fetch WI printer
    const { data: printer } = await supabase
      .from("printers")
      .select("store_name, slug, is_active")
      .eq("user_id", userId)
      .single();

    let wiData = null;
    if (printer) {
      const { data: printerId } = await supabase
        .from("printers")
        .select("id")
        .eq("user_id", userId)
        .single();

      let productCount = 0;
      if (printerId) {
        const { count } = await supabase
          .from("printer_products")
          .select("*", { count: "exact", head: true })
          .eq("printer_id", printerId.id);
        productCount = count || 0;
      }

      wiData = {
        store_name: printer.store_name || "Unnamed Store",
        slug: printer.slug,
        is_active: printer.is_active,
        product_count: productCount,
      };
    }

    // Fetch QS store
    const { data: qsStore } = await supabase
      .from("quick_stores")
      .select("store_name, slug, is_active")
      .eq("user_id", userId)
      .single();

    let qsData = null;
    if (qsStore) {
      const { data: qsId } = await supabase
        .from("quick_stores")
        .select("id")
        .eq("user_id", userId)
        .single();

      let productCount = 0;
      if (qsId) {
        const { count } = await supabase
          .from("quick_store_products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", qsId.id);
        productCount = count || 0;
      }

      qsData = {
        store_name: qsStore.store_name || "Unnamed Store",
        slug: qsStore.slug,
        is_active: qsStore.is_active,
        product_count: productCount,
      };
    }

    return {
      success: true,
      data: { websiteIntegration: wiData, quickStore: qsData },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Country list for dropdown */
export const COUNTRIES = [
  "Argentina", "Australia", "Austria", "Belgium", "Brazil",
  "Canada", "Chile", "China", "Colombia", "Croatia",
  "Czech Republic", "Denmark", "Egypt", "Finland", "France",
  "Germany", "Greece", "Hungary", "India", "Indonesia",
  "Ireland", "Israel", "Italy", "Japan", "Kenya",
  "Malaysia", "Mexico", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Pakistan", "Philippines", "Poland", "Portugal",
  "Romania", "Saudi Arabia", "Singapore", "South Africa", "South Korea",
  "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand",
  "Turkey", "United Arab Emirates", "United Kingdom", "United States", "Vietnam",
] as const;

/** Currency list */
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "KRW", symbol: "₩", name: "South Korean Won" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "ZAR", symbol: "R", name: "South African Rand" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  { code: "THB", symbol: "฿", name: "Thai Baht" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso" },
] as const;

/** Phone country codes */
export const PHONE_CODES = [
  { code: "+54", country: "Argentina" },
  { code: "+61", country: "Australia" },
  { code: "+43", country: "Austria" },
  { code: "+32", country: "Belgium" },
  { code: "+55", country: "Brazil" },
  { code: "+1", country: "Canada" },
  { code: "+56", country: "Chile" },
  { code: "+86", country: "China" },
  { code: "+57", country: "Colombia" },
  { code: "+385", country: "Croatia" },
  { code: "+420", country: "Czech Republic" },
  { code: "+45", country: "Denmark" },
  { code: "+20", country: "Egypt" },
  { code: "+358", country: "Finland" },
  { code: "+33", country: "France" },
  { code: "+49", country: "Germany" },
  { code: "+30", country: "Greece" },
  { code: "+36", country: "Hungary" },
  { code: "+91", country: "India" },
  { code: "+62", country: "Indonesia" },
  { code: "+353", country: "Ireland" },
  { code: "+972", country: "Israel" },
  { code: "+39", country: "Italy" },
  { code: "+81", country: "Japan" },
  { code: "+254", country: "Kenya" },
  { code: "+60", country: "Malaysia" },
  { code: "+52", country: "Mexico" },
  { code: "+31", country: "Netherlands" },
  { code: "+64", country: "New Zealand" },
  { code: "+234", country: "Nigeria" },
  { code: "+47", country: "Norway" },
  { code: "+92", country: "Pakistan" },
  { code: "+63", country: "Philippines" },
  { code: "+48", country: "Poland" },
  { code: "+351", country: "Portugal" },
  { code: "+40", country: "Romania" },
  { code: "+966", country: "Saudi Arabia" },
  { code: "+65", country: "Singapore" },
  { code: "+27", country: "South Africa" },
  { code: "+82", country: "South Korea" },
  { code: "+34", country: "Spain" },
  { code: "+46", country: "Sweden" },
  { code: "+41", country: "Switzerland" },
  { code: "+886", country: "Taiwan" },
  { code: "+66", country: "Thailand" },
  { code: "+90", country: "Turkey" },
  { code: "+971", country: "UAE" },
  { code: "+44", country: "United Kingdom" },
  { code: "+1", country: "United States" },
  { code: "+84", country: "Vietnam" },
] as const;
