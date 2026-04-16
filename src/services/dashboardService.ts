/**
 * Dashboard Service
 * Aggregates data from multiple tables for the main dashboard view
 */

import { supabase } from "@/lib/supabaseClient";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalOrders: number;
  ordersThisMonth: number;
  ordersTrend: number; // percentage change vs previous month
  revenueThisMonth: number;
  revenueCurrency: string;
  revenueTrend: number;
  creditsBalance: number;
  creditsUsedThisMonth: number;
  pendingActions: number;
  pendingWI: number;
  pendingQS: number;
}

export interface UsageChartPoint {
  date: string;         // YYYY-MM-DD
  standalone: number;
  website_integration: number;
  quick_store: number;
  total: number;
}

export interface ActionItem {
  id: string;
  code: string;
  source: "wi" | "qs";
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  createdAt: string;
  totalPrice: number | null;
  currency: string;
}

export interface ChannelHealth {
  wi: {
    setup: boolean;
    isActive: boolean;
    totalOrders: number;
    ordersThisMonth: number;
    productCount: number;
  } | null;
  qs: {
    setup: boolean;
    isPublished: boolean;
    storeSlug: string;
    totalOrders: number;
    totalViews: number;
    conversionRate: number;
  } | null;
}

export interface ActivityEvent {
  id: string;
  type: "sheet_generated" | "order_received" | "order_paid" | "credits_recharged" | "order_downloaded";
  title: string;
  subtitle: string;
  timestamp: string;
  color: string;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  usageChart: UsageChartPoint[];
  actionItems: ActionItem[];
  channelHealth: ChannelHealth;
  activityFeed: ActivityEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const thirtyDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString();
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const startOfPrevMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfPrevMonth = () => {
  const d = new Date();
  d.setDate(0); // last day of previous month
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

// ─── Data Fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch all dashboard data in parallel
 */
export async function fetchDashboardData(
  userId: string,
  creditsBalance: number
): Promise<DashboardData> {
  const [kpis, usageChart, actionItems, channelHealth, activityFeed] =
    await Promise.all([
      fetchKPIs(userId, creditsBalance),
      fetchUsageChart(userId),
      fetchActionItems(userId),
      fetchChannelHealth(userId),
      fetchActivityFeed(userId),
    ]);

  return { kpis, usageChart, actionItems, channelHealth, activityFeed };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

async function fetchKPIs(userId: string, creditsBalance: number): Promise<DashboardKPIs> {
  const monthStart = startOfMonth();
  const prevMonthStart = startOfPrevMonth();
  const prevMonthEnd = endOfPrevMonth();

  // Get printer and quick store IDs
  const [printerRes, qsRes] = await Promise.all([
    supabase.from("printers").select("id, currency").eq("user_id", userId).maybeSingle(),
    supabase.from("quick_stores").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  const printerId = printerRes.data?.id;
  const currency = printerRes.data?.currency || "USD";
  const qsId = qsRes.data?.id;

  // WI orders this month & previous month
  let wiThisMonth = 0, wiPrevMonth = 0, wiTotal = 0, wiPending = 0;
  let wiRevenueThisMonth = 0, wiRevenuePrevMonth = 0;

  if (printerId) {
    const [totalRes, thisMonthRes, prevMonthRes, pendingRes] = await Promise.all([
      supabase.from("designs").select("*", { count: "exact", head: true }).eq("printer_id", printerId),
      supabase.from("designs").select("total_price").eq("printer_id", printerId).gte("created_at", monthStart),
      supabase.from("designs").select("total_price").eq("printer_id", printerId).gte("created_at", prevMonthStart).lte("created_at", prevMonthEnd),
      supabase.from("designs").select("*", { count: "exact", head: true }).eq("printer_id", printerId).eq("status", "pending"),
    ]);
    wiTotal = totalRes.count || 0;
    wiThisMonth = thisMonthRes.data?.length || 0;
    wiRevenueThisMonth = thisMonthRes.data?.reduce((sum, d) => sum + (d.total_price || 0), 0) || 0;
    wiPrevMonth = prevMonthRes.data?.length || 0;
    wiRevenuePrevMonth = prevMonthRes.data?.reduce((sum, d) => sum + (d.total_price || 0), 0) || 0;
    wiPending = pendingRes.count || 0;
  }

  // QS orders this month & previous month
  let qsThisMonth = 0, qsPrevMonth = 0, qsTotal = 0, qsPending = 0;

  if (qsId) {
    const [totalRes, thisMonthRes, prevMonthRes, pendingRes] = await Promise.all([
      supabase.from("quick_store_orders").select("*", { count: "exact", head: true }).eq("quick_store_id", qsId),
      supabase.from("quick_store_orders").select("*", { count: "exact", head: true }).eq("quick_store_id", qsId).gte("created_at", monthStart),
      supabase.from("quick_store_orders").select("*", { count: "exact", head: true }).eq("quick_store_id", qsId).gte("created_at", prevMonthStart).lte("created_at", prevMonthEnd),
      supabase.from("quick_store_orders").select("*", { count: "exact", head: true }).eq("quick_store_id", qsId).eq("status", "pending"),
    ]);
    qsTotal = totalRes.count || 0;
    qsThisMonth = thisMonthRes.count || 0;
    qsPrevMonth = prevMonthRes.count || 0;
    qsPending = pendingRes.count || 0;
  }

  // Credits used this month
  const { data: usageLogs } = await supabase
    .from("usage_logs")
    .select("sq_inches_used")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const creditsUsedThisMonth = usageLogs?.reduce((sum, l) => sum + (l.sq_inches_used || 0), 0) || 0;

  // Calculate trends
  const totalThisMonth = wiThisMonth + qsThisMonth;
  const totalPrevMonth = wiPrevMonth + qsPrevMonth;
  const ordersTrend = totalPrevMonth > 0
    ? Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100)
    : totalThisMonth > 0 ? 100 : 0;

  const revenueTrend = wiRevenuePrevMonth > 0
    ? Math.round(((wiRevenueThisMonth - wiRevenuePrevMonth) / wiRevenuePrevMonth) * 100)
    : wiRevenueThisMonth > 0 ? 100 : 0;

  return {
    totalOrders: wiTotal + qsTotal,
    ordersThisMonth: totalThisMonth,
    ordersTrend,
    revenueThisMonth: wiRevenueThisMonth,
    revenueCurrency: currency,
    revenueTrend,
    creditsBalance,
    creditsUsedThisMonth: Math.round(creditsUsedThisMonth),
    pendingActions: wiPending + qsPending,
    pendingWI: wiPending,
    pendingQS: qsPending,
  };
}

// ─── Usage Chart ──────────────────────────────────────────────────────────────

async function fetchUsageChart(userId: string): Promise<UsageChartPoint[]> {
  const since = thirtyDaysAgo();

  const { data: logs } = await supabase
    .from("usage_logs")
    .select("sq_inches_used, source, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (!logs || logs.length === 0) return [];

  // Group by date
  const grouped: Record<string, UsageChartPoint> = {};

  // Pre-fill last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    grouped[key] = { date: key, standalone: 0, website_integration: 0, quick_store: 0, total: 0 };
  }

  logs.forEach((log) => {
    const day = log.created_at.split("T")[0];
    if (!grouped[day]) {
      grouped[day] = { date: day, standalone: 0, website_integration: 0, quick_store: 0, total: 0 };
    }
    const source = (log.source || "standalone") as keyof Pick<UsageChartPoint, "standalone" | "website_integration" | "quick_store">;
    grouped[day][source] += Math.round(log.sq_inches_used || 0);
    grouped[day].total += Math.round(log.sq_inches_used || 0);
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Action Items ─────────────────────────────────────────────────────────────

async function fetchActionItems(userId: string): Promise<ActionItem[]> {
  const items: ActionItem[] = [];

  // WI pending orders
  const { data: printer } = await supabase
    .from("printers")
    .select("id, currency")
    .eq("user_id", userId)
    .maybeSingle();

  if (printer?.id) {
    const { data: wiOrders } = await supabase
      .from("designs")
      .select("id, design_code, status, customer_email, total_price, created_at")
      .eq("printer_id", printer.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    wiOrders?.forEach((o) => {
      items.push({
        id: o.id,
        code: o.design_code,
        source: "wi",
        status: "Pending",
        customerEmail: o.customer_email,
        customerName: null,
        createdAt: o.created_at,
        totalPrice: o.total_price,
        currency: printer.currency || "USD",
      });
    });
  }

  // QS new/pending orders
  const { data: qs } = await supabase
    .from("quick_stores")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (qs?.id) {
    const { data: qsOrders } = await supabase
      .from("quick_store_orders")
      .select("id, order_code, status, customer_name, customer_email, created_at")
      .eq("quick_store_id", qs.id)
      .in("status", ["pending", "new"])
      .order("created_at", { ascending: false })
      .limit(5);

    qsOrders?.forEach((o) => {
      items.push({
        id: o.id,
        code: o.order_code,
        source: "qs",
        status: o.status === "new" ? "New" : "Pending",
        customerEmail: o.customer_email,
        customerName: o.customer_name,
        createdAt: o.created_at,
        totalPrice: null,
        currency: "USD",
      });
    });
  }

  // Sort by date, newest first
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, 6);
}

// ─── Channel Health ───────────────────────────────────────────────────────────

async function fetchChannelHealth(userId: string): Promise<ChannelHealth> {
  const monthStart = startOfMonth();

  // WI
  const { data: printer } = await supabase
    .from("printers")
    .select("id, is_active, setup_completed")
    .eq("user_id", userId)
    .maybeSingle();

  let wi: ChannelHealth["wi"] = null;

  if (printer?.setup_completed) {
    const [totalRes, monthRes, productsRes] = await Promise.all([
      supabase.from("designs").select("*", { count: "exact", head: true }).eq("printer_id", printer.id),
      supabase.from("designs").select("*", { count: "exact", head: true }).eq("printer_id", printer.id).gte("created_at", monthStart),
      supabase.from("printer_products").select("*", { count: "exact", head: true }).eq("printer_id", printer.id).eq("is_active", true),
    ]);

    wi = {
      setup: true,
      isActive: printer.is_active,
      totalOrders: totalRes.count || 0,
      ordersThisMonth: monthRes.count || 0,
      productCount: productsRes.count || 0,
    };
  }

  // QS
  const { data: store } = await supabase
    .from("quick_stores")
    .select("id, slug, is_published, setup_completed")
    .eq("user_id", userId)
    .maybeSingle();

  let qs: ChannelHealth["qs"] = null;

  if (store?.setup_completed) {
    const [totalRes, viewsRes, ordersSubmittedRes] = await Promise.all([
      supabase.from("quick_store_orders").select("*", { count: "exact", head: true }).eq("quick_store_id", store.id),
      supabase.from("quick_store_analytics").select("*", { count: "exact", head: true }).eq("quick_store_id", store.id).eq("event_type", "page_view"),
      supabase.from("quick_store_analytics").select("*", { count: "exact", head: true }).eq("quick_store_id", store.id).eq("event_type", "order_submit"),
    ]);

    const totalViews = viewsRes.count || 0;
    const totalSubmitted = ordersSubmittedRes.count || 0;
    const conversionRate = totalViews > 0 ? (totalSubmitted / totalViews) * 100 : 0;

    qs = {
      setup: true,
      isPublished: store.is_published,
      storeSlug: store.slug,
      totalOrders: totalRes.count || 0,
      totalViews,
      conversionRate: Math.round(conversionRate * 10) / 10,
    };
  }

  return { wi, qs };
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

async function fetchActivityFeed(userId: string): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  // Recent sheet generations (usage_logs)
  const { data: usageLogs } = await supabase
    .from("usage_logs")
    .select("id, sq_inches_used, sheet_width, sheet_height, image_count, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  usageLogs?.forEach((log) => {
    const sourceLabel =
      log.source === "website_integration" ? "Website Integration" :
      log.source === "quick_store" ? "Quick Store" : "Standalone Builder";
    events.push({
      id: `usage-${log.id}`,
      type: "sheet_generated",
      title: `Sheet generated — ${log.image_count} images, ${log.sheet_width}×${log.sheet_height}"`,
      subtitle: `${sourceLabel} · ${Math.round(log.sq_inches_used).toLocaleString("en-IN")} sq.in used`,
      timestamp: log.created_at,
      color: "#a855f7",
    });
  });

  // Recent WI orders
  const { data: printer } = await supabase
    .from("printers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (printer?.id) {
    const { data: wiOrders } = await supabase
      .from("designs")
      .select("id, design_code, status, total_price, created_at, paid_at, downloaded_at")
      .eq("printer_id", printer.id)
      .order("created_at", { ascending: false })
      .limit(5);

    wiOrders?.forEach((o) => {
      if (o.status === "pending") {
        events.push({
          id: `wi-new-${o.id}`,
          type: "order_received",
          title: `New order ${o.design_code} received`,
          subtitle: `Website Integration · $${(o.total_price || 0).toFixed(2)}`,
          timestamp: o.created_at,
          color: "#4F46E5",
        });
      } else if (o.status === "paid" && o.paid_at) {
        events.push({
          id: `wi-paid-${o.id}`,
          type: "order_paid",
          title: `Order ${o.design_code} marked as paid`,
          subtitle: `Website Integration · Credits deducted`,
          timestamp: o.paid_at,
          color: "#16a34a",
        });
      } else if (o.status === "downloaded" && o.downloaded_at) {
        events.push({
          id: `wi-dl-${o.id}`,
          type: "order_downloaded",
          title: `Order ${o.design_code} downloaded`,
          subtitle: `Website Integration`,
          timestamp: o.downloaded_at,
          color: "#6366f1",
        });
      }
    });
  }

  // Recent QS orders
  const { data: qs } = await supabase
    .from("quick_stores")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (qs?.id) {
    const { data: qsOrders } = await supabase
      .from("quick_store_orders")
      .select("id, order_code, status, customer_name, created_at")
      .eq("quick_store_id", qs.id)
      .order("created_at", { ascending: false })
      .limit(5);

    qsOrders?.forEach((o) => {
      events.push({
        id: `qs-${o.id}`,
        type: "order_received",
        title: `${o.status === "pending" ? "New" : "Updated"} order ${o.order_code}`,
        subtitle: `Quick Store${o.customer_name ? ` · ${o.customer_name}` : ""}`,
        timestamp: o.created_at,
        color: "#7c3aed",
      });
    });
  }

  // Recent credit recharges
  const { data: recharges } = await supabase
    .from("credit_transactions")
    .select("id, type, plan_name, credits_added, amount, currency, created_at")
    .eq("user_id", userId)
    .eq("status", "success")
    .in("type", ["recharge", "free_trial"])
    .order("created_at", { ascending: false })
    .limit(3);

  recharges?.forEach((r) => {
    const label = r.type === "free_trial"
      ? "Free trial claimed"
      : `Credits recharged — ${r.plan_name || "Recharge"}`;
    events.push({
      id: `credit-${r.id}`,
      type: "credits_recharged",
      title: label,
      subtitle: `+${(r.credits_added || 0).toLocaleString("en-IN")} sq.in added`,
      timestamp: r.created_at,
      color: "#f59e0b",
    });
  });

  // Sort all events by timestamp, newest first
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return events.slice(0, 10);
}
