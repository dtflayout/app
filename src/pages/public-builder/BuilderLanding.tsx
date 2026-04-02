/**
 * BuilderLanding Page
 * Shows available products for a printer on builder.dtflayout.com/:printerSlug
 * If only one product exists, redirects directly to the builder.
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { getPublicPrinter, getPublicProducts } from "@/services/publicBuilderService";

const BuilderLanding: React.FC = () => {
  const { printerSlug } = useParams<{ printerSlug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [products, setProducts] = useState<Array<{ id: string; product_name: string; product_slug: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!printerSlug) {
        setError("Store not found");
        setLoading(false);
        return;
      }

      // Fetch printer info
      const printerResult = await getPublicPrinter(printerSlug);
      if (!printerResult.success || !printerResult.data) {
        setError("Store not found");
        setLoading(false);
        return;
      }

      setStoreName(printerResult.data.store_name);
      setLogoUrl(printerResult.data.logo_url || null);

      // Fetch products
      const productsResult = await getPublicProducts(printerResult.data.id);
      if (!productsResult.success || !productsResult.data) {
        setError("No products available");
        setLoading(false);
        return;
      }

      const activeProducts = productsResult.data;

      // If exactly one product, redirect straight to the builder
      if (activeProducts.length === 1) {
        navigate(`/${printerSlug}/${activeProducts[0].product_slug}`, { replace: true });
        return;
      }

      setProducts(activeProducts);
      setLoading(false);
    };

    load();
  }, [printerSlug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Store Not Found</h1>
          <p className="text-gray-500">The store you're looking for doesn't exist or isn't active.</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{storeName}</h1>
          <p className="text-gray-500">No products are available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Store header */}
        <div className="text-center mb-8">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={storeName}
              className="h-12 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{storeName}</h1>
          <p className="text-gray-500 mt-1">Choose a product to start building your gang sheet</p>
        </div>

        {/* Product list */}
        <div className="space-y-3">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/${printerSlug}/${product.product_slug}`)}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all text-left group"
            >
              <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                {product.product_name}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BuilderLanding;
