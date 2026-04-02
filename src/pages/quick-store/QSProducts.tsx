import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { getQSProducts, deleteQSProduct, toggleProductActive, reorderQSProducts } from '@/services/qsProductService';
import { QuickStore, QSProduct, CURRENCY_CONFIG, UNIT_LABELS } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, MoreVertical, Pencil, Trash2, Copy, GripVertical, Package, Loader2, Eye, EyeOff } from 'lucide-react';
import { ProductGridSkeleton } from "@/components/Skeletons";

interface OutletContextType {
  store: QuickStore | null;
}

const QSProducts: React.FC = () => {
  const { store } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<QSProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      if (!store?.id) return;
      
      const result = await getQSProducts(store.id);
      if (result.success && result.data) {
        setProducts(result.data);
      }
      setLoading(false);
    };

    loadProducts();
  }, [store?.id]);

  const handleToggleActive = async (product: QSProduct) => {
    const result = await toggleProductActive(product.id, !product.is_active);
    if (result.success) {
      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success(product.is_active ? 'Product hidden' : 'Product visible');
    } else {
      toast.error(result.error || 'Failed to update');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;

    const result = await deleteQSProduct(productId);
    if (result.success) {
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Product deleted');
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  };

  const formatPricing = (product: QSProduct): string => {
    if (!product.show_pricing) return 'Contact for pricing';
    
    const symbol = CURRENCY_CONFIG[store?.currency || 'INR'].symbol;
    const unitLabel = product.pricing_basis === 'area' 
      ? 'sq.inch' 
      : UNIT_LABELS[store?.measurement_unit || 'inch'].singular;

    if (product.pricing_type === 'flat') {
      return `${symbol}${product.flat_price}/${unitLabel}`;
    } else {
      const tiers = product.pricing_tiers || [];
      if (tiers.length === 0) return 'No pricing set';
      const minPrice = Math.min(...tiers.map(t => t.price));
      const maxPrice = Math.max(...tiers.map(t => t.price));
      return `${symbol}${minPrice} - ${symbol}${maxPrice}/${unitLabel}`;
    }
  };

  if (!store) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please complete store setup first
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-bold text-gray-900">Your Products</h2>
          <p className="text-sm text-gray-600">
            {products.length} product{products.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button onClick={() => navigate('/app/quick-store/products/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {loading ? (
        <ProductGridSkeleton count={4} />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">
              Add your first product to start receiving orders
            </p>
            <Button onClick={() => navigate('/app/quick-store/products/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id} className={!product.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Drag Handle */}
                  <GripVertical className="h-5 w-5 text-gray-300 cursor-move flex-shrink-0" />

                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{product.product_name}</h3>
                      {!product.is_active && (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {product.roll_width_inches}" wide • {formatPricing(product)}
                    </p>
                    {product.minimum_order > 0 && (
                      <p className="text-xs text-gray-400">
                        Min: {product.minimum_order} {product.pricing_basis === 'area' ? 'sq.inches' : 'inches'}
                      </p>
                    )}
                  </div>

                  {/* Pricing Display Toggle */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {product.show_pricing ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Active</span>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
                    />
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/app/quick-store/products/${product.id}/edit`)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default QSProducts;
