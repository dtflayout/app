/**
 * Storefront Service
 * Public-facing service for customer storefront (no auth required)
 */

import { supabase } from "@/lib/supabaseClient";
import {
  QuickStore,
  QSProduct,
  Testimonial,
  AnalyticsEventType,
} from "@/types/quickStore";

/**
 * Get store by slug (public)
 */
export async function getPublicStore(
  slug: string
): Promise<{ success: boolean; data?: QuickStore | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_stores")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .eq("is_active", true)
      .eq("is_published", true)
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
 * Get store products (public)
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

/**
 * Get single product by slug (public)
 */
export async function getPublicProductBySlug(
  storeId: string,
  productSlug: string
): Promise<{ success: boolean; data?: QSProduct | null; error?: string }> {
  try {
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
 * Get testimonials (public)
 */
export async function getPublicTestimonials(
  storeId: string
): Promise<{ success: boolean; data?: Testimonial[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quick_store_testimonials")
      .select("*")
      .eq("quick_store_id", storeId)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(5);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Testimonial[] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Log analytics event (internal)
 */
export async function logAnalyticsEvent(event: {
  quick_store_id: string;
  event_type: AnalyticsEventType;
  page_path?: string;
  product_id?: string;
}): Promise<void> {
  try {
    // Get or create visitor ID
    let visitorId = localStorage.getItem('qs_visitor_id');
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('qs_visitor_id', visitorId);
    }

    await supabase.from("quick_store_analytics").insert({
      ...event,
      visitor_id: visitorId,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
    });
  } catch (err) {
    console.error("Analytics error:", err);
  }
}

/**
 * Track event helper (simplified wrapper for components)
 * This is the function imported by storefront pages
 */
export async function trackEvent(
  storeId: string,
  eventType: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Get or create visitor ID
    let visitorId = localStorage.getItem('qs_visitor_id');
    if (!visitorId) {
      visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('qs_visitor_id', visitorId);
    }

    await supabase.from("quick_store_analytics").insert({
      quick_store_id: storeId,
      event_type: eventType,
      page_path: window.location.pathname,
      visitor_id: visitorId,
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      metadata: metadata || null,
    });
  } catch (err) {
    console.error("Track event error:", err);
  }
}

/**
 * Get analytics summary for a store
 */
export async function getAnalyticsSummary(
  storeId: string
): Promise<{
  total_views: number;
  product_views: number;
  builder_opens: number;
  orders_submitted: number;
  views_today: number;
  views_this_week: number;
}> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Total page views
    const { count: total_views } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "page_view");

    // Product views
    const { count: product_views } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "product_view");

    // Builder opens
    const { count: builder_opens } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "builder_open");

    // Orders submitted
    const { count: orders_submitted } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "order_submit");

    // Views today
    const { count: views_today } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "page_view")
      .gte("created_at", `${today}T00:00:00`);

    // Views this week
    const { count: views_this_week } = await supabase
      .from("quick_store_analytics")
      .select("*", { count: "exact", head: true })
      .eq("quick_store_id", storeId)
      .eq("event_type", "page_view")
      .gte("created_at", weekAgo.toISOString());

    return {
      total_views: total_views || 0,
      product_views: product_views || 0,
      builder_opens: builder_opens || 0,
      orders_submitted: orders_submitted || 0,
      views_today: views_today || 0,
      views_this_week: views_this_week || 0,
    };
  } catch (err) {
    console.error("Analytics summary error:", err);
    return {
      total_views: 0,
      product_views: 0,
      builder_opens: 0,
      orders_submitted: 0,
      views_today: 0,
      views_this_week: 0,
    };
  }
}


// ── Contact Messages ─────────────────────────────────────────────────────────

export async function submitContactMessage(
  storeId: string,
  data: { name: string; phone: string; email: string; message: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("quick_store_messages")
      .insert({
        quick_store_id: storeId,
        sender_name: data.name,
        sender_phone: data.phone,
        sender_email: data.email || null,
        message: data.message,
        is_read: false,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getStoreMessages(storeId: string) {
  const { data, error } = await supabase
    .from("quick_store_messages")
    .select("*")
    .eq("quick_store_id", storeId)
    .order("created_at", { ascending: false });

  if (error) return { success: false as const, error: error.message, data: [] };
  return { success: true as const, data: data || [] };
}

export async function markMessageRead(messageId: string) {
  const { error } = await supabase
    .from("quick_store_messages")
    .update({ is_read: true })
    .eq("id", messageId);

  return { success: !error, error: error?.message };
}

