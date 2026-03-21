import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { updateQuickStore } from '@/services/quickStoreService';
import {
  QuickStore,
  HeaderStyle,
  HeaderColor,
  TopBarStyle,
  FooterStyle,
} from '@/types/quickStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Loader2, Check, Layout, Sun, Moon, Palette,
  Megaphone, Plus, Trash2, GripVertical,
  AlignCenter, RotateCcw, MoveRight,
} from 'lucide-react';

interface OutletContextType {
  store: QuickStore | null;
  setStore: (store: QuickStore) => void;
}

// ─── Header Style Previews ────────────────────────────────────────────────────

interface PreviewProps { primary: string; bg: string; text: string; }

const ClassicPreview: React.FC<PreviewProps> = ({ primary, bg, text }) => (
  <div className="w-full rounded flex items-center justify-between px-3 h-9 border border-black/5" style={{ backgroundColor: bg }}>
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded" style={{ backgroundColor: primary }} />
      <div className="h-2 w-14 rounded-sm opacity-40" style={{ backgroundColor: text }} />
    </div>
    <div className="flex items-center gap-3">
      {[18, 22, 18].map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm opacity-30" style={{ width: w, backgroundColor: text }} />
      ))}
    </div>
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded-full border opacity-50" style={{ borderColor: primary }} />
      <div className="h-5 w-12 rounded text-[7px] flex items-center justify-center font-medium opacity-40" style={{ backgroundColor: text, color: bg }}>Login</div>
    </div>
  </div>
);

const MinimalPreview: React.FC<PreviewProps> = ({ primary, bg, text }) => (
  <div className="w-full rounded flex items-center justify-between px-3 h-9 border border-black/5" style={{ backgroundColor: bg }}>
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded" style={{ backgroundColor: primary }} />
      <div className="h-2 w-14 rounded-sm opacity-40" style={{ backgroundColor: text }} />
    </div>
    <div className="flex items-center gap-3">
      {[18, 22, 20, 14].map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm opacity-30" style={{ width: w, backgroundColor: text }} />
      ))}
      <div className="w-3.5 h-3.5 rounded-full border" style={{ borderColor: primary }} />
    </div>
  </div>
);

const CenteredPreview: React.FC<PreviewProps> = ({ primary, bg, text }) => (
  <div className="w-full rounded flex flex-col items-center justify-center gap-1.5 h-12 border border-black/5" style={{ backgroundColor: bg }}>
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: primary }} />
      <div className="h-2 w-12 rounded-sm opacity-40" style={{ backgroundColor: text }} />
    </div>
    <div className="flex items-center gap-3">
      {[18, 22, 16].map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm opacity-30" style={{ width: w, backgroundColor: text }} />
      ))}
    </div>
  </div>
);

const BoldPreview: React.FC<PreviewProps> = ({ primary, bg, text }) => (
  <div className="w-full rounded flex items-center justify-between px-3 h-9 border border-black/5" style={{ backgroundColor: bg }}>
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-5 rounded" style={{ backgroundColor: primary }} />
      <div className="flex flex-col gap-0.5">
        <div className="h-2 w-14 rounded-sm opacity-50" style={{ backgroundColor: text }} />
        <div className="h-1.5 w-10 rounded-sm opacity-25" style={{ backgroundColor: text }} />
      </div>
    </div>
    <div className="flex items-center gap-3">
      {[18, 22, 16].map((w, i) => (
        <div key={i} className="h-1.5 rounded-sm opacity-30" style={{ width: w, backgroundColor: text }} />
      ))}
      <div className="h-5 w-14 rounded-full text-[6px] flex items-center justify-center font-medium text-white" style={{ backgroundColor: primary }}>
        Order Now
      </div>
    </div>
  </div>
);

const HEADER_STYLES: { id: HeaderStyle; label: string; description: string; Preview: React.FC<PreviewProps> }[] = [
  { id: 'classic', label: 'Classic', description: 'Logo left · Nav center · Login right', Preview: ClassicPreview },
  { id: 'minimal', label: 'Minimal', description: 'Logo left · All links right · Clean', Preview: MinimalPreview },
  { id: 'centered', label: 'Centered', description: 'Logo centered · Nav links below', Preview: CenteredPreview },
  { id: 'bold', label: 'Bold', description: 'Logo + tagline · CTA button right', Preview: BoldPreview },
];

const TOPBAR_STYLES: { id: TopBarStyle; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'static', label: 'Static', description: 'One fixed line', icon: <AlignCenter className="h-4 w-4" /> },
  { id: 'carousel', label: 'Carousel', description: '2–3 rotating slides', icon: <RotateCcw className="h-4 w-4" /> },
  { id: 'marquee', label: 'Marquee', description: 'Scrolling text', icon: <MoveRight className="h-4 w-4" /> },
];

