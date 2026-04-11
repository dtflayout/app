import React, { useState, useEffect, useCallback } from 'react';
import { SetupWizard, WizardStep } from '@/components/SetupWizard';
import { useAuth } from '@/contexts/AuthContext';
import { isSlugReserved } from '@/hooks/useSubdomain';
import {
  createQuickStore,
  updateQuickStore,
  checkSlugAvailability,
  uploadStoreAsset,
  createTestimonial,
  getQuickStore,
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
import { toast } from 'sonner';
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
  Store, Phone, Type, Clock, CheckCircle2, Upload, Check, X, Lock,
  Loader2, Mail, MapPin, Globe,
} from 'lucide-react';
import { buildStoreUrl } from '@/hooks/useSubdomain';
import { supabase } from '@/lib/supabaseClient';

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia',
  'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
  'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania',
  'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea',
  'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela',
  'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe',
];

const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { day: 'Monday', open: '09:00', close: '18:00', closed: false },
  { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
  { day: 'Wednesday', open: '09:00', close: '18:00', closed: false },
  { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
  { day: 'Friday', open: '09:00', close: '18:00', closed: false },
  { day: 'Saturday', open: '10:00', close: '16:00', closed: false },
  { day: 'Sunday', open: '', close: '', closed: true },
];

interface QSSetupWizardProps {
  existingStore: QuickStore | null;
  onComplete: (store: QuickStore) => void;
  onClose: () => void;
}

export const QSSetupWizard: React.FC<QSSetupWizardProps> = ({ existingStore, onComplete, onClose }) => {
  const { user, profile } = useAuth();

  const [store, setStore] = useState<QuickStore | null>(existingStore);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Step 1: Store Identity ──
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [slugValue, setSlugValue] = useState('');
  const [currency, setCurrency] = useState<Currency>((profile?.currency as Currency) || 'USD');
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>('inch');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // ── Step 2: Contact Info ──
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // ── Step 3: Appearance ──
  const [fontPairing, setFontPairing] = useState<FontPairing>('modern');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ── Step 4: Business Hours ──
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(DEFAULT_BUSINESS_HOURS);
  const [showBusinessHours, setShowBusinessHours] = useState(true);

  // Load from existing store for resume
  useEffect(() => {
    if (existingStore) {
      const s = existingStore;
      setStoreName(s.store_name);
      setTagline(s.tagline || '');
      setSlugValue(s.slug);
      setCurrency(s.currency);
      setMeasurementUnit(s.measurement_unit);
      setPhone(s.phone || '');
      setWhatsapp(s.whatsapp || '');
      setEmail(s.email || '');
      setAddress(s.address || '');
      setCity(s.city || '');
      setCountry(s.country || '');
      setGoogleMapsUrl(s.google_maps_url || '');
      setFontPairing(s.font_pairing || 'modern');
      setLogoUrl(s.logo_url || null);
      setBusinessHours(s.business_hours?.length ? s.business_hours : DEFAULT_BUSINESS_HOURS);
      setShowBusinessHours(s.show_business_hours ?? true);
      setSlugStatus('available');
      // Resume at saved step (0-indexed)
      setCurrentStep(Math.min((s.setup_step || 1) - 1, 4));
    }
  }, [existingStore]);

  // Slug availability check
  useEffect(() => {
    if (!slugValue || slugValue.length < 3) { setSlugStatus('idle'); return; }
    if (isSlugReserved(slugValue.trim())) { setSlugStatus('taken'); return; }
    if (store && slugValue === store.slug) { setSlugStatus('available'); return; }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const result = await checkSlugAvailability(slugValue, user?.id);
      setSlugStatus(result.available ? 'available' : 'taken');
    }, 500);
    return () => clearTimeout(timer);
  }, [slugValue, store, user?.id]);

  // ── Step validators ──
  const validateStep1 = useCallback(() => {
    if (!storeName.trim()) { toast.error('Store name is required'); return 'error'; }
    if (!slugValue || slugValue.length < 3) { toast.error('Store URL must be at least 3 characters'); return 'error'; }
    if (isSlugReserved(slugValue.trim())) { toast.error(`"${slugValue.trim()}" is a reserved name. Please choose a different URL.`); return 'error'; }
    if (slugStatus === 'checking') { toast.error('Checking URL availability, please wait...'); return 'error'; }
    if (slugStatus === 'taken') { toast.error('This URL is not available'); return 'error'; }
    return null;
  }, [storeName, slugValue, slugStatus]);

  const validateStep2 = useCallback(() => {
    if (!phone.trim()) { toast.error('Phone number is required'); return 'error'; }
    if (!email.trim()) { toast.error('Email is required'); return 'error'; }
    if (!email.includes('@') || !email.includes('.')) { toast.error('Please enter a valid email address'); return 'error'; }
    if (!city.trim()) { toast.error('City is required'); return 'error'; }
    if (!country.trim()) { toast.error('Country is required'); return 'error'; }
    return null;
  }, [phone, email, city, country]);

  // ── Step savers ──
  const saveStep1 = useCallback(async () => {
    if (!user?.id) return;

    const storeNameTrimmed = storeName.trim();
    const defaults: Partial<QuickStoreInput> = {
      hero_title: `Welcome to ${storeNameTrimmed}`,
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
      about_content: `${storeNameTrimmed} specializes in high-quality Direct-to-Film (DTF) printing with fast turnaround times.`,
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
    };

    if (store) {
      // Update (don't change immutable fields)
      const result = await updateQuickStore(store.id, {
        store_name: storeNameTrimmed,
        tagline: tagline.trim() || null,
        font_pairing: fontPairing,
        setup_step: 2,
      } as any);
      if (result.success && result.data) setStore(result.data);
      else throw new Error(result.error || 'Failed to update');
    } else {
      // Create
      const result = await createQuickStore(user.id, {
        ...defaults,
        slug: slugValue.toLowerCase().trim(),
        store_name: storeNameTrimmed,
        tagline: tagline.trim() || null,
        currency,
        measurement_unit: measurementUnit,
        font_pairing: fontPairing,
        is_published: false,
      });
      if (result.success && result.data) {
        setStore(result.data);
        // Set setup_step
        // supabase imported at top
        await supabase.from('quick_stores').update({ setup_step: 2 }).eq('id', result.data.id);
        // Seed testimonials
        const sampleTestimonials = [
          { customer_name: 'Alex Rivera', customer_location: 'Texas, USA', content: 'Excellent print quality and super fast delivery.', rating: 5 },
          { customer_name: 'Sarah Mitchell', customer_location: 'London, UK', content: 'Very impressed with the color vibrancy and the transfers.', rating: 5 },
          { customer_name: 'James Chen', customer_location: 'Toronto, CA', content: 'The online builder made it so easy to arrange my designs.', rating: 4 },
        ];
        for (const t of sampleTestimonials) {
          await createTestimonial(result.data.id, t);
        }
      } else {
        throw new Error(result.error || 'Failed to create store');
      }
    }
  }, [user?.id, store, storeName, tagline, slugValue, currency, measurementUnit, fontPairing]);

  const saveStep2 = useCallback(async () => {
    if (!store) return;
    const result = await updateQuickStore(store.id, {
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim(),
      address: address.trim() || null,
      city: city.trim(),
      country,
      google_maps_url: googleMapsUrl.trim() || null,
    } as any);
    if (result.success && result.data) {
      setStore(result.data);
      // supabase imported at top
      await supabase.from('quick_stores').update({ setup_step: 3 }).eq('id', store.id);
    } else throw new Error(result.error || 'Failed to save');
  }, [store, phone, whatsapp, email, address, city, country, googleMapsUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setUploadingLogo(true);
    const result = await uploadStoreAsset(store.id, file, 'logo');
    if (result.success && result.url) {
      setLogoUrl(result.url);
      await updateQuickStore(store.id, { logo_url: result.url } as any);
      toast.success('Logo uploaded!');
    } else toast.error(result.error || 'Failed to upload');
    setUploadingLogo(false);
  };

  const saveStep3 = useCallback(async () => {
    if (!store) return;
    const result = await updateQuickStore(store.id, {
      font_pairing: fontPairing,
    } as any);
    if (result.success && result.data) setStore(result.data);
    // supabase imported at top
    await supabase.from('quick_stores').update({ setup_step: 4 }).eq('id', store.id);
  }, [store, fontPairing]);

  const saveStep4 = useCallback(async () => {
    if (!store) return;
    const result = await updateQuickStore(store.id, {
      business_hours: businessHours,
      show_business_hours: showBusinessHours,
    } as any);
    if (result.success && result.data) setStore(result.data);
    // supabase imported at top
    await supabase.from('quick_stores').update({ setup_step: 5 }).eq('id', store.id);
  }, [store, businessHours, showBusinessHours]);

  const handleComplete = useCallback(async () => {
    if (!store) return;
    // supabase imported at top
    await supabase.from('quick_stores').update({
      setup_completed: true,
      setup_step: 5,
    }).eq('id', store.id);
    // Refresh
    if (user?.id) {
      const result = await getQuickStore(user.id);
      if (result.success && result.data) onComplete(result.data);
    }
  }, [store, user?.id, onComplete]);

  // ── Steps definition ──
  const steps: WizardStep[] = [
    {
      id: 'identity',
      title: 'Store Identity',
      description: 'Your store name, URL, currency, and measurement unit',
      icon: Store,
      validate: validateStep1,
      onNext: saveStep1,
      content: (
        <div className="space-y-5 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name <span className="text-red-400">*</span></Label>
              <Input className="placeholder:text-gray-300" placeholder="My Print Shop" value={storeName} onChange={(e) => setStoreName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input className="placeholder:text-gray-300" placeholder="Quality DTF Printing" value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Store URL <span className="text-red-400">*</span></Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="e.g., myprintshop"
                  value={slugValue}
                  onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  disabled={!!store}
                  className={store ? 'bg-gray-50 text-gray-500 pr-10 placeholder:text-gray-300' : 'pr-10 placeholder:text-gray-300'}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {store ? <Lock className="h-4 w-4 text-gray-400" /> :
                   slugStatus === 'checking' ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> :
                   slugStatus === 'available' ? <Check className="h-4 w-4 text-indigo-500" /> :
                   slugStatus === 'taken' ? <X className="h-4 w-4 text-red-500" /> : null}
                </div>
              </div>
              <span className="text-sm text-gray-500 whitespace-nowrap">.dtflayout.com</span>
            </div>
            {slugStatus === 'taken' && <p className="text-sm text-red-500">This URL is not available</p>}
            {slugStatus === 'available' && slugValue && (
              <p className="text-sm font-medium text-indigo-600">Your store: {buildStoreUrl(slugValue)}</p>
            )}
            {!store && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                ⚠️ Choose carefully — your store URL <strong>cannot be changed</strong> after creation.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency <span className="text-red-400">*</span></Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)} disabled={!!store}>
                <SelectTrigger className={store ? 'bg-gray-50 text-gray-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_CONFIG).map(([code, config]) => (
                    <SelectItem key={code} value={code}>{config.symbol} - {config.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Measurement Unit <span className="text-red-400">*</span></Label>
              <Select value={measurementUnit} onValueChange={(v) => setMeasurementUnit(v as MeasurementUnit)} disabled={!!store}>
                <SelectTrigger className={store ? 'bg-gray-50 text-gray-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(UNIT_LABELS).map(([unit, labels]) => (
                    <SelectItem key={unit} value={unit}>{labels.plural}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {!store && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              ⚠️ Currency and measurement unit <strong>cannot be changed</strong> after creation.
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Information',
      description: 'How customers can reach you — shown on your store',
      icon: Phone,
      validate: validateStep2,
      onNext: saveStep2,
      content: (
        <div className="space-y-5 max-w-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone <span className="text-red-400">*</span></Label>
              <Input className="placeholder:text-gray-300" placeholder="+1 234 567 8900" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input className="placeholder:text-gray-300" placeholder="+1 234 567 8900" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email <span className="text-red-400">*</span></Label>
            <Input type="email" className="placeholder:text-gray-300" placeholder="hello@yourstore.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea className="placeholder:text-gray-300" placeholder="123 Print Street, Suite 4" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City <span className="text-red-400">*</span></Label>
              <Input className="placeholder:text-gray-300" placeholder="New York" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country <span className="text-red-400">*</span></Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Google Maps URL <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input className="placeholder:text-gray-300" placeholder="https://maps.google.com/..." value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Upload your logo and choose a font style for your store',
      icon: Type,
      onNext: saveStep3,
      content: (
        <div className="space-y-6">
          {/* Logo Upload — first */}
          <div className="space-y-3">
            <Label className="text-base">Store Logo</Label>
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <img src={logoUrl} alt="Logo" className="h-16 w-auto max-w-[200px] object-contain rounded-lg border bg-white p-1.5" />
                <label className="text-sm text-indigo-600 hover:underline cursor-pointer">
                  Change logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 px-8 py-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-colors max-w-xs">
                {uploadingLogo ? (
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-300" />
                    <span className="text-sm text-gray-600">Click to upload logo</span>
                    <p className="text-xs text-gray-400">PNG recommended. Max 5MB.</p>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={!store || uploadingLogo} />
              </label>
            )}
            <p className="text-xs text-gray-400">You can also upload or change this later from Store Setup.</p>
          </div>

          {/* Font Pairings — below logo */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <Label className="text-base">Font Style</Label>
              <p className="text-xs text-gray-400 mt-1">You can change this anytime from Store Setup.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FONT_PAIRINGS.map((fp) => {
                const selected = fontPairing === fp.id;
                return (
                  <button
                    key={fp.id}
                    onClick={() => setFontPairing(fp.id as FontPairing)}
                    className={`relative flex flex-col p-3 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <span className="text-base font-bold leading-tight" style={{ fontFamily: `'${fp.heading}', sans-serif` }}>
                      {fp.label}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: `'${fp.body}', sans-serif` }}>
                      {fp.heading === fp.body ? fp.heading : `${fp.heading} + ${fp.body}`}
                    </span>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-sm font-bold block" style={{ fontFamily: `'${fp.heading}', sans-serif` }}>
                        Heading Text
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5 leading-relaxed" style={{ fontFamily: `'${fp.body}', sans-serif` }}>
                        Body text looks like this in your store
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {FONT_PAIRINGS.map(fp => <link key={fp.id} rel="stylesheet" href={fp.googleImport} />)}
          </div>
        </div>
      ),
    },
    {
      id: 'hours',
      title: 'Business Hours',
      description: 'Set your operating hours — displayed on your store',
      icon: Clock,
      onNext: saveStep4,
      content: (
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <Label className="text-base">Show on store</Label>
            <Switch checked={showBusinessHours} onCheckedChange={setShowBusinessHours} />
          </div>
          {showBusinessHours && (
            <div className="space-y-2">
              {businessHours.map((hour, idx) => (
                <div key={hour.day} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-12 flex-shrink-0">{hour.day.slice(0, 3)}</span>
                  <Switch
                    checked={!hour.closed}
                    onCheckedChange={(open) => {
                      const updated = [...businessHours];
                      updated[idx] = { ...updated[idx], closed: !open };
                      setBusinessHours(updated);
                    }}
                  />
                  {hour.closed ? (
                    <span className="text-sm text-red-400 ml-1">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hour.open}
                        onChange={(e) => {
                          const updated = [...businessHours];
                          updated[idx] = { ...updated[idx], open: e.target.value };
                          setBusinessHours(updated);
                        }}
                        className="h-9 text-sm w-28"
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <Input
                        type="time"
                        value={hour.close}
                        onChange={(e) => {
                          const updated = [...businessHours];
                          updated[idx] = { ...updated[idx], close: e.target.value };
                          setBusinessHours(updated);
                        }}
                        className="h-9 text-sm w-28"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'review',
      title: 'Review & Finish',
      description: 'Your store will be created as a draft — you can publish it anytime',
      icon: CheckCircle2,
      content: (
        <div className="space-y-6 max-w-lg">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-14 w-auto max-w-[120px] object-contain rounded-lg border bg-white p-1.5" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Store className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h3 className="font-heading text-lg font-bold text-gray-900">{storeName}</h3>
              {tagline && <p className="text-sm text-gray-500">{tagline}</p>}
              <p className="text-sm text-indigo-600">{slugValue}.dtflayout.com</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <SummaryRow label="Currency" value={CURRENCY_CONFIG[currency]?.symbol + ' ' + currency} />
            <SummaryRow label="Unit" value={UNIT_LABELS[measurementUnit]?.plural || measurementUnit} />
            <SummaryRow label="Phone" value={phone || '—'} />
            <SummaryRow label="Email" value={email || '—'} />
            <SummaryRow label="City" value={city && country ? `${city}, ${country}` : '—'} />
            <SummaryRow label="Font" value={FONT_PAIRINGS.find(f => f.id === fontPairing)?.label || fontPairing} />
            <SummaryRow label="Logo" value={logoUrl ? '✓ Uploaded' : 'Not uploaded'} />
            <SummaryRow label="Business Hours" value={showBusinessHours ? '✓ Configured' : 'Hidden'} />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-700">
              <strong>Your store will be created as a draft.</strong> You can publish it from the Store Setup page when you're ready to go live. After setup, you can customize your homepage, header, add products, and more.
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
      title="Set Up Quick Store"
      subtitle="Create your branded storefront in a few steps"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onComplete={handleComplete}
      onClose={onClose}
      completeText="Create Store"
      completingText="Creating..."
    />
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);
