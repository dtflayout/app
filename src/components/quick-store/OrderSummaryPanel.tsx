import React from 'react';
import { QSProduct, formatPrice, Currency, UNIT_LABELS } from '@/types/quickStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Ruler,
  Image as ImageIcon,
  Calculator,
  ShoppingCart,
  Info,
  ArrowRight
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface SheetDimensions {
  width: number;
  height: number;
  usedArea: number;
}

interface Props {
  product: QSProduct;
  sheetDimensions: SheetDimensions;
  imageCount: number;
  currentPrice: number;
  currency: Currency;
  onSubmit: () => void;
}

const OrderSummaryPanel: React.FC<Props> = ({
  product,
  sheetDimensions,
  imageCount,
  currentPrice,
  currency,
  onSubmit
}) => {
  const unit = 'inch';
  const sheetArea = sheetDimensions.width * sheetDimensions.height;
  
  const getPricingBasisLabel = () => {
    return product.pricing_basis === 'length' ? 'per inch' : 'per sq inch';
  };

  const getPriceBreakdown = (): { label: string; value: string }[] => {
    const breakdown: { label: string; value: string }[] = [];
    
    if (product.pricing_type === 'flat') {
      const rate = product.flat_price || 0;
      if (product.pricing_basis === 'length') {
        breakdown.push({
          label: `${sheetDimensions.height} ${unit} × ${formatPrice(rate, currency)}`,
          value: formatPrice(currentPrice, currency)
        });
      } else {
        breakdown.push({
          label: `${sheetArea.toFixed(1)} sq ${unit} × ${formatPrice(rate, currency)}`,
          value: formatPrice(currentPrice, currency)
        });
      }
    } else {
      const tiers = product.pricing_tiers || [];
      const dimension = product.pricing_basis === 'length' 
        ? sheetDimensions.height 
        : sheetArea;
      
      const applicableTier = tiers.find(
        tier => dimension >= tier.min && (tier.max === null || dimension <= tier.max)
      );
      
      if (applicableTier) {
        breakdown.push({
          label: `Tier: ${applicableTier.min}-${applicableTier.max || '∞'} ${unit}`,
          value: `${formatPrice(applicableTier.price, currency)}/${unit}${product.pricing_basis === 'area' ? '²' : ''}`
        });
      }
    }
    
    return breakdown;
  };

  const priceBreakdown = getPriceBreakdown();

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{product.product_name}</h3>
        <p className="text-sm text-muted-foreground">Order Summary</p>
      </div>

      <Separator className="mb-4" />

      <Card className="mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Sheet Size
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Dimensions</span>
            <span className="font-medium">
              {sheetDimensions.width}&quot; × {sheetDimensions.height}&quot;
            </span>
          </div>
          {product.pricing_basis === 'area' && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-muted-foreground">Total Area</span>
              <span className="font-medium">{sheetArea.toFixed(1)} sq {unit}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Count</span>
            <Badge variant={imageCount > 0 ? 'default' : 'secondary'}>
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Pricing
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {product.pricing_type === 'flat' ? 'Flat rate' : 'Tiered'} pricing{' '}
                    {getPricingBasisLabel()}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4 space-y-2">
          {priceBreakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex-1" />

      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-medium">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(currentPrice, currency)}
          </span>
        </div>

        <Button
          onClick={onSubmit}
          disabled={imageCount === 0}
          className="w-full gap-2"
          size="lg"
        >
          <ShoppingCart className="w-4 h-4" />
          Submit Order
          <ArrowRight className="w-4 h-4" />
        </Button>

        {imageCount === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Add at least one image to submit your order
          </p>
        )}
      </div>

      {product.show_pricing && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Pricing:</strong>{' '}
            {product.pricing_type === 'flat' 
              ? `${formatPrice(product.flat_price || 0, currency)} ${getPricingBasisLabel()}`
              : `Tiered pricing ${getPricingBasisLabel()}`
            }
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>Note:</strong> Final price may vary based on sheet dimensions.
            Payment is collected offline by the store.
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderSummaryPanel;
