import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { getPrinter, Printer } from "@/services/printerService";
import { logSheetGeneration } from "@/lib/usageLogger";
import { logCreditTransaction } from "@/lib/creditLedgerService";
import {
  getOrders,
  getOrderStats,
  updateOrderStatus,
  deleteOrder,
  getOrderPreviewUrls,
  formatTimeRemaining,
  formatDate,
  formatRelativeTime,
  getTimezoneAbbreviation,
  OrderDesign,
  OrderStats,
} from "@/services/orderService";
import { formatPrice } from "@/types/publicBuilder";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek } from "date-fns";
import {
  Loader2,
  Package,
  Clock,
  CheckCircle,
  Download,
  XCircle,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  FileDown,
  AlertTriangle,
  Search,
  LayoutGrid,
  List,
  CalendarIcon,
} from "lucide-react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "outline" as const,
    icon: Clock,
    color: "text-amber-600",
    badgeClass: "",
  },
  paid: {
    label: "Paid",
    variant: "default" as const,
    icon: CheckCircle,
    color: "text-green-600",
    badgeClass: "bg-green-600 hover:bg-green-700 border-transparent text-white",
  },
  downloaded: {
    label: "Downloaded",
    variant: "default" as const,
    icon: Download,
    color: "text-green-600",
    badgeClass: "bg-green-100 hover:bg-green-200 border-green-200 text-green-800",
  },
  expired: {
    label: "Expired",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-600",
    badgeClass: "",
  },
};

