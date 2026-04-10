import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { logSheetGeneration } from "@/lib/usageLogger";
import { getQSOrders, updateQSOrderStatus, deleteQSOrder, formatTimeRemaining, formatDate, getTimezoneAbbreviation } from "@/services/qsOrderService";
import { QuickStore, QSOrder, formatPrice } from "@/types/quickStore";
import { getR2PublicUrl } from "@/lib/r2Client";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek, formatDistanceToNow } from "date-fns";
import { Loader2, Package, Clock, CheckCircle, Download, XCircle, MoreVertical, Eye, Trash2, RefreshCw, FileDown, Search, LayoutGrid, List, CalendarIcon, Phone, User, AlertTriangle, Mail, MessageSquare } from "lucide-react";
import { StatsCardsSkeleton, KanbanSkeleton } from "@/components/Skeletons";

interface OutletContextType { store: QuickStore | null; }

const STATUS_CONFIG: Record<string, { label: string; variant: "outline" | "default" | "destructive"; icon: any; badgeClass: string }> = {
  pending: { label: "Pending", variant: "outline", icon: Clock, badgeClass: "" },
  paid: { label: "Paid", variant: "default", icon: CheckCircle, badgeClass: "bg-green-600 hover:bg-green-700 border-transparent text-white" },
  downloaded: { label: "Downloaded", variant: "default", icon: Download, badgeClass: "bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-800" },
  expired: { label: "Expired", variant: "destructive", icon: XCircle, badgeClass: "" },
};

