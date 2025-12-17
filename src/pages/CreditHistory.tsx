import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOutseta } from "@/contexts/OutsetaContext";
import { useCredits } from "@/contexts/CreditsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Gift, CreditCard, Sparkles, FileText } from "lucide-react";
import { getCreditLedger, getCreditSummary, CreditLedgerEntry, CreditType } from "@/lib/creditLedgerService";

const CreditHistory = () => {
  const { user } = useOutseta();
  const { credits: currentBalance } = useCredits();
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const [summary, setSummary] = useState<{
    totalCredits: number;
    totalDebits: number;
    byType: Record<CreditType, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const userId = user?.Account?.Uid || user?.Uid || "";

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ledgerData, summaryData] = await Promise.all([
        getCreditLedger(userId, 100),
        getCreditSummary(userId),
      ]);
      setLedger(ledgerData);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error loading credit history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
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

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  const getTypeIcon = (type: CreditType) => {
    switch (type) {
      case 'free_trial':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'recharge':
        return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'referral_bonus':
        return <Gift className="h-4 w-4 text-green-500" />;
      case 'usage':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: CreditType): string => {
    switch (type) {
      case 'free_trial':
        return 'Free Trial';
      case 'recharge':
        return 'Recharge';
      case 'referral_bonus':
        return 'Referral Bonus';
      case 'usage':
        return 'Sheet Created';
      case 'manual_adjustment':
        return 'Adjustment';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Credit History</h1>
            <p className="text-muted-foreground mt-1">
              Complete breakdown of your credit balance
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Current Balance Card */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
          <CardContent className="pt-6">
            <p className="text-slate-300 text-sm mb-1">Current Balance</p>
            <p className="text-4xl font-bold text-emerald-400">
              {formatNumber(currentBalance)}
              <span className="text-lg font-normal text-slate-400 ml-2">sq.inch</span>
            </p>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                </div>
                <p className="text-xl font-bold text-green-600">+{formatNumber(summary.totalCredits)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-muted-foreground">Total Used</p>
                </div>
                <p className="text-xl font-bold text-red-600">-{formatNumber(summary.totalDebits)}</p>
              </CardContent>
            </Card>
            {summary.byType.recharge && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-muted-foreground">From Recharges</p>
                  </div>
                  <p className="text-xl font-bold">+{formatNumber(summary.byType.recharge)}</p>
                </CardContent>
              </Card>
            )}
            {summary.byType.referral_bonus && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">From Referrals</p>
                  </div>
                  <p className="text-xl font-bold">+{formatNumber(summary.byType.referral_bonus)}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All credit additions and deductions</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                      <th className="text-right py-3 px-2 font-medium text-muted-foreground">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-3 px-2 text-muted-foreground">
                          {formatDateTime(entry.created_at)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(entry.type)}
                            <span>{getTypeLabel(entry.type)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {entry.description || '-'}
                        </td>
                        <td className={`py-3 px-2 text-right font-medium ${
                          entry.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.amount > 0 ? '+' : ''}{formatNumber(entry.amount)} sq.in
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatNumber(entry.balance_after)} sq.in
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreditHistory;
