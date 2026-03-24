import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw, CreditCard, PlusCircle,
  TrendingUp, TrendingDown, Wallet, Sparkles, Loader2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatNumber = (num: number): string =>
  Math.round(num).toLocaleString("en-IN");

const formatCompact = (num: number): string =>
  num >= 100000
    ? (num / 100000).toFixed(1) + "L"
    : num >= 1000
    ? (num / 1000).toFixed(1) + "K"
    : num.toFixed(0);

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  free_trial: { label: "Free Trial", icon: <Sparkles className="h-4 w-4" />, color: "text-purple-600 bg-purple-50" },
  recharge: { label: "Recharge", icon: <CreditCard className="h-4 w-4" />, color: "text-blue-600 bg-blue-50" },
  manual_adjustment: { label: "Adjustment", icon: <TrendingUp className="h-4 w-4" />, color: "text-gray-600 bg-gray-50" },
};

// credit_transactions row shape (recharges only)
interface CreditTransaction {
  id: string;
  user_id: string;
  email: string;
  type: string;
  plan_id: string | null;
  plan_name: string | null;
  amount: number;
  currency: string;
  credits_added: number;
  credits_before: number;
  credits_after: number;
  status: string;
  payment_id: string | null;
  description: string | null;
  created_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

let _billingLoaded = false;

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credits: currentBalance } = useCredits();

  const [ledger, setLedger] = useState<CreditTransaction[]>([]);
  const [summary, setSummary] = useState<{ totalCredits: number; totalDebits: number; byType: Record<string, number> } | null>(null);
  const [isLoading, setIsLoading] = useState(!_billingLoaded);

  const userId = user?.id || "";

  // ─── Data fetch ─────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!userId) { setIsLoading(false); return; }
    if (!_billingLoaded) setIsLoading(true);

    try {
      // Fetch recharge transactions from credit_transactions (where Dodo webhook logs)
      const { data: txData, error: txError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(200);

      if (txError) {
        console.error("Error loading billing data:", txError);
        setLedger([]);
        setSummary(null);
        return;
      }

      const transactions: CreditTransaction[] = txData || [];
      setLedger(transactions);

      // Build summary from transactions
      let totalCredits = 0;
      let totalDebits = 0;
      const byType: Record<string, number> = {};

      for (const tx of transactions) {
        const credits = tx.credits_added || 0;
        totalCredits += credits;

        const typeKey = tx.plan_id === 'free_trial' ? 'free_trial' : 'recharge';
        byType[typeKey] = (byType[typeKey] || 0) + credits;
      }

      // Also fetch usage deductions from credit_ledger for the "Total Used" summary
      const { data: usageData } = await supabase
        .from('credit_ledger')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'usage');

      if (usageData) {
        for (const entry of usageData) {
          if (entry.amount < 0) totalDebits += Math.abs(entry.amount);
        }
      }

      setSummary({ totalCredits, totalDebits, byType });
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      _billingLoaded = true;
      setIsLoading(false);
    }
  };

  useEffect(() => { if (userId) loadData(); }, [userId]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Billing & Credits</h1>
              <p className="text-sm text-muted-foreground">
                Manage your balance and recharges — for usage details, see{" "}
                <a href="/logs" className="text-indigo-600 hover:underline font-medium">History</a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate("/pricing")} className="bg-indigo-600 hover:bg-indigo-700">
              <PlusCircle className="mr-2 h-4 w-4" />
              Buy Credits
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white overflow-hidden">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                <p className="text-4xl font-bold text-indigo-400">
                  {formatNumber(currentBalance)}
                  <span className="text-lg font-normal text-gray-400 ml-2">sq.in</span>
                </p>
              </div>
              <Button
                onClick={() => navigate("/pricing")}
                variant="outline"
                className="text-white border-gray-600 hover:bg-gray-700 hover:text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Recharge Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Credits In</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{summary ? formatCompact(summary.totalCredits) : "0"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground">Total Used</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                −{summary ? formatCompact(summary.totalDebits) : "0"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Free Trial</span>
              </div>
              <div className="text-2xl font-bold">
                {summary?.byType?.free_trial ? formatCompact(summary.byType.free_trial) : "0"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">From Recharges</span>
              </div>
              <div className="text-2xl font-bold">
                {summary?.byType?.recharge ? formatCompact(summary.byType.recharge) : "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Activity */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Credit Activity</CardTitle>
              <CardDescription>Recharges, free trial, and bonus credits received</CardDescription>
            </CardHeader>
            <CardContent>
              {ledger.length === 0 ? (
                <div className="py-12 text-center">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">No credit activity yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Buy credits to get started</p>
                  <Button onClick={() => navigate("/pricing")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Buy Credits
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {ledger.map((entry) => {
                    const typeKey = entry.plan_id === 'free_trial' ? 'free_trial' : 'recharge';
                    const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.recharge;
                    const creditsAdded = entry.credits_added || 0;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 py-3.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          {config.icon}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{entry.plan_name || config.label}</span>
                            {entry.currency && entry.amount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                — {entry.currency === 'INR' ? '₹' : '$'}{entry.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</span>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-green-600">
                            +{formatNumber(creditsAdded)}
                            <span className="text-xs font-normal text-muted-foreground ml-1">sq.in</span>
                          </span>
                          <Tooltip>
                            <TooltipTrigger>
                              <p className="text-xs text-muted-foreground cursor-help">
                                Bal: {formatCompact(entry.credits_after || 0)}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              Balance after: {formatNumber(entry.credits_after || 0)} sq.in
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Billing;
