import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getQuickStore, ensurePrinterForQS } from '@/services/quickStoreService';
import { getPendingOrdersCount } from '@/services/qsOrderService';
import { getStoreMessages } from '@/services/storefrontService';
import { QuickStore } from '@/types/quickStore';
import { buildStoreUrl } from '@/hooks/useSubdomain';
import { AppLayout } from '@/components/AppLayout';
import { FullPageSkeleton } from "@/components/Skeletons";
import {
  Store,
  Home,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Settings2,
  ExternalLink,
  Eye,
  Loader2,
  Users,
  Layout,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const QuickStoreLayout: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState<QuickStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    const loadStore = async () => {
      if (!user?.id) return;

      const result = await getQuickStore(user.id);
      if (result.success && result.data) {
        setStore(result.data);
        
        // Ensure a printer row exists for this user (required for Builder Settings)
        // This is idempotent — returns existing printer if already present
        await ensurePrinterForQS(
          user.id,
          result.data.slug,
          result.data.store_name,
          result.data.logo_url
        );
        
        // Get pending orders count
        const countResult = await getPendingOrdersCount(result.data.id);
        setPendingCount(countResult.count);
        // Get unread messages count
        const msgResult = await getStoreMessages(result.data.id);
        if (msgResult.success) {
          setUnreadMessages((msgResult.data as any[]).filter((m: any) => !m.is_read).length);
        }
      }
      setLoading(false);
    };

    loadStore();
  }, [user?.id]);

  // Refresh pending count periodically
  useEffect(() => {
    if (!store?.id) return;

    const interval = setInterval(async () => {
      const countResult = await getPendingOrdersCount(store.id);
      setPendingCount(countResult.count);
      const msgResult = await getStoreMessages(store.id);
      if (msgResult.success) {
        setUnreadMessages((msgResult.data as any[]).filter((m: any) => !m.is_read).length);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [store?.id]);

  const tabs = [
    { to: '/app/quick-store/setup', icon: Store, label: 'Store Setup' },
    { to: '/app/quick-store/header', icon: Layout, label: 'Header & Footer' },
    { to: '/app/quick-store/homepage', icon: Home, label: 'Homepage' },
    { to: '/app/quick-store/products', icon: Package, label: 'Products' },
    { 
      to: '/app/quick-store/orders', 
      icon: ShoppingCart, 
      label: 'Orders',
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      to: '/app/quick-store/messages',
      icon: MessageSquare,
      label: 'Messages',
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { to: '/app/quick-store/customers', icon: Users, label: 'Customers' },
    { to: '/app/quick-store/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/app/quick-store/settings', icon: Settings, label: 'Settings' },
    { to: '/app/quick-store/builder-settings', icon: Settings2, label: 'Builder Settings' },
  ];

  const handlePreview = () => {
    if (store?.slug) {
      const url = buildStoreUrl(store.slug);
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <FullPageSkeleton />
      </AppLayout>
    );
  }

  // If no store exists, show just the outlet (for setup page)
  if (!store && !loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <Outlet context={{ store: null, setStore, pendingCount: 0, setPendingCount }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header with Store Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Store Logo */}
            {store?.logo_url ? (
              <img 
                src={store.logo_url} 
                alt={store.store_name}
                className="w-12 h-12 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Store className="h-6 w-6 text-white" />
              </div>
            )}
            
            {/* Store Name & Status */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight">{store?.store_name || 'Quick Store'}</h1>
                {store?.is_published ? (
                  <Badge variant="default" className="bg-indigo-500">Live</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                {store?.slug ? `${store.slug}.dtflayout.com` : 'Set up your store to get started'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handlePreview}
              disabled={!store?.slug}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button 
              size="sm"
              onClick={handlePreview}
              disabled={!store?.is_published}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Store
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  cn(
                    "group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap",
                    isActive
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <tab.icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-indigo-500"
                          : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {tab.label}
                    {tab.badge && (
                      <Badge 
                        variant="destructive" 
                        className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                      >
                        {tab.badge}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Page Content */}
        <Outlet context={{ store, setStore, pendingCount, setPendingCount }} />
      </div>
    </AppLayout>
  );
};

export default QuickStoreLayout;
