/**
 * StoreBuilder Page
 * Customer-facing builder for Quick Store
 * Route: /s/:storeSlug/builder/:productSlug
 * 
 * Similar to PublicBuilder but uses Quick Store's area/length pricing model
 * and submits orders to the Quick Store system instead of the website's cart
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Types
import { 
  QuickStore, 
  QSProduct, 
  calculatePrice, 
  formatPrice,
  QSOrderInput,
  OrderSheet,
} from '@/types/quickStore';

// Services
import { getPublicProductBySlug, trackEvent } from '@/services/storefrontService';
import { 
  createOrder, 
  uploadOrderSheet, 
  uploadOrderPreview,
  updateOrderSheetPaths,
  linkOrderToCustomer,
} from '@/services/qsOrderService';

// Contexts
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

// Hooks
import { useBuilderSettings } from '@/hooks/useBuilderSettings';

// Components
import { QSBuilderTopBar } from '@/components/quick-store';
import OrderSubmitModal from '@/components/quick-store/OrderSubmitModal';
import { CollageCreator, SheetLayoutData, SheetExportData } from '@/components/CollageCreator';

interface Props {
  store: QuickStore;
}

interface SheetState {
  sheetNumber: number;
  widthInches: number;
  heightInches: number;
  imageCount: number;
}

const StoreBuilder: React.FC<Props> = ({ store }) => {
  const { productSlug } = useParams<{ productSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';

  // Get customer auth state
  const { customer, isLoggedIn } = useCustomerAuth();

  // Load printer's builder settings (userId primary, slug fallback)
  const { settings: builderSettings } = useBuilderSettings({ userId: store.user_id, slug: store.slug, context: 'qs' });

  // Data state
  const [product, setProduct] = useState<QSProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Layout state
  const [sheetStates, setSheetStates] = useState<SheetState[]>([]);
  const [hasLayout, setHasLayout] = useState(false);
  
  // Order submission state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerExport, setTriggerExport] = useState(false);
  const [pendingCustomerInfo, setPendingCustomerInfo] = useState<{
    name: string;
    phone: string;
    notes?: string;
  } | null>(null);

  // Canvas width from product settings
  const canvasWidthInches = product?.roll_width_inches || 22;

  // Load product data
  useEffect(() => {
    const loadProduct = async () => {
      if (!productSlug) {
        setLoadError('No product specified');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const result = await getPublicProductBySlug(store.id, productSlug);
        
        if (!result.success || !result.data) {
          setLoadError(result.error || 'Product not found');
          setIsLoading(false);
          return;
        }

        if (!result.data.is_active) {
          setLoadError('This product is currently unavailable');
          setIsLoading(false);
          return;
        }

        setProduct(result.data);
        trackEvent(store.id, 'builder_open', { productSlug });
        
        console.log('[StoreBuilder] Loaded product:', result.data.product_name);
      } catch (err) {
        console.error('[StoreBuilder] Error loading product:', err);
        setLoadError('Failed to load product. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [store.id, productSlug]);

  // Live chat widget — disabled until domain whitelist is implemented
  // Printers can still save their chat widget code in settings,
  // but it won't execute until we add safe injection with allowed domains.
  // TODO: Re-enable with domain whitelist (Tawk.to, Crisp, Intercom, etc.)
  // See CLAUDE_CONTEXT.md section 5.4 for details.
  useEffect(() => {
    if (builderSettings.enable_live_chat && builderSettings.live_chat_script?.trim()) {
      console.log('[StoreBuilder] Live chat configured but script injection is disabled (security hardening)');
    }
  }, [builderSettings.enable_live_chat, builderSettings.live_chat_script]);

  // Load Google Font
  useEffect(() => {
    const fontFamily = builderSettings.font_family;
    if (!fontFamily || fontFamily === 'Inter') return;

    const linkId = 'dtf-builder-font';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [builderSettings.font_family]);

  // Set favicon to store logo
  useEffect(() => {
    if (!store.logo_url) return;

    const linkId = 'dtf-builder-favicon';
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = store.logo_url;

    return () => {
      const el = document.getElementById(linkId);
      if (el) el.remove();
    };
  }, [store.logo_url]);

  /**
   * Handle layout generation callback from CollageCreator
   */
  const handleLayoutGenerated = (data: {
    sheets: SheetLayoutData[];
    totalSheets: number;
    widthInches: number;
  }) => {
    console.log(`[StoreBuilder] Layout generated: ${data.totalSheets} sheet(s)`);

    const newSheetStates: SheetState[] = data.sheets.map(sheet => ({
      sheetNumber: sheet.sheetNumber,
      widthInches: sheet.widthInches,
      heightInches: sheet.heightInches,
      imageCount: sheet.imageCount,
    }));

    setSheetStates(newSheetStates);
    setHasLayout(true);
  };

  /**
   * Calculate totals from sheet states
   */
  const totals = useMemo(() => {
    const totalHeightInches = sheetStates.reduce((sum, s) => sum + s.heightInches, 0);
    const totalAreaSqInches = sheetStates.reduce(
      (sum, s) => sum + s.widthInches * s.heightInches, 
      0
    );
    const totalImages = sheetStates.reduce((sum, s) => sum + s.imageCount, 0);

    return { totalHeightInches, totalAreaSqInches, totalImages };
  }, [sheetStates]);

  /**
   * Calculate price
   */
  const priceResult = useMemo(() => {
    if (!product || !hasLayout || sheetStates.length === 0) return null;
    return calculatePrice(product, totals.totalHeightInches, totals.totalAreaSqInches);
  }, [product, hasLayout, sheetStates, totals]);

  const totalPrice = priceResult?.totalPrice || 0;

  /**
   * Handle submit order button click - opens customer info modal
   */
  const handleSubmitClick = () => {
    if (!hasLayout || sheetStates.length === 0) {
      toast.error('Please generate a layout first');
      return;
    }

    if (totals.totalImages === 0) {
      toast.error('Please add images to your design');
      return;
    }

    // Check minimum order
    if (priceResult && !priceResult.meetsMinimum && product?.below_minimum_action === 'block') {
      toast.error(`Minimum order is ${product.minimum_order} ${product.pricing_basis === 'area' ? 'sq.inches' : 'inches'}`);
      return;
    }

    setShowOrderModal(true);
  };

  /**
   * Handle customer info submission from modal - triggers export
   */
  const handleOrderSubmit = (customerInfo: { name: string; phone: string; notes?: string }) => {
    setPendingCustomerInfo(customerInfo);
    setIsSubmitting(true);
    setShowOrderModal(false);
    setTriggerExport(true);
  };

  /**
   * Handle export completion from CollageCreator
   */
  const handleExportComplete = async (data: {
    sheets: SheetExportData[];
    totalSheets: number;
  }) => {
    setTriggerExport(false);

    if (!product || !pendingCustomerInfo) {
      toast.error('Missing order information');
      setIsSubmitting(false);
      return;
    }

    try {
      toast.loading(`Creating order with ${data.totalSheets} sheet(s)...`, { id: 'submit-order' });

      console.log(`[StoreBuilder] Processing ${data.totalSheets} exported sheets`);

      // Build order sheets array
      const orderSheets: OrderSheet[] = data.sheets.map((exportedSheet, index) => {
        const sheetState = sheetStates[index];
        return {
          sheet_number: exportedSheet.sheetNumber,
          width_inches: exportedSheet.widthInches,
          height_inches: exportedSheet.heightInches,
          area_sq_inches: exportedSheet.widthInches * exportedSheet.heightInches,
          storage_path: '', // Will be updated after upload
          preview_url: '', // Will be updated after upload
        };
      });

      // Create order input - include customer email if logged in
      const orderInput: QSOrderInput = {
        quick_store_id: store.id,
        product_id: product.id,
        customer_name: pendingCustomerInfo.name,
        customer_phone: pendingCustomerInfo.phone,
        customer_email: isLoggedIn && customer ? customer.email : null,
        customer_notes: pendingCustomerInfo.notes || null,
        sheets: orderSheets,
        sheet_count: data.totalSheets,
        total_length_inches: totals.totalHeightInches,
        total_area_sq_inches: totals.totalAreaSqInches,
        currency: store.currency,
        pricing_basis: product.pricing_basis,
        calculated_price: product.show_pricing ? totalPrice : null,
        show_pricing: product.show_pricing,
      };

      // Create order in database
      const orderResult = await createOrder(orderInput, store.slug);

      if (!orderResult.success || !orderResult.data) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      const orderId = orderResult.data.id;
      const orderCode = orderResult.data.order_code;
      console.log(`[StoreBuilder] Order created: ${orderCode}`);

      // Link order to customer if logged in
      if (isLoggedIn && customer) {
        console.log(`[StoreBuilder] Linking order to customer: ${customer.id}`);
        await linkOrderToCustomer(orderId, customer.id);
      }

      // Upload sheet files and track paths
      toast.loading(`Uploading ${data.totalSheets} sheet(s)...`, { id: 'submit-order' });

      const uploadedSheetPaths: Array<{
        sheet_number: number;
        storage_path: string;
        preview_url: string;
      }> = [];

      for (const exportedSheet of data.sheets) {
        console.log(`[StoreBuilder] Uploading sheet ${exportedSheet.sheetNumber}...`);

        let storagePath = '';
        let previewUrl = '';

        // Upload full-resolution PNG
        const uploadResult = await uploadOrderSheet(
          store.slug,
          orderCode,
          exportedSheet.sheetNumber,
          exportedSheet.blob
        );

        if (uploadResult.success && uploadResult.path) {
          storagePath = uploadResult.path;
        } else {
          console.warn(`[StoreBuilder] Failed to upload sheet ${exportedSheet.sheetNumber}:`, uploadResult.error);
        }

        // Upload preview PNG
        const previewResult = await uploadOrderPreview(
          store.slug,
          orderCode,
          exportedSheet.sheetNumber,
          exportedSheet.previewBlob
        );

        if (previewResult.success && previewResult.publicUrl) {
          previewUrl = previewResult.publicUrl;
        } else {
          console.warn(`[StoreBuilder] Failed to upload preview for sheet ${exportedSheet.sheetNumber}`);
        }

        // Track uploaded paths
        uploadedSheetPaths.push({
          sheet_number: exportedSheet.sheetNumber,
          storage_path: storagePath,
          preview_url: previewUrl,
        });

        console.log(`[StoreBuilder] Sheet ${exportedSheet.sheetNumber} uploaded`);
      }

      // Update order with sheet paths
      if (uploadedSheetPaths.length > 0) {
        console.log(`[StoreBuilder] Updating order with sheet paths...`);
        await updateOrderSheetPaths(orderId, uploadedSheetPaths);
      }

      // Track analytics
      trackEvent(store.id, 'order_submit', {
        productId: product.id,
        orderCode,
        sheetCount: data.totalSheets,
        totalArea: totals.totalAreaSqInches,
        price: totalPrice,
      });

      toast.dismiss('submit-order');
      toast.success('Order submitted successfully!');

      // Redirect to order status page
      setTimeout(() => {
        navigate(`${basePath}/order/${orderCode}`);
      }, 500);

    } catch (error: any) {
      console.error('[StoreBuilder] Order submission error:', error);
      toast.dismiss('submit-order');
      toast.error(error.message || 'Failed to submit order. Please try again.');
      setIsSubmitting(false);
      setPendingCustomerInfo(null);
    }
  };

  // Appearance CSS custom properties from builder settings (mirrors PublicBuilder)
  const buttonRadius = builderSettings.button_style === 'pill' ? '9999px' : builderSettings.button_style === 'square' ? '2px' : '8px';

  const appearanceStyle = useMemo(() => ({
    '--builder-bg': builderSettings.color_background,
    '--builder-topbar': builderSettings.color_top_bar,
    '--builder-primary': builderSettings.color_primary,
    '--builder-secondary': builderSettings.color_secondary,
    '--builder-text': builderSettings.color_text,
    '--builder-button-radius': buttonRadius,
  } as React.CSSProperties), [builderSettings, buttonRadius]);

  // Loading state
  if (isLoading) {
    const loaderContent = builderSettings.use_logo_as_loader && store.logo_url ? (
      <img src={store.logo_url} alt="Loading" className="h-12 w-12 animate-pulse mx-auto mb-4" />
    ) : (
      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{ color: store.color_primary }} />
    );

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: store.color_background }}>
        <div className="text-center">
          {loaderContent}
          <p className="text-gray-600">Loading builder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: store.color_background }}>
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Load Builder
          </h1>
          <p className="text-gray-600 mb-6">
            {loadError || 'The requested product could not be found.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate(`${basePath}/products`)}
          >
            Browse Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: builderSettings.color_background || '#f3f4f6', fontFamily: `'${builderSettings.font_family || 'Inter'}', sans-serif`, ...appearanceStyle }}>
      <QSBuilderTopBar
        store={store}
        product={product}
        sheets={sheetStates}
        isGenerating={false}
        isSubmitting={isSubmitting}
        onSubmitOrder={handleSubmitClick}
        hasLayout={hasLayout}
        basePath={basePath}
        topBarColor={builderSettings.color_top_bar}
        primaryColor={builderSettings.color_primary}
        textColor={builderSettings.color_text}
        buttonRadius={buttonRadius}
      />
      
      <div className="flex-1">
        <CollageCreator
          builderMode="public"
          printerSlug={store.slug}
          productSlug={productSlug}
          dpi={300}
          initialCanvasWidth={canvasWidthInches}
          builderSettings={builderSettings}
          onLayoutGenerated={handleLayoutGenerated}
          triggerExport={triggerExport}
          onExportComplete={handleExportComplete}
        />
      </div>

      {/* Order Submit Modal */}
      <OrderSubmitModal
        open={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSubmit={handleOrderSubmit}
        submitting={isSubmitting}
        product={product}
        sheetDimensions={{
          width: canvasWidthInches,
          height: totals.totalHeightInches,
          usedArea: totals.totalAreaSqInches,
        }}
        imageCount={totals.totalImages}
        totalPrice={totalPrice}
        currency={store.currency}
        storeName={store.store_name}
      />
    </div>
  );
};

export default StoreBuilder;
