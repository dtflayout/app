import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateQuickStore, uploadStoreAsset, getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '@/services/quickStoreService';
import { QuickStore, Testimonial, TestimonialInput, HeroStyle, HeroBgType, HeroTextAlign, FeaturesLayout, FeatureItem, DEFAULT_FEATURES, FaqStyle, FaqItem, DEFAULT_FAQS, HeroSliderImage } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Loader2, Plus, Trash2, GripVertical, Star, Quote,
  Type, Users, Check, Image as ImageIcon, Upload,
  AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp,
  LayoutGrid, Scissors, Ruler, Zap, Sparkles, HelpCircle,
  Eye, EyeOff, LayoutList, Package, MessageSquareQuote, FileText, Phone,
  RotateCcw, ListOrdered,
  type LucideIcon,
} from 'lucide-react';

interface OutletContextType {
  store: QuickStore | null;
  setStore: (store: QuickStore) => void;
}

// ── Homepage section config ──
interface SectionConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
}

const ALL_SECTIONS: SectionConfig[] = [
  { id: 'hero', label: 'Hero Banner', icon: ImageIcon, locked: true },
  { id: 'about', label: 'About Us', icon: FileText },
  { id: 'features', label: 'Product Features', icon: Star },
  { id: 'how_it_works', label: 'How It Works', icon: ListOrdered },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'contact', label: 'Contact', icon: Phone },
];

const DEFAULT_SECTIONS = ['hero', 'about', 'features', 'how_it_works', 'products', 'testimonials', 'faq'];

function parseSections(stored: string[] | undefined): { id: string; enabled: boolean }[] {
  if (!stored || stored.length === 0) {
    return ALL_SECTIONS.map((s) => ({
      id: s.id,
      enabled: DEFAULT_SECTIONS.includes(s.id),
    }));
  }
  const ordered: { id: string; enabled: boolean }[] = stored.map((entry) => {
    const disabled = entry.startsWith('!');
    return { id: disabled ? entry.slice(1) : entry, enabled: !disabled };
  });
  for (const sec of ALL_SECTIONS) {
    if (!ordered.some((o) => o.id === sec.id)) {
      ordered.push({ id: sec.id, enabled: true });
    }
  }
  return ordered;
}

function serializeSections(sections: { id: string; enabled: boolean }[]): string[] {
  return sections.map((s) => (s.enabled ? s.id : `!${s.id}`));
}

// ─── Hero Style Previews ──────────────────────────────────────────────────────

interface HeroPreviewProps { primary: string; secondary: string; }

const FullBleedPreview: React.FC<HeroPreviewProps> = ({ primary, secondary }) => (
  <div className="w-full h-16 rounded-md overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-1 p-2">
      <div className="h-2.5 w-24 rounded-sm bg-white/80" />
      <div className="h-1.5 w-16 rounded-sm bg-white/50" />
      <div className="h-4 w-14 rounded-full mt-1 bg-white/25 border border-white/40" />
    </div>
  </div>
);

const SplitPreview: React.FC<HeroPreviewProps> = ({ primary, secondary }) => (
  <div className="w-full h-16 rounded-md overflow-hidden flex">
    <div className="w-1/2 bg-white flex flex-col justify-center gap-1 px-2">
      <div className="h-2 w-16 rounded-sm bg-gray-700" />
      <div className="h-1.5 w-11 rounded-sm bg-gray-300" />
      <div className="h-3 w-10 rounded-full mt-0.5" style={{ backgroundColor: primary }} />
    </div>
    <div className="w-1/2 rounded-r-md" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
  </div>
);

const MinimalPreview: React.FC<HeroPreviewProps> = ({ primary }) => (
  <div className="w-full h-16 rounded-md overflow-hidden bg-gray-50 border border-gray-100 flex items-center px-3">
    <div className="flex flex-col gap-1">
      <div className="h-3 w-20 rounded-sm bg-gray-800" />
      <div className="h-2 w-14 rounded-sm bg-gray-300" />
      <div className="h-4 w-12 rounded-full mt-0.5 border-2" style={{ borderColor: primary }} />
    </div>
  </div>
);

const CinematicPreview: React.FC<HeroPreviewProps> = ({ primary, secondary }) => (
  <div className="w-full h-16 rounded-md overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 40%, transparent)' }} />
    <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-0.5">
      <div className="h-2 w-20 rounded-sm bg-white/80" />
      <div className="h-1.5 w-14 rounded-sm bg-white/50" />
    </div>
  </div>
);

const CardPreview: React.FC<HeroPreviewProps> = ({ primary, secondary }) => (
  <div className="w-full h-16 rounded-md overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-1.5 flex flex-col items-center gap-1">
        <div className="h-2 w-16 rounded-sm bg-white/80" />
        <div className="h-1.5 w-10 rounded-sm bg-white/50" />
      </div>
    </div>
  </div>
);

const HERO_STYLES: { id: HeroStyle; label: string; description: string; Preview: React.FC<HeroPreviewProps> }[] = [
  { id: 'fullbleed', label: 'Full Bleed', description: 'Full-height bg, text centered with overlay', Preview: FullBleedPreview },
  { id: 'split', label: 'Split', description: 'Text left · Image or color right', Preview: SplitPreview },
  { id: 'minimal', label: 'Minimal', description: 'Light bg, large text left-aligned', Preview: MinimalPreview },
  { id: 'cinematic', label: 'Cinematic', description: 'Extra tall, text pinned to bottom', Preview: CinematicPreview },
  { id: 'card', label: 'Card', description: 'Frosted card floating over background', Preview: CardPreview },
];

