/**
 * Quick Store Order Service
 * Order management operations
 */

import { supabase } from "@/lib/supabaseClient";
import { uploadToR2, getR2PublicUrl, deleteR2Folder } from "@/lib/r2Client";
import { QSOrder, QSOrderInput, OrderStatus } from "@/types/quickStore";

// ============================================
// RATE LIMITING
// ============================================

/**
 * Check rate limit before allowing order submission
 */
export async function checkRateLimit(
  storeId: string,
  phone: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check store limit (50/day)
    const { count: storeCount } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .gte("created_at", `${today}T00:00:00`);

    if ((storeCount || 0) >= 50) {
      return { 
        allowed: false, 
        reason: "This store has reached its daily order limit. Please try again tomorrow." 
      };
    }

    // Check phone limit (10/day across all stores)
    const { count: phoneCount } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .gte("created_at", `${today}T00:00:00`);

    if ((phoneCount || 0) >= 10) {
      return { 
        allowed: false, 
        reason: "You've reached the daily order limit. Please try again tomorrow." 
      };
    }

    return { allowed: true };
  } catch (err: any) {
    console.error("[QSOrderService] Rate limit check error:", err);
    return { allowed: true }; // Allow on error
  }
}

// ============================================
// ORDER CRUD
// ============================================

/**
 * Create new order
 */
