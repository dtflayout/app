import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ShoppingCart, DollarSign, Wallet, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Layers,
  Globe, Store, RefreshCw, Clock, CreditCard,
  ChevronRight, Package, Zap,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { StatsCardsSkeleton, TableSkeleton } from "@/components/Skeletons";
import {
  fetchDashboardData,
  DashboardData,
} from "@/services/dashboardService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (num: number): string =>
  Math.round(num).toLocaleString("en-IN");

const formatCompact = (num: number): string =>
  num >= 100000
    ? (num / 100000).toFixed(1) + "L"
    : num >= 1000
    ? (num / 1000).toFixed(1) + "K"
    : num.toFixed(0);

const formatCurrency = (num: number, currency: string): string => {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const timeAgo = (timestamp: string): string => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

// ─── Source Config ────────────────────────────────────────────────────────────

const SOURCE_CONFIG = {
  standalone: { label: "Builder", color: "#4F46E5" },
  website_integration: { label: "WI", color: "#0EA5E9" },
  quick_store: { label: "QS", color: "#F97316" },
};

// ─── Trend Badge ──────────────────────────────────────────────────────────────

const TrendBadge = ({ value }: { value: number }) => {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }
  const isUp = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? "+" : ""}{value}%
    </span>
  );
};

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline = ({ data, color = "#4F46E5" }: { data: number[]; color?: string }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 72;
  const h = 20;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">{formatNumber(entry.value)} sq.in</span>
        </div>
      ))}
    </div>
  );
};

// ─── Module-level flag ────────────────────────────────────────────────────────

