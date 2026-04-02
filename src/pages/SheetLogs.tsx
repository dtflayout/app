import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { getUserLogs, calculateUsageStats, UsageLogRecord, UsageSource } from "@/lib/usageLogger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw, FileText, Search, CalendarIcon, Download,
  LayoutGrid, TrendingDown, Layers, CreditCard, Wallet,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { TableSkeleton } from "@/components/Skeletons";
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek, differenceInDays } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// ─── Source Config ────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<UsageSource, { label: string; className: string; color: string }> = {
  standalone: { label: "Builder", className: "bg-indigo-100 text-indigo-700 border-indigo-200", color: "#4F46E5" },
  website_integration: { label: "Website", className: "bg-indigo-100 text-indigo-700 border-indigo-200", color: "#6366f1" },
  quick_store: { label: "Quick Store", className: "bg-purple-100 text-purple-700 border-purple-200", color: "#a855f7" },
};

const ALL_SOURCES: UsageSource[] = ["standalone", "website_integration", "quick_store"];

// ─── Component ────────────────────────────────────────────────────────────────

// Module-level flag — persists across tab switches (component remounts)
let _sheetLogsLoaded = false;

export const SheetLogs = () => {
  const { user } = useAuth();
  const { credits: currentBalance } = useCredits();
  const [logs, setLogs] = useState<UsageLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(!_sheetLogsLoaded);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<UsageSource | "all">("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<string>("all");

  // Chart toggle
  const [chartGrouping, setChartGrouping] = useState<"daily" | "weekly">("daily");

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatNumber = (num: number): string =>
    num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatCompact = (num: number): string =>
    num >= 100000
      ? (num / 100000).toFixed(1) + "L"
      : num >= 1000
      ? (num / 1000).toFixed(1) + "K"
      : num.toFixed(0);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  };

  // ─── Date presets ─────────────────────────────────────────────────────────

  const setDatePreset = (preset: string) => {
    const now = new Date();
    setActivePreset(preset);
    switch (preset) {
      case "today": setDateFrom(startOfDay(now)); setDateTo(now); break;
      case "week": setDateFrom(startOfWeek(now, { weekStartsOn: 1 })); setDateTo(now); break;
      case "month": setDateFrom(startOfMonth(now)); setDateTo(now); break;
      case "7days": setDateFrom(subDays(now, 7)); setDateTo(now); break;
      case "30days": setDateFrom(subDays(now, 30)); setDateTo(now); break;
      case "all": setDateFrom(undefined); setDateTo(undefined); break;
    }
    setCurrentPage(1);
  };

  const handleCustomDateFrom = (date: Date | undefined) => { setDateFrom(date); setActivePreset(""); setCurrentPage(1); };
  const handleCustomDateTo = (date: Date | undefined) => { setDateTo(date); setActivePreset(""); setCurrentPage(1); };
  const hasDateFilter = dateFrom !== undefined || dateTo !== undefined;

  // ─── Data fetch ───────────────────────────────────────────────────────────

  const fetchLogs = async () => {
    if (!user?.email) { setIsLoading(false); return; }
    if (!_sheetLogsLoaded) setIsLoading(true);
    const result = await getUserLogs(user.email);
    if (result.success && result.data) {
      setLogs(result.data);
    } else {
      if (!_sheetLogsLoaded) toast.error("Failed to load history");
    }
    _sheetLogsLoaded = true;
    setIsLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [user?.email]);

  // ─── Filtered data ────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (dateFrom) {
      const from = startOfDay(dateFrom);
      result = result.filter((l) => new Date(l.created_at) >= from);
    }
    if (dateTo) {
      const to = endOfDay(dateTo);
      result = result.filter((l) => new Date(l.created_at) <= to);
    }
    if (sourceFilter !== "all") {
      result = result.filter((l) => (l.source || "standalone") === sourceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      result = result.filter((l) =>
        l.design_code?.toUpperCase().includes(q) ||
        l.user_email.toUpperCase().includes(q)
      );
    }

    return result;
  }, [logs, dateFrom, dateTo, sourceFilter, searchQuery]);

  // ─── Stats from filtered data ─────────────────────────────────────────────

  const filteredStats = useMemo(() => {
    const totalGenerations = filteredLogs.length;
    const totalAreaUsed = filteredLogs.reduce((s, l) => s + l.sq_inches_used, 0);
    const totalCreditsUsed = filteredLogs.reduce((s, l) => s + (l.credits_before - l.credits_after), 0);
    const avgPerGeneration = totalGenerations > 0 ? totalAreaUsed / totalGenerations : 0;

    return { totalGenerations, totalAreaUsed, totalCreditsUsed, avgPerGeneration };
  }, [filteredLogs]);

  // ─── Chart data ───────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const grouped: Record<string, { date: string; area: number; credits: number; count: number }> = {};

    // Sort oldest first for chart
    const sorted = [...filteredLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    for (const log of sorted) {
      const d = new Date(log.created_at);
      let key: string;

      if (chartGrouping === "weekly") {
        // ISO week key
        const weekStart = startOfWeek(d, { weekStartsOn: 1 });
        key = format(weekStart, "MMM d");
      } else {
        key = format(d, "MMM d");
      }

      if (!grouped[key]) grouped[key] = { date: key, area: 0, credits: 0, count: 0 };
      grouped[key].area += log.sq_inches_used;
      grouped[key].credits += (log.credits_before - log.credits_after);
      grouped[key].count += 1;
    }

    return Object.values(grouped);
  }, [filteredLogs, chartGrouping]);

  // ─── CSV export ───────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ["Date", "Sheet Width", "Sheet Height", "Area Used (sq.in)", "Credits Before", "Credits After", "Credits Used", "Images", "Source", "Design Code"];

    const csvDate = (dateString: string): string => {
      const d = new Date(dateString);
      return format(d, "dd-MMM-yyyy h:mm a");
    };

    const rows = filteredLogs.map((l) => [
      csvDate(l.created_at),
      l.sheet_width.toFixed(2),
      l.sheet_height.toFixed(2),
      l.sq_inches_used.toFixed(2),
      l.credits_before.toFixed(2),
      l.credits_after.toFixed(2),
      (l.credits_before - l.credits_after).toFixed(2),
      l.image_count,
      SOURCE_CONFIG[l.source || "standalone"].label,
      l.design_code || "",
    ]);

    const escapeCsv = (val: any) => {
      const str = String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csv = [headers.join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `generation-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [sourceFilter, searchQuery]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-extrabold tracking-tight">Generation History</h1>
              <p className="text-sm text-muted-foreground">Track your credit usage across all builders</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} variant="outline" size="sm" disabled={filteredLogs.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={fetchLogs} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range + Source Filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
                {["today", "week", "7days", "month", "30days", "all"].map((preset) => {
                  const labels: Record<string, string> = {
                    today: "Today", week: "This Week", "7days": "Last 7 Days",
                    month: "This Month", "30days": "Last 30 Days", all: "All Time",
                  };
                  return (
                    <Button
                      key={preset}
                      variant={activePreset === preset ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${activePreset === preset ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                      onClick={() => setDatePreset(preset)}
                    >
                      {labels[preset]}
                    </Button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`text-xs gap-1.5 ${dateFrom ? "border-indigo-300 text-indigo-700" : ""}`}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={dateFrom} onSelect={handleCustomDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`text-xs gap-1.5 ${dateTo ? "border-indigo-300 text-indigo-700" : ""}`}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={dateTo} onSelect={handleCustomDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
                {hasDateFilter && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDatePreset("all")}>
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Source filter + search */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground mr-1">Source:</span>
                <Button
                  variant={sourceFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className={`text-xs ${sourceFilter === "all" ? "bg-gray-800 hover:bg-gray-900" : ""}`}
                  onClick={() => setSourceFilter("all")}
                >
                  All
                </Button>
                {ALL_SOURCES.map((src) => (
                  <Button
                    key={src}
                    variant={sourceFilter === src ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${sourceFilter === src ? "bg-gray-800 hover:bg-gray-900" : ""}`}
                    onClick={() => setSourceFilter(src)}
                  >
                    {SOURCE_CONFIG[src].label}
                  </Button>
                ))}
              </div>
              <div className="relative w-[260px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search design code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground">Generations</span>
              </div>
              <div className="text-2xl font-heading font-bold">{filteredStats.totalGenerations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <LayoutGrid className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Area</span>
              </div>
              <div className="text-2xl font-heading font-bold">
                {formatCompact(filteredStats.totalAreaUsed)}
                <span className="text-sm font-normal text-muted-foreground ml-1">sq.in</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Avg / Generation</span>
              </div>
              <div className="text-2xl font-heading font-bold">
                {formatNumber(filteredStats.avgPerGeneration)}
                <span className="text-sm font-normal text-muted-foreground ml-1">sq.in</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground">Credits Used</span>
              </div>
              <div className="text-2xl font-heading font-bold text-red-600">
                {formatCompact(filteredStats.totalCreditsUsed)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Balance</span>
              </div>
              <div className="text-2xl font-heading font-bold text-green-600">
                {formatCompact(currentBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Trend Chart */}
        {chartData.length > 1 && (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Usage Trend</h3>
                <div className="inline-flex items-center bg-gray-100 rounded-full p-0.5">
                  <button
                    onClick={() => setChartGrouping("daily")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      chartGrouping === "daily" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setChartGrouping("weekly")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      chartGrouping === "weekly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                    }`}
                  >
                    Weekly
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCompact(v)} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 13 }}
                    formatter={(value: number, name: string) => [formatNumber(value) + " sq.in", name === "area" ? "Area Used" : "Credits Used"]}
                    labelFormatter={(label) => label}
                  />
                  <Area type="monotone" dataKey="area" stroke="#6366f1" strokeWidth={2} fill="url(#areaGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-1">No records found</h3>
              <p className="text-sm text-muted-foreground">
                {logs.length > 0 ? "Try adjusting your filters" : "Your usage history will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-0 pb-4">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sheet Size</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Area</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits Used</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Images</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLogs.map((log) => {
                      const creditsUsed = log.credits_before - log.credits_after;
                      const src = SOURCE_CONFIG[log.source || "standalone"];
                      const isMatch = searchQuery.trim() && (
                        log.design_code?.toUpperCase().includes(searchQuery.toUpperCase().trim())
                      );

                      return (
                        <tr
                          key={log.id}
                          className={`border-b last:border-0 transition-colors hover:bg-gray-50 ${isMatch ? "bg-indigo-50/50" : ""}`}
                        >
                          <td className="px-4 py-3.5 text-sm text-gray-900">{formatDate(log.created_at)}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">
                            {formatNumber(log.sheet_width)}" × {formatNumber(log.sheet_height)}"
                          </td>
                          <td className="px-4 py-3.5 text-sm text-right font-medium text-indigo-600">
                            {formatNumber(log.sq_inches_used)}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="inline-flex items-center text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                  −{formatNumber(creditsUsed)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {formatNumber(log.credits_before)} → {formatNumber(log.credits_after)}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-center text-gray-600">{log.image_count}</td>
                          <td className="px-4 py-3.5 text-center">
                            {log.design_code ? (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className={`text-xs cursor-default ${src.className}`}>
                                    {src.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs font-mono">
                                  {log.design_code}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Badge variant="outline" className={`text-xs ${src.className}`}>
                                {src.label}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y">
                {currentLogs.map((log) => {
                  const creditsUsed = log.credits_before - log.credits_after;
                  const src = SOURCE_CONFIG[log.source || "standalone"];

                  return (
                    <div key={log.id} className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{formatDate(log.created_at)}</span>
                        <Badge variant="outline" className={`text-xs ${src.className}`}>
                          {src.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                        <span className="text-muted-foreground">Sheet Size</span>
                        <span className="text-right">{formatNumber(log.sheet_width)}" × {formatNumber(log.sheet_height)}"</span>
                        <span className="text-muted-foreground">Area Used</span>
                        <span className="text-right font-medium text-indigo-600">{formatNumber(log.sq_inches_used)} sq.in</span>
                        <span className="text-muted-foreground">Credits Used</span>
                        <span className="text-right font-semibold text-red-600">−{formatNumber(creditsUsed)}</span>
                        <span className="text-muted-foreground">Images</span>
                        <span className="text-right">{log.image_count}</span>
                        {log.design_code && (
                          <>
                            <span className="text-muted-foreground">Design Code</span>
                            <span className="text-right font-mono text-xs">{log.design_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length}
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          className={`w-9 ${page === currentPage ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default SheetLogs;
