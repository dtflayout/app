import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Store, Copy, Check, ExternalLink, Upload, X, Hash } from "lucide-react";
import { toast } from "sonner";
import { getPrinter, savePrinter, Printer } from "@/services/printerService";
import { uploadToR2 } from "@/lib/r2Client";
import { FormSkeleton } from "@/components/Skeletons";
import { WISetupWizard } from "@/components/setup-wizard/WISetupWizard";

// Currency options
const CURRENCY_OPTIONS = [
  { value: "USD", label: "$ USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "€ EUR - Euro", symbol: "€" },
  { value: "GBP", label: "£ GBP - British Pound", symbol: "£" },
  { value: "INR", label: "₹ INR - Indian Rupee", symbol: "₹" },
  { value: "CAD", label: "CA$ CAD - Canadian Dollar", symbol: "CA$" },
  { value: "AUD", label: "A$ AUD - Australian Dollar", symbol: "A$" },
  { value: "JPY", label: "¥ JPY - Japanese Yen", symbol: "¥" },
  { value: "CNY", label: "CN¥ CNY - Chinese Yuan", symbol: "CN¥" },
  { value: "MXN", label: "MX$ MXN - Mexican Peso", symbol: "MX$" },
  { value: "BRL", label: "R$ BRL - Brazilian Real", symbol: "R$" },
  { value: "AED", label: "AED - UAE Dirham", symbol: "AED" },
  { value: "SGD", label: "S$ SGD - Singapore Dollar", symbol: "S$" },
  { value: "NZD", label: "NZ$ NZD - New Zealand Dollar", symbol: "NZ$" },
  { value: "CHF", label: "CHF - Swiss Franc", symbol: "CHF" },
  { value: "ZAR", label: "R ZAR - South African Rand", symbol: "R" },
];

let _storeSetupLoaded = false;

const StoreSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!_storeSetupLoaded);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Form State
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const builderUrl = slug ? `builder.dtflayout.com/${slug}` : "builder.dtflayout.com/your-store-name";

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      if (!_storeSetupLoaded) setIsLoading(true);
      try {
        const result = await getPrinter(user.id);
        if (result.success && result.data) {
          const printerData = result.data;
          // Show wizard if setup not completed
          if (!printerData.setup_completed) {
            setShowWizard(true);
            setIsLoading(false);
            _storeSetupLoaded = true;
            return;
          }
          setPrinter(printerData);
          setStoreName(printerData.store_name || "");
          setStoreUrl(printerData.store_url || "");
          setSlug(printerData.slug || "");
          setCurrency(printerData.currency || "USD");
          setLogoUrl(printerData.logo_url || null);
        } else {
          // No printer exists — show wizard for first-time setup
          setShowWizard(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (!_storeSetupLoaded) toast.error("Failed to load store data");
      } finally {
        _storeSetupLoaded = true;
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Handle logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Upload logo to R2
  // Uses store_id for organized storage paths: {store_id}/logo.{ext}
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user?.id) return logoUrl; // Return existing URL if no new file

    // If we don't have a printer with store_id yet, use user_id temporarily
    const storageId = printer?.store_id || user.id;

    setIsUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${storageId}/logo-${Date.now()}.${fileExt}`;

      const result = await uploadToR2("printer-assets", filePath, logoFile, logoFile.type || "image/png");

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      return result.publicUrl || null;
    } catch (err: any) {
      console.error("Logo upload error:", err);
      toast.error("Failed to upload logo: " + err.message);
      return logoUrl; // Return existing URL on error
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoUrl(null);
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast.error("Please log in to save store setup");
      return;
    }

    if (!storeName.trim() || !storeUrl.trim() || !slug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate URL format
    if (!storeUrl.startsWith("http://") && !storeUrl.startsWith("https://")) {
      toast.error("Store URL must start with http:// or https://");
      return;
    }

    setIsSaving(true);
    try {
      // Upload logo first if a new file was selected
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        finalLogoUrl = await uploadLogo();
      }

      const result = await savePrinter(user.id, {
        storeName: storeName.trim(),
        storeUrl: storeUrl.trim(),
        slug: slug.trim(),
        currency: currency,
        logo_url: finalLogoUrl || undefined,
      });

      if (result.success && result.data) {
        setPrinter(result.data);
        setLogoUrl(result.data.logo_url);
        setLogoFile(null); // Clear the file after successful upload
        setLogoPreview(null);
        toast.success("Store setup saved successfully!");
      } else {
        toast.error(result.error || "Failed to save store setup");
      }
    } catch (error) {
      toast.error("Failed to save store setup");
      console.error("Error saving store:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`https://${builderUrl}`);
      setCopied(true);
      toast.success("Builder URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  if (isLoading) {
    return <FormSkeleton fields={5} />;
  }

  // Show setup wizard for first-time users or incomplete setup
  if (showWizard) {
    return (
      <WISetupWizard
        onComplete={() => {
          window.location.reload();
        }}
        onClose={() => navigate("/app")}
      />
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 2-column grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
              <CardDescription>Your store name and URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Store ID Display (only shown after printer is created) */}
              {printer?.store_id && (
                <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-indigo-600" />
                    <Label className="text-sm font-medium">Store ID</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-white border px-3 py-2 text-sm font-mono text-gray-700">
                      {printer.store_id}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        await navigator.clipboard.writeText(printer.store_id);
                        toast.success("Store ID copied!");
                      }}
                      title="Copy Store ID"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This unique identifier is used to organize your files. You may need this for support requests.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="store-name">Store Name</Label>
                <Input
                  id="store-name"
                  placeholder="e.g., Ninja Transfers"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed to your customers on the builder page
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-url">Store URL</Label>
                <Input
                  id="store-url"
                  type="url"
                  placeholder="e.g., https://ninjatransfers.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Your store URL where customers will be redirected for checkout
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    placeholder="e.g., ninjatransfers"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Currency for displaying prices
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Logo & Branding */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Logo & Branding</CardTitle>
              </div>
              <CardDescription>Your store logo for the public builder</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <div className="flex items-center gap-4">
                  {(logoPreview || logoUrl) ? (
                    <div className="relative group">
                      <img
                        src={logoPreview || logoUrl || ""}
                        alt="Store logo"
                        className="h-16 w-auto max-w-[200px] object-contain border rounded bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-sm transition-colors"
                        title="Remove logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-colors">
                      <Upload className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload Logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                  {isUploadingLogo && (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This logo will appear on your public builder page. Max 5MB. Recommended: PNG with transparent background.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Builder URL */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-indigo-600" />
                <CardTitle className="text-lg">Builder URL</CardTitle>
              </div>
              <CardDescription>Share this URL with your customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-gray-50 p-4 space-y-2">
                <Label className="text-sm font-medium">Your Builder URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white border px-3 py-2 text-sm font-mono text-indigo-600">
                    https://{builderUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyUrl}
                    disabled={!slug}
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  {slug && printer && (
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                      title="Open URL"
                    >
                      <a href={`https://${builderUrl}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this URL with your customers or embed it on your website
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>{/* end 2-column grid */}

      {/* Save Button — full width below grid */}
      <div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : printer ? (
            "Update Store Setup"
          ) : (
            "Save Store Setup"
          )}
        </Button>
      </div>
    </div>
  );
};

export default StoreSetup;
