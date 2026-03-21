import React, { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { getPublicProductBySlug } from '@/services/storefrontService';
import { logAnalyticsEvent } from '@/services/storefrontService';
import { QuickStore, QSProduct, CURRENCY_CONFIG, UNIT_LABELS, DEFAULT_DELIVERY_STEPS, DEFAULT_FAQS } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import {
  Loader2, Package, ArrowRight, ArrowLeft, Info, ChevronLeft, ChevronRight,
  Upload, Sparkles, ChevronDown,
} from 'lucide-react';

interface Props {
  store: QuickStore;
}

// ─── FAQ Accordion ───────────────────────────────────────────────────────────
function ProductFaq({ store }: { store: QuickStore }) {
  const [openId, setOpenId] = React.useState<string | null>(null);
  const items = store.faq_items?.length ? store.faq_items : DEFAULT_FAQS;
  const title = store.faq_title || 'Frequently Asked Questions';

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: store.color_text }}>
        {title}
      </h2>
      <div className="max-w-3xl mx-auto space-y-2">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpenId(openId === item.id ? null : item.id)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-[16px] pr-4" style={{ color: store.color_text }}>{item.question}</span>
              <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openId === item.id ? 'rotate-180' : ''}`} />
            </button>
            {openId === item.id && (
              <div className="px-6 pb-5">
                <p className="text-[#7c7c7c] leading-relaxed text-[15px]">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── How It Works (full version like homepage) ───────────────────────────────
function ProductHowItWorks({ store }: { store: QuickStore }) {
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
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" style={{ color: store.color_text }}>
        How It Works — 3 Simple Steps
      </h2>
      <p className="text-[#7c7c7c] text-lg text-center mb-10">Create your DTF print sheet in minutes</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div
            key={step.num}
            className="relative rounded-2xl border border-gray-100 p-7 hover:-translate-y-1 hover:shadow-xl transition-all duration-500 ease-out"
            style={{ background: `linear-gradient(145deg, ${step.color}18 0%, ${step.color}0a 60%, #ffffff 100%)` }}
          >
            <div
              className="absolute -top-4 -left-4 w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg"
              style={{ backgroundColor: store.color_primary ?? '#4f46e5' }}
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
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const StoreProductDetail: React.FC<Props> = ({ store }) => {
  const { productSlug } = useParams();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';

  const [product, setProduct] = useState<QSProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      if (!productSlug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const result = await getPublicProductBySlug(store.id, productSlug);

      if (result.success && result.data) {
        setProduct(result.data);
        logAnalyticsEvent({
          quick_store_id: store.id,
          event_type: 'product_view',
          product_id: result.data.id,
          page_path: window.location.pathname,
        });
      } else {
        setNotFound(true);
      }

      setLoading(false);
    };

    loadProduct();
  }, [store.id, productSlug]);

  const currencySymbol = CURRENCY_CONFIG[store.currency].symbol;
  const unitLabel = product?.pricing_basis === 'area'
    ? 'sq.inch'
    : UNIT_LABELS[store.measurement_unit].singular;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-medium text-gray-600 mb-2">Product not found</h2>
        <p className="text-[#7c7c7c] mb-6">This product may have been removed or doesn't exist</p>
        <Link to={`${basePath}/products`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const primary = store.color_primary ?? '#4f46e5';
  const deliverySteps = store.delivery_steps?.length ? store.delivery_steps : DEFAULT_DELIVERY_STEPS;
  const deliveryIcons = [Upload, Sparkles, Package];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`${basePath}/products`}
          className="text-sm text-[#7c7c7c] hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Images — 4:5 aspect ratio (800×1000) */}
        <div className="space-y-3">
          {(() => {
            const images = product.product_images?.length ? product.product_images : (product.image_url ? [product.image_url] : []);
            if (images.length === 0) {
              return (
                <div className="aspect-[4/5] bg-gray-100 rounded-xl flex items-center justify-center">
                  <Package className="h-24 w-24 text-gray-300" />
                </div>
              );
            }
            return (
              <>
                <div className="aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden relative group">
                  <img
                    src={images[activeImage] || images[0]}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button
                        onClick={() => setActiveImage((activeImage + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2">
                    {images.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === activeImage ? 'border-indigo-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img src={url} alt={`${product.product_name} ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: store.color_text }}>
            {product.product_name}
          </h1>

          <p className="text-[17px] font-semibold mb-2" style={{ color: store.color_text }}>
            Sheet width: {product.roll_width_inches} inches
          </p>

          {product.description ? (
            <p className="text-[#7c7c7c] text-[16px] mb-6 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          ) : (
            <p className="text-[#7c7c7c] text-[16px] mb-6 leading-relaxed italic">
              Upload your designs and we'll arrange them into a print-ready gang sheet.
            </p>
          )}

          {/* Pricing */}
          {product.show_pricing ? (
            <div className="border border-gray-100 rounded-xl p-5 mb-5" style={{ background: `linear-gradient(145deg, ${primary}18 0%, ${primary}08 60%, #ffffff 100%)` }}>
              <h3 className="font-bold text-lg mb-1">Pricing</h3>
              {product.pricing_type === 'flat' ? (
                <div className="py-3">
                  <span className="text-3xl font-bold" style={{ color: primary }}>
                    {currencySymbol}{product.flat_price}
                  </span>
                  <span className="text-[#7c7c7c] ml-1">per {unitLabel}</span>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-[#7c7c7c] mb-3">Price based on total quantity</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-sm font-medium text-[#7c7c7c]">Quantity</th>
                        <th className="text-right py-2 text-sm font-medium text-[#7c7c7c]">Price/{unitLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(product.pricing_tiers || []).map((tier, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="py-3 text-[16px]">
                            {tier.min} - {tier.max ?? '∞'} {product.pricing_basis === 'area' ? 'sq.inches' : 'inches'}
                          </td>
                          <td className="py-3 text-right font-semibold text-[16px]" style={{ color: primary }}>
                            {currencySymbol}{tier.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-gray-100 rounded-xl p-6 mb-5 bg-gray-50 text-center">
              <Info className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-[#7c7c7c]">Contact us for pricing details</p>
            </div>
          )}

          {/* Minimum Order */}
          {product.minimum_order > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
              <p className="text-amber-800 text-sm">
                <strong>Minimum order:</strong> {product.minimum_order} {product.pricing_basis === 'area' ? 'sq.inches' : 'inches'}
                {product.below_minimum_action === 'charge_minimum' && (
                  <span className="block text-amber-600 mt-1">
                    Orders below minimum will be charged for minimum quantity
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Delivery Timeline */}
          <div className="border border-gray-100 rounded-xl p-5 mb-5">
            <h3 className="font-bold text-lg mb-5">Delivery Timeline</h3>
            <div className="flex items-center justify-between">
              {deliverySteps.map((step, idx) => {
                const Icon = deliveryIcons[idx] ?? Package;
                return (
                  <React.Fragment key={idx}>
                    <div className="flex flex-col items-center text-center flex-1">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                        style={{ backgroundColor: `${primary}12`, color: primary }}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-semibold" style={{ color: store.color_text }}>{step.label}</p>
                      <p className="text-xs text-[#7c7c7c] mt-0.5">{step.time}</p>
                    </div>
                    {idx < deliverySteps.length - 1 && (
                      <div className="flex-shrink-0 w-12 h-px mb-8" style={{ backgroundColor: `${primary}30` }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* CTA Button */}
          <Link to={`${basePath}/builder/${product.product_slug}`}>
            <Button
              size="lg"
              className="w-full text-lg py-6 font-semibold"
              style={{ backgroundColor: primary }}
            >
              Start Designing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>

          <p className="text-center text-sm text-[#7c7c7c] mt-4">
            Upload your images and create your custom DTF gang sheet
          </p>
        </div>
      </div>

      {/* Full-width sections below */}
      <div className="mt-16 space-y-16">
        {/* How It Works — full version like homepage */}
        <div>
          <div style={{ borderTopWidth: '1px', borderColor: 'rgba(124,124,124,0.15)' }} />
          <div className="pt-14">
            <ProductHowItWorks store={store} />
          </div>
        </div>

        {/* FAQ */}
        {store.show_product_faq !== false && (
          <div>
            <div style={{ borderTopWidth: '1px', borderColor: 'rgba(124,124,124,0.15)' }} />
            <div className="pt-14 pb-8">
              <ProductFaq store={store} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreProductDetail;
