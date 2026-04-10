import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import {
  User,
  Building2,
  Globe,
  Store,
  Lock,
  Trash2,
  Save,
  Loader2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  ExternalLink,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProfile,
  updateProfile,
  changePassword,
  getConnectedStores,
  requestAccountDeletion,
  COUNTRIES,
  CURRENCIES,
  PHONE_CODES,
  type ProfileSettings,
} from "@/services/settingsService";

// ─── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({
  icon,
  title,
  description,
  children,
  variant = "default",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) => (
  <div
    className={cn(
      "rounded-2xl border transition-all",
      variant === "danger"
        ? "border-red-200 bg-white"
        : "border-gray-200/80 bg-white"
    )}
  >
    <div
      className={cn(
        "flex items-start gap-4 px-6 py-5 border-b",
        variant === "danger" ? "border-red-100" : "border-gray-100"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          variant === "danger"
            ? "bg-red-50 text-red-500"
            : "bg-indigo-50 text-indigo-600"
        )}
      >
        {icon}
      </div>
      <div>
        <h2
          className={cn(
            "font-heading text-lg font-bold tracking-tight",
            variant === "danger" ? "text-red-900" : "text-gray-900"
          )}
        >
          {title}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

// ─── Form Field ────────────────────────────────────────────────────────────────

const FormField = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-gray-300";

const selectClass =
  "w-full px-4 py-2.5 border border-gray-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white appearance-none cursor-pointer";

// ─── Main Component ────────────────────────────────────────────────────────────

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Profile state
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [phoneCode, setPhoneCode] = useState("+1");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Connected stores
  const [connectedStores, setConnectedStores] = useState<{
    websiteIntegration: any;
    quickStore: any;
  } | null>(null);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Load profile ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);

      const [profileRes, storesRes] = await Promise.all([
        getProfile(user.id),
        getConnectedStores(user.id),
      ]);

      if (profileRes.success && profileRes.data) {
        const p = profileRes.data;
        setProfile(p);
        setFullName(p.full_name || "");
        setBusinessName(p.business_name || "");
        setCountry(p.country || "");
        setCurrency(p.currency || "USD");

        if (p.phone) {
          const parts = p.phone.match(/^(\+\d{1,4})\s?(.*)$/);
          if (parts) {
            setPhoneCode(parts[1]);
            setPhoneNumber(parts[2]);
          } else {
            setPhoneNumber(p.phone);
          }
        }
      }

      if (storesRes.success && storesRes.data) {
        setConnectedStores(storesRes.data);
      }

      setIsLoading(false);
    };

    load();
  }, [user]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    const phoneStr = phoneNumber ? `${phoneCode} ${phoneNumber}` : null;
    const changed =
      fullName !== (profile.full_name || "") ||
      businessName !== (profile.business_name || "") ||
      country !== (profile.country || "") ||
      currency !== (profile.currency || "USD") ||
      phoneStr !== profile.phone;
    setHasChanges(changed);
  }, [fullName, businessName, country, currency, phoneCode, phoneNumber, profile]);

  // ─── Save profile ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !hasChanges) return;
    setIsSaving(true);

    const phoneStr = phoneNumber.trim()
      ? `${phoneCode} ${phoneNumber.trim()}`
      : null;

    const result = await updateProfile(user.id, {
      full_name: fullName.trim() || undefined,
      business_name: businessName.trim() || undefined,
      country: country || undefined,
      currency,
      phone: phoneStr || undefined,
    });

    if (result.success && result.data) {
      setProfile(result.data);
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Your profile has been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save settings",
        variant: "destructive",
      });
    }

    setIsSaving(false);
  };

  // ─── Change password ──────────────────────────────────────────────────────

  const handlePasswordChange = async () => {
    if (!user?.email) return;

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "New password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    const result = await changePassword(user.email, currentPassword, newPassword);

    if (result.success) {
      toast({
        title: "Password changed",
        description: "Your password has been updated.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to change password",
        variant: "destructive",
      });
    }

    setIsChangingPassword(false);
  };

  // ─── Delete account ────────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmText !== "DELETE") return;
    setIsDeleting(true);

    const result = await requestAccountDeletion(user.id);

    if (result.success) {
      toast({
        title: "Account deleted",
        description: "Your account has been scheduled for deletion.",
      });
      navigate("/");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete account",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  };

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 bg-white border border-gray-200/80 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const isGoogleUser = user?.app_metadata?.provider === "google";

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 tracking-tight">
            Settings
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your account, business details, and preferences.
          </p>
        </div>

        {/* ━━━ 2-Column Grid ━━━ */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Profile Section */}
            <SectionCard
              icon={<User className="w-5 h-5" />}
              title="Profile"
              description="Your personal information"
            >
              <div className="space-y-4">
                <FormField label="Full Name">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass}
                    placeholder="John Doe"
                  />
                </FormField>

                <FormField label="Email" hint="Email cannot be changed">
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className={cn(inputClass, "bg-gray-50 text-gray-500 cursor-not-allowed")}
                  />
                </FormField>

                <FormField label="Phone Number">
                  <div className="flex gap-2">
                    <div className="relative w-[220px] flex-shrink-0">
                      <select
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        className={cn(selectClass, "w-full pr-8")}
                      >
                        {PHONE_CODES.map((pc) => (
                          <option key={`${pc.code}-${pc.country}`} value={pc.code}>
                            {pc.country} ({pc.code})
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      className={inputClass}
                      maxLength={15}
                    />
                  </div>
                </FormField>

                {/* Password Change */}
                {!isGoogleUser && (
                  <div className="pt-2">
                    {!showPasswordSection ? (
                      <button
                        onClick={() => setShowPasswordSection(true)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        Change password
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">Change Password</p>
                          <button
                            onClick={() => {
                              setShowPasswordSection(false);
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showCurrentPw ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={inputClass}
                            placeholder="Current password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            type={showNewPw ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClass}
                            placeholder="New password (min 6 characters)"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPw(!showNewPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputClass}
                          placeholder="Confirm new password"
                        />

                        <button
                          onClick={handlePasswordChange}
                          disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              Update Password
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isGoogleUser && (
                  <p className="text-xs text-gray-400 pt-2">
                    Signed in with Google — password managed by Google.
                  </p>
                )}
              </div>
            </SectionCard>

            {/* Danger Zone */}
            <SectionCard
              icon={<AlertTriangle className="w-5 h-5" />}
              title="Danger Zone"
              description="Irreversible actions"
              variant="danger"
            >
              <div>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete my account
                  </button>
                ) : (
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">This action is permanent</p>
                        <p className="text-sm text-red-700 mt-1">
                          All your data, credits, store configurations, and order history will be permanently deleted.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-red-800 mb-1.5">
                        Type <span className="font-mono font-bold">DELETE</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full px-4 py-2.5 border border-red-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all placeholder:text-red-300"
                        placeholder="DELETE"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== "DELETE" || isDeleting}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete permanently
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Business Section */}
            <SectionCard
              icon={<Building2 className="w-5 h-5" />}
              title="Business"
              description="Your company details and defaults"
            >
              <div className="space-y-4">
                <FormField label="Business Name" hint="Your DTF printing business name">
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={inputClass}
                    placeholder="Acme DTF Prints"
                  />
                </FormField>

                <FormField label="Country">
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </FormField>

                <FormField label="Default Currency" hint="Used as default across products">
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
                </FormField>
              </div>
            </SectionCard>

            {/* Connected Stores */}
            <SectionCard
              icon={<Globe className="w-5 h-5" />}
              title="Connected Stores"
              description="Your Website Integration and Quick Store setups"
            >
              <div className="space-y-3">
                {/* Website Integration */}
                <div
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors",
                    connectedStores?.websiteIntegration
                      ? "border-green-200 bg-green-50/50 hover:bg-green-50"
                      : "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        connectedStores?.websiteIntegration
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Website Integration</p>
                      {connectedStores?.websiteIntegration ? (
                        <p className="text-xs text-gray-500">
                          {connectedStores.websiteIntegration.store_name} · {connectedStores.websiteIntegration.product_count} product{connectedStores.websiteIntegration.product_count !== 1 ? "s" : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Not set up yet</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/app/website-integration")}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {connectedStores?.websiteIntegration ? "Manage" : "Set up"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Store */}
                <div
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors",
                    connectedStores?.quickStore
                      ? "border-green-200 bg-green-50/50 hover:bg-green-50"
                      : "border-gray-100 bg-gray-50/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        connectedStores?.quickStore
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Quick Store</p>
                      {connectedStores?.quickStore ? (
                        <p className="text-xs text-gray-500">
                          {connectedStores.quickStore.store_name} · {connectedStores.quickStore.product_count} product{connectedStores.quickStore.product_count !== 1 ? "s" : ""}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">Not set up yet</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/app/quick-store")}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    {connectedStores?.quickStore ? "Manage" : "Set up"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>{/* end 2-column grid */}

        {/* ━━━ Sticky Save Bar ━━━ */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-20">
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
              <div className="mb-6 flex items-center justify-between gap-4 px-5 py-3.5 bg-indigo-900 rounded-2xl shadow-[0_8px_30px_rgba(30,27,75,0.3)] border border-indigo-700/50">
                <p className="text-sm text-indigo-200">You have unsaved changes</p>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Settings;
