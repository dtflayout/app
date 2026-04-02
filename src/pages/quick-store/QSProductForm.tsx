import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { getQSProductById, createQSProduct, updateQSProduct } from '@/services/qsProductService';
import { uploadStoreAsset, updateQuickStore } from '@/services/quickStoreService';
import {
  QuickStore,
  QSProduct,
  QSProductInput,
  PricingBasis,
  PricingType,
  BelowMinimumAction,
  PricingTier,
  CURRENCY_CONFIG,
  UNIT_LABELS,
  DEFAULT_DELIVERY_STEPS,
  generateSlug,
} from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Upload, ArrowLeft, Plus, Trash2, DollarSign, Ruler, Image as ImageIcon, ShoppingBag, RotateCcw } from 'lucide-react';
import { FormSkeleton } from "@/components/Skeletons";

interface OutletContextType {
  store: QuickStore | null;
  setStore: (store: QuickStore) => void;
}

const DEFAULT_PRODUCT_DESCRIPTION = `Create custom DTF gang sheets effortlessly with our online builder. Upload your artwork, set your sheet dimensions, and let our smart algorithm arrange everything for maximum material efficiency.

• Auto-arranged layouts that reduce film waste by up to 30%
• Built-in image tools — enhance, trim, remove colors & add text
• Multiple sheet sizes to fit any order requirement
• Print-ready output at 300 DPI
• Fast turnaround — orders ready within 24 hours

Start designing your gang sheet in minutes. No design software needed.`;