// ─── Color Swatch Button ──────────────────────────────────────────────────────

const ColorSwatch: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-gray-500">{label}</Label>
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-lg border-2 border-gray-200 overflow-hidden cursor-pointer hover:border-gray-300 transition-colors shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 text-xs font-mono w-28"
        maxLength={7}
      />
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const QSHeader: React.FC = () => {
  const { store, setStore } = useOutletContext<OutletContextType>();

  const [selectedStyle, setSelectedStyle] = useState<HeaderStyle>(store?.header_style ?? 'classic');
  const [selectedColor, setSelectedColor] = useState<HeaderColor>(store?.header_color ?? 'light');
  const [customColor, setCustomColor] = useState(store?.header_custom_color ?? store?.color_primary ?? '#6366f1');
  const [topbarEnabled, setTopbarEnabled] = useState(store?.topbar_enabled ?? false);
  const [topbarStyle, setTopbarStyle] = useState<TopBarStyle>(store?.topbar_style ?? 'static');
  const [topbarItems, setTopbarItems] = useState<string[]>(
    store?.topbar_items?.length ? store.topbar_items : ['Free delivery on orders above ₹500']
  );
  const [topbarBg, setTopbarBg] = useState(store?.topbar_bg_color ?? store?.color_primary ?? '#4f46e5');
  const [topbarText, setTopbarText] = useState(store?.topbar_text_color ?? '#ffffff');
  const [footerStyle, setFooterStyle] = useState<FooterStyle>(store?.footer_style ?? 'classic');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store) {
      setSelectedStyle(store.header_style ?? 'classic');
      setSelectedColor(store.header_color ?? 'light');
      setCustomColor(store.header_custom_color ?? store.color_primary ?? '#6366f1');
      setTopbarEnabled(store.topbar_enabled ?? false);
      setTopbarStyle(store.topbar_style ?? 'static');
      setTopbarItems(store.topbar_items?.length ? store.topbar_items : ['Free delivery on orders above ₹500']);
      setTopbarBg(store.topbar_bg_color ?? store.color_primary ?? '#4f46e5');
      setTopbarText(store.topbar_text_color ?? '#ffffff');
    }
  }, [store]);

  const primary = store?.color_primary ?? '#6366f1';

  // Derive preview colors from selected header color option
  const previewBg =
    selectedColor === 'light' ? '#ffffff'
    : selectedColor === 'dark' ? '#111827'
    : customColor;
  const previewText =
    selectedColor === 'dark' || selectedColor === 'custom' ? '#ffffff' : '#111827';

  const maxItems = topbarStyle === 'static' ? 1 : 3;

  const handleTopbarStyleChange = (s: TopBarStyle) => {
    setTopbarStyle(s);
    if (s === 'static') setTopbarItems([topbarItems[0] ?? '']);
  };

  const handleAddItem = () => {
    if (topbarItems.length < maxItems) setTopbarItems([...topbarItems, '']);
  };

  const handleRemoveItem = (i: number) => setTopbarItems(topbarItems.filter((_, idx) => idx !== i));
  const handleItemChange = (i: number, val: string) =>
    setTopbarItems(topbarItems.map((item, idx) => (idx === i ? val : item)));

  const handleSave = async () => {
    if (!store?.id) return;
    setSaving(true);
    const result = await updateQuickStore(store.id, {
      header_style: selectedStyle,
      header_color: selectedColor,
      header_custom_color: selectedColor === 'custom' ? customColor : null,
      topbar_enabled: topbarEnabled,
      topbar_style: topbarStyle,
      topbar_items: topbarItems.filter(Boolean),
      topbar_bg_color: topbarBg,
      topbar_text_color: topbarText,
      footer_style: footerStyle,
    });
    if (result.success && result.data) {
      setStore(result.data);
      toast.success('Header & Footer settings saved!');
    } else {
      toast.error(result.error || 'Failed to save header settings');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">

          {/* Header Color */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Header Color
              </CardTitle>
              <CardDescription>Choose the background color of your navigation bar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'light' as HeaderColor,
                    label: 'Light',
                    sub: 'White bg, dark text',
                    iconBg: '#f9fafb',
                    iconBorder: '1px solid #e5e7eb',
                    icon: <Sun className="h-5 w-5 text-amber-500" />,
                    previewEl: (
                      <div className="w-full h-6 rounded-md border border-gray-200 bg-white flex items-center px-2 gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primary }} />
                        <div className="h-1.5 w-10 rounded-sm bg-gray-300" />
                        <div className="ml-auto h-1.5 w-8 rounded-sm bg-gray-200" />
                      </div>
                    ),
                  },
                  {
                    id: 'dark' as HeaderColor,
                    label: 'Dark',
                    sub: 'Dark bg, light text',
                    iconBg: '#111827',
                    iconBorder: 'none',
                    icon: <Moon className="h-5 w-5 text-indigo-400" />,
                    previewEl: (
                      <div className="w-full h-6 rounded-md bg-gray-900 flex items-center px-2 gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primary }} />
                        <div className="h-1.5 w-10 rounded-sm bg-gray-600" />
                        <div className="ml-auto h-1.5 w-8 rounded-sm bg-gray-700" />
                      </div>
                    ),
                  },
                  {
                    id: 'custom' as HeaderColor,
                    label: 'Custom',
                    sub: 'Pick any color',
                    iconBg: customColor,
                    iconBorder: 'none',
                    icon: <Palette className="h-5 w-5 text-white" />,
                    previewEl: (
                      <div className="w-full h-6 rounded-md flex items-center px-2 gap-1.5" style={{ backgroundColor: customColor }}>
                        <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                        <div className="h-1.5 w-10 rounded-sm bg-white/50" />
                        <div className="ml-auto h-1.5 w-8 rounded-sm bg-white/30" />
                      </div>
                    ),
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedColor(opt.id)}
                    className={cn(
                      'relative flex flex-col gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                      selectedColor === opt.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    )}
                  >
                    {selectedColor === opt.id && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: opt.iconBg, border: opt.iconBorder }}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{opt.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{opt.sub}</p>
                    </div>
                    <div className="mt-0.5">{opt.previewEl}</div>
                  </button>
                ))}
              </div>

              {/* Custom color picker — shows only when Custom is selected */}
              {selectedColor === 'custom' && (
                <div className="pt-1 border-t border-gray-100">
                  <ColorSwatch
                    label="Custom header background color"
                    value={customColor}
                    onChange={setCustomColor}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Header Layout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Header Layout
              </CardTitle>
              <CardDescription>Select how your navigation is arranged</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {HEADER_STYLES.map(({ id, label, description, Preview }) => {
                  const isSelected = selectedStyle === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedStyle(id)}
                      className={cn(
                        'relative flex flex-col gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center z-10">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <div className="w-full overflow-hidden rounded-md shadow-sm">
                        <Preview primary={primary} bg={previewBg} text={previewText} />
                      </div>
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

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

          {/* Announcement Bar */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5" />
                    Announcement Bar
                  </CardTitle>
                  <CardDescription className="mt-1">
                    A thin strip above the header for promotions &amp; announcements
                  </CardDescription>
                </div>
                <Switch checked={topbarEnabled} onCheckedChange={setTopbarEnabled} />
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {topbarEnabled ? (
                <div className="space-y-5">

                  {/* Style picker */}
                  <div className="grid grid-cols-3 gap-2">
                    {TOPBAR_STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleTopbarStyleChange(s.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all',
                          topbarStyle === s.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        )}
                      >
                        {topbarStyle === s.id && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                        <div className={cn('p-1.5 rounded-lg', topbarStyle === s.id ? 'text-indigo-600' : 'text-gray-400')}>
                          {s.icon}
                        </div>
                        <p className="font-medium text-xs text-gray-900">{s.label}</p>
                        <p className="text-[10px] text-gray-500 leading-tight">{s.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Color pickers */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-xl">
                    <ColorSwatch label="Background color" value={topbarBg} onChange={setTopbarBg} />
                    <ColorSwatch label="Text color" value={topbarText} onChange={setTopbarText} />
                  </div>

                  {/* Live preview */}
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    <div
                      className="text-xs py-1.5 px-4 text-center font-medium overflow-hidden"
                      style={{ backgroundColor: topbarBg, color: topbarText }}
                    >
                      {topbarStyle === 'marquee' ? (
                        <span>{topbarItems[0] || 'Your announcement text here'}</span>
                      ) : (
                        topbarItems[0] || 'Your announcement text here'
                      )}
                    </div>
                    <div className="bg-gray-50 px-3 py-1.5 text-center">
                      <span className="text-[10px] text-gray-400">Preview</span>
                    </div>
                  </div>

                  {/* Content items */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        {topbarStyle === 'static' ? 'Announcement text' : `Slides (${topbarItems.length}/${maxItems})`}
                      </Label>
                      {topbarStyle !== 'static' && topbarItems.length < maxItems && (
                        <Button variant="ghost" size="sm" onClick={handleAddItem} className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700">
                          <Plus className="h-3 w-3" /> Add slide
                        </Button>
                      )}
                    </div>

                    {topbarItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {topbarStyle !== 'static' && (
                          <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <Input
                            placeholder={topbarStyle === 'marquee' ? 'Scrolling text...' : `Slide ${i + 1} text`}
                            value={item}
                            onChange={(e) => handleItemChange(i, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        {topbarStyle !== 'static' && topbarItems.length > 1 && (
                          <button onClick={() => handleRemoveItem(i)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}

                    {topbarStyle === 'carousel' && (
                      <p className="text-[11px] text-gray-400">Slides rotate every 4 seconds</p>
                    )}
                    {topbarStyle === 'marquee' && (
                      <p className="text-[11px] text-gray-400">All slides scroll continuously across the bar</p>
                    )}
                  </div>

                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 border border-dashed border-gray-200 p-6 text-center">
                  <Megaphone className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Enable to add an announcement bar above your header</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* ── Footer Style ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Footer Style
          </CardTitle>
          <CardDescription>Choose how the bottom of your store looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {([
              { id: 'classic'  as FooterStyle, label: 'Classic',  desc: '3-col logo+links+contact' },
              { id: 'minimal'  as FooterStyle, label: 'Minimal',  desc: 'Centered, single row' },
              { id: 'dark'     as FooterStyle, label: 'Dark',     desc: 'Dark bg, light text' },
              { id: 'bold'     as FooterStyle, label: 'Bold',     desc: 'Large store name bg' },
              { id: 'compact'  as FooterStyle, label: 'Compact',  desc: '2-col tight layout' },
            ] as const).map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => setFooterStyle(id)}
                className={cn(
                  'relative flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all',
                  footerStyle === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                {footerStyle === id && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
                {/* Mini footer preview */}
                <div className={cn(
                  'w-full h-10 rounded-lg flex items-end p-1.5 mb-1',
                  id === 'dark' ? 'bg-slate-800' : 'bg-gray-100'
                )}>
                  {id === 'classic' && (
                    <div className="flex gap-1 w-full">
                      <div className="flex-1 flex flex-col gap-0.5"><div className="h-1 w-5 rounded bg-gray-400" /><div className="h-0.5 w-8 rounded bg-gray-300" /></div>
                      <div className="flex-1 flex flex-col gap-0.5"><div className="h-0.5 w-6 rounded bg-gray-300" /><div className="h-0.5 w-5 rounded bg-gray-300" /></div>
                      <div className="flex-1 flex flex-col gap-0.5"><div className="h-0.5 w-7 rounded bg-gray-300" /><div className="h-0.5 w-5 rounded bg-gray-300" /></div>
                    </div>
                  )}
                  {id === 'minimal' && (
                    <div className="flex flex-col items-center gap-0.5 w-full">
                      <div className="h-1 w-8 rounded bg-gray-400 mx-auto" />
                      <div className="flex gap-1 justify-center"><div className="h-0.5 w-4 rounded bg-gray-300" /><div className="h-0.5 w-4 rounded bg-gray-300" /><div className="h-0.5 w-4 rounded bg-gray-300" /></div>
                    </div>
                  )}
                  {id === 'dark' && (
                    <div className="flex gap-1 w-full">
                      <div className="flex-1 flex flex-col gap-0.5"><div className="h-1 w-5 rounded bg-slate-500" /><div className="h-0.5 w-7 rounded bg-slate-600" /></div>
                      <div className="flex-1 flex flex-col gap-0.5"><div className="h-0.5 w-5 rounded bg-slate-600" /><div className="h-0.5 w-4 rounded bg-slate-600" /></div>
                    </div>
                  )}
                  {id === 'bold' && (
                    <div className="w-full flex flex-col gap-0.5">
                      <div className="h-2 w-full rounded opacity-10 bg-gray-600" />
                      <div className="flex gap-1"><div className="h-0.5 w-4 rounded bg-gray-400" /><div className="h-0.5 w-3 rounded bg-gray-400" /></div>
                    </div>
                  )}
                  {id === 'compact' && (
                    <div className="flex items-center justify-between w-full gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      <div className="flex gap-1"><div className="h-0.5 w-3 rounded bg-gray-300" /><div className="h-0.5 w-3 rounded bg-gray-300" /></div>
                      <div className="flex flex-col gap-0.5 items-end"><div className="h-0.5 w-5 rounded bg-gray-300" /><div className="h-0.5 w-4 rounded bg-gray-300" /></div>
                    </div>
                  )}
                </div>
                <span className={cn('text-xs font-semibold', footerStyle === id ? 'text-indigo-700' : 'text-gray-800')}>{label}</span>
                <span className="text-[10px] text-gray-400 leading-tight">{desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-50">
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving || !store}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Header & Footer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QSHeader;
