import React, { useState, useEffect, useCallback } from 'react';
import { SetupWizard, WizardStep } from '@/components/SetupWizard';
import { useAuth } from '@/contexts/AuthContext';
import { getPrinter, savePrinter, Printer } from '@/services/printerService';
import { uploadToR2 } from '@/lib/r2Client';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store, Upload, CheckCircle2, X, Copy, ExternalLink, Loader2 } from 'lucide-react';

const CURRENCY_OPTIONS = [
  { value: 'USD', label: '$ USD - US Dollar' },
  { value: 'EUR', label: '€ EUR - Euro' },
  { value: 'GBP', label: '£ GBP - British Pound' },
  { value: 'INR', label: '₹ INR - Indian Rupee' },
  { value: 'CAD', label: 'CA$ CAD - Canadian Dollar' },
  { value: 'AUD', label: 'A$ AUD - Australian Dollar' },
  { value: 'JPY', label: '¥ JPY - Japanese Yen' },
  { value: 'CNY', label: 'CN¥ CNY - Chinese Yuan' },
  { value: 'MXN', label: 'MX$ MXN - Mexican Peso' },
  { value: 'BRL', label: 'R$ BRL - Brazilian Real' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SGD', label: 'S$ SGD - Singapore Dollar' },
  { value: 'NZD', label: 'NZ$ NZD - New Zealand Dollar' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'ZAR', label: 'R ZAR - South African Rand' },
];

interface WISetupWizardProps {
  onComplete: (printer: Printer) => void;
  onClose: () => void;
}

export const WISetupWizard: React.FC<WISetupWizardProps> = ({ onComplete, onClose }) => {
  const { user, profile } = useAuth();

  // Printer record (created on step 1)
  const [printer, setPrinter] = useState<Printer | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  // Step 1: Store Identity
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [currency, setCurrency] = useState(profile?.currency || 'USD');

  // Step 2: Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Load existing printer for resume
  useEffect(() => {
    const load = async () => {
      if (!user?.id) { setLoading(false); return; }
      const result = await getPrinter(user.id);
      if (result.success && result.data) {
        const p = result.data;
        setPrinter(p);
        setStoreName(p.store_name || '');
        setStoreUrl(p.store_url || '');
        setSlug(p.slug || '');
        setCurrency(p.currency || 'USD');
        setLogoUrl(p.logo_url || null);
        // Resume at saved step
        setCurrentStep(Math.min(p.setup_step ? p.setup_step - 1 : 0, 2));
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // Step 1 validate
  const validateStep1 = useCallback(() => {
    if (!storeName.trim()) { toast.error('Store name is required'); return 'error'; }
    if (!slug.trim() || slug.length < 3) { toast.error('URL slug must be at least 3 characters'); return 'error'; }
    if (!storeUrl.trim()) { toast.error('Store URL is required'); return 'error'; }
    if (!storeUrl.startsWith('http://') && !storeUrl.startsWith('https://')) {
      toast.error('Store URL must start with http:// or https://');
      return 'error';
    }
    return null;
  }, [storeName, slug, storeUrl]);

  // Step 1 save
  const saveStep1 = useCallback(async () => {
    if (!user?.id) return;
    const result = await savePrinter(user.id, {
      storeName: storeName.trim(),
      storeUrl: storeUrl.trim(),
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''),
      currency,
    });
    if (result.success && result.data) {
      setPrinter(result.data);
      // Update setup_step in DB
      // supabase imported at top
      await supabase.from('printers').update({ setup_step: 2 }).eq('id', result.data.id);
    } else {
      throw new Error(result.error || 'Failed to save');
    }
  }, [user?.id, storeName, storeUrl, slug, currency]);

  // Logo upload handler
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Logo must be less than 5MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Step 2 save (upload logo if selected — non-blocking)
  const saveStep2 = useCallback(async () => {
    if (!printer || !user?.id) return;
    let finalLogoUrl = logoUrl;

    if (logoFile) {
      setUploadingLogo(true);
      try {
        const storageId = printer.store_id || user.id;
        const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
        const filePath = `${storageId}/logo-${Date.now()}.${fileExt}`;
        const result = await uploadToR2('printer-assets', filePath, logoFile, logoFile.type || 'image/png');
        if (result.success && result.publicUrl) {
          finalLogoUrl = result.publicUrl;
          setLogoUrl(finalLogoUrl);
        } else {
          toast.error('Logo upload failed — you can upload it later from Store Setup');
        }
      } catch (err) {
        console.error('[WISetupWizard] Logo upload error:', err);
        toast.error('Logo upload failed — you can upload it later from Store Setup');
      } finally {
        setUploadingLogo(false);
      }
    }

    // Save logo URL (if any) and advance step
    await supabase.from('printers').update({
      logo_url: finalLogoUrl,
      setup_step: 3,
    }).eq('id', printer.id);
  }, [printer, user?.id, logoFile, logoUrl]);

  // Complete wizard
  const handleComplete = useCallback(async () => {
    if (!printer) return;
    // supabase imported at top
    await supabase.from('printers').update({
      setup_completed: true,
      setup_step: 3,
    }).eq('id', printer.id);

    // Refresh printer
    if (user?.id) {
      const result = await getPrinter(user.id);
      if (result.success && result.data) {
        onComplete(result.data);
      }
    }
  }, [printer, user?.id, onComplete]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const builderUrl = slug ? `builder.dtflayout.com/${slug}` : '';

  // Build steps
  const steps: WizardStep[] = [
    {
      id: 'identity',
      title: 'Store Identity',
      description: 'Your store name, URL slug, and currency for the public builder',
      icon: Store,
      validate: validateStep1,
      onNext: saveStep1,
      content: (
        <div className="space-y-5 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="wi-store-name">Store Name <span className="text-red-400">*</span></Label>
            <Input
              id="wi-store-name"
              className="placeholder:text-gray-300" placeholder="e.g., Ninja Transfers"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400">Displayed to your customers on the builder page</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-slug">URL Slug <span className="text-red-400">*</span></Label>
            <div className="flex items-center gap-2">
              <Input
                id="wi-slug"
                placeholder="e.g., ninjatransfers"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                disabled={!!printer}
                className={printer ? 'bg-gray-50 text-gray-500 placeholder:text-gray-300' : 'placeholder:text-gray-300'}
              />
            </div>
            {slug && slug.length >= 3 && (
              <p className="text-sm font-medium text-indigo-600">
                Your builder: https://builder.dtflayout.com/{slug}
              </p>
            )}
            <p className="text-xs text-gray-400">
              This is the unique short name for your builder URL. Only lowercase letters, numbers, and hyphens.
            </p>
            {!slug && (
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                <p className="font-medium text-gray-500">Examples:</p>
                <p>ninjatransfers → builder.dtflayout.com/<strong>ninjatransfers</strong></p>
                <p>ace-dtf-prints → builder.dtflayout.com/<strong>ace-dtf-prints</strong></p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-store-url">Store URL <span className="text-red-400">*</span></Label>
            <Input
              id="wi-store-url"
              type="url"
              className="placeholder:text-gray-300" placeholder="https://ninjatransfers.com"
              value={storeUrl}
              onChange={(e) => setStoreUrl(e.target.value)}
            />
            <p className="text-xs text-gray-400">Your website where customers will be redirected for checkout</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wi-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Currency for displaying prices on your builder</p>
          </div>
        </div>
      ),
    },
    {
      id: 'logo',
      title: 'Store Logo',
      description: 'Upload your brand logo — it appears on the public builder page',
      icon: Upload,
      onNext: saveStep2,
      content: (
        <div className="space-y-5 max-w-lg">
          <div className="space-y-3">
            {(logoPreview || logoUrl) ? (
              <div className="space-y-3">
                <div className="relative inline-block">
                  <img
                    src={logoPreview || logoUrl || ''}
                    alt="Store logo"
                    className="h-24 w-auto max-w-[240px] object-contain border rounded-xl bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); setLogoUrl(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-sm transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline cursor-pointer">
                  Change logo
                  <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 px-8 py-10 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-colors">
                {uploadingLogo ? (
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-300" />
                    <div className="text-center">
                      <span className="text-sm font-medium text-gray-700">Click to upload logo</span>
                      <p className="text-xs text-gray-400 mt-1">PNG with transparent background recommended. Max 5MB.</p>
                    </div>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400">
            You can skip this step and upload a logo later from Store Setup.
          </p>
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Review & Finish',
      description: 'Everything looks good — your builder will be ready to share',
      icon: CheckCircle2,
      content: (
        <div className="space-y-6 max-w-lg">
          {/* Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {(logoPreview || logoUrl) ? (
                <img src={logoPreview || logoUrl || ''} alt="" className="h-14 w-auto max-w-[120px] object-contain rounded-lg border bg-white p-1.5" />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Store className="h-7 w-7 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-heading text-lg font-bold text-gray-900">{storeName || 'Your Store'}</h3>
                <p className="text-sm text-gray-500">{storeUrl}</p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
              <SummaryRow label="URL Slug" value={slug} />
              <SummaryRow label="Currency" value={CURRENCY_OPTIONS.find(c => c.value === currency)?.label || currency} />
              <SummaryRow label="Logo" value={(logoPreview || logoUrl) ? '✓ Uploaded' : 'Not uploaded'} />
            </div>
          </div>

          {/* Builder URL Preview */}
          {builderUrl && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Your Builder URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-white border px-3 py-2 text-sm font-mono text-indigo-600">
                  https://{builderUrl}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(`https://${builderUrl}`); toast.success('Copied!'); }}
                  className="p-2 rounded-lg hover:bg-white text-gray-500 hover:text-indigo-600 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">Share this URL with your customers or embed it on your website</p>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-700">
              <strong>You're all set!</strong> Click "Complete Setup" to finish. You can always edit these settings later, and customize your builder's appearance in the Builder Settings tab.
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <SetupWizard
      title="Set Up Website Integration"
      subtitle="Connect your website and let customers design gang sheets"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onComplete={handleComplete}
      onClose={handleClose}
      completeText="Complete Setup"
      completingText="Finishing..."
    />
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);
