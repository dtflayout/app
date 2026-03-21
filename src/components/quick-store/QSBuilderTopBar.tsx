/**
 * QSBuilderTopBar Component
 * Header for Quick Store builder - displays store logo, sheet info, price, and submit button
 */

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, Store, ArrowLeft } from "lucide-react";
import { QuickStore, QSProduct, formatPrice, Currency, calculatePrice } from "@/types/quickStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SheetInfo {
  sheetNumber: number;
  widthInches: number;
  heightInches: number;
  imageCount: number;
}

interface QSBuilderTopBarProps {
  store: QuickStore;
  product: QSProduct;
  sheets: SheetInfo[];
  isGenerating: boolean;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
  hasLayout: boolean;
  basePath: string;
}

const QSBuilderTopBar: React.FC<QSBuilderTopBarProps> = ({
  store,
  product,
  sheets,
  isGenerating,
  isSubmitting,
  onSubmitOrder,
  hasLayout,
  basePath,
}) => {
  // Calculate total dimensions
  const totalHeightInches = sheets.reduce((sum, sheet) => sum + sheet.heightInches, 0);
  const totalAreaSqInches = sheets.reduce(
    (sum, sheet) => sum + sheet.widthInches * sheet.heightInches,
    0
  );
  const totalImages = sheets.reduce((sum, sheet) => sum + sheet.imageCount, 0);

  // Calculate price using product pricing config
  const priceResult = hasLayout && sheets.length > 0
    ? calculatePrice(product, totalHeightInches, totalAreaSqInches)
    : null;

  const totalPrice = priceResult?.totalPrice || 0;
  const meetsMinimum = priceResult?.meetsMinimum ?? true;

  // Format dimensions display
  const getDimensionsDisplay = () => {
    if (!hasLayout || sheets.length === 0) {
      return `${product.roll_width_inches}" × --"`;
    }

    if (sheets.length === 1) {
      return `${product.roll_width_inches}" × ${sheets[0].heightInches.toFixed(2)}"`;
    }

    // Multiple sheets
    return `${sheets.length} sheets • ${totalHeightInches.toFixed(2)}" total`;
  };

  // Get price display
  const getPriceDisplay = () => {
    if (!hasLayout || sheets.length === 0) {
      return "--";
    }

    if (!product.show_pricing) {
      return "Contact for price";
    }

    return formatPrice(totalPrice, store.currency);
  };

  // Get detailed breakdown for tooltip
  const getPriceBreakdown = () => {
    if (!priceResult || priceResult.breakdown.length === 0) return null;

    return (
      <div className="space-y-1">
        {priceResult.breakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between gap-4 text-xs">
            <span>{item.tierLabel}:</span>
            <span>{item.quantity} × {formatPrice(item.rate, store.currency)}</span>
          </div>
        ))}
        {!meetsMinimum && (
          <div className="text-amber-600 text-xs mt-2 pt-2 border-t">
            Minimum order: {product.minimum_order} {priceResult.displayUnit}
          </div>
        )}
      </div>
    );
  };

  const isSubmitDisabled =
    !hasLayout ||
    sheets.length === 0 ||
    totalImages === 0 ||
    isGenerating ||
    isSubmitting ||
    (!meetsMinimum && product.below_minimum_action === "block");

  return (
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
        {/* Left: Back button, Logo and Store Name */}
        <div className="flex items-center gap-3">
          <Link
            to={`${basePath}/p/${product.product_slug}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          
          {store.logo_url ? (
            <img
              src={store.logo_url}
              alt={store.store_name}
              className="h-10 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: store.color_primary }}
            >
              <Store className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="font-semibold text-gray-900 text-sm">
              {store.store_name}
            </h1>
            <p className="text-xs text-gray-500">{product.product_name}</p>
          </div>
        </div>

        {/* Center: Dimensions & Images */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <span className="text-gray-500 text-xs block">Sheet Size</span>
            <span className="font-mono font-medium text-gray-900">
              {getDimensionsDisplay()}
            </span>
          </div>
          
          {hasLayout && sheets.length > 0 && (
            <>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <span className="text-gray-500 text-xs block">
                  {product.pricing_basis === "area" ? "Area" : "Length"}
                </span>
                <span className="font-mono font-medium text-gray-900">
                  {product.pricing_basis === "area"
                    ? `${totalAreaSqInches.toFixed(0)} sq.in`
                    : `${totalHeightInches.toFixed(1)}"`}
                </span>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <span className="text-gray-500 text-xs block">Images</span>
                <span className="font-medium text-gray-900">{totalImages}</span>
              </div>
            </>
          )}
          
          {sheets.length > 1 && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${store.color_primary}20`,
                color: store.color_primary 
              }}
            >
              {sheets.length} sheets
            </span>
          )}
        </div>

        {/* Right: Price and Submit */}
        <div className="flex items-center gap-4">
          {/* Price Display */}
          {product.show_pricing && (
            <div className="text-right">
              {priceResult && priceResult.breakdown.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-lg font-bold" style={{ color: store.color_primary }}>
                        {getPriceDisplay()}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-3">
                    <p className="font-medium mb-2">Price Breakdown</p>
                    {getPriceBreakdown()}
                    <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                      <span>Total:</span>
                      <span>{formatPrice(totalPrice, store.currency)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-lg font-bold" style={{ color: store.color_primary }}>
                    {getPriceDisplay()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Submit Order Button */}
          <Button
            onClick={onSubmitOrder}
            disabled={isSubmitDisabled}
            className="text-white gap-2"
            style={{ backgroundColor: store.color_primary }}
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Submitting...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Submit Order</span>
                {product.show_pricing && hasLayout && totalPrice > 0 && (
                  <span className="hidden lg:inline">
                    ({formatPrice(totalPrice, store.currency)})
                  </span>
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning banner if below minimum */}
      {hasLayout && !meetsMinimum && product.below_minimum_action === "block" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-center gap-2 text-amber-800 text-sm max-w-screen-2xl mx-auto">
            <span>
              Minimum order is {product.minimum_order} {product.pricing_basis === "area" ? "sq.inches" : "inches"}.
              Please add more images to meet the minimum.
            </span>
          </div>
        </div>
      )}

      {/* Info banner if below minimum but charging minimum */}
      {hasLayout && !meetsMinimum && product.below_minimum_action === "charge_minimum" && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center gap-2 text-blue-800 text-sm max-w-screen-2xl mx-auto">
            <span>
              Order is below minimum ({product.minimum_order} {product.pricing_basis === "area" ? "sq.inches" : "inches"}).
              You will be charged for the minimum quantity.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QSBuilderTopBar;