const QSProductForm: React.FC = () => {
  const { store, setStore } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = !!productId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  // Product page settings (stored on store, not product)
  const [deliverySteps, setDeliverySteps] = useState<{ label: string; time: string }[]>(
    store?.delivery_steps?.length ? store.delivery_steps : DEFAULT_DELIVERY_STEPS
  );
  const [showProductFaq, setShowProductFaq] = useState(store?.show_product_faq !== false);
  const [savingPageSettings, setSavingPageSettings] = useState(false);

  const [formData, setFormData] = useState<QSProductInput>({
    product_name: '',
    product_slug: '',
    description: DEFAULT_PRODUCT_DESCRIPTION,
    image_url: '',
    product_images: [],
    roll_width_inches: 22,
    show_pricing: true,
    pricing_basis: 'area',
    pricing_type: 'flat',
    tier_calculation: 'slab',
    flat_price: 0,
    pricing_tiers: [{ min: 0, max: null, price: 0 }],
    minimum_order: 0,
    below_minimum_action: 'block',
    is_active: true,
  });

  // Load existing product
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;

      const result = await getQSProductById(productId);
      if (result.success && result.data) {
        const product = result.data;
        const images = product.product_images?.length ? product.product_images : (product.image_url ? [product.image_url] : []);
        setProductImages(images);
        setFormData({
          product_name: product.product_name,
          product_slug: product.product_slug,
          description: product.description || '',
          image_url: product.image_url || '',
          product_images: images,
          roll_width_inches: product.roll_width_inches,
          show_pricing: product.show_pricing,
          pricing_basis: product.pricing_basis,
          pricing_type: product.pricing_type,
          tier_calculation: product.tier_calculation,
          flat_price: product.flat_price || 0,
          pricing_tiers: product.pricing_tiers?.length > 0 
            ? product.pricing_tiers 
            : [{ min: 0, max: null, price: 0 }],
          minimum_order: product.minimum_order || 0,
          below_minimum_action: product.below_minimum_action,
          is_active: product.is_active,
        });
      } else {
        toast.error('Product not found');
        navigate('/app/quick-store/products');
      }
      setLoading(false);
    };

    loadProduct();
  }, [productId, navigate]);

  const handleInputChange = (field: keyof QSProductInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'product_name' && !isEditing) {
      setFormData((prev) => ({ ...prev, product_slug: generateSlug(value) }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    if (productImages.length >= 5) { toast.error('Maximum 5 images allowed'); return; }

    setUploadingImage(true);
    const result = await uploadStoreAsset(store.id, file, 'product');

    if (result.success && result.url) {
      const updated = [...productImages, result.url];
      setProductImages(updated);
      handleInputChange('product_images', updated);
      handleInputChange('image_url', updated[0]); // First image = thumbnail
      toast.success(`Image ${updated.length} uploaded!`);
    } else {
      toast.error(result.error || 'Failed to upload image');
    }
    setUploadingImage(false);
  };

  const handleRemoveImage = (idx: number) => {
    const updated = productImages.filter((_, i) => i !== idx);
    setProductImages(updated);
    handleInputChange('product_images', updated);
    handleInputChange('image_url', updated[0] || ''); // Update thumbnail
  };

  // Tier management
  const addTier = () => {
    const tiers = formData.pricing_tiers || [];
    if (tiers.length >= 5) {
      toast.error('Maximum 5 tiers allowed');
      return;
    }

    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier?.max ? lastTier.max + 1 : (lastTier?.min || 0) + 100;

    const updatedTiers = [
      ...tiers.slice(0, -1).map(t => ({ ...t, max: t.max })),
      { ...lastTier, max: newMin - 1 },
      { min: newMin, max: null, price: 0 },
    ];

    handleInputChange('pricing_tiers', updatedTiers);
  };

  const removeTier = (index: number) => {
    const tiers = formData.pricing_tiers || [];
    if (tiers.length <= 1) return;

    const updatedTiers = tiers.filter((_, i) => i !== index);
    updatedTiers[updatedTiers.length - 1].max = null;
    handleInputChange('pricing_tiers', updatedTiers);
  };

  const updateTier = (index: number, field: keyof PricingTier, value: number | null) => {
    const tiers = [...(formData.pricing_tiers || [])];
    tiers[index] = { ...tiers[index], [field]: value };
    handleInputChange('pricing_tiers', tiers);
  };

  const handleSave = async () => {
    if (!store?.id) return;

    // Validation
    if (!formData.product_name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (formData.roll_width_inches <= 0) {
      toast.error('Roll width must be greater than 0');
      return;
    }
    if (formData.show_pricing) {
      if (formData.pricing_type === 'flat' && (formData.flat_price || 0) <= 0) {
        toast.error('Please set a price');
        return;
      }
      if (formData.pricing_type === 'tiered') {
        const hasInvalidTier = formData.pricing_tiers?.some(t => t.price <= 0);
        if (hasInvalidTier) {
          toast.error('All tier prices must be greater than 0');
          return;
        }
      }
    }

    setSaving(true);

    try {
      if (isEditing && productId) {
        const result = await updateQSProduct(productId, formData);
        if (result.success) {
          toast.success('Product updated!');
          navigate('/app/quick-store/products');
        } else {
          toast.error(result.error || 'Failed to update');
        }
      } else {
        const result = await createQSProduct(store.id, formData);
        if (result.success) {
          toast.success('Product created!');
          navigate('/app/quick-store/products');
        } else {
          toast.error(result.error || 'Failed to create');
        }
      }
    } catch (err) {
      toast.error('An error occurred');
    }

    setSaving(false);
  };

  const currencySymbol = CURRENCY_CONFIG[store?.currency || 'INR'].symbol;
  const unitLabel = formData.pricing_basis === 'area'
    ? 'sq.inch'
    : UNIT_LABELS[store?.measurement_unit || 'inch'].singular;

  if (loading) {
    return <FormSkeleton fields={6} />;
  }

  if (!store) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please complete store setup first
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/quick-store/products')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  placeholder="22-inch DTF Roll"
                  value={formData.product_name}
                  onChange={(e) => handleInputChange('product_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input
                  placeholder="22-inch-dtf-roll"
                  value={formData.product_slug}
                  onChange={(e) => handleInputChange('product_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description</Label>
                <button
                  type="button"
                  onClick={() => handleInputChange('description', DEFAULT_PRODUCT_DESCRIPTION)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Reset to default description"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
              <Textarea
                placeholder="Premium quality DTF film, perfect for cotton and polyester fabrics..."
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                maxLength={800}
              />
              <p className="text-xs text-gray-500 text-right">
                {(formData.description || '').length}/800
              </p>
            </div>

            <div className="space-y-2">
              <Label>Roll Width (inches) *</Label>
              <Input
                type="number"
                min={1}
                value={formData.roll_width_inches}
                onChange={(e) => handleInputChange('roll_width_inches', parseFloat(e.target.value) || 0)}
                className="w-32"
              />
            </div>

            {/* Product Images */}
            <div className="space-y-2">
              <Label>Product Images</Label>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2.5 mb-3">
                <p className="text-sm text-indigo-600"><span className="font-semibold">Recommended:</span> 800 × 1000 px · Up to 5 images</p>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {productImages.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-medium">Main</span>
                    )}
                  </div>
                ))}
                {productImages.length < 5 && (
                  <label className="cursor-pointer aspect-square">
                    <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-indigo-300 transition-colors">
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-400">{productImages.length === 0 ? 'Add image' : `${productImages.length}/5`}</span>
                        </>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                  </label>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>{/* end LEFT COLUMN */}

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6">

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show Pricing Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Show pricing to customers</p>
                <p className="text-sm text-gray-500">
                  If disabled, customers will see "Contact for pricing"
                </p>
              </div>
              <Switch
                checked={formData.show_pricing}
                onCheckedChange={(v) => handleInputChange('show_pricing', v)}
              />
            </div>

            {formData.show_pricing && (
              <>
                {/* Pricing Basis */}
                <div className="space-y-2">
                  <Label>Pricing Basis</Label>
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    {([
                      { id: 'length' as PricingBasis, label: 'Per inch (length)' },
                      { id: 'area' as PricingBasis, label: 'Per sq.inch (area)' },
                    ]).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleInputChange('pricing_basis', id)}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                          formData.pricing_basis === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Type */}
                <div className="space-y-2">
                  <Label>Pricing Type</Label>
                  <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                    {([
                      { id: 'flat' as PricingType, label: 'Flat Rate' },
                      { id: 'tiered' as PricingType, label: 'Tiered (Bulk Discounts)' },
                    ]).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleInputChange('pricing_type', id)}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                          formData.pricing_type === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flat Price */}
                {formData.pricing_type === 'flat' && (
                  <div className="space-y-2">
                    <Label>Price per {unitLabel}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{currencySymbol}</span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.flat_price || ''}
                        onChange={(e) => handleInputChange('flat_price', parseFloat(e.target.value) || 0)}
                        className="w-32"
                      />
                      <span className="text-gray-500">per {unitLabel}</span>
                    </div>
                  </div>
                )}

                {/* Tiered Pricing */}
                {formData.pricing_type === 'tiered' && (
                  <>
                    <div className="space-y-2">
                      <Label>Pricing Tiers</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-sm font-medium">From</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">To</th>
                              <th className="px-4 py-2 text-left text-sm font-medium">Price/{unitLabel}</th>
                              <th className="px-4 py-2 w-12"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(formData.pricing_tiers || []).map((tier, index) => (
                              <tr key={index} className="border-t">
                                <td className="px-4 py-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={tier.min}
                                    onChange={(e) => updateTier(index, 'min', parseInt(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  {tier.max === null ? (
                                    <span className="text-gray-500">∞</span>
                                  ) : (
                                    <Input
                                      type="number"
                                      min={tier.min + 1}
                                      value={tier.max}
                                      onChange={(e) => updateTier(index, 'max', parseInt(e.target.value) || null)}
                                      className="w-24"
                                    />
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-1">
                                    <span>{currencySymbol}</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      value={tier.price}
                                      onChange={(e) => updateTier(index, 'price', parseFloat(e.target.value) || 0)}
                                      className="w-24"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  {(formData.pricing_tiers || []).length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeTier(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {(formData.pricing_tiers || []).length < 5 && (
                        <Button variant="outline" size="sm" onClick={addTier}>
                          <Plus className="h-4 w-4 mr-1" /> Add Tier
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Minimum Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              Minimum Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum Order</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={formData.minimum_order || ''}
                  onChange={(e) => handleInputChange('minimum_order', parseInt(e.target.value) || 0)}
                  className="w-32"
                />
                <span className="text-gray-500">
                  {formData.pricing_basis === 'area' ? 'sq.inches' : 'inches'}
                </span>
              </div>
              <p className="text-xs text-gray-500">Set to 0 for no minimum</p>
            </div>

            {(formData.minimum_order || 0) > 0 && (
              <div className="space-y-2">
                <Label>If order is below minimum</Label>
                <Select
                  value={formData.below_minimum_action}
                  onValueChange={(v) => handleInputChange('below_minimum_action', v as BelowMinimumAction)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block submission until minimum is met</SelectItem>
                    <SelectItem value="charge_minimum">Allow but charge for minimum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Product Active</p>
                <p className="text-sm text-gray-500">
                  Inactive products won't appear in your store
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => handleInputChange('is_active', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Page Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Product Page Settings
            </CardTitle>
            <CardDescription>Customize what customers see on this product's page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Delivery Timeline */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Delivery Timeline</Label>
              <p className="text-xs text-[#7c7c7c]">Shown on the product page to set customer expectations</p>
              <div className="space-y-2">
                {deliverySteps.map((step, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Step {idx + 1} Label</Label>
                      <Input
                        value={step.label}
                        onChange={(e) => setDeliverySteps(deliverySteps.map((s, i) => i === idx ? { ...s, label: e.target.value } : s))}
                        placeholder="e.g. Order Placed"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Timeframe</Label>
                      <Input
                        value={step.time}
                        onChange={(e) => setDeliverySteps(deliverySteps.map((s, i) => i === idx ? { ...s, time: e.target.value } : s))}
                        placeholder="e.g. Within 24h"
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="font-medium text-sm">FAQ on Product Page</p>
                <p className="text-xs text-[#7c7c7c]">Show your store's FAQ section below the product details</p>
              </div>
              <Switch checked={showProductFaq} onCheckedChange={setShowProductFaq} />
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                if (!store?.id) return;
                setSavingPageSettings(true);
                const result = await updateQuickStore(store.id, {
                  delivery_steps: deliverySteps,
                  show_product_faq: showProductFaq,
                });
                if (result.success && result.data) {
                  setStore(result.data);
                  toast.success('Product page settings saved!');
                } else {
                  toast.error(result.error || 'Failed to save');
                }
                setSavingPageSettings(false);
              }}
              disabled={savingPageSettings}
            >
              {savingPageSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Page Settings
            </Button>
          </CardContent>
        </Card>
        </div>{/* end RIGHT COLUMN */}

      </div>{/* end 2-column grid */}

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[70px] z-50">
        <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-3 flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/app/quick-store/products')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QSProductForm;