const QSOrders = () => {
  const { store } = useOutletContext<OutletContextType>();
  const { user } = useAuth();
  const { credits, deductCredits } = useCredits();

  const [orders, setOrders] = useState<QSOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [activePreset, setActivePreset] = useState<string>("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [selectedOrder, setSelectedOrder] = useState<QSOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Mark as Paid confirmation modal state
  const [paidConfirmOrders, setPaidConfirmOrders] = useState<QSOrder[]>([]);
  const [isPaidConfirmOpen, setIsPaidConfirmOpen] = useState(false);

  useEffect(() => { if (viewMode === "kanban") setStatusFilter("all"); }, [viewMode]);

  const isExpired = (o: QSOrder) => new Date(o.expires_at) < new Date();

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== "all") {
      if (statusFilter === "expired") result = result.filter((o) => isExpired(o));
      else result = result.filter((o) => o.status === statusFilter && !isExpired(o));
    }
    if (dateFrom) { const from = startOfDay(dateFrom); result = result.filter((o) => new Date(o.created_at) >= from); }
    if (dateTo) { const to = endOfDay(dateTo); result = result.filter((o) => new Date(o.created_at) <= to); }
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase().trim();
      result = result.filter((o) => o.order_code.toUpperCase().includes(q) || o.customer_name.toUpperCase().includes(q) || o.customer_phone.includes(q));
    }
    return result;
  }, [orders, searchQuery, dateFrom, dateTo, statusFilter]);

  const selectableOrders = useMemo(() => filteredOrders.filter((o) => !isExpired(o)), [filteredOrders]);
  const allSelected = selectableOrders.length > 0 && selectableOrders.every((o) => selectedIds.has(o.id));
  const selectedOrders = useMemo(() => filteredOrders.filter((o) => selectedIds.has(o.id)), [filteredOrders, selectedIds]);
  const selectedPendingCount = selectedOrders.filter((o) => o.status === "pending").length;
  const selectedDownloadableCount = selectedOrders.filter((o) => o.status === "paid" || o.status === "downloaded").length;

  const toggleSelect = (id: string) => { setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); };
  const toggleSelectAll = () => { allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(selectableOrders.map((o) => o.id))); };
  useEffect(() => { setSelectedIds(new Set()); }, [statusFilter, searchQuery]);

  // ─── Credit deduction helper ───────────────────────────────────────────────
  const deductCreditsForOrder = async (order: QSOrder, runningCredits: number): Promise<{ success: boolean; newBalance: number }> => {
    if (!user) return { success: false, newBalance: runningCredits };
    const totalArea = order.total_area_sq_inches;
    if (totalArea <= 0) { toast.error("Cannot calculate area"); return { success: false, newBalance: runningCredits }; }
    if (runningCredits < totalArea) { toast.error(`Insufficient credits. Need ${totalArea.toFixed(2)}, have ${runningCredits.toFixed(2)}`); return { success: false, newBalance: runningCredits }; }

    const creditsBefore = runningCredits;
    const deductResult = await deductCredits(totalArea, `Quick Store - ${order.order_code}`);
    if (!deductResult.success) { toast.error(deductResult.error || "Failed to deduct credits"); return { success: false, newBalance: runningCredits }; }
    const newBalance = deductResult.newBalance ?? (runningCredits - totalArea);

    await logSheetGeneration({ user_id: user.id, user_email: user.email || "", sq_inches_used: totalArea, sheet_width: order.sheets[0]?.width_inches || 0, sheet_height: order.sheets.reduce((sum, s) => sum + s.height_inches, 0), image_count: order.sheet_count, credits_before: creditsBefore, credits_after: newBalance, source: "quick_store", design_code: order.order_code });
    return { success: true, newBalance };
  };

  // ─── Mark as Paid: show confirmation first ─────────────────────────────────
  const requestMarkPaid = (ordersToMark: QSOrder[]) => {
    setPaidConfirmOrders(ordersToMark);
    setIsPaidConfirmOpen(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (!store || !user || paidConfirmOrders.length === 0) return;
    setIsPaidConfirmOpen(false);
    setIsProcessing(true);

    const totalAreaNeeded = paidConfirmOrders.reduce((sum, o) => sum + o.total_area_sq_inches, 0);
    if (credits < totalAreaNeeded) { toast.error(`Insufficient credits. Need ${totalAreaNeeded.toFixed(2)} sq.in, have ${credits.toFixed(2)} sq.in`); setIsProcessing(false); return; }

    let runningCredits = credits;
    let successCount = 0, failCount = 0;

    for (const order of paidConfirmOrders) {
      try {
        const result = await deductCreditsForOrder(order, runningCredits);
        if (!result.success) { failCount++; continue; }
        runningCredits = result.newBalance;
        const updateResult = await updateQSOrderStatus(order.id, "paid", Math.round(order.total_area_sq_inches));
        if (updateResult.success) successCount++; else failCount++;
      } catch { failCount++; }
    }

    await fetchOrders();
    setPaidConfirmOrders([]);
    setIsProcessing(false);

    if (paidConfirmOrders.length === 1) {
      if (failCount === 0) toast.success(`${paidConfirmOrders[0].order_code} marked as paid — credits deducted`);
      else toast.error("Failed to mark as paid");
    } else {
      failCount === 0 ? toast.success(`${successCount} order${successCount > 1 ? "s" : ""} marked as paid — credits deducted`) : toast.warning(`${successCount} succeeded, ${failCount} failed`);
    }
  };

  const paidConfirmTotalArea = paidConfirmOrders.reduce((sum, o) => sum + o.total_area_sq_inches, 0);
  const paidConfirmHasCredits = credits >= paidConfirmTotalArea;
  const paidConfirmBalanceAfter = credits - paidConfirmTotalArea;

  // ─── Bulk handlers ─────────────────────────────────────────────────────────
  const handleBulkMarkPaid = () => {
    const pendingOrders = selectedOrders.filter((o) => o.status === "pending");
    if (pendingOrders.length === 0) return;
    requestMarkPaid(pendingOrders);
  };

  const handleBulkDownload = async () => {
    if (!store) return;
    setIsProcessing(true);
    const downloadable = selectedOrders.filter((o) => o.status === "paid" || o.status === "downloaded");
    const totalSheets = downloadable.reduce((sum, o) => sum + o.sheet_count, 0);
    toast.info(`Downloading ${totalSheets} sheet${totalSheets > 1 ? "s" : ""}...`);
    for (const order of downloadable) { await downloadOrderFiles(order); if (order.status === "paid") await updateQSOrderStatus(order.id, "downloaded"); }
    await fetchOrders(); setSelectedIds(new Set()); setIsProcessing(false);
    toast.success(`Downloaded ${totalSheets} sheet${totalSheets > 1 ? "s" : ""}`);
  };

  // ─── Data loading ──────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    if (!store?.id) return;
    const result = await getQSOrders(store.id, { limit: 100 });
    if (result.success && result.data) setOrders(result.data);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!store?.id) { setIsLoading(false); return; }
      const isFirstLoad = orders.length === 0;
      if (isFirstLoad) setIsLoading(true);
      await fetchOrders();
      setIsLoading(false);
    };
    loadData();
  }, [store?.id]);

  // ─── Download files ────────────────────────────────────────────────────────
  const downloadFile = async (url: string, filename: string) => {
    try { const response = await fetch(url); const blob = await response.blob(); const blobUrl = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = blobUrl; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(blobUrl); } catch (err) { console.error(`Failed to download ${filename}:`, err); }
  };

  const downloadOrderFiles = async (order: QSOrder) => {
    for (const sheet of order.sheets) {
      const storagePath = sheet.storage_path || `orders/${store?.slug || "unknown"}/${order.order_code}/sheet_${sheet.sheet_number}.png`;
      const publicUrl = getR2PublicUrl("design-files", storagePath);
      if (publicUrl) { await downloadFile(publicUrl, `${order.order_code}_sheet${sheet.sheet_number}_${Math.round(sheet.width_inches)}x${Math.round(sheet.height_inches)}in.png`); await new Promise((r) => setTimeout(r, 500)); }
    }
  };

  const handleDownload = async (order: QSOrder) => {
    toast.info(`Downloading ${order.sheet_count} sheet${order.sheet_count > 1 ? "s" : ""}...`);
    await downloadOrderFiles(order);
    if (order.status === "paid") { await updateQSOrderStatus(order.id, "downloaded"); await fetchOrders(); }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedOrder || !store) return;
    setIsProcessing(true);
    try {
      const result = await deleteQSOrder(selectedOrder.id, store.slug, selectedOrder.order_code);
      if (result.success) { toast.success("Order deleted"); setIsDeleteDialogOpen(false); setIsViewDialogOpen(false); setSelectedOrder(null); await fetchOrders(); }
      else toast.error(result.error || "Failed to delete");
    } catch { toast.error("Failed to delete order"); } finally { setIsProcessing(false); }
  };

  const handleClearExpired = async () => {
    if (!store) return;
    const expiredOrders = orders.filter((o) => isExpired(o));
    if (expiredOrders.length === 0) { toast.info("No expired orders to clear"); return; }
    setIsProcessing(true); let cleared = 0;
    for (const order of expiredOrders) { try { const result = await deleteQSOrder(order.id, store.slug, order.order_code); if (result.success) cleared++; } catch {} }
    await fetchOrders(); setIsProcessing(false);
    toast.success(`Cleared ${cleared} expired order${cleared > 1 ? "s" : ""}`);
  };

  const handleRefresh = async () => { if (!store) return; setIsLoading(true); await fetchOrders(); setIsLoading(false); toast.success("Orders refreshed"); };

  // ─── View order details (modal) ────────────────────────────────────────────
  const handleViewOrder = (order: QSOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  // ─── Date presets ──────────────────────────────────────────────────────────
  const setDatePreset = (preset: string) => {
    const now = new Date(); setActivePreset(preset);
    switch (preset) {
      case "today": setDateFrom(startOfDay(now)); setDateTo(now); break;
      case "week": setDateFrom(startOfWeek(now, { weekStartsOn: 1 })); setDateTo(now); break;
      case "month": setDateFrom(startOfMonth(now)); setDateTo(now); break;
      case "7days": setDateFrom(subDays(now, 7)); setDateTo(now); break;
      case "30days": setDateFrom(subDays(now, 30)); setDateTo(now); break;
      case "all": setDateFrom(undefined); setDateTo(undefined); break;
    }
  };
  const handleCustomDateFrom = (date: Date | undefined) => { setDateFrom(date); setActivePreset(""); };
  const handleCustomDateTo = (date: Date | undefined) => { setDateTo(date); setActivePreset(""); };
  const hasDateFilter = dateFrom !== undefined || dateTo !== undefined;

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const filteredStats = useMemo(() => {
    const total = filteredOrders.length;
    const pending = filteredOrders.filter((o) => o.status === "pending" && !isExpired(o)).length;
    const paid = filteredOrders.filter((o) => o.status === "paid" && !isExpired(o)).length;
    const downloaded = filteredOrders.filter((o) => o.status === "downloaded" && !isExpired(o)).length;
    const expired = filteredOrders.filter((o) => isExpired(o)).length;
    return { total, pending, paid, downloaded, expired };
  }, [filteredOrders]);

  // ─── Kanban ────────────────────────────────────────────────────────────────
  const kanbanColumns = useMemo(() => {
    const pending: QSOrder[] = [], paid: QSOrder[] = [], downloaded: QSOrder[] = [], expired: QSOrder[] = [];
    for (const order of filteredOrders) {
      if (isExpired(order)) { expired.push(order); continue; }
      if (order.status === "pending") pending.push(order);
      else if (order.status === "paid") paid.push(order);
      else if (order.status === "downloaded") downloaded.push(order);
    }
    return { pending, paid, downloaded, expired };
  }, [filteredOrders]);

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const handleDragStart = (e: React.DragEvent, orderId: string) => { e.dataTransfer.setData("text/plain", orderId); e.dataTransfer.effectAllowed = "move"; setDraggedOrderId(orderId); };
  const handleDragOver = (e: React.DragEvent, column: string) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(column); };
  const handleDragLeave = () => { setDragOverColumn(null); };
  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault(); setDragOverColumn(null); setDraggedOrderId(null);
    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId || !store) return;
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    // Drag to paid → show confirmation modal
    if (order.status === "pending" && targetColumn === "paid") requestMarkPaid([order]);
  };

  // ─── Kanban card ───────────────────────────────────────────────────────────
  const renderKanbanCard = (order: QSOrder, borderColor: string, actions: React.ReactNode, footer?: React.ReactNode, draggable = false) => {
    const isMatch = searchQuery.trim() && (order.order_code.toUpperCase().includes(searchQuery.toUpperCase().trim()) || order.customer_name.toUpperCase().includes(searchQuery.toUpperCase().trim()));
    return (
      <div key={order.id} draggable={draggable} onDragStart={draggable ? (e) => handleDragStart(e, order.id) : undefined}
        className={`rounded-lg border shadow-sm p-3.5 transition-all hover:shadow-lg hover:border-gray-300 ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${draggedOrderId === order.id ? "opacity-50 scale-95" : ""} ${isMatch ? "shadow-xl shadow-indigo-200/50 scale-[1.02] bg-white" : `bg-white ${borderColor}`}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[15px] font-bold">{order.order_code}</span>
          {actions}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1.5"><User className="h-3.5 w-3.5" /><span className="truncate">{order.customer_name}</span></div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"><Phone className="h-3 w-3" /><span>{order.customer_phone}</span></div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">{order.show_pricing && order.calculated_price ? formatPrice(order.calculated_price, order.currency) : `${Math.round(order.total_area_sq_inches)} sq.in`}</span>
          <span className="text-muted-foreground">{order.sheet_count} sheet{order.sheet_count > 1 ? "s" : ""}</span>
        </div>
        {footer}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (!store) return <div className="p-6 text-center text-gray-500">Please complete store setup first</div>;
  if (isLoading) return <div className="space-y-6"><StatsCardsSkeleton count={5} /><KanbanSkeleton columns={4} /></div>;

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card><CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-1">Period:</span>
            {["today", "week", "7days", "month", "30days", "all"].map((preset) => {
              const labels: Record<string, string> = { today: "Today", week: "This Week", "7days": "Last 7 Days", month: "This Month", "30days": "Last 30 Days", all: "All Time" };
              const isActive = activePreset === preset;
              return <Button key={preset} variant={isActive ? "default" : "outline"} size="sm" className={`text-xs ${isActive ? "bg-indigo-600 hover:bg-indigo-700" : ""}`} onClick={() => setDatePreset(preset)}>{labels[preset]}</Button>;
            })}
          </div>
          <div className="flex items-center gap-2">
            <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={`text-xs gap-1.5 ${dateFrom ? "border-indigo-300 text-indigo-700" : ""}`}><CalendarIcon className="h-3.5 w-3.5" />{dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={dateFrom} onSelect={handleCustomDateFrom} initialFocus /></PopoverContent></Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className={`text-xs gap-1.5 ${dateTo ? "border-indigo-300 text-indigo-700" : ""}`}><CalendarIcon className="h-3.5 w-3.5" />{dateTo ? format(dateTo, "MMM d, yyyy") : "To"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={dateTo} onSelect={handleCustomDateTo} initialFocus /></PopoverContent></Popover>
            {hasDateFilter && <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setDatePreset("all")}>Clear</Button>}
          </div>
        </div>
      </CardContent></Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4 pb-4"><div className="text-2xl font-heading font-bold">{filteredStats.total}</div><p className="text-xs text-muted-foreground">Total Orders</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-2xl font-heading font-bold text-amber-600">{filteredStats.pending}</div><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-2xl font-heading font-bold text-green-600">{filteredStats.paid}</div><p className="text-xs text-muted-foreground">Paid</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4"><div className="text-2xl font-heading font-bold text-blue-600">{filteredStats.downloaded}</div><p className="text-xs text-muted-foreground">Downloaded</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div><div className="text-2xl font-heading font-bold text-red-600">{filteredStats.expired}</div><p className="text-xs text-muted-foreground">Expired</p></div>
            {filteredStats.expired > 0 && <Button variant="ghost" size="sm" className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2" onClick={handleClearExpired} disabled={isProcessing}><Trash2 className="h-3 w-3 mr-1" />Clear</Button>}
          </div>
        </CardContent></Card>
      </div>

      {/* Orders Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Package className="h-5 w-5 text-indigo-600" /><CardTitle className="text-xl">Customer Orders</CardTitle></div>
            <div className="flex items-center gap-3">
              {viewMode === "table" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px] h-10"><SelectValue placeholder="Filter status" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Orders</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="downloaded">Downloaded</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                </Select>
              )}
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleRefresh}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex justify-center mt-2"><div className="relative w-[70%]"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input type="text" placeholder="Search by Order Code, Customer Name, or Phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11 w-full border-2 border-indigo-200 focus:border-indigo-400 rounded-lg shadow-sm" /></div></div>
          <div className="flex items-center justify-center pt-3">
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button onClick={() => setViewMode("kanban")} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${viewMode === "kanban" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><LayoutGrid className="h-4 w-4" />Kanban View</button>
              <button onClick={() => setViewMode("table")} className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all ${viewMode === "table" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><List className="h-4 w-4" />Table View</button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <CardDescription className="text-sm">{viewMode === "kanban" ? "Drag orders from Pending to Paid, then download" : "Manage customer orders from your Quick Store"}</CardDescription>
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Times shown in {getTimezoneAbbreviation()}</span>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No orders found</p></div>
          ) : viewMode === "kanban" ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* ── Pending Column ── */}
              <div className={`rounded-xl border transition-colors ${dragOverColumn === "pending" ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-200/60"}`} style={{ background: "linear-gradient(180deg, #fffdf5 0%, #fef9e1 50%, #fefce8 100%)" }} onDragOver={(e) => handleDragOver(e, "pending")} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "pending")}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-amber-200/60"><div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="font-bold text-base text-amber-900">Pending</span></div><Badge variant="outline" className="text-amber-700 border-amber-300 bg-white/60 text-sm px-2.5">{kanbanColumns.pending.length}</Badge></div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.pending.map((order) => renderKanbanCard(order, "border-amber-100",
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => requestMarkPaid([order])} disabled={isProcessing}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>,
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-amber-100 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                      <span className="text-amber-600 font-semibold">{formatTimeRemaining(order.expires_at)}</span>
                    </div>, true
                  ))}
                  {kanbanColumns.pending.length === 0 && <div className="text-center py-10 text-amber-600/60 text-sm font-medium">No pending orders</div>}
                </div>
              </div>

              {/* ── Paid Column ── */}
              <div className={`rounded-xl border transition-colors ${dragOverColumn === "paid" ? "border-green-400 ring-2 ring-green-200" : "border-green-200/60"}`} style={{ background: "linear-gradient(180deg, #f5fcf5 0%, #e8f8ec 50%, #f0fdf4 100%)" }} onDragOver={(e) => handleDragOver(e, "paid")} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, "paid")}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-green-200/60"><div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="font-bold text-base text-green-900">Paid</span></div><Badge variant="outline" className="text-green-700 border-green-300 bg-white/60 text-sm px-2.5">{kanbanColumns.paid.length}</Badge></div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.paid.map((order) => renderKanbanCard(order, "border-green-100",
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(order)}><FileDown className="h-4 w-4 mr-2" />Download Files</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>,
                    <Button size="sm" variant="outline" className="w-full mt-3 text-green-700 border-green-300 hover:bg-green-50 font-medium" onClick={() => handleDownload(order)}><FileDown className="h-4 w-4 mr-1.5" />Download</Button>
                  ))}
                  {kanbanColumns.paid.length === 0 && <div className="text-center py-10 text-green-600/60 text-sm font-medium">{kanbanColumns.pending.length > 0 ? "Drag pending orders here to mark as paid" : "No paid orders"}</div>}
                </div>
              </div>

              {/* ── Downloaded Column ── */}
              <div className="rounded-xl border border-blue-200/60" style={{ background: "linear-gradient(180deg, #f5f9ff 0%, #e8f1fc 50%, #eff6ff 100%)" }}>
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-blue-200/60"><div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="font-bold text-base text-blue-900">Downloaded</span></div><Badge variant="outline" className="text-blue-700 border-blue-300 bg-white/60 text-sm px-2.5">{kanbanColumns.downloaded.length}</Badge></div>
                <div className="p-3.5 space-y-2.5">
                  {kanbanColumns.downloaded.map((order) => renderKanbanCard(order, "border-blue-100",
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(order)}><FileDown className="h-4 w-4 mr-2" />Download Again</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>,
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-blue-100 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1 text-blue-600 font-semibold"><CheckCircle className="h-3.5 w-3.5" />Done</span>
                    </div>
                  ))}
                  {kanbanColumns.downloaded.length === 0 && <div className="text-center py-10 text-blue-600/60 text-sm font-medium">No downloaded orders</div>}
                </div>
              </div>
            </div>
            {kanbanColumns.expired.length > 0 && <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground px-1"><XCircle className="h-4 w-4 text-red-400" /><span>{kanbanColumns.expired.length} expired order{kanbanColumns.expired.length > 1 ? "s" : ""} hidden — switch to table view to see them</span></div>}
            </>
          ) : (
            /* ═══ TABLE VIEW ═══ */
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 ? <span className="font-medium text-indigo-700">{selectedIds.size} order{selectedIds.size > 1 ? "s" : ""} selected<button onClick={() => setSelectedIds(new Set())} className="ml-2 text-xs underline text-indigo-500 hover:text-indigo-700">Clear</button></span> : <span>Select orders to perform bulk actions</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkDownload} disabled={isProcessing || selectedDownloadableCount === 0 || selectedPendingCount > 0}><FileDown className="h-4 w-4 mr-2" />Download Files{selectedDownloadableCount > 0 && selectedPendingCount === 0 ? ` (${selectedDownloadableCount})` : ""}</Button>
                  <Button size="sm" onClick={handleBulkMarkPaid} disabled={isProcessing || selectedPendingCount === 0} className="bg-indigo-600 hover:bg-indigo-700">
                    {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid{selectedPendingCount > 0 ? ` (${selectedPendingCount})` : ""}</>}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="w-[44px]"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} disabled={selectableOrders.length === 0} className="h-[18px] w-[18px] rounded-[3px]" /></TableHead>
                  <TableHead>Order Code</TableHead><TableHead>Customer</TableHead><TableHead>Status</TableHead><TableHead>Price / Area</TableHead><TableHead>Sheets</TableHead><TableHead>Created</TableHead><TableHead>Expires</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const isExp = isExpired(order);
                    const config = isExp ? STATUS_CONFIG.expired : (STATUS_CONFIG[order.status] || STATUS_CONFIG.pending);
                    const StatusIcon = config.icon;
                    const isPending = order.status === "pending" && !isExp;
                    return (
                      <TableRow key={order.id} className={selectedIds.has(order.id) ? "bg-indigo-50" : ""}>
                        <TableCell>{!isExp ? <Checkbox checked={selectedIds.has(order.id)} onCheckedChange={() => toggleSelect(order.id)} className="h-[18px] w-[18px] rounded-[3px]" /> : null}</TableCell>
                        <TableCell className="font-mono font-medium">{order.order_code}</TableCell>
                        <TableCell><div><div className="font-medium text-sm">{order.customer_name}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{order.customer_phone}</div></div></TableCell>
                        <TableCell><Badge variant={config.variant} className={`gap-1 ${config.badgeClass}`}><StatusIcon className="h-3 w-3" />{config.label}</Badge></TableCell>
                        <TableCell>{order.show_pricing && order.calculated_price ? formatPrice(order.calculated_price, order.currency) : `${Math.round(order.total_area_sq_inches)} sq.in`}</TableCell>
                        <TableCell>{order.sheet_count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground cursor-help" title={format(new Date(order.created_at), "PPP p")}>{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>{isExp ? <span className="text-sm text-red-600">Expired</span> : <span className={`text-sm ${isPending ? "text-amber-600" : "text-muted-foreground"}`}>{formatTimeRemaining(order.expires_at)}</span>}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewOrder(order)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                              {(order.status === "paid" || order.status === "downloaded") && !isExp && <DropdownMenuItem onClick={() => handleDownload(order)}><FileDown className="h-4 w-4 mr-2" />Download Files</DropdownMenuItem>}
                              {isPending && <DropdownMenuItem onClick={() => requestMarkPaid([order])} disabled={isProcessing}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrder(order); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent></DropdownMenu>
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

      {/* ═══ VIEW DETAILS DIALOG ═══ */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>Order Code: {selectedOrder?.order_code}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (() => {
            const isExp = isExpired(selectedOrder);
            const effectiveStatus = isExp ? "expired" : selectedOrder.status;
            return (
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                {/* Status & Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {(() => { const c = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.pending; return <Badge variant={c.variant} className={`mt-1 ${c.badgeClass}`}>{c.label}</Badge>; })()}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-medium">{selectedOrder.show_pricing && selectedOrder.calculated_price ? formatPrice(selectedOrder.calculated_price, selectedOrder.currency) : `${Math.round(selectedOrder.total_area_sq_inches)} sq.in`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{selectedOrder.customer_phone}</p>
                  </div>
                  {selectedOrder.customer_email && <div className="col-span-2"><p className="text-sm text-muted-foreground">Email</p><p className="text-sm">{selectedOrder.customer_email}</p></div>}
                  <div><p className="text-sm text-muted-foreground">Created</p><p className="text-sm">{formatDate(selectedOrder.created_at)}</p></div>
                  {selectedOrder.paid_at && <div><p className="text-sm text-muted-foreground">Marked Paid</p><p className="text-sm">{formatDate(selectedOrder.paid_at)}</p></div>}
                  {selectedOrder.downloaded_at && <div><p className="text-sm text-muted-foreground">Downloaded</p><p className="text-sm">{formatDate(selectedOrder.downloaded_at)}</p></div>}
                </div>

                {selectedOrder.customer_notes && <div className="p-3 bg-gray-50 rounded-lg"><p className="text-sm font-medium text-gray-700 mb-1">Customer Notes:</p><p className="text-sm text-gray-600">{selectedOrder.customer_notes}</p></div>}

                {/* Auto-Delete Info */}
                <div className={`rounded-lg border p-4 ${effectiveStatus === "pending" ? "bg-amber-50 border-amber-200" : isExp ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-start gap-3">
                    <Clock className={`h-5 w-5 mt-0.5 ${effectiveStatus === "pending" ? "text-amber-600" : isExp ? "text-red-600" : "text-gray-500"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Auto-Delete</p>
                      <p className="text-sm text-gray-600 mt-0.5">{formatDate(selectedOrder.expires_at)}</p>
                      <p className={`text-sm font-medium mt-1 ${isExp ? "text-red-600" : effectiveStatus === "pending" ? "text-amber-600" : "text-gray-600"}`}>{isExp ? "Expired" : `${formatTimeRemaining(selectedOrder.expires_at)} remaining`}</p>
                      {effectiveStatus === "pending" && !isExp && <p className="text-xs text-amber-700 mt-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Mark as paid to extend retention by 10 days</p>}
                    </div>
                  </div>
                </div>

                {/* Sheet Previews */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sheet Previews ({selectedOrder.sheet_count} sheet{selectedOrder.sheet_count > 1 ? "s" : ""})
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.sheets.map((sheet, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden bg-gray-50">
                        {sheet.preview_url ? (
                          <img src={sheet.preview_url} alt={`Sheet ${sheet.sheet_number}`} className="w-full h-auto" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center text-muted-foreground text-sm">No preview</div>
                        )}
                        <div className="p-2 text-xs text-center text-muted-foreground">Sheet {sheet.sheet_number}</div>
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
                        <span>{Math.round(sheet.area_sq_inches)} sq.in</span>
                        {selectedOrder.show_pricing && selectedOrder.calculated_price ? <span>{formatPrice(Math.round(selectedOrder.calculated_price / selectedOrder.sheet_count), selectedOrder.currency)}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            {selectedOrder && (selectedOrder.status === "paid" || selectedOrder.status === "downloaded") && !isExpired(selectedOrder) && (
              <Button onClick={() => { setIsViewDialogOpen(false); handleDownload(selectedOrder); }}><FileDown className="h-4 w-4 mr-2" />Download Files</Button>
            )}
            {selectedOrder && selectedOrder.status === "pending" && !isExpired(selectedOrder) && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setIsViewDialogOpen(false); requestMarkPaid([selectedOrder]); }}><CheckCircle className="h-4 w-4 mr-2" />Mark as Paid</Button>
            )}
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MARK AS PAID CONFIRMATION DIALOG ═══ */}
      <Dialog open={isPaidConfirmOpen} onOpenChange={setIsPaidConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Mark as Paid</DialogTitle>
            <DialogDescription>
              {paidConfirmOrders.length === 1
                ? `Review the credit deduction for ${paidConfirmOrders[0]?.order_code}.`
                : `Review the credit deduction for ${paidConfirmOrders.length} orders.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {paidConfirmOrders.length === 1 && paidConfirmOrders[0] && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Sheet dimensions:</p>
                <p className="text-2xl font-heading font-bold">{paidConfirmOrders[0].sheets[0]?.width_inches}" × {Number(paidConfirmOrders[0].sheets[0]?.height_inches || 0).toFixed(2)}"</p>
                {paidConfirmOrders[0].sheet_count > 1 && <p className="text-sm text-gray-500 mt-1">({paidConfirmOrders[0].sheet_count} sheets total)</p>}
              </div>
            )}
            {paidConfirmOrders.length > 1 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-2">Orders to mark as paid:</p>
                {paidConfirmOrders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm py-1">
                    <span className="font-mono">{o.order_code}</span>
                    <span>{Math.round(o.total_area_sq_inches)} sq.in</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="text-sm mb-3">This will deduct <span className="font-bold">{Math.round(paidConfirmTotalArea).toLocaleString()} sq.inches</span> from your credits.</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Your current balance:</span><span className="font-semibold">{credits.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.in</span></div>
                <Separator />
                <div className="flex justify-between"><span className="text-gray-600">After deduction:</span><span className={`font-semibold ${paidConfirmBalanceAfter < 0 ? "text-red-600" : "text-indigo-600"}`}>{paidConfirmBalanceAfter.toLocaleString(undefined, { maximumFractionDigits: 2 })} sq.in</span></div>
              </div>
            </div>
            {paidConfirmBalanceAfter < 500 && paidConfirmBalanceAfter >= 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg"><AlertTriangle className="h-4 w-4 flex-shrink-0" /><p className="text-sm">Your balance will be low after this deduction.</p></div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPaidConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmMarkPaid} disabled={!paidConfirmHasCredits || isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Confirm & Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ DELETE DIALOG ═══ */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>Delete Order</DialogTitle><DialogDescription>Are you sure you want to delete order {selectedOrder?.order_code}? This will permanently delete the design files and cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isProcessing}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>{isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete Order"}</Button>
        </DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default QSOrders;