// ─── Color Swatch ─────────────────────────────────────────────────────────────

const ColorSwatch: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-gray-500">{label}</Label>
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs font-mono w-28" maxLength={7} />
    </div>
  </div>
);

// ─── Live Hero Preview ────────────────────────────────────────────────────────

function buildHeroBg(bgType: HeroBgType, gradFrom: string, gradTo: string, gradAngle: number, solidColor: string, imageUrl?: string): string {
  if (bgType === 'image' && imageUrl) return `url(${imageUrl})`;
  if (bgType === 'solid') return solidColor;
  return `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})`;
}

interface LivePreviewProps {
  style: HeroStyle; bgType: HeroBgType; gradFrom: string; gradTo: string;
  gradAngle: number; solidColor: string; overlayOpacity: number;
  textColor: string; textAlign: HeroTextAlign; title: string; subtitle: string;
  imageUrl?: string; primary: string;
}

const LiveHeroPreview: React.FC<LivePreviewProps> = ({
  style, bgType, gradFrom, gradTo, gradAngle, solidColor, overlayOpacity,
  textColor, textAlign, title, subtitle, imageUrl, primary,
}) => {
  const bg = buildHeroBg(bgType, gradFrom, gradTo, gradAngle, solidColor, imageUrl);
  const overlayAlpha = Math.round(overlayOpacity * 2.55).toString(16).padStart(2, '0');
  const alignClass = textAlign === 'left' ? 'items-start text-left' : textAlign === 'right' ? 'items-end text-right' : 'items-center text-center';
  const displayTitle = title || 'Your Hero Title';
  const displaySub = subtitle || 'Your hero subtitle goes here';

  if (style === 'fullbleed') return (
    <div className="relative h-36 bg-cover bg-center rounded-lg overflow-hidden" style={{ background: bg, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0" style={{ backgroundColor: `#000000${overlayAlpha}` }} />
      <div className={`absolute inset-0 flex flex-col justify-center px-4 gap-1 ${alignClass}`}>
        <p className="font-bold text-sm leading-tight" style={{ color: textColor }}>{displayTitle}</p>
        <p className="text-xs opacity-80" style={{ color: textColor }}>{displaySub}</p>
        <div className="mt-1 h-5 w-16 rounded-full text-[9px] flex items-center justify-center font-medium" style={{ backgroundColor: primary, color: '#fff' }}>View Products</div>
      </div>
    </div>
  );

  if (style === 'split') return (
    <div className="h-36 rounded-lg overflow-hidden flex">
      <div className="w-1/2 bg-white flex flex-col justify-center px-4 gap-1.5">
        <p className="font-bold text-xs leading-tight text-gray-900">{displayTitle}</p>
        <p className="text-[10px] text-gray-500">{displaySub}</p>
        <div className="h-5 w-16 rounded-full text-[9px] flex items-center justify-center font-medium text-white" style={{ backgroundColor: primary }}>View Products</div>
      </div>
      <div className="w-1/2 bg-cover bg-center" style={{ background: bg, backgroundSize: 'cover' }}>
        {bgType !== 'image' && <div className="w-full h-full" style={{ background: bg }} />}
      </div>
    </div>
  );

  if (style === 'minimal') return (
    <div className={`h-36 rounded-lg overflow-hidden bg-white border border-gray-100 flex items-center px-6`}>
      <div className={`flex flex-col gap-1.5 w-full ${alignClass}`}>
        <p className="font-bold text-sm text-gray-900">{displayTitle}</p>
        <p className="text-[11px] text-gray-500">{displaySub}</p>
        <div className="h-5 w-16 rounded-full text-[9px] flex items-center justify-center font-medium text-white mt-1" style={{ backgroundColor: primary }}>View Products</div>
      </div>
    </div>
  );

  if (style === 'cinematic') return (
    <div className="relative h-36 rounded-lg overflow-hidden bg-cover bg-center" style={{ background: bg, backgroundSize: 'cover' }}>
      <div className="absolute inset-0" style={{ backgroundColor: `#000000${overlayAlpha}` }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
      <div className={`absolute bottom-0 left-0 right-0 px-4 pb-3 flex flex-col gap-1 ${alignClass}`}>
        <p className="font-bold text-xs" style={{ color: textColor }}>{displayTitle}</p>
        <p className="text-[10px] opacity-70" style={{ color: textColor }}>{displaySub}</p>
      </div>
    </div>
  );

  if (style === 'card') {
    const justifyCard = textAlign === 'left' ? 'justify-start pl-3' : textAlign === 'right' ? 'justify-end pr-3' : 'justify-center';
    return (
      <div className="relative h-36 rounded-lg overflow-hidden bg-cover bg-center" style={{ background: bg, backgroundSize: 'cover' }}>
        <div className="absolute inset-0" style={{ backgroundColor: `#000000${overlayAlpha}` }} />
        <div className={`absolute inset-0 flex items-center ${justifyCard}`}>
          <div className={`bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-4 py-3 flex flex-col gap-1 ${alignClass}`} style={{ width: '65%' }}>
            <p className="font-bold text-xs" style={{ color: textColor }}>{displayTitle}</p>
            <p className="text-[10px] opacity-70" style={{ color: textColor }}>{displaySub}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const HomepageEditor: React.FC = () => {
  const { store, setStore } = useOutletContext<OutletContextType>();

  // Features
  const [featuresEnabled, setFeaturesEnabled] = useState(store?.features_enabled !== false);
  const [featuresLayout, setFeaturesLayout] = useState<FeaturesLayout>(store?.features_layout ?? 'grid');
  const [featuresTitle, setFeaturesTitle] = useState(store?.features_title ?? '');
  const [featuresSubtitle, setFeaturesSubtitle] = useState(store?.features_subtitle ?? '');
  const [features, setFeatures] = useState<FeatureItem[]>(store?.features?.length ? store.features : DEFAULT_FEATURES);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  // FAQ
  const [faqEnabled, setFaqEnabled] = useState(store?.faq_enabled !== false);
  const [faqStyle, setFaqStyle] = useState<FaqStyle>(store?.faq_style ?? 'clean');
  const [faqTitle, setFaqTitle] = useState(store?.faq_title ?? '');
  const [faqItems, setFaqItems] = useState<FaqItem[]>(store?.faq_items?.length ? store.faq_items : DEFAULT_FAQS);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);

  // Hero style
  const [heroStyle, setHeroStyle] = useState<HeroStyle>(store?.hero_style ?? 'fullbleed');
  const [heroBgType, setHeroBgType] = useState<HeroBgType>(store?.hero_bg_type ?? 'gradient');
  const [gradFrom, setGradFrom] = useState(store?.hero_gradient_from ?? store?.color_primary ?? '#4F46E5');
  const [gradTo, setGradTo] = useState(store?.hero_gradient_to ?? store?.color_secondary ?? '#0D9488');
  const [gradAngle, setGradAngle] = useState(store?.hero_gradient_angle ?? 135);
  const [solidColor, setSolidColor] = useState(store?.hero_solid_color ?? store?.color_primary ?? '#4F46E5');
  const [overlayOpacity, setOverlayOpacity] = useState(store?.hero_overlay_opacity ?? 40);
  const [heroTextColor, setHeroTextColor] = useState(store?.hero_text_color ?? '#ffffff');
  const [textAlign, setTextAlign] = useState<HeroTextAlign>(store?.hero_text_align ?? 'center');
  const [heroCtaEnabled, setHeroCtaEnabled] = useState(store?.hero_cta_enabled !== false);
  const [heroCtaText, setHeroCtaText] = useState(store?.hero_cta_text ?? '');
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [uploadingMobileImage, setUploadingMobileImage] = useState(false);
  const [sliderImages, setSliderImages] = useState<HeroSliderImage[]>(store?.hero_slider_images ?? []);
  const [uploadingSliderImage, setUploadingSliderImage] = useState(false);

  // Hero content
  const [heroTitle, setHeroTitle] = useState(store?.hero_title ?? '');
  const [heroSubtitle, setHeroSubtitle] = useState(store?.hero_subtitle ?? '');
  const [aboutTitle, setAboutTitle] = useState(store?.about_title ?? 'About Us');
  const [aboutContent, setAboutContent] = useState(store?.about_content ?? '');
  const [saving, setSaving] = useState(false);

  // ── Homepage sections reorder state ──
  const [sections, setSections] = useState<{ id: string; enabled: boolean }[]>(
    () => parseSections(store?.homepage_sections)
  );
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialInput>({ customer_name: '', customer_location: '', content: '', rating: 5 });
  const [savingTestimonial, setSavingTestimonial] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (store) {
      setFeaturesEnabled(store.features_enabled !== false);
      setFeaturesLayout(store.features_layout ?? 'grid');
      setFeaturesTitle(store.features_title ?? '');
      setFeaturesSubtitle(store.features_subtitle ?? '');
      setFeatures(store.features?.length ? store.features : DEFAULT_FEATURES);
      setFaqEnabled(store.faq_enabled !== false);
      setFaqStyle(store.faq_style ?? 'clean');
      setFaqTitle(store.faq_title ?? '');
      setFaqItems(store.faq_items?.length ? store.faq_items : DEFAULT_FAQS);
      setHeroStyle(store.hero_style ?? 'fullbleed');
      setHeroBgType(store.hero_bg_type ?? 'gradient');
      setGradFrom(store.hero_gradient_from ?? store.color_primary ?? '#4F46E5');
      setGradTo(store.hero_gradient_to ?? store.color_secondary ?? '#0D9488');
      setGradAngle(store.hero_gradient_angle ?? 135);
      setSolidColor(store.hero_solid_color ?? store.color_primary ?? '#4F46E5');
      setOverlayOpacity(store.hero_overlay_opacity ?? 40);
      setHeroTextColor(store.hero_text_color ?? '#ffffff');
      setTextAlign(store.hero_text_align ?? 'center');
      setHeroCtaEnabled(store.hero_cta_enabled !== false);
      setHeroCtaText(store.hero_cta_text ?? '');
      setHeroTitle(store.hero_title ?? '');
      setHeroSubtitle(store.hero_subtitle ?? '');
      setSliderImages(store.hero_slider_images ?? []);
      setAboutTitle(store.about_title ?? 'About Us');
      setAboutContent(store.about_content ?? '');
    }
  }, [store]);

  useEffect(() => {
    const loadTestimonials = async () => {
      if (!store?.id) return;
      const result = await getTestimonials(store.id);
      if (result.success && result.data) setTestimonials(result.data);
      setLoadingTestimonials(false);
    };
    loadTestimonials();
  }, [store?.id]);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setUploadingHeroImage(true);
    const result = await uploadStoreAsset(store.id, file, 'banner');
    if (result.success && result.url) {
      await updateQuickStore(store.id, { banner_image_url: result.url, hero_bg_type: 'image' });
      setStore({ ...store, banner_image_url: result.url });
      setHeroBgType('image');
      toast.success('Desktop hero image uploaded!');
    } else {
      toast.error(result.error || 'Failed to upload image');
    }
    setUploadingHeroImage(false);
  };

  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setUploadingMobileImage(true);
    const result = await uploadStoreAsset(store.id, file, 'banner-mobile');
    if (result.success && result.url) {
      await updateQuickStore(store.id, { hero_mobile_image_url: result.url });
      setStore({ ...store, hero_mobile_image_url: result.url });
      toast.success('Mobile hero image uploaded!');
    } else {
      toast.error(result.error || 'Failed to upload image');
    }
    setUploadingMobileImage(false);
  };

  // ── Slider image handlers ──
  const handleSliderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    if (sliderImages.length >= 3) { toast.error('Maximum 3 slider images allowed'); return; }
    setUploadingSliderImage(true);
    const result = await uploadStoreAsset(store.id, file, 'banner');
    if (result.success && result.url) {
      const newSlide: HeroSliderImage = { id: `slide-${Date.now()}`, url: result.url };
      const updated = [...sliderImages, newSlide];
      setSliderImages(updated);
      await updateQuickStore(store.id, { hero_slider_images: updated, hero_bg_type: 'image' });
      setHeroBgType('image');
      toast.success(`Slide ${updated.length} uploaded!`);
    } else {
      toast.error(result.error || 'Failed to upload image');
    }
    setUploadingSliderImage(false);
  };

  const handleSliderMobileUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideId: string) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    const result = await uploadStoreAsset(store.id, file, 'banner');
    if (result.success && result.url) {
      const updated = sliderImages.map(s => s.id === slideId ? { ...s, mobile_url: result.url } : s);
      setSliderImages(updated);
      await updateQuickStore(store.id, { hero_slider_images: updated });
      toast.success('Mobile image added!');
    } else {
      toast.error(result.error || 'Failed to upload');
    }
  };

  const handleRemoveSliderImage = async (slideId: string) => {
    if (!store?.id) return;
    const updated = sliderImages.filter(s => s.id !== slideId);
    setSliderImages(updated);
    await updateQuickStore(store.id, { hero_slider_images: updated });
    toast.success('Slide removed');
  };

  // ── Section reorder & toggle handlers ──
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || idx === 0) return;
    setDragOverIdx(idx);
  };

  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx || idx === 0) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    setSections((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIdx, 1);
      const targetIdx = idx === 0 ? 1 : idx;
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSectionToggle = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // ── Reset-to-default handlers ──
  const storeName = store?.store_name || 'Our Store';

  const resetHero = () => {
    setHeroStyle('fullbleed');
    setHeroBgType('gradient');
    setGradFrom(store?.color_primary ?? '#4f46e5');
    setGradTo(store?.color_secondary ?? '#0ea5e9');
    setGradAngle(135);
    setSolidColor(store?.color_primary ?? '#4f46e5');
    setOverlayOpacity(15);
    setHeroTextColor('#ffffff');
    setTextAlign('center');
    setHeroCtaEnabled(true);
    setHeroCtaText('Browse Products');
    setHeroTitle(`Welcome to ${storeName}`);
    setHeroSubtitle('Premium DTF transfers with fast turnaround. Upload your designs, we handle the rest.');
    setSliderImages([]);
    toast.success('Hero reset to defaults — save to apply');
  };

  const resetAbout = () => {
    setAboutTitle('About Us');
    setAboutContent(`${storeName} specializes in high-quality Direct-to-Film (DTF) printing with fast turnaround times. We use the latest printing technology to deliver vibrant, durable transfers that look great on any fabric. Whether you need a single custom print or bulk gang sheets for your business, we've got you covered.`);
    toast.success('About section reset to defaults — save to apply');
  };

  const resetFeatures = () => {
    setFeaturesEnabled(true);
    setFeaturesLayout('grid');
    setFeaturesTitle('Why customers choose us');
    setFeaturesSubtitle('Everything you need for professional DTF printing');
    setFeatures([...DEFAULT_FEATURES]);
    toast.success('Features reset to defaults — save to apply');
  };

  const resetFaq = () => {
    setFaqEnabled(true);
    setFaqStyle('clean');
    setFaqTitle('Frequently Asked Questions');
    setFaqItems([...DEFAULT_FAQS]);
    toast.success('FAQ reset to defaults — save to apply');
  };

  const DEFAULT_TESTIMONIALS: TestimonialInput[] = [
    {
      customer_name: 'Alex Rivera',
      customer_location: 'Texas, USA',
      content: 'Excellent print quality and super fast delivery. The gang sheets were perfectly arranged with zero wasted space. Will definitely order again!',
      rating: 5,
    },
    {
      customer_name: 'Sarah Mitchell',
      customer_location: 'London, UK',
      content: 'Very impressed with the color vibrancy and the transfers adhered perfectly to the fabric. Great value for money with bulk pricing.',
      rating: 5,
    },
    {
      customer_name: 'James Chen',
      customer_location: 'Toronto, CA',
      content: 'The online builder made it so easy to arrange my designs. Customer support was responsive and helpful. Highly recommended for DTF printing!',
      rating: 4,
    },
  ];

  const [resettingTestimonials, setResettingTestimonials] = useState(false);

  const resetTestimonials = async () => {
    if (!store?.id) return;
    if (!confirm('This will replace all existing testimonials with sample reviews. Continue?')) return;
    setResettingTestimonials(true);
    try {
      // Delete existing
      for (const t of testimonials) {
        await deleteTestimonial(t.id);
      }
      // Create defaults
      const created: Testimonial[] = [];
      for (const input of DEFAULT_TESTIMONIALS) {
        const result = await createTestimonial(store.id, input);
        if (result.success && result.data) created.push(result.data);
      }
      setTestimonials(created);
      toast.success('Testimonials reset to sample reviews');
    } catch {
      toast.error('Failed to reset testimonials');
    }
    setResettingTestimonials(false);
  };

  const handleSaveContent = async () => {
    if (!store?.id) return;
    setSaving(true);
    const result = await updateQuickStore(store.id, {
      homepage_sections: serializeSections(sections),
      features_enabled: featuresEnabled,
      features_layout: featuresLayout,
      features_title: featuresTitle || null,
      features_subtitle: featuresSubtitle || null,
      features: features,
      faq_enabled: faqEnabled,
      faq_style: faqStyle,
      faq_title: faqTitle || null,
      faq_items: faqItems,
      hero_style: heroStyle,
      hero_bg_type: heroBgType,
      hero_slider_images: sliderImages,
      hero_gradient_from: gradFrom,
      hero_gradient_to: gradTo,
      hero_gradient_angle: gradAngle,
      hero_solid_color: solidColor,
      hero_overlay_opacity: overlayOpacity,
      hero_text_color: heroTextColor,
      hero_text_align: textAlign,
      hero_cta_enabled: heroCtaEnabled,
      hero_cta_text: heroCtaText,
      hero_title: heroTitle,
      hero_subtitle: heroSubtitle,
      about_title: aboutTitle,
      about_content: aboutContent,
    });
    if (result.success && result.data) {
      setStore(result.data);
      toast.success('Homepage saved!');
    } else {
      toast.error(result.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleOpenTestimonialDialog = (testimonial?: Testimonial) => {
    if (testimonial) {
      setEditingTestimonial(testimonial);
      setTestimonialForm({ customer_name: testimonial.customer_name, customer_location: testimonial.customer_location || '', content: testimonial.content, rating: testimonial.rating || 5 });
    } else {
      setEditingTestimonial(null);
      setTestimonialForm({ customer_name: '', customer_location: '', content: '', rating: 5 });
    }
    setDialogOpen(true);
  };

  const handleSaveTestimonial = async () => {
    if (!store?.id || !testimonialForm.customer_name || !testimonialForm.content) {
      toast.error('Name and content are required'); return;
    }
    setSavingTestimonial(true);
    try {
      if (editingTestimonial) {
        const result = await updateTestimonial(editingTestimonial.id, testimonialForm);
        if (result.success && result.data) { setTestimonials(prev => prev.map(t => t.id === editingTestimonial.id ? result.data! : t)); toast.success('Testimonial updated!'); }
        else toast.error(result.error || 'Failed to update');
      } else {
        const result = await createTestimonial(store.id, testimonialForm);
        if (result.success && result.data) { setTestimonials(prev => [...prev, result.data!]); toast.success('Testimonial added!'); }
        else toast.error(result.error || 'Failed to add');
      }
      setDialogOpen(false);
    } catch { toast.error('An error occurred'); }
    setSavingTestimonial(false);
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return;
    const result = await deleteTestimonial(id);
    if (result.success) { setTestimonials(prev => prev.filter(t => t.id !== id)); toast.success('Testimonial deleted'); }
    else toast.error(result.error || 'Failed to delete');
  };

  if (!store) return <div className="p-6 text-center text-gray-500">Please complete store setup first</div>;

  const primary = store.color_primary ?? '#4F46E5';
  const secondary = store.color_secondary ?? '#0D9488';
  const showOverlay = heroStyle !== 'minimal' && heroStyle !== 'split';
  const showTextColor = heroStyle !== 'minimal' && heroStyle !== 'split';

  return (
    <div className="space-y-6 pb-20">

      {/* Homepage Layout / Section Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Homepage Layout
          </CardTitle>
          <CardDescription>
            Drag to reorder sections. Toggle visibility with the eye icon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sections.map((sec, idx) => {
              const config = ALL_SECTIONS.find((s) => s.id === sec.id);
              if (!config) return null;
              const Icon = config.icon;
              const isLocked = !!config.locked;
              const isDragging = dragIdx === idx;
              const isDragOver = dragOverIdx === idx && dragIdx !== idx;

              return (
                <div
                  key={sec.id}
                  draggable={!isLocked}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all
                    ${isDragging ? 'opacity-40 border-dashed border-indigo-300 bg-indigo-50' : 'border-gray-200'}
                    ${isDragOver ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : ''}
                    ${!sec.enabled && !isLocked ? 'opacity-50 bg-gray-50' : 'bg-white'}
                    ${!isLocked ? 'cursor-grab active:cursor-grabbing' : ''}
                  `}
                >
                  {/* Drag handle */}
                  <div className={`flex-shrink-0 ${isLocked ? 'invisible' : 'text-gray-400'}`}>
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Section icon + label */}
                  <Icon className={`h-4 w-4 flex-shrink-0 ${sec.enabled ? 'text-gray-600' : 'text-gray-400'}`} />
                  <span className={`flex-1 text-sm font-medium ${sec.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                    {config.label}
                  </span>

                  {/* Toggle visibility */}
                  {isLocked ? (
                    <span className="text-xs text-gray-400 italic mr-1">Always visible</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSectionToggle(sec.id)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                        sec.enabled ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-gray-500'
                      }`}
                      title={sec.enabled ? 'Hide section' : 'Show section'}
                    >
                      {sec.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Changes apply when you save.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Hero Style Picker */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Hero Style
                  </CardTitle>
                  <CardDescription>Choose how the top banner of your homepage looks</CardDescription>
                </div>
                <button type="button" onClick={resetHero} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors" title="Reset hero to defaults">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {HERO_STYLES.map(({ id, label, description, Preview }) => {
                  const isSelected = heroStyle === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setHeroStyle(id)}
                      className={cn(
                        'relative flex flex-col gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                        isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center z-10">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <Preview primary={primary} secondary={secondary} />
                      <div>
                        <p className="font-medium text-sm text-gray-900">{label}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Hero Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Hero Content
              </CardTitle>
              <CardDescription>Title, subtitle and text alignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hero_title">Hero Title</Label>
                <Input id="hero_title" placeholder={`Welcome to ${store.store_name}`} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_subtitle">Hero Subtitle</Label>
                <Input id="hero_subtitle" placeholder="Quality DTF Printing for your business" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
              </div>
              {/* Text alignment - only for styles that use it */}
              {heroStyle !== 'split' && (
                <div className="space-y-2">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-2">
                    {([
                      { id: 'left' as HeroTextAlign, icon: <AlignLeft className="h-4 w-4" /> },
                      { id: 'center' as HeroTextAlign, icon: <AlignCenter className="h-4 w-4" /> },
                      { id: 'right' as HeroTextAlign, icon: <AlignRight className="h-4 w-4" /> },
                    ]).map(({ id, icon }) => (
                      <button
                        key={id}
                        onClick={() => setTextAlign(id)}
                        className={cn(
                          'flex-1 h-9 rounded-lg border-2 flex items-center justify-center transition-all',
                          textAlign === id ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* CTA Button */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Call to Action Button</Label>
                    <p className="text-xs text-gray-500 mt-0.5">Show a button linking to your products page</p>
                  </div>
                  <Switch checked={heroCtaEnabled} onCheckedChange={setHeroCtaEnabled} />
                </div>
                {heroCtaEnabled && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Button text</Label>
                    <Input
                      placeholder="View Products"
                      value={heroCtaText}
                      onChange={(e) => setHeroCtaText(e.target.value)}
                      maxLength={40}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    About Section
                  </CardTitle>
                  <CardDescription>Tell customers about your business</CardDescription>
                </div>
                <button type="button" onClick={resetAbout} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors" title="Reset about to defaults">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="about_title">Section Title</Label>
                <Input id="about_title" placeholder="About Us" value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="about_content">About Content</Label>
                <Textarea
                  id="about_content"
                  placeholder="Tell your customers about your business..."
                  value={aboutContent}
                  onChange={(e) => setAboutContent(e.target.value)}
                  rows={5}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 text-right">{aboutContent.length}/500</p>
              </div>
            </CardContent>
          </Card>

          {/* Features Section */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Product Features
                  </CardTitle>
                  <CardDescription className="mt-1">4 feature highlights shown between About Us and Products</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={resetFeatures} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors" title="Reset features to defaults">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <Switch checked={featuresEnabled} onCheckedChange={setFeaturesEnabled} />
                </div>
              </div>
            </CardHeader>
            {featuresEnabled && (
              <CardContent className="space-y-4">
              {/* Section Heading */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Section heading</Label>
                    <Input
                      value={featuresTitle}
                      onChange={(e) => setFeaturesTitle(e.target.value)}
                      placeholder="Why customers choose us"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Section subtitle</Label>
                    <Input
                      value={featuresSubtitle}
                      onChange={(e) => setFeaturesSubtitle(e.target.value)}
                      placeholder="Everything you need for professional DTF printing"
                      className="text-sm"
                    />
                  </div>
                </div>

                {/* Layout toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Layout style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'grid'        as FeaturesLayout, label: '2×2 Grid',    desc: 'Cards with stats' },
                      { id: 'alternating' as FeaturesLayout, label: 'Alternating', desc: 'Side-by-side rows' },
                      { id: 'bento'       as FeaturesLayout, label: 'Bento',       desc: 'Asymmetric grid' },
                      { id: 'iconrow'     as FeaturesLayout, label: 'Icon Row',    desc: '4-col minimal' },
                      { id: 'steps'       as FeaturesLayout, label: 'Steps',       desc: 'Numbered flow' },
                      { id: 'dark'        as FeaturesLayout, label: 'Dark Bold',   desc: 'Dark background' },
                    ] as const).map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setFeaturesLayout(id)}
                        className={cn(
                          'flex flex-col gap-0.5 p-2.5 rounded-xl border-2 text-left transition-all',
                          featuresLayout === id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <span className={cn('text-xs font-semibold', featuresLayout === id ? 'text-indigo-700' : 'text-gray-800')}>{label}</span>
                        <span className="text-[10px] text-gray-400 leading-tight">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expandable edit section */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setFeaturesExpanded(!featuresExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">Pre-filled for you</span>
                      <span className="text-xs text-gray-400">· expand to customise</span>
                    </div>
                    {featuresExpanded
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                  </button>

                  {featuresExpanded && (
                    <div className="p-4 space-y-4 divide-y divide-gray-50">
                      {features.map((feat, i) => (
                        <div key={feat.id} className={cn('space-y-2.5', i > 0 && 'pt-4')}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${feat.color}25` }}>
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: feat.color }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-600">Feature {i + 1}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400">Icon</span>
                              <Switch
                                checked={feat.show_icon !== false}
                                onCheckedChange={(v) => setFeatures(features.map((f, idx) => idx === i ? { ...f, show_icon: v } : f))}
                              />
                            </div>
                          </div>
                          <Input
                            value={feat.heading}
                            onChange={(e) => setFeatures(features.map((f, idx) => idx === i ? { ...f, heading: e.target.value } : f))}
                            placeholder="Feature heading"
                            className="text-sm h-8"
                          />
                          <Textarea
                            value={feat.description}
                            onChange={(e) => setFeatures(features.map((f, idx) => idx === i ? { ...f, description: e.target.value } : f))}
                            placeholder="30–50 word description"
                            rows={2}
                            className="text-xs resize-none"
                          />
                        </div>
                      ))}
                      <div className="pt-3">
                        <button
                          onClick={() => setFeatures(DEFAULT_FEATURES)}
                          className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline"
                        >
                          ↺ Reset all to defaults
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5" />
                    FAQ
                  </CardTitle>
                  <CardDescription className="mt-1">Accordion Q&A shown below Testimonials</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={resetFaq} className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors" title="Reset FAQ to defaults">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </button>
                  <Switch checked={faqEnabled} onCheckedChange={setFaqEnabled} />
                </div>
              </div>
            </CardHeader>
            {faqEnabled && (
              <CardContent className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Section heading</Label>
                  <Input value={faqTitle} onChange={e => setFaqTitle(e.target.value)} placeholder="Frequently Asked Questions" className="text-sm" />
                </div>

                {/* Style picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Accordion style</Label>
                  <div className="flex gap-2">
                    {([
                      { id: 'clean' as FaqStyle, label: 'Clean',  desc: 'Minimal dividers' },
                      { id: 'card'  as FaqStyle, label: 'Card',   desc: 'Each item a card' },
                      { id: 'bold'  as FaqStyle, label: 'Bold',   desc: 'Dark background' },
                    ] as const).map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setFaqStyle(id)}
                        className={cn(
                          'flex-1 flex flex-col gap-0.5 p-2.5 rounded-xl border-2 text-left transition-all',
                          faqStyle === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        <span className={cn('text-xs font-semibold', faqStyle === id ? 'text-indigo-700' : 'text-gray-800')}>{label}</span>
                        <span className="text-[10px] text-gray-400">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ items */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Questions ({faqItems.length})</Label>
                  {faqItems.map((item, i) => (
                    <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      {/* Item header */}
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-500 w-5 flex-shrink-0">Q{i + 1}</span>
                        {editingFaqId === item.id ? (
                          <Input
                            value={item.question}
                            onChange={e => setFaqItems(faqItems.map((f, idx) => idx === i ? { ...f, question: e.target.value } : f))}
                            className="h-7 text-xs flex-1"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-xs text-gray-700 flex-1 cursor-pointer hover:text-gray-900 truncate"
                            onClick={() => setEditingFaqId(item.id)}
                          >
                            {item.question || 'Click to edit question'}
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingFaqId(editingFaqId === item.id ? null : item.id)}
                            className="text-[10px] text-indigo-500 hover:text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-50"
                          >
                            {editingFaqId === item.id ? 'Done' : 'Edit'}
                          </button>
                          <button
                            onClick={() => setFaqItems(faqItems.filter((_, idx) => idx !== i))}
                            className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Answer */}
                      {editingFaqId === item.id && (
                        <div className="p-3 border-t border-gray-100">
                          <Textarea
                            value={item.answer}
                            onChange={e => setFaqItems(faqItems.map((f, idx) => idx === i ? { ...f, answer: e.target.value } : f))}
                            placeholder="Answer..."
                            rows={3}
                            className="text-xs resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add + Reset */}
                  <div className="flex items-center gap-3 pt-1">
                    {faqItems.length < 10 ? (
                      <button
                        onClick={() => {
                          const newItem: FaqItem = { id: `faq_${Date.now()}`, question: '', answer: '' };
                          setFaqItems([...faqItems, newItem]);
                          setEditingFaqId(newItem.id);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add question
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Maximum 10 questions reached</span>
                    )}
                    <button
                      onClick={() => setFaqItems(DEFAULT_FAQS)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ↺ Reset to defaults
                    </button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Background */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Hero Background
              </CardTitle>
              <CardDescription>Choose what fills the hero area</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Bg type tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                {([
                  { id: 'gradient' as HeroBgType, label: 'Gradient' },
                  { id: 'solid' as HeroBgType, label: 'Solid Color' },
                  { id: 'image' as HeroBgType, label: 'Image' },
                ]).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setHeroBgType(id)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                      heroBgType === id || (id === 'image' && heroBgType === 'slider') ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Gradient controls */}
              {heroBgType === 'gradient' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <ColorSwatch label="From color" value={gradFrom} onChange={setGradFrom} />
                    <ColorSwatch label="To color" value={gradTo} onChange={setGradTo} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-500">Angle</Label>
                      <span className="text-xs text-gray-500 font-mono">{gradAngle}°</span>
                    </div>
                    <Slider min={0} max={360} step={15} value={[gradAngle]} onValueChange={([v]) => setGradAngle(v)} />
                    <div className="h-6 rounded-md" style={{ background: `linear-gradient(${gradAngle}deg, ${gradFrom}, ${gradTo})` }} />
                  </div>
                </div>
              )}

              {/* Solid color */}
              {heroBgType === 'solid' && (
                <ColorSwatch label="Background color" value={solidColor} onChange={setSolidColor} />
              )}

              {/* Image upload (unified — 1 image = static, 2-3 = slider) */}
              {(heroBgType === 'image' || heroBgType === 'slider') && (
                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-sm text-indigo-700 font-semibold mb-1">Recommended image sizes</p>
                    <div className="flex gap-6">
                      <div className="text-sm text-indigo-600"><span className="font-semibold">Desktop:</span> 1440 × 800 px</div>
                      <div className="text-sm text-indigo-600"><span className="font-semibold">Mobile:</span> 768 × 800 px</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Upload up to 3 images. {sliderImages.length <= 1 ? 'A single image shows as a static hero.' : 'Multiple images create an auto-rotating slider with navigation arrows.'}
                    {' '}Each image can have an optional mobile version.
                  </p>
                  
                  {sliderImages.map((slide, idx) => (
                    <div key={slide.id} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {sliderImages.length === 1 ? 'Hero Image' : `Slide ${idx + 1}`}
                        </span>
                        <button
                          onClick={() => handleRemoveSliderImage(slide.id)}
                          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                      {/* Desktop preview */}
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 font-medium">Desktop (1440×800)</span>
                        <img src={slide.url} alt={`Slide ${idx + 1}`} className="w-full h-20 object-cover rounded-md border" />
                      </div>
                      {/* Mobile image */}
                      {slide.mobile_url ? (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-medium">Mobile (768×800)</span>
                          <img src={slide.mobile_url} alt={`Slide ${idx + 1} mobile`} className="w-full h-16 object-cover rounded-md border" />
                          <button
                            onClick={async () => {
                              const updated = sliderImages.map(s => s.id === slide.id ? { ...s, mobile_url: null } : s);
                              setSliderImages(updated);
                              await updateQuickStore(store.id, { hero_slider_images: updated });
                            }}
                            className="text-xs text-red-400 hover:underline"
                          >
                            Remove mobile image
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer block">
                          <div className="border border-dashed border-gray-300 rounded-md p-2 text-center hover:border-indigo-300 transition-colors">
                            <p className="text-xs text-gray-400">+ Add mobile image (768×800 · optional)</p>
                          </div>
                          <input type="file" accept="image/*" onChange={(e) => handleSliderMobileUpload(e, slide.id)} className="hidden" />
                        </label>
                      )}
                    </div>
                  ))}

                  {sliderImages.length < 3 && (
                    <label className="cursor-pointer block">
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center hover:border-indigo-300 transition-colors">
                        {uploadingSliderImage ? (
                          <Loader2 className="h-6 w-6 mx-auto animate-spin text-gray-400" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 mx-auto text-gray-300 mb-1.5" />
                            <p className="text-xs text-gray-500">
                              {sliderImages.length === 0 ? 'Upload hero image' : `Add image ${sliderImages.length + 1} of 3`}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">1440 × 800 px recommended</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleSliderImageUpload} className="hidden" disabled={uploadingSliderImage} />
                    </label>
                  )}
                </div>
              )}

              {/* Overlay opacity */}
              {showOverlay && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Dark overlay</Label>
                    <span className="text-xs text-gray-500 font-mono">{overlayOpacity}%</span>
                  </div>
                  <Slider min={0} max={80} step={5} value={[overlayOpacity]} onValueChange={([v]) => setOverlayOpacity(v)} />
                </div>
              )}

              {/* Text color */}
              {showTextColor && (
                <div className="pt-1 border-t border-gray-100">
                  <ColorSwatch label="Text color" value={heroTextColor} onChange={setHeroTextColor} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-700">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveHeroPreview
                style={heroStyle} bgType={heroBgType} gradFrom={gradFrom} gradTo={gradTo}
                gradAngle={gradAngle} solidColor={solidColor} overlayOpacity={overlayOpacity}
                textColor={heroTextColor} textAlign={textAlign} title={heroTitle} subtitle={heroSubtitle}
                imageUrl={store.banner_image_url ?? undefined} primary={primary}
              />
            </CardContent>
          </Card>

          {/* Testimonials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Quote className="h-5 w-5" />
                    Testimonials
                  </CardTitle>
                  <CardDescription>Customer reviews and feedback</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetTestimonials}
                    disabled={resettingTestimonials}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    title="Reset to sample testimonials"
                  >
                    {resettingTestimonials ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Reset
                  </button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => handleOpenTestimonialDialog()}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Customer Name *</Label>
                        <Input placeholder="John Smith" value={testimonialForm.customer_name} onChange={(e) => setTestimonialForm(prev => ({ ...prev, customer_name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input placeholder="New York, USA" value={testimonialForm.customer_location || ''} onChange={(e) => setTestimonialForm(prev => ({ ...prev, customer_location: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Review *</Label>
                        <Textarea placeholder="Great quality prints!" value={testimonialForm.content} onChange={(e) => setTestimonialForm(prev => ({ ...prev, content: e.target.value }))} rows={3} />
                      </div>
                      <div className="space-y-2">
                        <Label>Rating</Label>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map((star) => (
                            <button key={star} type="button" onClick={() => setTestimonialForm(prev => ({ ...prev, rating: star }))} className="p-1">
                              <Star className={`h-6 w-6 ${star <= (testimonialForm.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTestimonial} disabled={savingTestimonial}>
                          {savingTestimonial && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {editingTestimonial ? 'Update' : 'Add'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTestimonials ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : testimonials.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Quote className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No testimonials yet</p>
                  <p className="text-sm">Add customer reviews to build trust</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {testimonials.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <GripVertical className="h-5 w-5 text-gray-300 mt-1 cursor-move" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.customer_name}</span>
                          {t.customer_location && <span className="text-sm text-gray-500">from {t.customer_location}</span>}
                        </div>
                        <div className="flex gap-0.5 my-1">
                          {[1,2,3,4,5].map((star) => (
                            <Star key={star} className={`h-3 w-3 ${star <= (t.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">"{t.content}"</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenTestimonialDialog(t)}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteTestimonial(t.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-50">
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-3 flex justify-end">
          <Button onClick={handleSaveContent} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HomepageEditor;
