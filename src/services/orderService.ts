/**
 * Order Service
 * Handles order/design management for printers
 */

import { supabase } from "@/lib/supabaseClient";
import { getR2PublicUrl, deleteR2Folder } from "@/lib/r2Client";

export interface OrderDesign {
  id: string;
  design_code: string;
  status: "pending" | "paid" | "downloaded" | "expired";
  sheets: SheetInfo[];
  sheet_count: number;
  total_price: number;
  currency: string;
  customer_email: string | null;
  created_at: string;
  paid_at: string | null;
  downloaded_at: string | null;
  expires_at: string;
  printer_product: {
    product_name: string;
    product_slug: string;
  } | null;
}

export interface SheetInfo {
  sheet_number: number;
  image_count: number;
  width_inches: number;
  height_inches: number;
  variant_id: string;
  variant_name: string;
  variant_price: number;
  storage_path: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  paid: number;
  downloaded: number;
  expired: number;
}

/**
 * Get all orders/designs for a printer
 */
export async function getOrders(
  printerId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; data?: OrderDesign[]; count?: number; error?: string }> {
  try {
    console.log("[OrderService] Fetching orders for printer:", printerId);

    let query = supabase
      .from("designs")
      .select(`
        *,
        printer_product:printer_products(product_name, product_slug)
      `, { count: "exact" })
      .eq("printer_id", printerId)
      .order("created_at", { ascending: false });

    // Filter by status if provided
    if (options?.status && options.status !== "all") {
      query = query.eq("status", options.status);
    }

    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[OrderService] Error fetching orders:", error);
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      data: data as OrderDesign[], 
      count: count || 0 
    };
  } catch (err: any) {
    console.error("[OrderService] Exception fetching orders:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get order statistics for a printer
 */
export async function getOrderStats(
  printerId: string
): Promise<{ success: boolean; data?: OrderStats; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("designs")
      .select("status")
      .eq("printer_id", printerId);

    if (error) {
      return { success: false, error: error.message };
    }

    const stats: OrderStats = {
      total: data.length,
      pending: data.filter(d => d.status === "pending").length,
      paid: data.filter(d => d.status === "paid").length,
      downloaded: data.filter(d => d.status === "downloaded").length,
      expired: data.filter(d => d.status === "expired").length,
    };

    return { success: true, data: stats };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get single order by ID
 */
export async function getOrderById(
  orderId: string,
  printerId: string
): Promise<{ success: boolean; data?: OrderDesign; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("designs")
      .select(`
        *,
        printer_product:printer_products(product_name, product_slug)
      `)
      .eq("id", orderId)
      .eq("printer_id", printerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Order not found" };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as OrderDesign };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update order status
 * 
 * Retention policy:
 * - When marked "paid": extends expires_at to 10 days from now
 * - When marked "downloaded": extends expires_at to 10 days from now
 */
export async function updateOrderStatus(
  orderId: string,
  printerId: string,
  status: "pending" | "paid" | "downloaded" | "expired"
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date();
    const updateData: Record<string, any> = { status };

    // Set timestamp and extend expiry based on status
    if (status === "paid") {
      updateData.paid_at = now.toISOString();
      // Extend expiry to 10 days from now
      updateData.expires_at = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === "downloaded") {
      updateData.downloaded_at = now.toISOString();
      // Extend expiry to 10 days from now (latest action)
      updateData.expires_at = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    }

    const { error } = await supabase
      .from("designs")
      .update(updateData)
      .eq("id", orderId)
      .eq("printer_id", printerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get download URLs for order sheets from R2
 */
export async function getOrderDownloadUrls(
  storeId: string,
  designCode: string,
  sheetCount: number
): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    const urls: string[] = [];

    for (let i = 1; i <= sheetCount; i++) {
      const path = `${storeId}/${designCode}/sheet_${i}.png`;
      urls.push(getR2PublicUrl("design-files", path));
    }

    return { success: true, urls };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get preview URLs for order sheets from R2
 */
export async function getOrderPreviewUrls(
  storeId: string,
  designCode: string,
  sheetCount: number
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 1; i <= sheetCount; i++) {
    const path = `${storeId}/${designCode}/preview_${i}.png`;
    urls.push(getR2PublicUrl("design-files", path));
  }

  return urls;
}

/**
 * Delete order and its files from R2
 */
export async function deleteOrder(
  orderId: string,
  printerId: string,
  storeId: string,
  designCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete files from R2 storage first
    const folderPath = `${storeId}/${designCode}`;
    const deleteResult = await deleteR2Folder("design-files", folderPath);

    if (!deleteResult.success) {
      console.error("[OrderService] Error deleting R2 files:", deleteResult.error);
      // Continue with DB deletion even if storage delete fails
    }

    // Delete the database record
    const { error } = await supabase
      .from("designs")
      .delete()
      .eq("id", orderId)
      .eq("printer_id", printerId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Mark expired designs (for manual trigger or cron job)
 * Returns count of designs marked as expired
 */
export async function markExpiredDesigns(
  printerId?: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    let query = supabase
      .from("designs")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    if (printerId) {
      query = query.eq("printer_id", printerId);
    }

    const { data, error } = await query.select("id");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Format time remaining until expiry
 */
export function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}

// ============================================================================
// DATE FORMATTING UTILITIES
// All dates are stored in UTC in database and converted to user's local timezone
// ============================================================================

/**
 * Format date with time (default format)
 * Example: "Feb 15, 2026, 3:45 PM"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format date only (no time)
 * Example: "Feb 15, 2026"
 */
export function formatDateOnly(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time only (no date)
 * Example: "3:45 PM"
 */
export function formatTimeOnly(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format as relative time ("2 hours ago", "3 days ago", "just now")
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  
  // Future date
  if (diffMs < 0) {
    return formatDate(dateString);
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "just now";
  } else if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else {
    return formatDateOnly(dateString);
  }
}

/**
 * Format date with full details
 * Example: "Saturday, February 15, 2026 at 3:45 PM"
 */
export function formatDateFull(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get user's timezone abbreviation (e.g., "IST", "EST", "PST")
 */
export function getTimezoneAbbreviation(): string {
  const timeString = new Date().toLocaleTimeString("en-US", { 
    timeZoneName: "short" 
  });
  // Extract timezone abbreviation from string like "3:45:00 PM IST"
  const parts = timeString.split(" ");
  return parts[parts.length - 1];
}

/**
 * Get user's full timezone name (e.g., "Asia/Kolkata", "America/New_York")
 */
export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