export async function createQSOrder(
  input: QSOrderInput,
  storeSlug: string
): Promise<{ success: boolean; data?: QSOrder; error?: string }> {
  try {
    console.log("[QSOrderService] Creating order for store:", input.quick_store_id);

    // Check rate limit
    const rateCheck = await checkRateLimit(input.quick_store_id, input.customer_phone);
    if (!rateCheck.allowed) {
      return { success: false, error: rateCheck.reason };
    }

    // Generate order code using database function
    const { data: codeResult, error: codeError } = await supabase
      .rpc('generate_qs_order_code', { store_slug: storeSlug });

    if (codeError) {
      console.error("[QSOrderService] Code generation error:", codeError);
      // Fallback to timestamp-based code
    }

    const orderCode = codeResult || `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await supabase
      .from("quick_store_orders")
      .insert({
        ...input,
        order_code: orderCode,
      })
      .select()
      .single();

    if (error) {
      console.error("[QSOrderService] Create error:", error);
      return { success: false, error: error.message };
    }

    console.log("[QSOrderService] Order created:", orderCode);
    return { success: true, data: data as QSOrder };
  } catch (err: any) {
    console.error("[QSOrderService] Exception:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get orders for a store (printer dashboard)
 */
export async function getQSOrders(
  storeId: string,
  filters?: {
    status?: OrderStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ success: boolean; data?: QSOrder[]; count?: number; error?: string }> {
  try {
    console.log("[QSOrderService] Fetching orders for store:", storeId);

    let query = supabase
      .from("quick_store_orders")
      .select("*", { count: "exact" })
      .eq("quick_store_id", storeId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `customer_name.ilike.${searchTerm},customer_phone.ilike.${searchTerm},order_code.ilike.${searchTerm}`
      );
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[QSOrderService] Fetch error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSOrder[], count: count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get single order by ID
 */
export async function getQSOrderById(
  orderId: string
): Promise<{ success: boolean; data?: QSOrder | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSOrder };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get order by code (for public tracking)
 */
export async function getQSOrderByCode(
  orderCode: string
): Promise<{ success: boolean; data?: QSOrder | null; error?: string }> {
  try {
    console.log("[QSOrderService] Fetching order by code:", orderCode);

    const { data, error } = await supabase
      .from("quick_store_orders")
      .select("*")
      .eq("order_code", orderCode.toUpperCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: data as QSOrder };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update order status
 */
export async function updateQSOrderStatus(
  orderId: string,
  status: OrderStatus,
  creditsDeducted?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QSOrderService] Updating order status:", orderId, status);

    const updateData: Record<string, any> = { status };
    const now = new Date();

    if (status === "paid") {
      updateData.paid_at = now.toISOString();
      // Extend expiry to 10 days from now
      updateData.expires_at = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
      if (creditsDeducted !== undefined) {
        updateData.credits_deducted = Math.round(creditsDeducted);
        updateData.deducted_at = now.toISOString();
      }
    } else if (status === "downloaded") {
      updateData.downloaded_at = now.toISOString();
      // Extend expiry to 10 days from now
      updateData.expires_at = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    } else if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("quick_store_orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      console.error("[QSOrderService] Update error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Get pending orders count (for notification badge)
 */
export async function getPendingOrdersCount(
  storeId: string
): Promise<{ count: number }> {
  try {
    const { count } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("status", "pending");

    return { count: count || 0 };
  } catch (err) {
    console.error("[QSOrderService] Count error:", err);
    return { count: 0 };
  }
}

/**
 * Get order statistics for a store
 */
export async function getOrderStats(
  storeId: string
): Promise<{
  total: number;
  pending: number;
  paid: number;
  downloaded: number;
  completed: number;
  thisWeek: number;
  thisMonth: number;
}> {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { count: total } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId);

    const { count: pending } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("status", "pending");

    const { count: paid } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("status", "paid");

    const { count: downloaded } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("status", "downloaded");

    const { count: completed } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("status", "completed");

    const { count: thisWeek } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .gte("created_at", weekAgo.toISOString());

    const { count: thisMonth } = await supabase
      .from("quick_store_orders")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .gte("created_at", monthAgo.toISOString());

    return {
      total: total || 0,
      pending: pending || 0,
      paid: paid || 0,
      downloaded: downloaded || 0,
      completed: completed || 0,
      thisWeek: thisWeek || 0,
      thisMonth: thisMonth || 0,
    };
  } catch (err) {
    console.error("[QSOrderService] Stats error:", err);
    return {
      total: 0,
      pending: 0,
      paid: 0,
      downloaded: 0,
      completed: 0,
      thisWeek: 0,
      thisMonth: 0,
    };
  }
}

/**
 * Delete order and its files from R2 storage
 */
export async function deleteQSOrder(
  orderId: string,
  storeSlug: string,
  orderCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete files from R2 storage first
    const folderPath = `orders/${storeSlug}/${orderCode}`;
    const deleteResult = await deleteR2Folder("design-files", folderPath);

    if (!deleteResult.success) {
      console.error("[QSOrderService] Error deleting R2 files:", deleteResult.error);
      // Continue with DB deletion even if storage delete fails
    }

    // Delete the database record
    const { error } = await supabase
      .from("quick_store_orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload order sheet file to R2
 */
export async function uploadOrderSheet(
  storeSlug: string,
  orderCode: string,
  sheetNumber: number,
  blob: Blob
): Promise<{ success: boolean; path?: string; publicUrl?: string; error?: string }> {
  try {
    const path = `orders/${storeSlug}/${orderCode}/sheet_${sheetNumber}.png`;

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
    return { success: false, error: err.message };
  }
}

/**
 * Upload order preview to R2
 */
export async function uploadOrderPreview(
  storeSlug: string,
  orderCode: string,
  sheetNumber: number,
  blob: Blob
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const path = `orders/${storeSlug}/${orderCode}/preview_${sheetNumber}.png`;

    const result = await uploadToR2("design-files", path, blob, "image/png");

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, publicUrl: result.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Alias exports for storefront pages
export const createOrder = createQSOrder;
export const getOrderByNumber = getQSOrderByCode;
export const getOrderById = getQSOrderById;

/**
 * Update order sheets with storage paths after upload
 */
export async function updateOrderSheetPaths(
  orderId: string,
  sheets: Array<{
    sheet_number: number;
    storage_path: string;
    preview_url: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[QSOrderService] Updating sheet paths for order:", orderId);

    // Get current order data
    const { data: order, error: fetchError } = await supabase
      .from("quick_store_orders")
      .select("sheets")
      .eq("id", orderId)
      .single();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Update sheets array with new paths
    const currentSheets = order.sheets || [];
    const updatedSheets = currentSheets.map((sheet: any) => {
      const update = sheets.find(s => s.sheet_number === sheet.sheet_number);
      if (update) {
        return {
          ...sheet,
          storage_path: update.storage_path,
          preview_url: update.preview_url,
        };
      }
      return sheet;
    });

    // Update order
    const { error: updateError } = await supabase
      .from("quick_store_orders")
      .update({ sheets: updatedSheets })
      .eq("id", orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Link order to customer
 */
export async function linkOrderToCustomer(
  orderId: string,
  customerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("quick_store_orders")
      .update({ customer_id: customerId })
      .eq("id", orderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ============================================
// DATE / EXPIRY HELPERS
// ============================================

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

/**
 * Format date with time
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
 * Get user's timezone abbreviation
 */
export function getTimezoneAbbreviation(): string {
  const timeString = new Date().toLocaleTimeString("en-US", {
    timeZoneName: "short",
  });
  const parts = timeString.split(" ");
  return parts[parts.length - 1];
}
