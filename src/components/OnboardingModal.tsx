import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { updateProfile, COUNTRIES, CURRENCIES } from "@/services/settingsService";
import {
  Loader2,
  Building2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OnboardingModal — renders as a full-screen overlay when
 * profile.onboarding_completed is false.
 * 
 * Collects: Business Name, Country, Currency
 * Then sets onboarding_completed = true.
 */
export const OnboardingModal = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0); // 0 = welcome, 1 = form
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);

  // Auto-suggest currency based on country
  const handleCountryChange = (value: string) => {
    setCountry(value);
    const countryToCurrency: Record<string, string> = {
      "United States": "USD",
      "Canada": "CAD",
      "United Kingdom": "GBP",
      "Australia": "AUD",
      "India": "INR",
      "Germany": "EUR",
      "France": "EUR",
      "Italy": "EUR",
      "Spain": "EUR",
      "Netherlands": "EUR",
      "Belgium": "EUR",
      "Austria": "EUR",
      "Ireland": "EUR",
      "Portugal": "EUR",
      "Finland": "EUR",
      "Greece": "EUR",
      "Brazil": "BRL",
      "Mexico": "MXN",
      "Japan": "JPY",
      "South Korea": "KRW",
      "Singapore": "SGD",
      "United Arab Emirates": "AED",
      "South Africa": "ZAR",
      "New Zealand": "NZD",
      "Switzerland": "CHF",
      "Sweden": "SEK",
      "Poland": "PLN",
      "Turkey": "TRY",
      "Thailand": "THB",
      "Philippines": "PHP",
    };
    if (countryToCurrency[value]) {
      setCurrency(countryToCurrency[value]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    if (!businessName.trim()) {
      toast({
        title: "Business name required",
        description: "Please enter your business name to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!country) {
      toast({
        title: "Country required",
        description: "Please select your country to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const result = await updateProfile(user.id, {
      business_name: businessName.trim(),
      country,
      currency,
      onboarding_completed: true,
    });

    if (result.success) {
      await refreshProfile();
      toast({
        title: "Welcome aboard!",
        description: "Your account is all set up.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save. Please try again.",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-gray-300";

  const selectClass =
    "w-full px-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white appearance-none cursor-pointer";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop — same gradient as auth pages */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0F0D2E 0%, #1E1B4B 40%, #312E81 70%, #4F46E5 100%)",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Decorative orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 -top-40 -right-40"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {step === 0 ? (
          /* ── Welcome Step ── */
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h1 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight">
              Welcome to DTF Layout!
            </h1>
            <p className="mt-3 text-gray-500 text-sm leading-relaxed">
              Let's set up your account in 30 seconds. We just need a few
              details about your business.
            </p>

            {profile?.full_name && (
              <p className="mt-4 text-sm text-indigo-600 font-medium">
                Hey {profile.full_name.split(" ")[0]}, let's get started.
              </p>
            )}

            <button
              onClick={() => setStep(1)}
              className="mt-8 w-full flex justify-center items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)]"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              }}
            >
              Let's go
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                20,000 sq.in free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                No credit card
              </span>
            </div>
          </div>
        ) : (
          /* ── Form Step ── */
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-gray-900 tracking-tight">
                  Business Details
                </h2>
                <p className="text-xs text-gray-400">
                  You can change these anytime in Settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Business Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Acme DTF Prints"
                  autoFocus
                />
              </div>

              {/* Country */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Country <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select your country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Default Currency
                </label>
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={selectClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-400">
                  Auto-selected based on country. Used as default across your
                  products.
                </p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={isSaving || !businessName.trim() || !country}
              className="mt-6 w-full flex justify-center items-center gap-2 py-3 px-6 rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => setStep(0)}
              className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mt-6">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              step === 0 ? "bg-white w-6" : "bg-white/30"
            )}
          />
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              step === 1 ? "bg-white w-6" : "bg-white/30"
            )}
          />
        </div>
      </div>
    </div>
  );
};
