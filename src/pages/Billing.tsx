import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { RefreshCw, CreditCard, PlusCircle, IndianRupee, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";

interface PaymentLog {
  id: string;
  user_email: string;
  user_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string | null;
  plan_id: string;
  plan_name: string;
  amount_inr: number;
  credits_added: number;
  credits_before: number;
  credits_after: number;
  status: 'success' | 'failed' | 'pending';
  error_message: string | null;
  created_at: string;
}

interface PaymentStats {
  totalRecharges: number;
  totalAmountSpent: number;
  totalCreditsAdded: number;
}

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useOutseta();
  const { credits: creditsBalance } = useCredits();
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const fetchPayments = async () => {
    const userId = user?.Account?.Uid || user?.Uid;
    if (!userId) {
      console.error('No user ID found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('[Billing] Fetching payments for user_id:', userId);

    try {
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Billing] Error fetching payments:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        // Don't show error toast if table just doesn't exist or is empty
        if (error.code !== 'PGRST116') {
          toast.error('Failed to load payment history');
        }
        setPayments([]);
      } else {
        setPayments(data || []);
        console.log(`[Billing] Loaded ${data?.length || 0} payments for user`);
      }
    } catch (err: any) {
      console.error('[Billing] Exception fetching payments:', err?.message || err);
      toast.error('Failed to load payment history');
      setPayments([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  // Calculate stats (only for successful payments)
  const calculateStats = (): PaymentStats => {
    const successfulPayments = payments.filter(p => p.status === 'success');
    return {
      totalRecharges: successfulPayments.length,
      totalAmountSpent: successfulPayments.reduce((sum, p) => sum + p.amount_inr, 0),
      totalCreditsAdded: successfulPayments.reduce((sum, p) => sum + p.credits_added, 0),
    };
  };

  const stats = calculateStats();

  // Pagination
  const totalPages = Math.ceil(payments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = payments.slice(startIndex, endIndex);

  const handleRefresh = () => {
    toast.info('Refreshing payment history...');
    fetchPayments();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            Pending
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Billing & Payments</h1>
              <p className="text-gray-600">View your recharge history and manage credits</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Buy Credits
            </Button>
          </div>
        </div>

        {/* Current Balance Card */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm mb-1">Current Credit Balance</p>
              <p className="text-4xl font-bold text-emerald-400">
                {formatNumber(creditsBalance)}
                <span className="text-lg font-normal text-slate-400 ml-2">sq.inch</span>
              </p>
            </div>
            <Button
              onClick={() => navigate('/pricing')}
              variant="outline"
              className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Recharge Now
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {payments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="text-sm font-medium text-blue-700 mb-1">
                Total Recharges
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {stats.totalRecharges}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 border border-amber-200">
              <div className="text-sm font-medium text-amber-700 mb-1">
                Total Amount Spent
              </div>
              <div className="text-3xl font-bold text-amber-900 flex items-center">
                <IndianRupee className="w-6 h-6" />
                {formatNumber(stats.totalAmountSpent)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="text-sm font-medium text-green-700 mb-1">
                Total Credits Purchased
              </div>
              <div className="text-3xl font-bold text-green-900">
                {formatNumber(stats.totalCreditsAdded)}
                <span className="text-base font-normal ml-1">sq.in</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your payment history...</p>
          </div>
        ) : payments.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No recharges yet
            </h3>
            <p className="text-gray-600 mb-4">
              Buy credits to get started with creating print sheets.
            </p>
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Buy Credits
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
                        Plan
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Credits Added
                      </th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Payment ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentPayments.map((payment, index) => (
                      <tr
                        key={payment.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.plan_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          {payment.amount_inr === 0 ? (
                            <span className="text-green-600 font-medium">Free</span>
                          ) : (
                            <span className="text-gray-900 font-medium">
                              ₹{formatNumber(payment.amount_inr)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-emerald-600">
                          +{formatNumber(payment.credits_added)} sq.in
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {getStatusBadge(payment.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                          {payment.razorpay_payment_id.length > 20
                            ? `${payment.razorpay_payment_id.substring(0, 20)}...`
                            : payment.razorpay_payment_id
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {currentPayments.map((payment, index) => (
                  <div
                    key={payment.id}
                    className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.plan_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(payment.created_at)}
                        </div>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-medium text-gray-900">
                          {payment.amount_inr === 0 ? 'Free' : `₹${formatNumber(payment.amount_inr)}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credits Added:</span>
                        <span className="font-medium text-emerald-600">
                          +{formatNumber(payment.credits_added)} sq.in
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment ID:</span>
                        <span className="text-gray-500 font-mono text-xs">
                          {payment.razorpay_payment_id.length > 15
                            ? `${payment.razorpay_payment_id.substring(0, 15)}...`
                            : payment.razorpay_payment_id
                          }
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
                  Showing {startIndex + 1} to {Math.min(endIndex, payments.length)} of {payments.length} transactions
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
                          className="w-10"
                        >
                          {page}
                        </Button>
                      );
                    })}
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

export default Billing;
