/**
 * QSCustomers Page
 * Printer dashboard - view all customers
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Mail,
  Phone,
  ShoppingBag,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
  UserPlus,
} from 'lucide-react';
import { QuickStore, formatPrice } from '@/types/quickStore';
import { getStoreCustomers, QSCustomer } from '@/services/qsCustomerService';
import { format, formatDistanceToNow } from 'date-fns';

let _qsCustomersLoaded = false;

const QSCustomers: React.FC = () => {
  const { store } = useOutletContext<{ store: QuickStore }>();
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState<QSCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(!_qsCustomersLoaded);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'total_orders' | 'total_spent' | 'last_order_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      if (!store?.id) return;
      
      if (!_qsCustomersLoaded) setIsLoading(true);
      const result = await getStoreCustomers(store.id, {
        search: search || undefined,
        sortBy,
        sortOrder,
        limit: 50,
      });
      
      if (result.success) {
        setCustomers(result.data || []);
        setTotalCount(result.count || 0);
      }
      _qsCustomersLoaded = true;
      setIsLoading(false);
    };

    const debounce = setTimeout(loadCustomers, 300);
    return () => clearTimeout(debounce);
  }, [store?.id, search, sortBy, sortOrder]);

  // Calculate stats
  const stats = {
    totalCustomers: totalCount,
    activeCustomers: customers.filter(c => c.total_orders > 0).length,
    totalRevenue: customers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    avgOrderValue: customers.length > 0
      ? customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / 
        customers.reduce((sum, c) => sum + c.total_orders, 0) || 0
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Orders</p>
                <p className="text-2xl font-bold">{stats.activeCustomers}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.totalRevenue, store?.currency || 'INR')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.avgOrderValue, store?.currency || 'INR')}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Date Joined</SelectItem>
                <SelectItem value="total_orders">Total Orders</SelectItem>
                <SelectItem value="total_spent">Total Spent</SelectItem>
                <SelectItem value="last_order_at">Last Order</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
              <p className="text-muted-foreground">
                Customers will appear here when they create accounts or place orders.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/app/quick-store/customers/${customer.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                          {customer.name?.charAt(0).toUpperCase() || customer.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{customer.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {format(new Date(customer.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={customer.total_orders > 0 ? 'default' : 'secondary'}>
                        {customer.total_orders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(customer.total_spent || 0, store?.currency || 'INR')}
                    </TableCell>
                    <TableCell>
                      {customer.last_order_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(customer.last_order_at), { addSuffix: true })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QSCustomers;