const Orders = () => {
  const { user } = useAuth();
  const { credits, deductCredits, refreshCredits } = useCredits();
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [orders, setOrders] = useState<OrderDesign[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");

  // Date range filter
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<string>("all");

  // Reset status filter when switching to kanban (kanban shows all statuses as columns)
  useEffect(() => {
    if (viewMode === "kanban") setStatusFilter("all");
  }, [viewMode]);
  
  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<OrderDesign | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Multi-select states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter orders by search query, date range
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Date range filter
    if (dateFrom) {
      const from = startOfDay(dateFrom);
      result = result.filter((o) => new Date(o.created_at) >= from);
    }
    if (dateTo) {
      const to = endOfDay(dateTo);
      result = result.filter((o) => new Date(o.created_at) <= to);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toUpperCase().trim();
      result = result.filter((o) => o.design_code.toUpperCase().includes(query));
    }

    return result;
  }, [orders, searchQuery, dateFrom, dateTo]);

  // Orders that can be selected (all non-expired)
  const selectableOrders = useMemo(() => {
    return filteredOrders.filter(
      (o) => o.status !== "expired" && new Date(o.expires_at) >= new Date()
    );
  }, [filteredOrders]);

  // Are all selectable orders currently selected?
  const allSelected = selectableOrders.length > 0 && selectableOrders.every((o) => selectedIds.has(o.id));

  // Counts for enabling/disabling bulk buttons
  const selectedOrders = useMemo(() => {
    return filteredOrders.filter((o) => selectedIds.has(o.id));
  }, [filteredOrders, selectedIds]);

  const selectedPendingCount = selectedOrders.filter((o) => o.status === "pending").length;
  const selectedDownloadableCount = selectedOrders.filter(
    (o) => o.status === "paid" || o.status === "downloaded"
  ).length;

  // Toggle a single row
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Toggle all selectable
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableOrders.map((o) => o.id)));
    }
  };

  // Bulk mark as paid (keep selection so Download lights up immediately)
  const handleBulkMarkPaid = async () => {
    if (!printer || !user || selectedPendingCount === 0) return;
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    const pendingOrders = selectedOrders.filter((o) => o.status === "pending");

    // Calculate total area needed for all selected pending orders
    const totalAreaNeeded = pendingOrders.reduce(
      (sum, o) => sum + o.sheets.reduce((s, sh) => s + (sh.width_inches * sh.height_inches), 0), 0
    );

    if (credits < totalAreaNeeded) {
      toast.error(`Insufficient credits. Need ${totalAreaNeeded.toFixed(2)} sq.in, have ${credits.toFixed(2)} sq.in`);
      setIsProcessing(false);
      return;
    }

    let runningCredits = credits;

    for (const order of pendingOrders) {
      try {
        const orderArea = order.sheets.reduce(
          (sum, s) => sum + (s.width_inches * s.height_inches), 0
        );

        // Deduct credits
        const creditsBefore = runningCredits;
        const deductResult = await deductCredits(orderArea, `Website Integration - ${order.design_code}`);

        if (!deductResult.success) {
          failCount++;
          continue;
        }

        runningCredits = deductResult.newBalance ?? (runningCredits - orderArea);

        // Log to usage_logs
        await logSheetGeneration({
          user_id: user.id,
          user_email: user.email || "",
          sq_inches_used: orderArea,
          sheet_width: order.sheets[0]?.width_inches || 0,
          sheet_height: order.sheets.reduce((sum, s) => sum + s.height_inches, 0),
          image_count: order.sheet_count,
          credits_before: creditsBefore,
          credits_after: runningCredits,
          source: "website_integration",
          design_code: order.design_code,
        });

        // Log to credit_ledger for Credit History page
        await logCreditTransaction(
          user.id,
          user.email || "",
          "usage",
          -orderArea,
          runningCredits,
          `Website Integration - ${order.design_code}`,
          order.design_code
        );

        // Mark as paid
        const result = await updateOrderStatus(order.id, printer.id, "paid");
        if (result.success) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    // Don't clear selection — let user immediately hit Download
    await fetchOrders(printer.id);
    const statsResult = await getOrderStats(printer.id);
    if (statsResult.success && statsResult.data) setStats(statsResult.data);
    setIsProcessing(false);

    if (failCount === 0) {
      toast.success(`${successCount} order${successCount > 1 ? "s" : ""} marked as paid — credits deducted`);
    } else {
      toast.warning(`${successCount} succeeded, ${failCount} failed`);
    }
  };

  // Bulk download
  const handleBulkDownload = async () => {
    if (!printer?.store_id) return;
    setIsProcessing(true);

    const downloadable = selectedOrders.filter(
      (o) => o.status === "paid" || o.status === "downloaded"
    );

    let totalSheets = downloadable.reduce((sum, o) => sum + o.sheet_count, 0);
    toast.info(`Downloading ${totalSheets} sheet${totalSheets > 1 ? "s" : ""} from ${downloadable.length} order${downloadable.length > 1 ? "s" : ""}...`);

    for (const order of downloadable) {
      for (let i = 1; i <= order.sheet_count; i++) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${printer.store_id}/${order.design_code}/sheet_${i}.png`;
        const sheet = order.sheets?.[i - 1];
        const dims = sheet ? `_${Math.round(sheet.width_inches)}x${Math.round(sheet.height_inches)}in` : '';
        await downloadFile(url, `${order.design_code}_sheet${i}${dims}.png`);
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 500));
      }

      // Mark as downloaded if currently paid
      if (order.status === "paid") {
        await updateOrderStatus(order.id, printer.id, "downloaded");
      }
    }

    await fetchOrders(printer.id);
    const statsResult = await getOrderStats(printer.id);
    if (statsResult.success && statsResult.data) setStats(statsResult.data);

    setSelectedIds(new Set());
    setIsProcessing(false);
    toast.success(`Downloaded ${totalSheets} sheet${totalSheets > 1 ? "s" : ""}`);
  };

  // Clear selection when filter/search changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, searchQuery]);

  // Load printer and orders
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      // Only show loading spinner on first load, not on tab revisit
      const isFirstLoad = !printer;
      if (isFirstLoad) setIsLoading(true);

      try {
        // Get printer
        const printerResult = await getPrinter(user.id);
        if (!printerResult.success || !printerResult.data) {
          if (isFirstLoad) toast.error("Please set up your store first");
          setIsLoading(false);
          return;
        }
        setPrinter(printerResult.data);

        // Get orders
        await fetchOrders(printerResult.data.id);

        // Get stats
        const statsResult = await getOrderStats(printerResult.data.id);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isFirstLoad) toast.error("Failed to load orders");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Fetch orders with current filter
  const fetchOrders = async (printerId: string) => {
    const result = await getOrders(printerId, {
      status: statusFilter,
      limit: 50,
    });

    if (result.success && result.data) {
      setOrders(result.data);
    } else {
      toast.error(result.error || "Failed to load orders");
    }
  };

  // Refresh orders when filter changes
  useEffect(() => {
    if (printer?.id) {
      fetchOrders(printer.id);
    }
  }, [statusFilter, printer?.id]);

  // Handle status update (with credit deduction on "paid")
  const handleStatusUpdate = async (order: OrderDesign, newStatus: "paid" | "downloaded") => {
    if (!printer || !user) return;

    setIsProcessing(true);
    try {
      // When marking as paid, deduct credits first
      if (newStatus === "paid") {
        // Calculate total area from all sheets
        const totalArea = order.sheets.reduce(
          (sum, s) => sum + (s.width_inches * s.height_inches), 0
        );

        if (totalArea <= 0) {
          toast.error("Cannot calculate area for this order");
          setIsProcessing(false);
          return;
        }

        // Check sufficient credits
        if (credits < totalArea) {
          toast.error(`Insufficient credits. Need ${totalArea.toFixed(2)} sq.in, have ${credits.toFixed(2)} sq.in`);
          setIsProcessing(false);
          return;
        }

        // Deduct credits
        const creditsBefore = credits;
        const deductResult = await deductCredits(totalArea, `Website Integration - ${order.design_code}`);

        if (!deductResult.success) {
          toast.error(deductResult.error || "Failed to deduct credits");
          setIsProcessing(false);
          return;
        }

        // Log to usage_logs with source
        await logSheetGeneration({
          user_id: user.id,
          user_email: user.email || "",
          sq_inches_used: totalArea,
          sheet_width: order.sheets[0]?.width_inches || 0,
          sheet_height: order.sheets.reduce((sum, s) => sum + s.height_inches, 0),
          image_count: order.sheet_count,
          credits_before: creditsBefore,
          credits_after: deductResult.newBalance ?? (creditsBefore - totalArea),
          source: "website_integration",
          design_code: order.design_code,
        });

        // Log to credit_ledger for Credit History page
        await logCreditTransaction(
          user.id,
          user.email || "",
          "usage",
          -totalArea,
          deductResult.newBalance ?? (creditsBefore - totalArea),
          `Website Integration - ${order.design_code}`,
          order.design_code
        );
      }

      const result = await updateOrderStatus(order.id, printer.id, newStatus);
      if (result.success) {
        toast.success(
          newStatus === "paid"
            ? `${order.design_code} marked as paid — credits deducted`
            : `Order marked as ${newStatus}`
        );
        await fetchOrders(printer.id);
        const statsResult = await getOrderStats(printer.id);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      } else {
        toast.error(result.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle view order details
  const handleViewOrder = async (order: OrderDesign) => {
    setSelectedOrder(order);
    
    // Get preview URLs
    if (printer?.store_id) {
      const urls = await getOrderPreviewUrls(
        printer.store_id,
        order.design_code,
        order.sheet_count
      );
      setPreviewUrls(urls);
    }
    
    setIsViewDialogOpen(true);
  };

  // Handle download - uses fetch+blob to trigger real file downloads
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(`Failed to download ${filename}:`, err);
    }
  };

  const handleDownload = async (order: OrderDesign) => {
    if (!printer?.store_id) return;

    toast.info(`Downloading ${order.sheet_count} sheet${order.sheet_count > 1 ? "s" : ""}...`);

    for (let i = 1; i <= order.sheet_count; i++) {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/design-files/${printer.store_id}/${order.design_code}/sheet_${i}.png`;
      const sheet = order.sheets?.[i - 1];
      const dims = sheet ? `_${Math.round(sheet.width_inches)}x${Math.round(sheet.height_inches)}in` : '';
      await downloadFile(url, `${order.design_code}_sheet${i}${dims}.png`);
      // Small delay between downloads to avoid browser throttling
      if (i < order.sheet_count) await new Promise((r) => setTimeout(r, 500));
    }

    // Mark as downloaded if currently paid
    if (order.status === "paid") {
      await handleStatusUpdate(order, "downloaded");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedOrder || !printer) return;

    setIsProcessing(true);
    try {
      const result = await deleteOrder(
        selectedOrder.id,
        printer.id,
        printer.store_id,
        selectedOrder.design_code
      );

      if (result.success) {
        toast.success("Order deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedOrder(null);
        await fetchOrders(printer.id);
        // Update stats
        const statsResult = await getOrderStats(printer.id);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      } else {
        toast.error(result.error || "Failed to delete order");
      }
    } catch (error) {
      toast.error("Failed to delete order");
    } finally {
      setIsProcessing(false);
    }
  };

  // Refresh handler
  const handleRefresh = async () => {
    if (!printer) return;
    setIsLoading(true);
    await fetchOrders(printer.id);
    const statsResult = await getOrderStats(printer.id);
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data);
    }
    setIsLoading(false);
    toast.success("Orders refreshed");
  };

  // Clear all expired orders
  const handleClearExpired = async () => {
    if (!printer) return;

    const expiredOrders = orders.filter(
      (o) => o.status === "expired" || new Date(o.expires_at) < new Date()
    );

    if (expiredOrders.length === 0) {
      toast.info("No expired orders to clear");
      return;
    }

    setIsProcessing(true);
    let cleared = 0;

    for (const order of expiredOrders) {
      try {
        const result = await deleteOrder(order.id, printer.id, printer.store_id, order.design_code);
        if (result.success) cleared++;
      } catch {}
    }

    await fetchOrders(printer.id);
    const statsResult = await getOrderStats(printer.id);
    if (statsResult.success && statsResult.data) setStats(statsResult.data);
    setIsProcessing(false);
    toast.success(`Cleared ${cleared} expired order${cleared > 1 ? "s" : ""}`);
  };

  // Date preset helpers
  const setDatePreset = (preset: string) => {
    const now = new Date();
    setActivePreset(preset);
    switch (preset) {
      case "today":
        setDateFrom(startOfDay(now));
        setDateTo(now);
        break;
      case "week":
        setDateFrom(startOfWeek(now, { weekStartsOn: 1 }));
        setDateTo(now);
        break;
      case "month":
        setDateFrom(startOfMonth(now));
        setDateTo(now);
        break;
      case "7days":
        setDateFrom(subDays(now, 7));
        setDateTo(now);
        break;
      case "30days":
        setDateFrom(subDays(now, 30));
        setDateTo(now);
        break;
      case "all":
        setDateFrom(undefined);
        setDateTo(undefined);
        break;
    }
  };

  // Custom date pickers clear the active preset
  const handleCustomDateFrom = (date: Date | undefined) => {
    setDateFrom(date);
    setActivePreset("");
  };
  const handleCustomDateTo = (date: Date | undefined) => {
    setDateTo(date);
    setActivePreset("");
  };

  const hasDateFilter = dateFrom !== undefined || dateTo !== undefined;

  // Compute stats from filtered orders (reflects date range)
  const filteredStats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter((o) => o.status === "pending" && new Date(o.expires_at) >= new Date()).length;
    const paid = filteredOrders.filter((o) => o.status === "paid").length;
    const downloaded = filteredOrders.filter((o) => o.status === "downloaded").length;
    const expired = filteredOrders.filter((o) => o.status === "expired" || new Date(o.expires_at) < new Date()).length;
    return { total, pending, paid, downloaded, expired };
  }, [filteredOrders]);

  // ─── Kanban-specific logic ──────────────────────────────────────────────────

  // Group filtered orders by kanban column
  const kanbanColumns = useMemo(() => {
    const pending: OrderDesign[] = [];
    const paid: OrderDesign[] = [];
    const downloaded: OrderDesign[] = [];
    const expired: OrderDesign[] = [];

    for (const order of filteredOrders) {
      const isExp = order.status === "expired" || new Date(order.expires_at) < new Date();
      if (isExp) { expired.push(order); continue; }
      if (order.status === "pending") pending.push(order);
      else if (order.status === "paid") paid.push(order);
      else if (order.status === "downloaded") downloaded.push(order);
    }

    return { pending, paid, downloaded, expired };
  }, [filteredOrders]);

  // Drag state
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("text/plain", orderId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedOrderId(orderId);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggedOrderId(null);

    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId || !printer) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Only allow: pending → paid (handleStatusUpdate handles credit deduction)
    if (order.status === "pending" && targetColumn === "paid") {
      await handleStatusUpdate(order, "paid");
    }
  };

  // Kanban card actions
  const handleKanbanDownload = async (order: OrderDesign) => {
    await handleDownload(order);
    if (printer?.id) {
      await fetchOrders(printer.id);
      const statsResult = await getOrderStats(printer.id);
      if (statsResult.success && statsResult.data) setStats(statsResult.data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!printer) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Store Not Set Up</h3>
          <p className="text-muted-foreground mb-4">
            Please complete your store setup before viewing orders.
          </p>
          <Button asChild>
            <a href="/website-integration/setup">Go to Store Setup</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
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
                const isActive = activePreset === preset;
                return (
                  <Button
                    key={preset}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${isActive ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
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
        </CardContent>
      </Card>

      {/* Stats Cards — reflect filtered date range */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{filteredStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{filteredStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">{filteredStats.paid}</div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-blue-600">{filteredStats.downloaded}</div>
            <p className="text-xs text-muted-foreground">Downloaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{filteredStats.expired}</div>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
              {filteredStats.expired > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                  onClick={handleClearExpired}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-xl">Customer Orders</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {/* Status filter - only in table view */}
              {viewMode === "table" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="downloaded">Downloaded</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Full-width search bar */}
          <div className="flex justify-center mt-2">
            <div className="relative w-[70%]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Design Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 w-full border-2 border-indigo-200 focus:border-indigo-400 rounded-lg shadow-sm"
              />
            </div>
          </div>
          {/* Centered toggle pill */}
          <div className="flex items-center justify-center pt-3">
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  viewMode === "kanban"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban View
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  viewMode === "table"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="h-4 w-4" />
                Table View
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <CardDescription className="text-sm">
              {viewMode === "kanban"
                ? "Drag orders from Pending to Paid, then download"
                : "Manage customer designs from your public builder"}
            </CardDescription>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Times shown in {getTimezoneAbbreviation()}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
              {(statusFilter !== "all" || searchQuery) && (
                <p className="text-sm mt-1">Try changing the filter or search query</p>
              )}
            </div>
          ) : viewMode === "kanban" ? (
            /* ═══════════════ KANBAN VIEW ═══════════════ */
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Pending Column */}
              <div
                className={`rounded-xl border transition-colors ${
                  dragOverColumn === "pending" ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200/60"
                }`}
                style={{ background: "linear-gradient(180deg, #fffdf5 0%, #fef9e1 50%, #fefce8 100%)" }}
                onDragOver={(e) => handleDragOver(e, "pending")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "pending")}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-amber-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-bold text-base text-amber-900">Pending</span>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-white/60 text-sm px-2.5">{kanbanColumns.pending.length}</Badge>
                </div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.pending.map((order) => {
                    const isMatch = searchQuery.trim() && order.design_code.toUpperCase().includes(searchQuery.toUpperCase().trim());
                    return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      className={`rounded-lg border shadow-sm p-3.5 cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:border-gray-300 ${
                        draggedOrderId === order.id ? "opacity-50 scale-95" : ""
                      } ${isMatch ? "shadow-xl shadow-indigo-200/50 scale-[1.02] bg-white" : "bg-white border-amber-100"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[15px] font-bold">{order.design_code}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusUpdate(order, "paid")} disabled={isProcessing}>
                              <CheckCircle className="h-4 w-4 mr-2" />Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1.5">{order.printer_product?.product_name || "—"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{formatPrice(order.total_price, order.currency)}</span>
                        <span className="text-muted-foreground">{order.sheet_count} sheet{order.sheet_count > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-amber-100 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(order.created_at)}</span>
                        <span className="text-amber-600 font-semibold">{formatTimeRemaining(order.expires_at)}</span>
                      </div>
                    </div>
                    );
                  })}
                  {kanbanColumns.pending.length === 0 && (
                    <div className="text-center py-10 text-amber-600/60 text-sm font-medium">No pending orders</div>
                  )}
                </div>
              </div>

              {/* Paid Column */}
              <div
                className={`rounded-xl border transition-colors ${
                  dragOverColumn === "paid" ? "border-green-400 ring-2 ring-green-200" : "border-green-200/60"
                }`}
                style={{ background: "linear-gradient(180deg, #f5fcf5 0%, #e8f8ec 50%, #f0fdf4 100%)" }}
                onDragOver={(e) => handleDragOver(e, "paid")}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, "paid")}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-green-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="font-bold text-base text-green-900">Paid</span>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300 bg-white/60 text-sm px-2.5">{kanbanColumns.paid.length}</Badge>
                </div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.paid.map((order) => {
                    const isMatch = searchQuery.trim() && order.design_code.toUpperCase().includes(searchQuery.toUpperCase().trim());
                    return (
                    <div
                      key={order.id}
                      className={`rounded-lg border shadow-sm p-3.5 transition-all hover:shadow-lg hover:border-gray-300 ${
                        isMatch ? "shadow-xl shadow-indigo-200/50 scale-[1.02] bg-white" : "bg-white border-green-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[15px] font-bold">{order.design_code}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleKanbanDownload(order)}>
                              <FileDown className="h-4 w-4 mr-2" />Download Files
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1.5">{order.printer_product?.product_name || "—"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{formatPrice(order.total_price, order.currency)}</span>
                        <span className="text-muted-foreground">{order.sheet_count} sheet{order.sheet_count > 1 ? "s" : ""}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3 text-green-700 border-green-300 hover:bg-green-50 font-medium"
                        onClick={() => handleKanbanDownload(order)}
                      >
                        <FileDown className="h-4 w-4 mr-1.5" />
                        Download
                      </Button>
                    </div>
                    );
                  })}
                  {kanbanColumns.paid.length === 0 && (
                    <div className="text-center py-10 text-green-600/60 text-sm font-medium">
                      {kanbanColumns.pending.length > 0 ? "Drag pending orders here to mark as paid" : "No paid orders"}
                    </div>
                  )}
                </div>
              </div>

              {/* Downloaded Column */}
              <div
                className="rounded-xl border border-blue-200/60"
                style={{ background: "linear-gradient(180deg, #f5f9ff 0%, #e8f1fc 50%, #eff6ff 100%)" }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-blue-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="font-bold text-base text-blue-900">Downloaded</span>
                  </div>
                  <Badge variant="outline" className="text-blue-700 border-blue-300 bg-white/60 text-sm px-2.5">{kanbanColumns.downloaded.length}</Badge>
                </div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.downloaded.map((order) => {
                    const isMatch = searchQuery.trim() && order.design_code.toUpperCase().includes(searchQuery.toUpperCase().trim());
                    return (
                    <div
                      key={order.id}
                      className={`rounded-lg border shadow-sm p-3.5 transition-all hover:shadow-lg hover:border-gray-300 ${
                        isMatch ? "shadow-xl shadow-indigo-200/50 scale-[1.02] bg-white" : "bg-white border-blue-100"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[15px] font-bold">{order.design_code}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleKanbanDownload(order)}>
                              <FileDown className="h-4 w-4 mr-2" />Download Again
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-1.5">{order.printer_product?.product_name || "—"}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{formatPrice(order.total_price, order.currency)}</span>
                        <span className="text-muted-foreground">{order.sheet_count} sheet{order.sheet_count > 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-blue-100 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(order.created_at)}</span>
                        <span className="flex items-center gap-1 text-blue-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" />Done</span>
                      </div>
                    </div>
                    );
                  })}
                  {kanbanColumns.downloaded.length === 0 && (
                    <div className="text-center py-10 text-blue-600/60 text-sm font-medium">No downloaded orders</div>
                  )}
                </div>
              </div>
            </div>
            {/* Expired orders indicator */}
            {kanbanColumns.expired.length > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground px-1">
                <XCircle className="h-4 w-4 text-red-400" />
                <span>{kanbanColumns.expired.length} expired order{kanbanColumns.expired.length > 1 ? "s" : ""} hidden — switch to table view to see them</span>
              </div>
            )}
            </>
          ) : (
            /* ═══════════════ TABLE VIEW ═══════════════ */
            <>
              {/* Bulk Action Buttons - always visible */}
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 ? (
                    <span className="font-medium text-indigo-700">
                      {selectedIds.size} order{selectedIds.size > 1 ? "s" : ""} selected
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="ml-2 text-xs underline text-indigo-500 hover:text-indigo-700"
                      >
                        Clear
                      </button>
                    </span>
                  ) : (
                    <span>Select orders to perform bulk actions</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDownload}
                    disabled={isProcessing || selectedDownloadableCount === 0 || selectedPendingCount > 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Files{selectedDownloadableCount > 0 && selectedPendingCount === 0 ? ` (${selectedDownloadableCount})` : ""}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkMarkPaid}
                    disabled={isProcessing || selectedPendingCount === 0}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid{selectedPendingCount > 0 ? ` (${selectedPendingCount})` : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      disabled={selectableOrders.length === 0}
                      aria-label="Select all orders"
                      className="h-[18px] w-[18px] rounded-[3px]"
                    />
                  </TableHead>
                  <TableHead>Design Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Sheets</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const statusConfig = STATUS_CONFIG[order.status];
                  const StatusIcon = statusConfig.icon;
                  const isExpired = new Date(order.expires_at) < new Date();
                  const isPending = order.status === "pending";
                  const canMarkPaid = isPending && !isExpired;

                  return (
                    <TableRow key={order.id} className={selectedIds.has(order.id) ? "bg-indigo-50" : ""}>
                      <TableCell>
                        {!isExpired && order.status !== "expired" ? (
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                            aria-label={`Select ${order.design_code}`}
                            className="h-[18px] w-[18px] rounded-[3px]"
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {order.design_code}
                      </TableCell>
                      <TableCell>
                        {order.printer_product?.product_name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className={`gap-1 ${statusConfig.badgeClass}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatPrice(order.total_price, order.currency)}
                      </TableCell>
                      <TableCell>{order.sheet_count}</TableCell>
                      <TableCell 
                        className="text-sm text-muted-foreground cursor-help"
                        title={formatDate(order.created_at)}
                      >
                        {formatRelativeTime(order.created_at)}
                      </TableCell>
                      <TableCell>
                        {isExpired || order.status === "expired" ? (
                          <span className="text-sm text-red-600">Expired</span>
                        ) : (
                          <span className={`text-sm ${
                            isPending ? "text-amber-600" : "text-muted-foreground"
                          }`}>
                            {formatTimeRemaining(order.expires_at)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            
                            {(order.status === "paid" || order.status === "downloaded") && (
                              <DropdownMenuItem onClick={() => handleDownload(order)}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Download Files
                              </DropdownMenuItem>
                            )}

                            {canMarkPaid && (
                              <DropdownMenuItem 
                                onClick={() => handleStatusUpdate(order, "paid")}
                                disabled={isProcessing}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Design Code: {selectedOrder?.design_code}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {/* Status and Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={STATUS_CONFIG[selectedOrder.status].variant} className={`mt-1 ${STATUS_CONFIG[selectedOrder.status].badgeClass}`}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Price</p>
                  <p className="font-medium">
                    {formatPrice(selectedOrder.total_price, selectedOrder.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(selectedOrder.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="text-sm">{selectedOrder.printer_product?.product_name || "—"}</p>
                </div>
                {selectedOrder.paid_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Marked Paid</p>
                    <p className="text-sm">{formatDate(selectedOrder.paid_at)}</p>
                  </div>
                )}
                {selectedOrder.downloaded_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Downloaded</p>
                    <p className="text-sm">{formatDate(selectedOrder.downloaded_at)}</p>
                  </div>
                )}
                {selectedOrder.customer_email && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Customer Email</p>
                    <p className="text-sm">{selectedOrder.customer_email}</p>
                  </div>
                )}
              </div>

              {/* Auto-Delete Info */}
              <div className={`rounded-lg border p-4 ${
                selectedOrder.status === "pending" 
                  ? "bg-amber-50 border-amber-200" 
                  : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex items-start gap-3">
                  <Clock className={`h-5 w-5 mt-0.5 ${
                    selectedOrder.status === "pending" ? "text-amber-600" : "text-gray-500"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Auto-Delete</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {formatDate(selectedOrder.expires_at)}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      new Date(selectedOrder.expires_at) < new Date() 
                        ? "text-red-600" 
                        : selectedOrder.status === "pending" 
                          ? "text-amber-600" 
                          : "text-gray-600"
                    }`}>
                      {new Date(selectedOrder.expires_at) < new Date() 
                        ? "Expired" 
                        : `${formatTimeRemaining(selectedOrder.expires_at)} remaining`
                      }
                    </p>
                    {selectedOrder.status === "pending" && new Date(selectedOrder.expires_at) > new Date() && (
                      <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Mark as paid to extend retention by 10 days
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Previews */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Sheet Previews ({selectedOrder.sheet_count} sheet{selectedOrder.sheet_count > 1 ? "s" : ""})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={url}
                        alt={`Sheet ${index + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                      <div className="p-2 text-xs text-center text-muted-foreground">
                        Sheet {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sheet Details */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sheet Details</p>
                <div className="space-y-2">
                  {selectedOrder.sheets.map((sheet, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>Sheet {sheet.sheet_number}</span>
                      <span>{Number(sheet.width_inches).toFixed(2)}" × {Number(sheet.height_inches).toFixed(2)}"</span>
                      <span>{sheet.variant_name}</span>
                      <span>{formatPrice(sheet.variant_price, selectedOrder.currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedOrder && (selectedOrder.status === "paid" || selectedOrder.status === "downloaded") && (
              <Button onClick={() => handleDownload(selectedOrder)}>
                <FileDown className="h-4 w-4 mr-2" />
                Download Files
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order {selectedOrder?.design_code}? This will permanently delete the design files and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
