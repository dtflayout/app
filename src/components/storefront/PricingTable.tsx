import React from 'react';
import { QSProduct, formatPrice, Currency, UNIT_LABELS } from '@/types/quickStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Calculator, ArrowRight, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface Props {
  product: QSProduct;
  currency: Currency;
  productName?: string;
  compact?: boolean;
}

const PricingTable: React.FC<Props> = ({
  product,
  currency,
  productName,
  compact = false
}) => {
  const unit = 'inch';
  const unitLabel = UNIT_LABELS[unit].singular;
  const areaLabel = UNIT_LABELS[unit].perArea;
  const basisLabel = product.pricing_basis === 'length' ? unitLabel : areaLabel;

  if (product.pricing_type === 'flat') {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-2">
          <span className="text-lg font-semibold text-primary">
            {formatPrice(product.flat_price || 0, currency)}
          </span>
          <span className="text-sm text-muted-foreground">
            per {basisLabel}
          </span>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Pricing
          </CardTitle>
          {productName && (
            <CardDescription>{productName}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">
              {formatPrice(product.flat_price || 0, currency)}
            </span>
            <span className="text-muted-foreground">
              per {basisLabel}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {product.pricing_basis === 'length'
              ? 'Price is calculated based on sheet length.'
              : 'Price is calculated based on total sheet area.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const tiers = product.pricing_tiers || [];
  
  if (tiers.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Pricing not configured
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Tiered Pricing
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Price varies based on {product.pricing_basis === 'length' ? 'length' : 'area'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Starting at </span>
          <span className="font-semibold text-primary">
            {formatPrice(tiers[0].price, currency)}
          </span>
          <span className="text-muted-foreground">/{basisLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Pricing Tiers
            </CardTitle>
            {productName && (
              <CardDescription>{productName}</CardDescription>
            )}
          </div>
          <Badge variant="outline">
            {product.tier_calculation === 'slab' ? 'Slab Pricing' : 'Incremental'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {product.pricing_basis === 'length' ? 'Length' : 'Area'}
              </TableHead>
              <TableHead className="text-right">Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {tier.min} {unitLabel}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {tier.max === null ? '∞' : `${tier.max} ${unitLabel}`}
                    </span>
                    {product.pricing_basis === 'area' && (
                      <span className="text-xs text-muted-foreground">²</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold text-primary">
                    {formatPrice(tier.price, currency)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    /{basisLabel}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          {product.tier_calculation === 'slab' ? (
            <p>
              <strong>Slab Pricing:</strong> The rate for your entire{' '}
              {product.pricing_basis === 'length' ? 'length' : 'area'} is determined
              by which tier it falls into.
            </p>
          ) : (
            <p>
              <strong>Incremental Pricing:</strong> Different rates apply to
              different portions of your{' '}
              {product.pricing_basis === 'length' ? 'length' : 'area'} based on the
              tiers.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingTable;
