/**
 * StoreAccount Page
 * Customer's account page showing profile and order history
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  Package,
  LogOut,
  ShoppingBag,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { getCustomerOrders } from '@/services/qsCustomerService';
import { QuickStore, formatPrice, QSOrder } from '@/types/quickStore';
import { format } from 'date-fns';

interface Props {
  store: QuickStore;
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    processing: { variant: 'default', label: 'Processing' },
    ready: { variant: 'default', label: 'Ready' },
    completed: { variant: 'outline', label: 'Completed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };
  
  const style = styles[status] || { variant: 'secondary' as const, label: status };
  return <Badge variant={style.variant}>{style.label}</Badge>;
};

const StoreAccount: React.FC<Props> = ({ store }) => {
  const navigate = useNavigate();
  const { customer, isLoggedIn, isLoading: authLoading, logout } = useCustomerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  const basePath = `/s/${store.slug}`;

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      navigate(basePath);
    }
  }, [authLoading, isLoggedIn, navigate, basePath]);

  // Load orders
  useEffect(() => {
    const loadOrders = async () => {
      if (!customer?.id) return;
      
      setIsLoadingOrders(true);
      const result = await getCustomerOrders(customer.id);
      
      if (result.success) {
        setOrders(result.data || []);
      }
      setIsLoadingOrders(false);
    };

    if (isLoggedIn && customer) {
      loadOrders();
    }
  }, [isLoggedIn, customer]);

  const handleLogout = () => {
    logout();
    navigate(basePath);
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight">My Account</h1>
          <p className="text-muted-foreground">Manage your profile and view orders</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg"
                style={{ backgroundColor: store.color_primary }}
              >
                {customer.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <p className="font-medium">{customer.name || 'Customer'}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: store.color_primary }}>
                {customer.total_orders}
              </p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No orders yet</p>
                <Button
                  onClick={() => navigate(`${basePath}/products`)}
                  style={{ backgroundColor: store.color_primary }}
                  className="text-white"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`${basePath}/order/${order.order_code}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${store.color_primary}20` }}
                      >
                        <Package className="h-5 w-5" style={{ color: store.color_primary }} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">#{order.order_code}</p>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{order.product?.product_name || 'Product'}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {order.calculated_price && (
                        <p className="font-semibold" style={{ color: store.color_primary }}>
                          {formatPrice(order.calculated_price, order.currency)}
                        </p>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StoreAccount;
