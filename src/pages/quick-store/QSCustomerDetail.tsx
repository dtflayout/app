/**
 * QSCustomerDetail Page
 * Printer dashboard - view individual customer details and order history
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Package,
  ShoppingBag,
  TrendingUp,
  Clock,
  ExternalLink,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { QuickStore, formatPrice } from '@/types/quickStore';
import { getCustomerWithOrders, QSCustomer } from '@/services/qsCustomerService';
import { format, formatDistanceToNow } from 'date-fns';

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

const QSCustomerDetail: React.FC = () => {
  const { customerId } = useParams();
  const { store } = useOutletContext<{ store: QuickStore }>();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<QSCustomer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load customer and orders
  useEffect(() => {
    const loadData = async () => {
      if (!customerId) return;
      
      setIsLoading(true);
      const result = await getCustomerWithOrders(customerId);
      
      if (result.success && result.data) {
        setCustomer(result.data.customer);
        setOrders(result.data.orders);
      }
      setIsLoading(false);
    };

    loadData();
  }, [customerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Customer not found</p>
        <Button variant="outline" onClick={() => navigate('/app/quick-store/customers')}>
          Back to Customers
        </Button>
      </div>
    );
  }

  // Calculate order stats
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const avgOrderValue = orders.length > 0
    ? orders.reduce((sum, o) => sum + (o.calculated_price || 0), 0) / orders.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/quick-store/customers')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{customer.name || 'Customer'}</h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          {customer.phone && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`https://wa.me/${customer.phone?.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
          {customer.email && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open(`mailto:${customer.email}`, '_blank')}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          )}
        </div>
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
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xl">
                {customer.name?.charAt(0).toUpperCase() || 'C'}
              </div>
              <div>
                <p className="font-medium text-lg">{customer.name || 'Unknown'}</p>
                <Badge variant={customer.is_verified ? 'default' : 'secondary'}>
                  {customer.is_verified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Joined {format(new Date(customer.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{customer.total_orders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {formatPrice(customer.total_spent || 0, store?.currency || 'INR')}
                </p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {formatPrice(avgOrderValue, store?.currency || 'INR')}
                </p>
                <p className="text-xs text-muted-foreground">Avg Order</p>
              </div>
            </div>

            {customer.last_order_at && (
              <div className="text-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 inline mr-1" />
                Last order {formatDistanceToNow(new Date(customer.last_order_at), { addSuffix: true })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order History
              <Badge variant="secondary" className="ml-2">{orders.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">
                        #{order.order_code}
                      </TableCell>
                      <TableCell>
                        {order.product?.product_name || 'Unknown Product'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {order.calculated_price
                          ? formatPrice(order.calculated_price, order.currency)
                          : '--'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/app/quick-store/orders/${order.id}`)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QSCustomerDetail;
