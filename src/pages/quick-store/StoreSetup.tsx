import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  createQuickStore,
  updateQuickStore,
  checkSlugAvailability,
  uploadStoreAsset,
  setStorePublished,
  createTestimonial,
} from '@/services/quickStoreService';
import {
  QuickStore,
  QuickStoreInput,
  Currency,
  MeasurementUnit,
  CURRENCY_CONFIG,
  UNIT_LABELS,
  FontPairing,
  FONT_PAIRINGS,
  BusinessHours,
} from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Loader2,
  Upload,
  Check,
  X,
  Globe,
  Store,
  Phone,
  Mail,
  MapPin,
  Image,
  Type,
} from 'lucide-react';
import { buildStoreUrl } from '@/hooks/useSubdomain';

interface OutletContextType {
  store: QuickStore | null;
  setStore: (store: QuickStore) => void;
}

const StoreSetup: React.FC = () => {
  const { user } = useAuth();
  const { store, setStore } = useOutletContext<OutletContextType>();

  const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
    { day: 'Monday', open: '09:00', close: '18:00', closed: false },
    { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Wednesday', open: '09:00', close: '18:00', closed: false },
    { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
    { day: 'Friday', open: '09:00', close: '18:00', closed: false },
    { day: 'Saturday', open: '10:00', close: '16:00', closed: false },
    { day: 'Sunday', open: '', close: '', closed: true },
  ];

  const [formData, setFormData] = useState<QuickStoreInput>({
    slug: '',
    store_name: '',
    tagline: '',
    currency: 'USD',
    measurement_unit: 'inch',
    font_pairing: 'modern',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    country: '',
    google_maps_url: '',
    business_hours: DEFAULT_BUSINESS_HOURS,
  });

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Load existing store data
  useEffect(() => {
    if (store) {
      setFormData({
        slug: store.slug,
        store_name: store.store_name,
        tagline: store.tagline || '',
        currency: store.currency,
        measurement_unit: store.measurement_unit,
        font_pairing: store.font_pairing || 'modern',
        phone: store.phone || '',
        whatsapp: store.whatsapp || '',
        email: store.email || '',
        address: store.address || '',
        city: store.city || '',
        country: store.country || '',
        google_maps_url: store.google_maps_url || '',
        business_hours: store.business_hours?.length ? store.business_hours : DEFAULT_BUSINESS_HOURS,
        logo_url: store.logo_url || undefined,
        banner_image_url: store.banner_image_url || undefined,
      });
      setSlugStatus('available');
    }
  }, [store]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!formData.slug || formData.slug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    // Skip check if slug hasn't changed from existing store
    if (store && formData.slug === store.slug) {
      setSlugStatus('available');
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkSlugAvailability(formData.slug, user?.id);
      setSlugStatus(result.available ? 'available' : 'taken');
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.slug, store, user?.id]);

  const handleInputChange = (field: keyof QuickStoreInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSlugChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    handleInputChange('slug', sanitized);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!store?.id) {
      toast.error('Please save your store first before uploading a logo');
      return;
    }

    setUploadingLogo(true);
    const result = await uploadStoreAsset(store.id, file, 'logo');
    
    if (result.success && result.url) {
      handleInputChange('logo_url', result.url);
      // Auto-save
      await updateQuickStore(store.id, { logo_url: result.url });
      toast.success('Logo uploaded!');
    } else {
      toast.error(result.error || 'Failed to upload logo');
    }
    setUploadingLogo(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!store?.id) {
      toast.error('Please save your store first before uploading a banner');
      return;
    }

    setUploadingBanner(true);
    const result = await uploadStoreAsset(store.id, file, 'banner');
    
    if (result.success && result.url) {
      handleInputChange('banner_image_url', result.url);
      await updateQuickStore(store.id, { banner_image_url: result.url });
      toast.success('Banner uploaded!');
    } else {
      toast.error(result.error || 'Failed to upload banner');
    }
    setUploadingBanner(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;

    // Validation
    if (!formData.store_name.trim()) {
      toast.error('Store name is required');
      return;
    }
    if (!formData.slug || formData.slug.length < 3) {
      toast.error('Store URL must be at least 3 characters');
      return;
    }
    if (slugStatus === 'taken') {
      toast.error('This URL is not available');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Phone number is required');
      return;
    }
    if (!formData.email?.trim()) {
      toast.error('Email address is required');
      return;
    }
    if (!formData.city?.trim()) {
      toast.error('City is required');
      return;
    }
    if (!formData.country?.trim()) {
      toast.error('Country is required');
      return;
    }

    setSaving(true);

    try {
      if (store) {
        // Update existing
        const result = await updateQuickStore(store.id, formData);
        if (result.success && result.data) {
          setStore(result.data);
          toast.success('Store updated!');
        } else {
          toast.error(result.error || 'Failed to update store');
        }
      } else {
        // Create new — include smart defaults so the store looks complete immediately
        const storeName = formData.store_name.trim();
        const defaults: Partial<QuickStoreInput> = {
          hero_title: `Welcome to ${storeName}`,
          hero_subtitle: 'Premium DTF transfers with fast turnaround. Upload your designs, we handle the rest.',
          hero_cta_enabled: true,
          hero_cta_text: 'Browse Products',
          hero_style: 'fullbleed',
          hero_bg_type: 'gradient',
          hero_gradient_from: '#4f46e5',
          hero_gradient_to: '#0ea5e9',
          hero_gradient_angle: 135,
          hero_overlay_opacity: 15,
          hero_text_color: '#ffffff',
          hero_text_align: 'center',
          about_title: 'About Us',
          about_content: `${storeName} specializes in high-quality Direct-to-Film (DTF) printing with fast turnaround times. We use the latest printing technology to deliver vibrant, durable transfers that look great on any fabric. Whether you need a single custom print or bulk gang sheets for your business, we've got you covered.`,
          features_enabled: true,
          features_layout: 'grid',
          features_title: 'Why customers choose us',
          features_subtitle: 'Everything you need for professional DTF printing',
          faq_enabled: true,
          faq_style: 'clean',
          homepage_sections: ['hero', 'about', 'features', 'how_it_works', 'products', 'testimonials', 'faq', 'contact'],
          color_primary: '#4f46e5',
          color_secondary: '#0ea5e9',
          color_background: '#ffffff',
          color_text: '#1f2937',
          font_pairing: 'modern',
        };
        const result = await createQuickStore(user.id, { ...defaults, ...formData });
        if (result.success && result.data) {
          setStore(result.data);
          // Seed default testimonials
          const sampleTestimonials = [
            { customer_name: 'Alex Rivera', customer_location: 'Texas, USA', content: 'Excellent print quality and super fast delivery. The gang sheets were perfectly arranged with zero wasted space. Will definitely order again!', rating: 5 },
            { customer_name: 'Sarah Mitchell', customer_location: 'London, UK', content: 'Very impressed with the color vibrancy and the transfers adhered perfectly to the fabric. Great value for money with bulk pricing.', rating: 5 },
            { customer_name: 'James Chen', customer_location: 'Toronto, CA', content: 'The online builder made it so easy to arrange my designs. Customer support was responsive and helpful. Highly recommended for DTF printing!', rating: 4 },
          ];
          for (const t of sampleTestimonials) {
            await createTestimonial(result.data.id, t);
          }
          toast.success('Store created!');
        } else {
          toast.error(result.error || 'Failed to create store');
        }
      }
    } catch (err) {
      toast.error('An error occurred');
    }

    setSaving(false);
  };

  const handlePublishToggle = async (publish: boolean) => {
    if (!store?.id) return;

    // Check required fields before publishing
    if (publish) {
      if (!formData.store_name || !formData.slug) {
        toast.error('Please complete store setup before publishing');
        return;
      }
    }

    const result = await setStorePublished(store.id, publish);
    if (result.success) {
      setStore({ ...store, is_published: publish });
      toast.success(publish ? 'Store published!' : 'Store unpublished');
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 2-column grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Your store name and URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Store Name *</Label>
                  <Input
                    id="store_name"
                    placeholder="Mumbai Prints"
                    value={formData.store_name}
                    onChange={(e) => handleInputChange('store_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    placeholder="Quality DTF Printing"
                    value={formData.tagline || ''}
                    onChange={(e) => handleInputChange('tagline', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Store URL *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap">dtflayout.com/s/</span>
                  <div className="flex-1 relative">
                    <Input
                      id="slug"
                      placeholder="mumbai-prints"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      {slugStatus === 'available' && (
                        <Check className="h-4 w-4 text-indigo-500" />
                      )}
                      {slugStatus === 'taken' && (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
                {slugStatus === 'taken' && (
                  <p className="text-sm text-red-500">This URL is not available</p>
                )}
                {slugStatus === 'available' && formData.slug && (
                  <p className="text-sm text-indigo-600">
                    Your store will be at: {buildStoreUrl(formData.slug)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Currency & Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Currency & Units
              </CardTitle>
              <CardDescription>How prices and measurements are displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(v) => handleInputChange('currency', v as Currency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CURRENCY_CONFIG).map(([code, config]) => (
                        <SelectItem key={code} value={code}>
                          {config.symbol} - {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Measurement Unit *</Label>
                  <Select
                    value={formData.measurement_unit}
                    onValueChange={(v) => handleInputChange('measurement_unit', v as MeasurementUnit)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(UNIT_LABELS).map(([unit, labels]) => (
                        <SelectItem key={unit} value={unit}>
                          {labels.plural}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Font Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Font Style
              </CardTitle>
              <CardDescription>Choose a font pairing for your store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {FONT_PAIRINGS.map((fp) => {
                  const selected = (formData.font_pairing || 'modern') === fp.id;
                  return (
                    <button
                      key={fp.id}
                      onClick={() => handleInputChange('font_pairing', fp.id)}
                      className={`relative flex flex-col p-3 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {selected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <span
                        className="text-base font-bold leading-tight"
                        style={{ fontFamily: `'${fp.heading}', sans-serif` }}
                      >
                        {fp.label}
                      </span>
                      <span
                        className="text-xs text-gray-500 mt-1"
                        style={{ fontFamily: `'${fp.body}', sans-serif` }}
                      >
                        {fp.heading === fp.body ? fp.heading : `${fp.heading} + ${fp.body}`}
                      </span>
                      <span
                        className="text-[11px] text-gray-400 mt-2 leading-snug"
                        style={{ fontFamily: `'${fp.body}', sans-serif` }}
                      >
                        The quick brown fox jumps over the lazy dog
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Load all font previews */}
              {FONT_PAIRINGS.map(fp => (
                <link key={fp.id} rel="stylesheet" href={fp.googleImport} />
              ))}
            </CardContent>
          </Card>

          {/* Publish Status */}
          {store && (
            <Card>
              <CardHeader>
                <CardTitle>Publish Status</CardTitle>
                <CardDescription>Make your store visible to customers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {store.is_published ? 'Store is Live' : 'Store is Draft'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {store.is_published
                        ? 'Customers can access your store'
                        : 'Only you can see your store'}
                    </p>
                  </div>
                  <Switch
                    checked={store.is_published}
                    onCheckedChange={handlePublishToggle}
                  />
                </div>
              </CardContent>
            </Card>
          )}

        </div>{/* end LEFT COLUMN */}

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>How customers can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    placeholder="+91 98765 43210"
                    value={formData.whatsapp || ''}
                    onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@mumbaiprints.com"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Shop 12, Print Market, Mumbai"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Mumbai"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    placeholder="India"
                    value={formData.country || ''}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="google_maps_url">Google Maps URL <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="google_maps_url"
                  placeholder="https://maps.google.com/..."
                  value={formData.google_maps_url || ''}
                  onChange={(e) => handleInputChange('google_maps_url', e.target.value)}
                />
              </div>

              {/* Business Hours */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <Label>Business Hours <span className="text-gray-400 font-normal">(optional)</span></Label>
                <div className="space-y-1.5">
                  {(formData.business_hours || DEFAULT_BUSINESS_HOURS).map((hour, idx) => (
                    <div key={hour.day} className="flex items-center gap-2">
                      <span className="text-sm font-medium w-20 flex-shrink-0">{hour.day.slice(0, 3)}</span>
                      <Switch
                        checked={!hour.closed}
                        onCheckedChange={(open) => {
                          const updated = [...(formData.business_hours || DEFAULT_BUSINESS_HOURS)];
                          updated[idx] = { ...updated[idx], closed: !open };
                          handleInputChange('business_hours', updated);
                        }}
                      />
                      {hour.closed ? (
                        <span className="text-sm text-red-400 ml-1">Closed</span>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-1">
                          <Input
                            type="time"
                            value={hour.open}
                            onChange={(e) => {
                              const updated = [...(formData.business_hours || DEFAULT_BUSINESS_HOURS)];
                              updated[idx] = { ...updated[idx], open: e.target.value };
                              handleInputChange('business_hours', updated);
                            }}
                            className="h-8 text-xs w-28"
                          />
                          <span className="text-gray-400 text-xs">to</span>
                          <Input
                            type="time"
                            value={hour.close}
                            onChange={(e) => {
                              const updated = [...(formData.business_hours || DEFAULT_BUSINESS_HOURS)];
                              updated[idx] = { ...updated[idx], close: e.target.value };
                              handleInputChange('business_hours', updated);
                            }}
                            className="h-8 text-xs w-28"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Store Logo
              </CardTitle>
              <CardDescription>Your brand logo shown in the header</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-4 text-center max-w-xs">
                  {formData.logo_url ? (
                    <div className="space-y-2">
                      <img
                        src={formData.logo_url}
                        alt="Logo"
                        className="w-24 h-24 mx-auto object-contain rounded-lg"
                      />
                      <label className="cursor-pointer">
                        <span className="text-sm text-indigo-600 hover:underline">
                          Change logo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      {uploadingLogo ? (
                        <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Upload logo</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={!store || uploadingLogo}
                      />
                    </label>
                  )}
                </div>
                {!store && (
                  <p className="text-xs text-gray-500">Save store first to upload logo</p>
                )}
              </div>
            </CardContent>
          </Card>

        </div>{/* end RIGHT COLUMN */}

      </div>{/* end 2-column grid */}

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-50">
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving || slugStatus === 'taken'}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {store ? 'Save Changes' : 'Create Store'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoreSetup;
