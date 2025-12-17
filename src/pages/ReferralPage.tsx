import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useOutseta } from "@/contexts/OutsetaContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Link, CheckCircle2, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getReferralStatus,
  createReferralCode,
  claimReferralBonus,
  ReferralStatus,
} from "@/lib/referralService";

const ReferralPage = () => {
  const { user } = useOutseta();

  const [status, setStatus] = useState<ReferralStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create code form
  const [newCode, setNewCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Claim bonus form
  const [claimCode, setClaimCode] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);

  const userId = user?.Account?.Uid || user?.Uid || "";
  const userEmail = user?.Email || "";

  useEffect(() => {
    if (userId) {
      loadReferralStatus();
    }
  }, [userId]);

  const loadReferralStatus = async () => {
    setIsLoading(true);
    try {
      const result = await getReferralStatus(userId);
      setStatus(result);
    } catch (error) {
      console.error("Error loading referral status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a referral code");
      return;
    }

    setIsCreating(true);
    try {
      const result = await createReferralCode(userId, userEmail, newCode);
      if (result.success) {
        toast.success("Code submitted! Your referral code is pending approval.");
        await loadReferralStatus();
        setNewCode("");
      } else {
        toast.error(result.error || "Failed to create code");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClaimBonus = async () => {
    if (!claimCode.trim()) {
      toast.error("Please enter a referral code");
      return;
    }

    setIsClaiming(true);
    try {
      const result = await claimReferralBonus(userId, userEmail, claimCode);
      if (result.success) {
        toast.success(`Bonus Claimed! 🎉 ${result.bonusAmount?.toLocaleString()} sq. inch added!`);
        await loadReferralStatus();
        setClaimCode("");
      } else {
        toast.error(result.error || "Failed to claim bonus");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsClaiming(false);
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

  const formatRupee = (amount: number): string => {
    return `Rs. ${amount.toLocaleString('en-IN')}`;
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
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Referral Program</h1>
          <p className="text-muted-foreground mt-1">
            Share with friends or claim your bonus
          </p>
        </div>

        {/* Create Referral Code Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Create Your Referral Code</CardTitle>
            </div>
            <CardDescription>
              Create a unique code to share with others
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!status?.hasCreatedCode && !status?.referralCode ? (
              // Show create form
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter your code (e.g., YOURNAME)"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="uppercase"
                    maxLength={30}
                  />
                  <Button onClick={handleCreateCode} disabled={isCreating}>
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use letters, numbers, and underscores. 3-30 characters.
                </p>
              </div>
            ) : status?.referralCode?.is_approved ? (
              // Show approved code with stats
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                  <code className="px-3 py-1 bg-muted rounded text-lg font-mono">
                    {status.referralCode.code}
                  </code>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Referrals</p>
                    <p className="text-2xl font-bold">{status.referralCode.total_referrals}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Recharge Value</p>
                    <p className="text-2xl font-bold">{formatRupee(status.referralCode.total_recharge_value || 0)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatRupee(status.referralCode.total_earnings || 0)}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Share your code with others. When they make a purchase and use your code, you earn commission!
                </p>
              </div>
            ) : (
              // Show pending approval
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Code pending approval
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your code <code className="font-mono">{status?.referralCode?.code}</code> is being reviewed. You'll be notified once approved.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral History Section - Only show if user has approved code with referrals */}
        {status?.referralCode?.is_approved && status.referralHistory && status.referralHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Referral History</CardTitle>
              </div>
              <CardDescription>
                Complete log of all referrals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">User</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Recharge Value</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.referralHistory.map((log, index) => (
                      <tr key={log.id || index} className="border-b last:border-0">
                        <td className="py-3 px-2 text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-3 px-2">{log.referred_email}</td>
                        <td className="py-3 px-2 text-right">
                          {formatRupee(log.recharge_value)}
                        </td>
                        <td className="py-3 px-2 text-right font-medium text-green-600">
                          {formatRupee(log.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Claim Referral Bonus Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Have a Referral Code?</CardTitle>
            </div>
            <CardDescription>
              Get 20% bonus sq. inch on your last recharge
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!status?.hasClaimed ? (
              // Show claim form
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter referral code"
                    value={claimCode}
                    onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                  <Button onClick={handleClaimBonus} disabled={isClaiming}>
                    {isClaiming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Claim Bonus"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the code shared with you to get 20% bonus credits on your last purchase.
                </p>
              </div>
            ) : (
              // Show already claimed with details
              <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Bonus already claimed!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Code used: <code className="font-mono">{status?.claimedCode}</code>
                  </p>
                  {status?.bonusAmountClaimed && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Bonus received: <span className="font-semibold">{status.bonusAmountClaimed.toLocaleString()} sq. inch</span>
                    </p>
                  )}
                  {status?.bonusClaimedAt && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Claimed on: {formatDateTime(status.bonusClaimedAt)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReferralPage;
