import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPublicProducts, getPublicTestimonials } from '@/services/storefrontService';
import { QuickStore, QSProduct, Testimonial, CURRENCY_CONFIG, UNIT_LABELS, DEFAULT_FEATURES, DEFAULT_FAQS, HeroSliderImage } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Star, ArrowRight, Phone, Mail, MessageSquare, MapPin, Package, LayoutGrid, Scissors, Ruler, Zap, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Feature icon map ─────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutGrid: <LayoutGrid className="h-6 w-6" />,
  Scissors:   <Scissors   className="h-6 w-6" />,
  Ruler:      <Ruler      className="h-6 w-6" />,
  Zap:        <Zap        className="h-6 w-6" />,
};

// ─── Features Grid Layout ─────────────────────────────────────────────────────

function FeaturesGrid({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto">
        <div className="mb-16 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>
            {store.features_title || 'Why customers choose us'}
          </h2>
          <p className="text-[#7c7c7c] mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((feat) => {
            const showIcon = feat.show_icon !== false;
            return (
              <div
                key={feat.id}
                className="group border border-gray-100 rounded-2xl p-9 hover:-translate-y-1 hover:shadow-xl transition-all duration-500 ease-out"
                style={{ background: `linear-gradient(145deg, ${feat.color}18 0%, ${feat.color}0a 60%, #ffffff 100%)` }}
              >
                {showIcon && (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${feat.color}12`, color: feat.color }}
                  >
                    <span className="[&>svg]:w-6 [&>svg]:h-6">
                      {ICON_MAP[feat.icon] ?? <LayoutGrid className="h-6 w-6" />}
                    </span>
                  </div>
                )}
                <h3 className="font-bold text-[22px] mb-3" style={{ color: store.color_text }}>{feat.heading}</h3>
                <p className="text-[#7c7c7c] leading-relaxed text-[16px]">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Features Alternating Layout ──────────────────────────────────────────────
function FeaturesAlternating({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="container mx-auto max-w-6xl mb-14 text-center">
        <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>
          {store.features_title || 'Why customers choose us'}
        </h2>
        <p className="text-[#7c7c7c] mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
      </div>
      <div className="container mx-auto max-w-6xl space-y-5">
        {items.map((feat, i) => {
          const isEven = i % 2 === 0;
          const showIcon = feat.show_icon !== false;
          return (
            <div
              key={feat.id}
              className={`rounded-2xl overflow-hidden flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} min-h-[260px] bg-white shadow-sm hover:shadow-lg transition-all duration-300`}
            >
              {/* Visual panel */}
              {showIcon && (
                <div
                  className="md:w-[38%] flex items-center justify-center gap-6 p-10 min-h-[180px]"
                  style={{ backgroundColor: `${feat.color}0d` }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: feat.color, color: '#fff' }}
                  >
                    <span className="[&>svg]:w-7 [&>svg]:h-7">
                      {ICON_MAP[feat.icon] ?? <LayoutGrid className="h-7 w-7" />}
                    </span>
                  </div>
                </div>
              )}

              {/* Text panel */}
              <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-10">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 w-fit"
                  style={{ backgroundColor: `${feat.color}12`, color: feat.color }}
                >
                  {feat.heading}
                </div>
                <h3 className="font-heading text-2xl md:text-3xl font-extrabold mb-3 leading-tight tracking-tight" style={{ color: store.color_text }}>
                  {feat.heading}
                </h3>
                <p className="text-[#7c7c7c] leading-relaxed text-base max-w-md">{feat.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Features Bento Layout ────────────────────────────────────────────────────
function FeaturesBento({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  const [hero, ...rest] = items;
  const heroShowIcon = hero.show_icon !== false;
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>{store.features_title || 'Why customers choose us'}</h2>
          <p className="text-[#7c7c7c] mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Hero card — spans 2 cols */}
          <div className="md:col-span-2 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${hero.color}, ${hero.color}88)` }} />
            <div className="p-10 flex flex-col md:flex-row items-start gap-8">
              <div className="flex flex-col gap-4 flex-1">
                {heroShowIcon && (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${hero.color}15`, color: hero.color }}>
                    <span className="[&>svg]:w-7 [&>svg]:h-7">{ICON_MAP[hero.icon] ?? <LayoutGrid className="h-7 w-7" />}</span>
                  </div>
                )}
                <h3 className="font-heading text-2xl font-extrabold tracking-tight" style={{ color: store.color_text }}>{hero.heading}</h3>
                <p className="text-[#7c7c7c] leading-relaxed">{hero.description}</p>
              </div>
            </div>
          </div>
          {/* Small cards */}
          {rest.map((feat) => {
            const showIcon = feat.show_icon !== false;
            return (
              <div key={feat.id} className="rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${feat.color}, ${feat.color}88)` }} />
                <div className="p-6 flex flex-col gap-4">
                  {showIcon && (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${feat.color}15`, color: feat.color }}>
                      <span className="[&>svg]:w-5 [&>svg]:h-5">{ICON_MAP[feat.icon] ?? <LayoutGrid />}</span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg mb-1.5" style={{ color: store.color_text }}>{feat.heading}</h3>
                    <p className="text-[#7c7c7c] text-sm leading-relaxed">{feat.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Features Icon Row Layout ─────────────────────────────────────────────────
function FeaturesIconRow({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>{store.features_title || 'Why customers choose us'}</h2>
          <p className="text-[#7c7c7c] mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {items.map((feat) => {
            const showIcon = feat.show_icon !== false;
            return (
              <div key={feat.id} className="flex flex-col items-center text-center gap-4 group">
                {showIcon && (
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300"
                    style={{ background: `linear-gradient(135deg, ${feat.color}dd, ${feat.color}99)`, color: '#fff' }}
                  >
                    <span className="[&>svg]:w-9 [&>svg]:h-9">{ICON_MAP[feat.icon] ?? <LayoutGrid className="h-9 w-9" />}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base md:text-lg leading-tight mb-2" style={{ color: store.color_text }}>{feat.heading}</h3>
                  <p className="text-[#7c7c7c] text-sm leading-relaxed">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Features Steps Layout ────────────────────────────────────────────────────
function FeaturesSteps({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>{store.features_title || 'Why customers choose us'}</h2>
          <p className="text-[#7c7c7c] mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
        </div>
        {/* Desktop: horizontal steps */}
        <div className="hidden md:flex items-start gap-0">
          {items.map((feat, i) => (
            <React.Fragment key={feat.id}>
              <div className="flex flex-col items-center flex-1 gap-5">
                {/* Step circle */}
                <div className="relative">
                  {feat.show_icon !== false ? (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-md z-10 relative"
                      style={{ backgroundColor: feat.color, color: '#fff' }}
                    >
                      <span className="[&>svg]:w-7 [&>svg]:h-7">{ICON_MAP[feat.icon] ?? <LayoutGrid />}</span>
                    </div>
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center shadow-md z-10 relative text-xl font-black text-white"
                      style={{ backgroundColor: feat.color }}
                    >
                      {i + 1}
                    </div>
                  )}
                  {feat.show_icon !== false && (
                    <div
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white shadow"
                      style={{ backgroundColor: store.color_primary ?? feat.color }}
                    >
                      {i + 1}
                    </div>
                  )}
                </div>
                {/* Text */}
                <div className="text-center px-3">
                  <h3 className="font-bold text-base mb-2" style={{ color: store.color_text }}>{feat.heading}</h3>
                  <p className="text-[#7c7c7c] text-sm leading-relaxed">{feat.description}</p>
                </div>
              </div>
              {/* Connector */}
              {i < items.length - 1 && (
                <div className="flex items-start pt-8 flex-shrink-0">
                  <div className="w-12 h-0.5 mt-0" style={{ background: `linear-gradient(to right, ${feat.color}, ${items[i+1].color})` }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Mobile: vertical steps */}
        <div className="md:hidden space-y-6">
          {items.map((feat, i) => (
            <div key={feat.id} className="flex gap-4 items-start">
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: feat.color, color: '#fff' }}>
                  {feat.show_icon !== false ? (
                    <span className="[&>svg]:w-5 [&>svg]:h-5">{ICON_MAP[feat.icon] ?? <LayoutGrid />}</span>
                  ) : (
                    <span className="text-sm font-black">{i + 1}</span>
                  )}
                </div>
                {i < items.length - 1 && <div className="w-0.5 flex-1 h-10" style={{ backgroundColor: '#e5e7eb' }} />}
              </div>
              <div className="pt-1.5">
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: feat.color }}>Step {i + 1}</p>
                <h3 className="font-bold text-base mb-1.5" style={{ color: store.color_text }}>{feat.heading}</h3>
                <p className="text-[#7c7c7c] text-sm leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Dark Layout ─────────────────────────────────────────────────────
function FeaturesDark({ store }: { store: QuickStore }) {
  const items = store.features?.length ? store.features : DEFAULT_FEATURES;
  return (
    <section className="py-20 px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">{store.features_title || 'Why customers choose us'}</h2>
          <p className="text-slate-400 mt-3 text-lg">{store.features_subtitle || 'Everything you need for professional DTF printing'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((feat) => {
            const showIcon = feat.show_icon !== false;
            return (
              <div
                key={feat.id}
                className="rounded-2xl p-8 flex gap-5 border border-white/10 hover:border-white/20 hover:-translate-y-1 shadow-sm hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: '#1e293b' }}
              >
                {showIcon && (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${feat.color}22`, color: feat.color }}
                  >
                    <span className="[&>svg]:w-6 [&>svg]:h-6">{ICON_MAP[feat.icon] ?? <LayoutGrid />}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-white mb-2.5">{feat.heading}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works Section ────────────────────────────────────────────────────
function HowItWorks({ store }: { store: QuickStore }) {
  const primary = store.color_primary ?? '#4f46e5';
  const [isLocked, setIsLocked] = React.useState(true);

  const steps = [
    {
      num: 1,
      color: '#f59e0b',
      title: 'Upload Your Files',
      desc: 'Simply drag and drop your PNG artwork — instant previews make it effortless to get started.',
      visual: (
        <div className="bg-gray-50 border-2 border-dashed rounded-xl p-6 h-56 flex flex-col items-center" style={{ borderColor: `${primary}66` }}>
          <div className="flex flex-col items-center pt-2">
            <svg className="w-12 h-12 mb-2" style={{ color: primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="font-bold text-sm mb-1" style={{ color: primary }}>DROP FILES HERE</p>
            <p className="text-gray-600 text-xs font-medium">or click to browse</p>
          </div>
          <div className="flex gap-2 mt-auto">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md transform -rotate-6" />
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-md transform rotate-3" />
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg shadow-md transform -rotate-3" />
          </div>
        </div>
      ),
    },
    {
      num: 2,
      color: '#10b981',
      title: 'Set the Dimensions',
      desc: 'Enter your required width and height — the aspect ratio stays perfectly maintained for accurate print sizing.',
      visual: (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg" />
            <div>
              <p className="text-xs font-semibold text-gray-900">Your Design File.png</p>
              <p className="text-[10px] text-gray-500">PNG Image</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-0.5 font-medium">Width</p>
              <p className="text-lg font-bold text-gray-900">12.00 <span className="text-xs font-normal text-gray-600">inches</span></p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase mb-0.5 font-medium">Height</p>
              <p className="text-lg font-bold text-gray-900">18.00 <span className="text-xs font-normal text-gray-600">inches</span></p>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">Original: 3600 × 5400 px</p>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setIsLocked(!isLocked)} className="relative inline-flex items-center cursor-pointer">
              <div className="w-9 h-5 rounded-full transition-all" style={{ backgroundColor: isLocked ? primary : '#d1d5db' }}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${isLocked ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
            <span className="text-xs text-gray-700">Lock Aspect Ratio</span>
          </div>
          <span className="inline-block px-2.5 py-0.5 text-white text-[10px] font-bold rounded-full" style={{ backgroundColor: primary }}>300 DPI</span>
        </div>
      ),
    },
    {
      num: 3,
      color: '#8b5cf6',
      title: 'Generate Sheet',
      desc: 'With one click, your images are arranged into a clean, print-ready sheet ready to download.',
      visual: (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-1.5 mb-3 h-36">
            <div className="rounded-lg" style={{ backgroundColor: `${primary}22` }} />
            <div className="rounded-lg col-span-2" style={{ backgroundColor: `${primary}22` }} />
            <div className="rounded-lg col-span-2" style={{ backgroundColor: `${primary}22` }} />
            <div className="rounded-lg" style={{ backgroundColor: `${primary}22` }} />
            <div className="rounded-lg col-span-3" style={{ backgroundColor: `${primary}22` }} />
          </div>
          <div className="w-full text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm" style={{ backgroundColor: primary }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Sheet
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: store.color_text }}>
            How It Works — 3 Simple Steps
          </h2>
          <p className="text-[#7c7c7c] text-lg">Create your DTF print sheet in minutes</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative rounded-2xl border border-gray-100 p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-500 ease-out"
              style={{ background: `linear-gradient(145deg, ${step.color}18 0%, ${step.color}0a 60%, #ffffff 100%)` }}
            >
              <div
                className="absolute -top-4 -left-4 w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg"
                style={{ backgroundColor: primary }}
              >
                {step.num}
              </div>
              <div className="mb-5 mt-2">{step.visual}</div>
              <h3 className="text-[22px] font-bold mb-2.5" style={{ color: store.color_text }}>{step.title}</h3>
              <p className="text-[#7c7c7c] leading-relaxed text-[16px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
function FaqAccordion({ store }: { store: QuickStore }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const items = store.faq_items?.length ? store.faq_items : DEFAULT_FAQS;
  const title = store.faq_title || 'Frequently Asked Questions';
  const style = store.faq_style ?? 'clean';

  const toggle = (id: string) => setOpenId(prev => prev === id ? null : id);

  // ── Clean ────────────────────────────────────────────────────────────────────
  if (style === 'clean') return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: store.color_text }}>{title}</h2>
        <div className="divide-y divide-gray-200">
          {items.map(item => (
            <div key={item.id}>
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between py-5 text-left gap-4 hover:opacity-80 transition-opacity"
              >
                <span className="font-semibold text-base" style={{ color: store.color_text }}>{item.question}</span>
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: openId === item.id ? store.color_primary : '#f3f4f6' }}>
                  <span className="text-xs font-bold" style={{ color: openId === item.id ? '#fff' : '#6b7280' }}>
                    {openId === item.id ? '−' : '+'}
                  </span>
                </div>
              </button>
              {openId === item.id && (
                <p className="pb-5 text-[#7c7c7c] leading-relaxed text-sm md:text-base pr-10">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ── Card ─────────────────────────────────────────────────────────────────────
  if (style === 'card') return (
    <section className="py-20 px-4" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: store.color_text }}>{title}</h2>
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="rounded-2xl border bg-white overflow-hidden shadow-sm transition-all"
              style={{ borderColor: openId === item.id ? store.color_primary : '#e5e7eb', borderLeftWidth: openId === item.id ? '4px' : '1px' }}
            >
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
              >
                <span className="font-semibold text-base" style={{ color: store.color_text }}>{item.question}</span>
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: openId === item.id ? store.color_primary : '#f3f4f6' }}
                >
                  <span className="text-sm font-bold leading-none" style={{ color: openId === item.id ? '#fff' : '#9ca3af' }}>
                    {openId === item.id ? '−' : '+'}
                  </span>
                </div>
              </button>
              {openId === item.id && (
                <div className="px-6 pb-5 border-t" style={{ borderColor: `${store.color_primary}20` }}>
                  <p className="text-gray-500 leading-relaxed pt-4 text-sm md:text-base">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  // ── Bold (dark) ───────────────────────────────────────────────────────────────
  return (
    <section className="py-20 px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">{title}</h2>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
              <button
                onClick={() => toggle(item.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left gap-4 group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: openId === item.id ? store.color_primary : '#334155', color: openId === item.id ? '#fff' : '#64748b' }}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold text-white text-sm md:text-base">{item.question}</span>
                </div>
                <span className="flex-shrink-0 text-lg font-light text-slate-400 group-hover:text-white transition-colors">
                  {openId === item.id ? '−' : '+'}
                </span>
              </button>
              {openId === item.id && (
                <div className="px-6 pb-5 border-t border-white/5">
                  <p className="text-slate-400 leading-relaxed pt-4 text-sm md:text-base">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface Props { store: QuickStore; }

// ─── Hero helpers ─────────────────────────────────────────────────────────────

function buildBg(store: QuickStore, mobile = false): string {
  const bgType = store.hero_bg_type ?? 'gradient';
  if (bgType === 'image') {
    const src = (mobile && store.hero_mobile_image_url) ? store.hero_mobile_image_url : store.banner_image_url;
    if (src) return `url(${src})`;
  }
  if (bgType === 'solid') return store.hero_solid_color ?? store.color_primary;
  const from = store.hero_gradient_from ?? store.color_primary;
  const to   = store.hero_gradient_to   ?? store.color_secondary;
  const angle = store.hero_gradient_angle ?? 135;
  return `linear-gradient(${angle}deg, ${from}, ${to})`;
}

function overlayStyle(opacity: number): React.CSSProperties {
  const hex = Math.round(Math.min(opacity, 80) * 2.55).toString(16).padStart(2, '0');
  return { backgroundColor: `#000000${hex}` };
}

// ─── Hero Background Slider ──────────────────────────────────────────────────
function HeroBgSlider({ images, interval = 5000 }: { images: HeroSliderImage[]; interval?: number }) {
  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef<number>(0);
  const isMultiple = images.length > 1;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + images.length) % images.length);
  }, [images.length]);

  // Auto-rotate (only for multiple images)
  useEffect(() => {
    if (!isMultiple) return;
    timerRef.current = setInterval(() => goTo(current + 1), interval);
    return () => clearInterval(timerRef.current);
  }, [current, isMultiple, interval, goTo]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
    }
  };

  if (images.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((slide, idx) => {
        const src = (isMobile && slide.mobile_url) ? slide.mobile_url : slide.url;
        return (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: idx === current ? 1 : 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        );
      })}

      {/* Arrow navigation (only for multiple images) */}
      {isMultiple && (
        <>
          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm flex items-center justify-center text-white transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators (only for multiple images) */}
      {isMultiple && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === current ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Check if store has slider images (works for both 'image' and 'slider' bg types) */
function hasHeroImages(store: QuickStore): boolean {
  return (store.hero_bg_type === 'image' || store.hero_bg_type === 'slider') && (store.hero_slider_images?.length ?? 0) > 0;
}

interface HeroProps { store: QuickStore; basePath: string; }

function CtaButton({ store, basePath }: { store: QuickStore; basePath: string }) {
  if (store.hero_cta_enabled === false) return null;
  const label = store.hero_cta_text?.trim() || 'View Products';
  const heroStyle = store.hero_style ?? 'fullbleed';
  // On split/minimal, text is on white bg — use colored button
  const useInverted = heroStyle !== 'split' && heroStyle !== 'minimal';
  return (
    <Link to={`${basePath}/products`}>
      {useInverted ? (
        <Button size="lg" className="shadow-lg bg-white hover:bg-gray-100 font-semibold px-8" style={{ color: store.color_primary }}>
          {label} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ) : (
        <Button size="lg" className="shadow-lg font-semibold px-8" style={{ backgroundColor: store.color_primary, color: '#ffffff' }}>
          {label} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </Link>
  );
}

// 1. Full Bleed ─────────────────────────────────────────────────────────────
function HeroFullBleed({ store, basePath }: HeroProps) {
  const isImages = hasHeroImages(store);
  const desktopBg = buildBg(store, false);
  const mobileBg = buildBg(store, true);
  const hasMobile = store.hero_bg_type === 'image' && !!store.hero_mobile_image_url;
  const textColor = store.hero_text_color ?? '#ffffff';
  const align = store.hero_text_align ?? 'center';
  const cls = align === 'left' ? 'items-start text-left px-8 md:px-20'
            : align === 'right' ? 'items-end text-right px-8 md:px-20'
            : 'items-center text-center px-4';
  return (
    <section className="relative">
      {hasMobile && !isImages && (
        <style>{`
          .hero-fullbleed { background: ${mobileBg}; background-size: cover; background-position: center; }
          @media (min-width: 768px) { .hero-fullbleed { background: ${desktopBg}; background-size: cover; background-position: center; } }
        `}</style>
      )}
      <div
        className="hero-fullbleed h-[500px] md:h-[650px] relative"
        style={(!hasMobile && !isImages) ? { background: desktopBg, backgroundSize: 'cover', backgroundPosition: 'center' } : isImages ? { background: '#111' } : undefined}
      >
        {isImages && <HeroBgSlider images={store.hero_slider_images} />}
        <div className="absolute inset-0 z-[1]" style={overlayStyle(store.hero_overlay_opacity ?? 40)} />
        <div className={`absolute inset-0 z-[2] flex flex-col justify-center gap-5 ${cls}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-3xl" style={{ color: textColor }}>
            {store.hero_title || `Welcome to ${store.store_name}`}
          </h1>
          <p className="text-lg md:text-xl opacity-90 max-w-[50rem]" style={{ color: textColor }}>
            {store.hero_subtitle || 'Quality DTF printing for your business'}
          </p>
          <div className="mt-2">
            <CtaButton store={store} basePath={basePath} />
          </div>
        </div>
      </div>
    </section>
  );
}

// 2. Split ──────────────────────────────────────────────────────────────────
function HeroSplit({ store, basePath }: HeroProps) {
  const desktopBg = buildBg(store, false);
  const mobileBg = buildBg(store, true);
  const hasMobile = store.hero_bg_type === 'image' && !!store.hero_mobile_image_url;
  return (
    <section className="flex flex-col md:flex-row min-h-[500px] md:h-[650px]">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 py-16 bg-white order-2 md:order-1">
        <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4" style={{ color: store.color_text }}>
          {store.hero_title || `Welcome to ${store.store_name}`}
        </h1>
        <p className="text-lg text-[#7c7c7c] mb-8 max-w-md">
          {store.hero_subtitle || 'Quality DTF printing for your business'}
        </p>
        <CtaButton store={store} basePath={basePath} />
      </div>
      {hasMobile && (
        <style>{`
          .hero-split-img { background: ${mobileBg}; background-size: cover; background-position: center; }
          @media (min-width: 768px) { .hero-split-img { background: ${desktopBg}; background-size: cover; background-position: center; } }
        `}</style>
      )}
      <div className="hero-split-img flex-1 min-h-[260px] md:min-h-0 order-1 md:order-2"
        style={!hasMobile ? { background: desktopBg, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined} />
    </section>
  );
}

// 3. Minimal ───────────────────────────────────────────────────────────────
function HeroMinimal({ store, basePath }: HeroProps) {
  const align = store.hero_text_align ?? 'left';
  const cls = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
  return (
    <section className="py-20 md:py-28 px-6" style={{ backgroundColor: store.color_background }}>
      <div className={`container mx-auto max-w-5xl flex flex-col gap-6 ${cls}`}>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight max-w-3xl" style={{ color: store.color_text }}>
          {store.hero_title || `Welcome to ${store.store_name}`}
        </h1>
        <p className="text-xl text-[#7c7c7c] max-w-xl">
          {store.hero_subtitle || 'Quality DTF printing for your business'}
        </p>
        <div className="flex flex-wrap gap-3 mt-2">
          <CtaButton store={store} basePath={basePath} />
          <Link to={`${basePath}/contact`}>
            <Button size="lg" variant="outline">Contact Us</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// 4. Cinematic ─────────────────────────────────────────────────────────────
function HeroCinematic({ store, basePath }: HeroProps) {
  const isImages = hasHeroImages(store);
  const desktopBg = buildBg(store, false);
  const mobileBg = buildBg(store, true);
  const hasMobile = store.hero_bg_type === 'image' && !!store.hero_mobile_image_url;
  const textColor = store.hero_text_color ?? '#ffffff';
  const align = store.hero_text_align ?? 'left';
  const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
  return (
    <section className="relative">
      {hasMobile && !isImages && (
        <style>{`
          .hero-cinematic { background: ${mobileBg}; background-size: cover; background-position: center; }
          @media (min-width: 768px) { .hero-cinematic { background: ${desktopBg}; background-size: cover; background-position: center; } }
        `}</style>
      )}
      <div className="hero-cinematic h-[560px] md:h-[700px] relative"
        style={(!hasMobile && !isImages) ? { background: desktopBg, backgroundSize: 'cover', backgroundPosition: 'center' } : isImages ? { background: '#111' } : undefined}>
        {isImages && <HeroBgSlider images={store.hero_slider_images} />}
        <div className="absolute inset-0 z-[1]" style={overlayStyle(store.hero_overlay_opacity ?? 30)} />
        <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)' }} />
        <div className={`absolute bottom-0 left-0 right-0 z-[2] px-8 md:px-16 pb-14 flex flex-col ${alignClass}`}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-3 opacity-60" style={{ color: textColor }}>
            {store.city || 'DTF Printing'}
          </p>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 max-w-3xl" style={{ color: textColor }}>
            {store.hero_title || `Welcome to ${store.store_name}`}
          </h1>
          <p className="text-lg opacity-75 mb-6 max-w-xl" style={{ color: textColor }}>
            {store.hero_subtitle || 'Quality DTF printing for your business'}
          </p>
          <CtaButton store={store} basePath={basePath} />
        </div>
      </div>
    </section>
  );
}

// 5. Card ──────────────────────────────────────────────────────────────────
function HeroCard({ store, basePath }: HeroProps) {
  const isImages = hasHeroImages(store);
  const desktopBg = buildBg(store, false);
  const mobileBg = buildBg(store, true);
  const hasMobile = store.hero_bg_type === 'image' && !!store.hero_mobile_image_url;
  const textColor = store.hero_text_color ?? '#ffffff';
  const align = store.hero_text_align ?? 'center';
  const cls = align === 'left' ? 'items-start text-left' : align === 'right' ? 'items-end text-right' : 'items-center text-center';
  const justifyCls = align === 'left' ? 'justify-start pl-8 md:pl-16' : align === 'right' ? 'justify-end pr-8 md:pr-16' : 'justify-center';
  return (
    <section className="relative">
      {hasMobile && !isImages && (
        <style>{`
          .hero-card { background: ${mobileBg}; background-size: cover; background-position: center; }
          @media (min-width: 768px) { .hero-card { background: ${desktopBg}; background-size: cover; background-position: center; } }
        `}</style>
      )}
      <div className={`hero-card h-[520px] md:h-[650px] relative flex items-center ${justifyCls}`}
        style={(!hasMobile && !isImages) ? { background: desktopBg, backgroundSize: 'cover', backgroundPosition: 'center' } : isImages ? { background: '#111' } : undefined}>
        {isImages && <HeroBgSlider images={store.hero_slider_images} />}
        <div className="absolute inset-0 z-[1]" style={overlayStyle(store.hero_overlay_opacity ?? 20)} />
        <div
          className={`relative z-[2] flex flex-col gap-5 px-8 md:px-14 py-10 md:py-14 rounded-2xl max-w-xl w-full ${cls}`}
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          }}
        >
          <h1 className="text-3xl md:text-5xl font-bold leading-tight" style={{ color: textColor }}>
            {store.hero_title || `Welcome to ${store.store_name}`}
          </h1>
          <p className="text-lg opacity-80" style={{ color: textColor }}>
            {store.hero_subtitle || 'Quality DTF printing for your business'}
          </p>
          <CtaButton store={store} basePath={basePath} />
        </div>
      </div>
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const StoreHome: React.FC<Props> = ({ store }) => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';
  const [products, setProducts] = useState<QSProduct[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [pr, tr] = await Promise.all([getPublicProducts(store.id), getPublicTestimonials(store.id)]);
      if (pr.success && pr.data) setProducts(pr.data);
      if (tr.success && tr.data) setTestimonials(tr.data);
    };
    loadData();
  }, [store.id]);

  const formatPricing = (product: QSProduct): string => {
    if (!product.show_pricing) return 'Contact for pricing';
    const symbol = CURRENCY_CONFIG[store.currency].symbol;
    const unitLabel = product.pricing_basis === 'area' ? 'sq.inch' : UNIT_LABELS[store.measurement_unit].singular;
    if (product.pricing_type === 'flat') return `${symbol}${product.flat_price}/${unitLabel}`;
    const tiers = product.pricing_tiers || [];
    if (tiers.length === 0) return 'Contact for pricing';
    return `From ${symbol}${Math.min(...tiers.map(t => t.price))}/${unitLabel}`;
  };

  const renderFeatures = (key?: string) => {
    if (store.features_enabled === false) return null;
    const props = { store };
    switch (store.features_layout) {
      case 'alternating': return <FeaturesAlternating key={key} {...props} />;
      case 'bento':       return <FeaturesBento       key={key} {...props} />;
      case 'iconrow':     return <FeaturesIconRow     key={key} {...props} />;
      case 'steps':       return <FeaturesSteps       key={key} {...props} />;
      case 'dark':        return <FeaturesDark        key={key} {...props} />;
      default:            return <FeaturesGrid        key={key} {...props} />;
    }
  };

  const renderFaq = (key?: string) => {
    if (store.faq_enabled === false) return null;
    return <FaqAccordion key={key} store={store} />;
  };

  const heroProps = { store, basePath };
  const heroStyle = store.hero_style ?? 'fullbleed';

  const renderHero = () => {
    switch (heroStyle) {
      case 'split':     return <HeroSplit {...heroProps} />;
      case 'minimal':   return <HeroMinimal {...heroProps} />;
      case 'cinematic': return <HeroCinematic {...heroProps} />;
      case 'card':      return <HeroCard {...heroProps} />;
      default:          return <HeroFullBleed {...heroProps} />;
    }
  };

  const sections = (store.homepage_sections || ['hero', 'about', 'features', 'how_it_works', 'products', 'testimonials', 'faq'])
    .filter(s => !s.startsWith('!'));  // Filter out disabled sections (prefixed with !)

  const renderSection = (sectionName: string) => {
    switch (sectionName) {
      case 'hero':
        return <React.Fragment key="hero">{renderHero()}</React.Fragment>;

      case 'features':
        return <React.Fragment key="features">{renderFeatures('features')}</React.Fragment>;

      case 'how_it_works':
        return <React.Fragment key="how_it_works"><HowItWorks store={store} /></React.Fragment>;

      case 'about': {
        if (!store.about_content) return null;
        return (
          <section key="about" className="py-16 px-4">
            <div className="container mx-auto max-w-[60rem] text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: store.color_text }}>
                {store.about_title || 'About Us'}
              </h2>
              <p className="text-[#7c7c7c] leading-relaxed text-[16px]">{store.about_content}</p>
            </div>
          </section>
        );
      }

      case 'products':
        if (products.length === 0) return null;
        return (
          <section key="products" className="py-16 px-4 bg-gray-50">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: store.color_text }}>Our Products</h2>
                <Link to={`${basePath}/products`} className="text-sm font-medium" style={{ color: store.color_primary }}>View All →</Link>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.slice(0, 6).map((product) => (
                  <Link key={product.id} to={`${basePath}/p/${product.product_slug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="aspect-video bg-gray-100 relative">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{product.product_name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{product.roll_width_inches}" wide</p>
                        <p className="font-medium" style={{ color: store.color_primary }}>{formatPricing(product)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials': {
        const testimonialsEl = testimonials.length === 0 ? null : (
          <section key="testimonials" className="py-16 px-4">
            <div className="container mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: store.color_text }}>
                What Our Customers Say
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const cardColors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];
                  return testimonials.map((t, idx) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-gray-100 p-6 hover:-translate-y-1 hover:shadow-xl transition-all duration-500 ease-out"
                      style={{ background: `linear-gradient(145deg, ${cardColors[idx % cardColors.length]}18 0%, ${cardColors[idx % cardColors.length]}0a 60%, #ffffff 100%)` }}
                    >
                      <div className="flex gap-1 mb-3">
                        {[1,2,3,4,5].map((star) => (
                          <Star key={star} className={`h-4 w-4 ${star <= (t.rating || 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-[#7c7c7c] mb-4 italic text-[16px] leading-relaxed">"{t.content}"</p>
                      <div>
                        <p className="font-semibold text-[16px]">{t.customer_name}</p>
                        {t.customer_location && <p className="text-sm text-[#7c7c7c]">{t.customer_location}</p>}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </section>
        );
        // Inject FAQ after testimonials for existing stores that don't have 'faq' in sections
        const hasExplicitFaq = sections.includes('faq');
        const faqEl = !hasExplicitFaq ? renderFaq('faq') : null;
        return <React.Fragment key="testimonials">{testimonialsEl}{faqEl}</React.Fragment>;
      }

      case 'faq':
        return <React.Fragment key="faq">{renderFaq('faq')}</React.Fragment>;

      case 'contact':
        return (
          <section key="contact" className="py-16 px-4 bg-gray-50">
            <div className="container mx-auto max-w-4xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-10" style={{ color: store.color_text }}>Contact Us</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {store.phone && (
                    <a href={`tel:${store.phone}`} className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full" style={{ backgroundColor: `${store.color_primary}20` }}>
                        <Phone className="h-5 w-5" style={{ color: store.color_primary }} />
                      </div>
                      <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{store.phone}</p></div>
                    </a>
                  )}
                  {store.whatsapp && (
                    <a href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full bg-indigo-100"><MessageSquare className="h-5 w-5 text-indigo-600" /></div>
                      <div><p className="text-sm text-gray-500">WhatsApp</p><p className="font-medium">{store.whatsapp}</p></div>
                    </a>
                  )}
                  {store.email && (
                    <a href={`mailto:${store.email}`} className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full" style={{ backgroundColor: `${store.color_primary}20` }}>
                        <Mail className="h-5 w-5" style={{ color: store.color_primary }} />
                      </div>
                      <div><p className="text-sm text-gray-500">Email</p><p className="font-medium">{store.email}</p></div>
                    </a>
                  )}
                  {store.address && (
                    <div className="flex items-start gap-3 p-4 bg-white rounded-lg">
                      <div className="p-3 rounded-full" style={{ backgroundColor: `${store.color_primary}20` }}>
                        <MapPin className="h-5 w-5" style={{ color: store.color_primary }} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{store.address}</p>
                        {store.city && store.country && <p className="text-gray-600">{store.city}, {store.country}</p>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {store.google_maps_url ? (
                    <iframe src={store.google_maps_url} width="100%" height="300" style={{ border: 0, borderRadius: '0.5rem' }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  ) : (
                    <div className="text-center p-8 bg-white rounded-lg w-full">
                      <p className="text-gray-600 mb-4">Ready to place an order?</p>
                      <Link to={`${basePath}/products`}>
                        <Button style={{ backgroundColor: store.color_primary }}>Browse Products</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {sections.map((sectionName, idx) => {
        const el = renderSection(sectionName);
        if (!el) return null;
        return (
          <React.Fragment key={sectionName}>
            {idx > 0 && <div className="mx-auto max-w-6xl px-4"><div style={{ borderTopWidth: '1px', borderColor: 'rgba(124,124,124,0.15)' }} /></div>}
            {el}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StoreHome;