let _dashboardLoaded = false;

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credits: creditsBalance } = useCredits();

  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(!_dashboardLoaded);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userId = user?.id || "";

  // ─── Data Fetch ───────────────────────────────────────────────────────────

  const loadData = async (showRefresh = false) => {
    if (!userId) return;
    if (showRefresh) setIsRefreshing(true);
    else if (!_dashboardLoaded) setIsLoading(true);

    try {
      const result = await fetchDashboardData(userId, creditsBalance);
      setData(result);
      _dashboardLoaded = true;
    } catch (err) {
      console.error("[Dashboard] Error loading data:", err);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, creditsBalance]);

  // ─── Sparkline data from chart ────────────────────────────────────────────

  const sparklineData = useMemo(() => {
    if (!data?.usageChart.length) return { credits: [] as number[] };
    return {
      credits: data.usageChart.map((p) => p.total),
    };
  }, [data?.usageChart]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <StatsCardsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 h-[300px] bg-white rounded-xl animate-pulse" />
            <div className="lg:col-span-2 h-[300px] bg-white rounded-xl animate-pulse" />
          </div>
          <TableSkeleton rows={4} cols={3} />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-gray-500">
          <p>Unable to load dashboard data. Please try again.</p>
          <Button variant="outline" className="mt-4" onClick={() => loadData()}>
            Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  const { kpis, usageChart, actionItems, channelHealth, activityFeed } = data;
  const hasWI = channelHealth.wi !== null;
  const hasQS = channelHealth.qs !== null;
  const hasAnyChannel = hasWI || hasQS;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">

        {/* ── Row 0: Welcome + Quick Actions ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Here's your business at a glance
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => loadData(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh dashboard data</TooltipContent>
            </Tooltip>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/builder-150")}
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              New Sheet
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => navigate("/billing")}
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Buy Credits
            </Button>

            {hasWI && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => navigate("/app/website-integration/orders")}
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                WI Orders
              </Button>
            )}

            {hasQS && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => navigate("/app/quick-store/orders")}
              >
                <Store className="w-3.5 h-3.5 mr-1.5" />
                QS Orders
              </Button>
            )}
          </div>
        </div>

        {/* ── Row 1: KPI Cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Orders */}
          <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                </div>
                <TrendBadge value={kpis.ordersTrend} />
              </div>
              <p className="text-2xl font-heading font-bold text-gray-900 tracking-tight">
                {formatNumber(kpis.totalOrders)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Total orders · <span className="font-medium text-gray-700">{kpis.ordersThisMonth}</span> this month
              </p>
            </CardContent>
          </Card>

          {/* Revenue This Month */}
          <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <TrendBadge value={kpis.revenueTrend} />
              </div>
              <p className="text-2xl font-heading font-bold text-gray-900 tracking-tight">
                {formatCurrency(kpis.revenueThisMonth, kpis.revenueCurrency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Revenue this month
              </p>
            </CardContent>
          </Card>

          {/* Credits Balance */}
          <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-violet-50 rounded-lg">
                  <Wallet className="w-4 h-4 text-violet-600" />
                </div>
                <Sparkline
                  data={sparklineData.credits.length > 1 ? sparklineData.credits : [0, 0]}
                  color="#7c3aed"
                />
              </div>
              <p className="text-2xl font-heading font-bold text-gray-900 tracking-tight">
                {formatCompact(kpis.creditsBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Credits balance · <span className="font-medium text-gray-700">{formatCompact(kpis.creditsUsedThisMonth)}</span> used this month
              </p>
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card className={`shadow-sm hover:shadow-md transition-shadow ${
            kpis.pendingActions > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-white border-gray-100"
          }`}>
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${kpis.pendingActions > 0 ? "bg-amber-100" : "bg-gray-50"}`}>
                  <AlertTriangle className={`w-4 h-4 ${kpis.pendingActions > 0 ? "text-amber-600" : "text-gray-400"}`} />
                </div>
                {kpis.pendingActions > 0 && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    Action needed
                  </span>
                )}
              </div>
              <p className={`text-2xl font-heading font-bold tracking-tight ${
                kpis.pendingActions > 0 ? "text-amber-900" : "text-gray-900"
              }`}>
                {kpis.pendingActions}
              </p>
              <p className={`text-xs mt-1 ${kpis.pendingActions > 0 ? "text-amber-700" : "text-gray-500"}`}>
                {kpis.pendingActions > 0
                  ? `${kpis.pendingWI > 0 ? `${kpis.pendingWI} WI` : ""}${kpis.pendingWI > 0 && kpis.pendingQS > 0 ? " · " : ""}${kpis.pendingQS > 0 ? `${kpis.pendingQS} QS` : ""} pending`
                  : "All caught up!"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Row 2: Usage Chart + Action Items ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Chart */}
          <Card className="lg:col-span-3 bg-white border-gray-100 shadow-sm">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Credits usage</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Last 30 days by source</p>
                </div>
                <div className="flex items-center gap-3">
                  {Object.entries(SOURCE_CONFIG).map(([key, conf]) => (
                    <span key={key} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <span className="w-2 h-2 rounded-full" style={{ background: conf.color }} />
                      {conf.label}
                    </span>
                  ))}
                </div>
              </div>

              {usageChart.length > 0 ? (
                <div className="h-[220px] -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        interval="preserveStartEnd"
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCompact(v)}
                      />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="standalone"
                        stackId="1"
                        name="Builder"
                        stroke="#4F46E5"
                        fill="#4F46E5"
                        fillOpacity={0.15}
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="website_integration"
                        stackId="1"
                        name="Website Integration"
                        stroke="#0EA5E9"
                        fill="#0EA5E9"
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="quick_store"
                        stackId="1"
                        name="Quick Store"
                        stroke="#F97316"
                        fill="#F97316"
                        fillOpacity={0.1}
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
                  <div className="text-center">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No usage data yet</p>
                    <p className="text-xs mt-1">Generate your first sheet to see usage trends</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="lg:col-span-2 bg-white border-gray-100 shadow-sm">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Action required</h2>
                {kpis.pendingActions > 0 && (
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">
                    {kpis.pendingActions}
                  </Badge>
                )}
              </div>

              {actionItems.length > 0 ? (
                <div className="space-y-2">
                  {actionItems.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        navigate(
                          item.source === "wi"
                            ? "/app/website-integration/orders"
                            : "/app/quick-store/orders"
                        )
                      }
                      className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {item.code}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            item.status === "New"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {item.source === "wi" ? "Website Integration" : "Quick Store"}
                          {item.customerEmail ? ` · ${item.customerEmail}` : ""}
                          {item.customerName ? ` · ${item.customerName}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 ml-2" />
                    </button>
                  ))}

                  {kpis.pendingActions > 5 && (
                    <button
                      onClick={() => navigate(hasWI ? "/app/website-integration/orders" : "/app/quick-store/orders")}
                      className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium py-2 mt-1"
                    >
                      View all {kpis.pendingActions} pending orders →
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
                  <div className="text-center">
                    <div className="w-10 h-10 mx-auto mb-2 bg-emerald-50 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-gray-600 font-medium">All caught up!</p>
                    <p className="text-xs mt-1 text-gray-400">No orders need attention right now</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Row 3: Channel Health (conditional) ─────────────────────────── */}
        {hasAnyChannel && (
          <div className={`grid gap-4 ${hasWI && hasQS ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* WI Channel */}
            {hasWI && channelHealth.wi && (
              <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Website Integration</h3>
                        <p className="text-[11px] text-gray-400">Hosted gang sheet builder</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-[10px] ${
                        channelHealth.wi.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}>
                        {channelHealth.wi.isActive ? "Live" : "Inactive"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-400 hover:text-indigo-600"
                        onClick={() => navigate("/app/website-integration")}
                      >
                        Manage <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {formatNumber(channelHealth.wi.totalOrders)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Total orders</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {formatNumber(channelHealth.wi.ordersThisMonth)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">This month</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {channelHealth.wi.productCount}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Active products</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* QS Channel */}
            {hasQS && channelHealth.qs && (
              <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 px-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Store className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Quick Store</h3>
                        <p className="text-[11px] text-gray-400">
                          {channelHealth.qs.storeSlug}.dtflayout.com
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-[10px] ${
                        channelHealth.qs.isPublished
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}>
                        {channelHealth.qs.isPublished ? "Published" : "Draft"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-gray-400 hover:text-violet-600"
                        onClick={() => navigate("/app/quick-store")}
                      >
                        Manage <ChevronRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {formatNumber(channelHealth.qs.totalOrders)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Total orders</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {formatCompact(channelHealth.qs.totalViews)}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Page views</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xl font-heading font-bold text-gray-900">
                        {channelHealth.qs.conversionRate}%
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Conv. rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Row 4: Activity Feed ────────────────────────────────────────── */}
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-400 hover:text-gray-600"
                onClick={() => navigate("/logs")}
              >
                View history <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>

            {activityFeed.length > 0 ? (
              <div className="space-y-0 divide-y divide-gray-100">
                {activityFeed.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: event.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{event.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{event.subtitle}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p>No activity yet</p>
                <p className="text-xs mt-1">Your recent actions will show up here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
