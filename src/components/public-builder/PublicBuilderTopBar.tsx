/**
 * PublicBuilderTopBar Component
 * Displays printer logo, sheet dimensions, price, and Add to Cart button
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, AlertCircle } from "lucide-react";
import { PublicPrinter, PublicVariant, formatPrice, SheetData, convertFromInches } from "@/types/publicBuilder";
import { SizeUnit } from "@/types/builderSettings";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PublicBuilderTopBarProps {
  printer: PublicPrinter;
  sheets: SheetData[];
  canvasWidthInches: number;
  isGenerating: boolean;
  isAddingToCart: boolean;
  onAddToCart: () => void;
  hasLayout: boolean;
  /** Top bar background color from builder settings */
  topBarColor?: string;
  /** Primary/accent color from builder settings */
  primaryColor?: string;
  /** Display unit for measurements (inch/cm/mm) */
  sizeUnit?: SizeUnit;
  /** Whether to show the price in the top bar */
  showPrice?: boolean;
  /** Button border-radius */
  buttonRadius?: string;
}

/** Format a value in the given unit with appropriate symbol */
const formatDimension = (inches: number, unit: SizeUnit): string => {
  const val = convertFromInches(inches, unit);
  const symbol = unit === 'inch' ? '"' : unit === 'cm' ? ' cm' : ' mm';
  return `${val.toFixed(unit === 'mm' ? 1 : 2)}${symbol}`;
};

const PublicBuilderTopBar: React.FC<PublicBuilderTopBarProps> = ({
  printer,
  sheets,
  canvasWidthInches,
  isGenerating,
  isAddingToCart,
  onAddToCart,
  hasLayout,
  topBarColor,
  primaryColor,
  sizeUnit = 'inch',
  showPrice = true,
  buttonRadius,
}) => {
  // Calculate total price from all sheets
  const totalPrice = sheets.reduce((sum, sheet) => {
    return sum + (sheet.matched_variant?.price || 0);
  }, 0);

  // Check if any sheet doesn't have a matched variant
  const hasUnmatchedSheets = sheets.some((sheet) => !sheet.matched_variant);

  // Get total height for display
  const totalHeightInches = sheets.reduce((sum, sheet) => sum + sheet.height_inches, 0);

  // Format dimensions display using the configured size unit
  const getDimensionsDisplay = () => {
    if (!hasLayout || sheets.length === 0) {
      return `${formatDimension(canvasWidthInches, sizeUnit)} × --`;
    }

    if (sheets.length === 1) {
      return `${formatDimension(canvasWidthInches, sizeUnit)} × ${formatDimension(sheets[0].height_inches, sizeUnit)}`;
    }

    // Multiple sheets
    return `${sheets.length} sheets • ${formatDimension(totalHeightInches, sizeUnit)} total`;
  };

  // Get price display
  const getPriceDisplay = () => {
    if (!hasLayout || sheets.length === 0) {
      return "--";
    }

    if (hasUnmatchedSheets) {
      return "Price unavailable";
    }

    return formatPrice(totalPrice, printer.currency);
  };

  // Get detailed breakdown for tooltip
  const getPriceBreakdown = () => {
    if (sheets.length <= 1) return null;

    return sheets.map((sheet) => (
      <div key={sheet.sheet_number} className="flex justify-between gap-4 text-xs">
        <span>Sheet {sheet.sheet_number}:</span>
        <span>
          {sheet.matched_variant
            ? formatPrice(sheet.matched_variant.price, printer.currency)
            : "N/A"}
        </span>
      </div>
    ));
  };

  const isAddToCartDisabled =
    !hasLayout ||
    sheets.length === 0 ||
    hasUnmatchedSheets ||
    isGenerating ||
    isAddingToCart;

  return (
    <div className="sticky top-0 z-50 border-b shadow-sm" style={{ backgroundColor: topBarColor || '#ffffff', color: topBarColor ? '#ffffff' : undefined }}>
      <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
        {/* Left: Logo and Store Name */}
        <div className="flex items-center gap-3">
          {printer.logo_url ? (
            <img
              src={printer.logo_url}
              alt={printer.store_name}
              className="h-10 w-auto max-w-[150px] object-contain"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor ? `${primaryColor}20` : '#eef2ff' }}>
              <span className="font-bold text-lg" style={{ color: primaryColor || '#4F46E5' }}>
                {printer.store_name?.charAt(0) || "S"}
              </span>
            </div>
          )}
          <div className="hidden sm:block">
            <h1 className="font-semibold text-sm" style={{ color: topBarColor ? '#ffffff' : '#111827' }}>
              {printer.store_name}
            </h1>
            <p className="text-xs" style={{ color: topBarColor ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>Gang Sheet Builder</p>
          </div>
        </div>

        {/* Center: Dimensions */}
        <div className="hidden md:flex items-center gap-2 text-base">
          <span style={{ color: topBarColor ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>Sheet:</span>
          <span className="font-semibold" style={{ color: topBarColor ? '#ffffff' : '#111827' }}>
            {getDimensionsDisplay()}
          </span>
          {sheets.length > 1 && (
            <span className="text-sm px-2.5 py-0.5 rounded-full font-medium" style={{
              backgroundColor: primaryColor ? `${primaryColor}20` : '#eef2ff',
              color: primaryColor || '#4338ca',
            }}>
              {sheets.length} sheets
            </span>
          )}
        </div>

        {/* Right: Price and Add to Cart */}
        <div className="flex items-center gap-4">
          {/* Price Display — hidden when showPrice is false */}
          {showPrice && (
          <div className="text-right">
            {sheets.length > 1 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="text-xs" style={{ color: topBarColor ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: topBarColor ? '#ffffff' : '#111827' }}>
                      {getPriceDisplay()}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="p-3">
                  <p className="font-medium mb-2">Price Breakdown</p>
                  {getPriceBreakdown()}
                  <div className="border-t mt-2 pt-2 flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatPrice(totalPrice, printer.currency)}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <p className="text-xs" style={{ color: topBarColor ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>Price</p>
                <p className="text-lg font-bold" style={{ color: topBarColor ? '#ffffff' : '#111827' }}>
                  {getPriceDisplay()}
                </p>
              </div>
            )}
          </div>
          )}

          {/* Add to Cart Button with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  onClick={onAddToCart}
                  disabled={isAddToCartDisabled}
                  variant="ghost"
                  className="text-white gap-2 hover:opacity-90 disabled:opacity-50"
                  style={{ 
                    backgroundColor: isAddToCartDisabled ? '#9ca3af' : (primaryColor || '#4F46E5'), 
                    borderRadius: buttonRadius 
                  }}
                  size="lg"
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Adding...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      <span className="hidden sm:inline">Add to Cart</span>
                    </>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {isAddToCartDisabled && !isAddingToCart && (
              <TooltipContent side="bottom" className="bg-gray-900 text-white">
                {!hasLayout ? (
                  <p>Generate a layout first to add to cart</p>
                ) : hasUnmatchedSheets ? (
                  <p>Some sheets don't have matching sizes</p>
                ) : (
                  <p>Processing...</p>
                )}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>

      {/* Warning banner if sheets don't have variants */}
      {hasLayout && hasUnmatchedSheets && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="flex items-center gap-2 text-amber-800 text-sm max-w-screen-2xl mx-auto">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              Some sheet sizes don't match available variants. Please adjust your
              layout or contact the store.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBuilderTopBar;
