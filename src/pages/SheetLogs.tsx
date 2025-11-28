import React, { useState, useEffect } from "react";
import { useOutseta } from "@/contexts/OutsetaContext";
import { getUserLogs, calculateUsageStats, UsageLogRecord } from "@/lib/usageLogger";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

export const SheetLogs = () => {
  const { user } = useOutseta();
  const [logs, setLogs] = useState<UsageLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const fetchLogs = async () => {
    if (!user?.Email) {
      console.error('No user email found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getUserLogs(user.Email);

    if (result.success && result.data) {
      setLogs(result.data);
      console.log(`Loaded ${result.data.length} logs for ${user.Email}`);
    } else {
      console.error('Failed to fetch logs:', result.error);
      toast.error('Failed to load history');
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.Email]);

  const stats = calculateUsageStats(logs);

  // Pagination
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = logs.slice(startIndex, endIndex);

  const handleRefresh = () => {
    toast.info('Refreshing logs...');
    fetchLogs();
  };

  return (
    <AppLayout>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Generation History</h1>
            <p className="text-gray-600">View your past sheet generations</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {logs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="text-sm font-medium text-blue-700 mb-1">
              Total Generations
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {stats.totalGenerations}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
            <div className="text-sm font-medium text-green-700 mb-1">
              Total Area Used
            </div>
            <div className="text-3xl font-bold text-green-900">
              {formatNumber(stats.totalSqInchesUsed)}
              <span className="text-base font-normal ml-1">sq.in</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
            <div className="text-sm font-medium text-purple-700 mb-1">
              Average Per Generation
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {formatNumber(stats.averagePerGeneration)}
              <span className="text-base font-normal ml-1">sq.in</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your generation history...</p>
        </div>
      ) : logs.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No history yet
          </h3>
          <p className="text-gray-600 mb-4">
            Your sheet generations will appear here once you create your first layout.
          </p>
          <Button onClick={() => window.location.href = '/app'}>
            Create Your First Sheet
          </Button>
        </div>
      ) : (
        /* Table */
        <>
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Sheet Size
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Area Used
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Credits Before → After
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Images
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatNumber(log.sheet_width)}" × {formatNumber(log.sheet_height)}"
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-blue-600">
                        {formatNumber(log.sq_inches_used)} sq.in
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className="text-gray-600">
                          {formatNumber(log.credits_before)}
                        </span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="text-green-600 font-medium">
                          {formatNumber(log.credits_after)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {log.image_count} {log.image_count === 1 ? 'image' : 'images'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {currentLogs.map((log, index) => (
                <div
                  key={log.id}
                  className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(log.created_at)}
                    </div>
                    <div className="text-sm font-medium text-blue-600">
                      {formatNumber(log.sq_inches_used)} sq.in
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sheet Size:</span>
                      <span className="text-gray-900">
                        {formatNumber(log.sheet_width)}" × {formatNumber(log.sheet_height)}"
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Credits:</span>
                      <span>
                        <span className="text-gray-600">
                          {formatNumber(log.credits_before)}
                        </span>
                        <span className="text-gray-400 mx-1">→</span>
                        <span className="text-green-600 font-medium">
                          {formatNumber(log.credits_after)}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Images:</span>
                      <span className="text-gray-900">
                        {log.image_count} {log.image_count === 1 ? 'image' : 'images'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, logs.length)} of {logs.length} generations
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      className="w-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </AppLayout>
  );
};

