import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPublicProducts } from '@/services/storefrontService';
import { QuickStore, QSProduct, CURRENCY_CONFIG, UNIT_LABELS } from '@/types/quickStore';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, ArrowRight } from 'lucide-react';

interface Props {
  store: QuickStore;
}

const StoreProducts: React.FC<Props> = ({ store }) => {
  const location = useLocation();
  const basePath = location.pathname.startsWith('/s/') ? `/s/${store.slug}` : '';

  const [products, setProducts] = useState<QSProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      const result = await getPublicProducts(store.id);
      if (result.success && result.data) {
        setProducts(result.data);
      }
      setLoading(false);
    };

    loadProducts();
  }, [store.id]);

  const formatPricing = (product: QSProduct): string => {
    if (!product.show_pricing) return 'Contact for pricing';

    const symbol = CURRENCY_CONFIG[store.currency].symbol;
    const unitLabel = product.pricing_basis === 'area'
      ? 'sq.inch'
      : UNIT_LABELS[store.measurement_unit].singular;

    if (product.pricing_type === 'flat') {
      return `${symbol}${product.flat_price}/${unitLabel}`;
    } else {
      const tiers = product.pricing_tiers || [];
      if (tiers.length === 0) return 'Contact for pricing';
      const minPrice = Math.min(...tiers.map(t => t.price));
      const maxPrice = Math.max(...tiers.map(t => t.price));
      if (minPrice === maxPrice) {
        return `${symbol}${minPrice}/${unitLabel}`;
      }
      return `${symbol}${minPrice} - ${symbol}${maxPrice}/${unitLabel}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight mb-2" style={{ color: store.color_text }}>
          Our Products
        </h1>
        <p className="text-gray-600">
          Choose a product to start designing your DTF prints
        </p>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20">
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-600 mb-2">No products available</h2>
          <p className="text-gray-500">Please check back later</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link key={product.id} to={`${basePath}/p/${product.product_slug}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 overflow-hidden group">
                {/* Image */}
                <div className="aspect-video bg-gray-100 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <CardContent className="p-5">
                  <h3 className="font-semibold text-lg mb-1" style={{ color: store.color_text }}>
                    {product.product_name}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-3">
                    {product.roll_width_inches}" wide roll
                  </p>

                  {product.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Pricing */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg" style={{ color: store.color_primary }}>
                      {formatPricing(product)}
                    </span>
                    <span 
                      className="text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all"
                      style={{ color: store.color_primary }}
                    >
                      View Details
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Minimum Order */}
                  {product.minimum_order > 0 && (
                    <p className="text-xs text-gray-400 mt-2">
                      Min. order: {product.minimum_order} {product.pricing_basis === 'area' ? 'sq.inches' : 'inches'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default StoreProducts;
