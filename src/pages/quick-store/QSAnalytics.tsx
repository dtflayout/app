import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getAnalyticsSummary } from '@/services/storefrontService';
import { getOrderStats } from '@/services/qsOrderService';
import { QuickStore } from '@/types/quickStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Eye, Package, ShoppingCart, TrendingUp, Users, MousePointer } from 'lucide-react';
import { AnalyticsSkeleton } from "@/components/Skeletons";

interface OutletContextType {
  store: QuickStore | null;
}

const QSAnalytics: React.FC = () => {
  const { store } = useOutletContext<OutletContextType>();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_views: 0,
    product_views: 0,
    builder_opens: 0,
    orders_submitted: 0,
    views_today: 0,
    views_this_week: 0,
  });
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    downloaded: 0,
    completed: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!store?.id) return;

      const [analyticsData, ordersData] = await Promise.all([
        getAnalyticsSummary(store.id),
        getOrderStats(store.id),
      ]);

      setAnalytics(analyticsData);
      setOrderStats(ordersData);
      setLoading(false);
    };

    loadData();
  }, [store?.id]);

  if (!store) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please complete store setup first
      </div>
    );
  }

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  const conversionRate = analytics.total_views > 0 
    ? ((analytics.orders_submitted / analytics.total_views) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Traffic Stats */}
      <div>
        <h2 className="text-lg font-medium mb-4">Traffic</h2>
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{analytics.total_views}</p>
                  <p className="text-sm text-gray-500">Total Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{analytics.views_today}</p>
                  <p className="text-sm text-gray-500">Views Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{analytics.views_this_week}</p>
                  <p className="text-sm text-gray-500">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MousePointer className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{analytics.product_views}</p>
                  <p className="text-sm text-gray-500">Product Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div>
        <h2 className="text-lg font-medium mb-4">Conversion Funnel</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-blue-600">{analytics.total_views}</p>
                <p className="text-sm text-gray-500 mt-1">Page Views</p>
              </div>
              <div className="text-gray-300 text-2xl">→</div>
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-purple-600">{analytics.product_views}</p>
                <p className="text-sm text-gray-500 mt-1">Product Views</p>
              </div>
              <div className="text-gray-300 text-2xl">→</div>
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-orange-600">{analytics.builder_opens}</p>
                <p className="text-sm text-gray-500 mt-1">Builder Opens</p>
              </div>
              <div className="text-gray-300 text-2xl">→</div>
              <div className="text-center flex-1">
                <p className="text-3xl font-bold text-indigo-600">{analytics.orders_submitted}</p>
                <p className="text-sm text-gray-500 mt-1">Orders</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-sm text-gray-500">
                Conversion Rate: <span className="font-bold text-indigo-600">{conversionRate}%</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Stats */}
      <div>
        <h2 className="text-lg font-medium mb-4">Orders</h2>
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{orderStats.total}</p>
                  <p className="text-sm text-gray-500">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Package className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{orderStats.pending}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Package className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{orderStats.completed}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold">{orderStats.thisMonth}</p>
                  <p className="text-sm text-gray-500">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
        <p>
          <strong>Note:</strong> Analytics data updates in real-time. Page views are tracked anonymously 
          without storing personal information.
        </p>
      </div>
    </div>
  );
};

export default QSAnalytics;
