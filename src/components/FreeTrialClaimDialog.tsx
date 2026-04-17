import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { claimFreeTrial, UserInfo } from "@/services/paymentService";
import { Sparkles, Gift, X } from "lucide-react";

/**
 * Shows a dialog prompting the user to claim their free 20,000 sq.inch credits.
 * Displays when: user is logged in + onboarding is done + free trial not yet claimed.
 * Mount this in AppLayout.tsx alongside OnboardingModal.
 */
export function FreeTrialClaimDialog() {
  const { user, session, profile } = useAuth();
  const { freeTrialClaimed, refreshCredits } = useCredits();
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if: no user, onboarding not done, already claimed, or dismissed
  if (!user || !profile?.onboarding_completed || freeTrialClaimed || dismissed) {
    return null;
  }

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const userInfo: UserInfo = {
        email: user.email || "",
        name: profile?.business_name || user.email || "",
      };
      const result = await claimFreeTrial(userInfo, session?.access_token);
      if (result.success) {
        toast.success(`🎉 ${(result.credits_added ?? 20000).toLocaleString()} sq.inch credits added to your account!`);
        await refreshCredits();
      } else if (result.already_claimed) {
        toast.info("Free trial already claimed!");
        await refreshCredits();
      } else {
        toast.error(result.error || "Failed to claim free trial");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Top gradient banner */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 px-8 pt-10 pb-8 text-center overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-[-10px] left-[-10px] w-24 h-24 rounded-full bg-white/10 blur-lg" />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">
              Welcome! Claim Your Free Credits
            </h2>
            <p className="text-white/75 text-sm leading-relaxed">
              Start building gang sheets right away — on us.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Credit amount highlight */}
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5 mb-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Free Credits</span>
            </div>
            <div className="text-4xl font-extrabold text-emerald-600">20,000</div>
            <div className="text-sm text-emerald-600/70 font-medium mt-1">square inches</div>
          </div>

          {/* Benefits */}
          <div className="space-y-3 mb-6">
            {[
              "Enough to create several full gang sheets",
              "All editing tools included — trim, enhance, replace color & more",
              "Credits never expire — use at your own pace",
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#4F46E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm text-gray-600">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA button */}
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all
              bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
              shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30
              disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {claiming ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Claim 20,000 sq.inch Free
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            No credit card required. You can also claim later from the Pricing page.
          </p>
        </div>
      </div>
    </div>
  );
}
