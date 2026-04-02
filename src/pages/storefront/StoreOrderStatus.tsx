import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { QuickStore, QSOrder, formatPrice, ORDER_STATUS_LABELS } from '@/types/quickStore';
import { getOrderByNumber } from '@/services/qsOrderService';
import { trackEvent } from '@/services/storefrontService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Loader2,
  Search,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  FileImage,
  Phone,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import OrderStatusTracker from '@/components/storefront/OrderStatusTracker';

interface Props {
  store: QuickStore;
}

const StoreOrderStatus: React.FC<Props> = ({ store }) => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';

  const [order, setOrder] = useState<QSOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState(orderCode || '');

  useEffect(() => {
    if (orderCode) {
      loadOrder(orderCode);
    }
  }, [orderCode]);

  const loadOrder = async (code: string) => {
    setLoading(true);
    setError(null);

    const result = await getOrderByNumber(code);
    
    if (result.success && result.data) {
      // Verify the order belongs to this store
      if (result.data.quick_store_id !== store.id) {
        setError('Order not found');
        setOrder(null);
      } else {
        setOrder(result.data);
        trackEvent(store.id, 'order_status_view', { orderCode: code });
      }
    } else {
      setError(result.error || 'Order not found');
      setOrder(null);
    }
    
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      loadOrder(searchCode.trim());
    }
  };

  const handleWhatsApp = () => {
    if (store.whatsapp && order) {
      const message = encodeURIComponent(
        `Hi! I have a question about my order #${order.order_code}.`
      );
      window.open(
        `https://wa.me/${store.whatsapp.replace(/\D/g, '')}?text=${message}`,
        '_blank'
      );
    }
  };

  const handleCall = () => {
    if (store.phone) {
      window.open(`tel:${store.phone}`, '_self');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Link
          to={basePath || '/'}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">
            Enter your order code to check the status of your order.
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="orderCode" className="sr-only">
                  Order Code
                </Label>
                <Input
                  id="orderCode"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter order code (e.g., QS-ABC123)"
                  className="w-full"
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span className="ml-2 hidden sm:inline">Track</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {error && !loading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800">Order Not Found</h3>
                  <p className="text-red-600 text-sm mt-1">
                    We couldn&apos;t find an order with that code. Please check the order code and try again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {order && !loading && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Order #{order.order_code}
                    </CardTitle>
                    <CardDescription>
                      Placed on {formatDate(order.created_at)}
                    </CardDescription>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </CardHeader>
              <CardContent>
                <OrderStatusTracker
                  currentStatus={order.status}
                  createdAt={order.created_at}
                  downloadedAt={order.downloaded_at}
                  completedAt={order.completed_at}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer Name</p>
                    <p className="font-medium">{order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{order.customer_phone}</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Sheet Details
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Sheets</p>
                      <p className="font-medium">{order.sheet_count} sheet(s)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {order.pricing_basis === 'area' ? 'Total Area' : 'Total Length'}
                      </p>
                      <p className="font-medium">
                        {order.pricing_basis === 'area' 
                          ? `${order.total_area_sq_inches.toFixed(1)} sq.in`
                          : `${order.total_length_inches.toFixed(1)} inches`
                        }
                      </p>
                    </div>
                    {order.show_pricing && order.calculated_price !== null && (
                      <div>
                        <p className="text-muted-foreground">Price</p>
                        <p className="font-semibold text-lg">
                          {formatPrice(order.calculated_price, order.currency)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {order.customer_notes && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1">{order.customer_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {order.status === 'pending' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Clock className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-yellow-800">Order Pending</h3>
                      <p className="text-yellow-700 text-sm mt-1">
                        Your order is waiting to be reviewed by the printer. They will start processing it soon.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.status === 'downloaded' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Download className="w-6 h-6 text-blue-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-800">Being Processed</h3>
                      <p className="text-blue-700 text-sm mt-1">
                        The printer has downloaded your design and is working on it. You&apos;ll be notified when it&apos;s ready.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.status === 'completed' && (
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-indigo-800">Order Completed</h3>
                      <p className="text-indigo-700 text-sm mt-1">
                        Your order has been completed! Contact the store to arrange pickup or delivery.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {order.status === 'cancelled' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800">Order Cancelled</h3>
                      <p className="text-red-700 text-sm mt-1">
                        This order has been cancelled. Please contact the store for more information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
                <CardDescription>
                  Contact {store.store_name} for questions about your order.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {store.whatsapp && (
                    <Button
                      onClick={handleWhatsApp}
                      className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  )}
                  {store.phone && (
                    <Button variant="outline" onClick={handleCall} className="gap-2">
                      <Phone className="w-4 h-4" />
                      Call {store.phone}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!orderCode && !order && !loading && !error && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Track Your Order</h3>
                <p className="text-muted-foreground">
                  Enter your order code above to see the status of your order.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: QSOrder['status'] }> = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    downloaded: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const icons = {
    pending: Clock,
    downloaded: Download,
    completed: CheckCircle,
    cancelled: XCircle
  };

  const Icon = icons[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${styles[status]}`}>
      <Icon className="w-4 h-4" />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
};

export default StoreOrderStatus;
