/**
 * Reusable Skeleton Loading Components
 * 
 * Used across all app pages for consistent loading states.
 * Replaces spinner-based loading with layout-matching shimmer skeletons.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/* ─── Stats Cards Row ─────────────────────────────────────────────── */

export const StatsCardsSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-4" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/* ─── Balance Card (Billing) ──────────────────────────────────────── */

export const BalanceCardSkeleton = () => (
  <Card className="bg-gradient-dark text-white overflow-hidden border-indigo-500/20">
    <CardContent className="pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-3 w-24 mb-2 bg-white/10" />
          <Skeleton className="h-10 w-40 bg-white/10" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full bg-white/10" />
      </div>
    </CardContent>
  </Card>
);

/* ─── Table Rows ──────────────────────────────────────────────────── */

export const TableSkeleton = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-3 w-56 mt-1" />
    </CardHeader>
    <CardContent>
      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" style={{ maxWidth: i === 0 ? 160 : 100 }} />
        ))}
      </div>
      {/* Data rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className="h-4 flex-1"
                style={{
                  maxWidth: j === 0 ? 160 : j === cols - 1 ? 80 : 100,
                  opacity: 1 - i * 0.08,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

/* ─── Product Card Grid ───────────────────────────────────────────── */

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

/* ─── Kanban Board ────────────────────────────────────────────────── */

export const KanbanSkeleton = ({ columns = 4 }: { columns?: number }) => (
  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {Array.from({ length: columns }).map((_, col) => (
      <div key={col} className="rounded-xl border bg-gray-50/50 p-3">
        {/* Column header */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-6 rounded ml-auto" />
        </div>
        {/* Cards */}
        {Array.from({ length: 2 + (col % 2) }).map((_, row) => (
          <div key={row} className="bg-white rounded-lg border p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

/* ─── Messages List ───────────────────────────────────────────────── */

export const MessageListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Customer Detail ─────────────────────────────────────────────── */

export const CustomerDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-full" />
      <div>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
    <StatsCardsSkeleton count={4} />
    <TableSkeleton rows={4} cols={4} />
  </div>
);

/* ─── Order Detail ────────────────────────────────────────────────── */

export const OrderDetailSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Card><CardContent className="pt-4 pb-4"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-32" /></CardContent></Card>
      <Card><CardContent className="pt-4 pb-4"><Skeleton className="h-3 w-20 mb-2" /><Skeleton className="h-6 w-32" /></CardContent></Card>
    </div>
    <Card>
      <CardContent className="pt-4 pb-4">
        <Skeleton className="h-48 w-full rounded-lg" />
      </CardContent>
    </Card>
  </div>
);

/* ─── Form Fields ─────────────────────────────────────────────────── */

export const FormSkeleton = ({ fields = 5 }: { fields?: number }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i}>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <Skeleton className="h-10 w-32 rounded-full mt-4" />
  </div>
);

/* ─── Page Header ─────────────────────────────────────────────────── */

export const PageHeaderSkeleton = () => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-lg" />
      <div>
        <Skeleton className="h-6 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-9 w-24 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
  </div>
);

/* ─── Full Page (Layout-level) ────────────────────────────────────── */

export const FullPageSkeleton = () => (
  <div className="p-8 space-y-6">
    <PageHeaderSkeleton />
    <StatsCardsSkeleton count={4} />
    <TableSkeleton rows={5} cols={4} />
  </div>
);

/* ─── Analytics Stats ─────────────────────────────────────────────── */

export const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <StatsCardsSkeleton count={4} />
    <Card>
      <CardContent className="pt-6 pb-4">
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </CardContent>
    </Card>
  </div>
);
