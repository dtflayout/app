import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { getPublicStore } from '@/services/storefrontService';
import { logAnalyticsEvent } from '@/services/storefrontService';
import { QuickStore } from '@/types/quickStore';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';
import StorefrontLayout from './StorefrontLayout';
import StoreHome from './StoreHome';
import StoreProducts from './StoreProducts';
import StoreProductDetail from './StoreProductDetail';
import StoreBuilder from './StoreBuilder';
import StoreContact from './StoreContact';
import StoreOrderStatus from './StoreOrderStatus';
import StoreAccount from './StoreAccount';
import StoreNotFound from './StoreNotFound';
import { Loader2 } from 'lucide-react';

interface Props {
  storeSlug?: string; // From subdomain hook
}

const StorefrontApp: React.FC<Props> = ({ storeSlug: subdomainSlug }) => {
  const params = useParams();
  const slug = subdomainSlug || params.storeSlug;

  const [store, setStore] = useState<QuickStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadStore = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const result = await getPublicStore(slug);

      if (result.success && result.data) {
        setStore(result.data);

        // Apply store's custom colors
        const root = document.documentElement;
        root.style.setProperty('--store-primary', result.data.color_primary);
        root.style.setProperty('--store-secondary', result.data.color_secondary);
        root.style.setProperty('--store-background', result.data.color_background);
        root.style.setProperty('--store-text', result.data.color_text);

        // Set page title
        document.title = result.data.meta_title || result.data.store_name;

        // Log analytics
        logAnalyticsEvent({
          quick_store_id: result.data.id,
          event_type: 'page_view',
          page_path: window.location.pathname,
        });
      } else {
        setNotFound(true);
      }

      setLoading(false);
    };

    loadStore();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (notFound || !store) {
    return <StoreNotFound />;
  }

  return (
    <CustomerAuthProvider storeSlug={store.slug}>
      <Routes>
        {/* Builder has its own full-screen layout - no header/footer */}
        <Route path="/builder/:productSlug" element={<StoreBuilder store={store} />} />
        
        {/* All other pages use the standard storefront layout with header/footer */}
        <Route path="*" element={
          <StorefrontLayout store={store}>
            <Routes>
              <Route path="/" element={<StoreHome store={store} />} />
              <Route path="/products" element={<StoreProducts store={store} />} />
              <Route path="/p/:productSlug" element={<StoreProductDetail store={store} />} />
              <Route path="/contact" element={<StoreContact store={store} />} />
              <Route path="/order/:orderCode" element={<StoreOrderStatus store={store} />} />
              <Route path="/account" element={<StoreAccount store={store} />} />
              <Route path="*" element={<StoreNotFound />} />
            </Routes>
          </StorefrontLayout>
        } />
      </Routes>
    </CustomerAuthProvider>
  );
};

export default StorefrontApp;
