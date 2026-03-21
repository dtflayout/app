import React, { useState } from 'react';
import { QSProduct, formatPrice, Currency } from '@/types/quickStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Phone,
  MessageSquare,
  ShoppingCart,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SheetDimensions {
  width: number;
  height: number;
  usedArea: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (customerInfo: { name: string; phone: string; notes?: string }) => void;
  submitting: boolean;
  product: QSProduct;
  sheetDimensions: SheetDimensions;
  imageCount: number;
  totalPrice: number;
  currency: Currency;
  storeName: string;
}

const OrderSubmitModal: React.FC<Props> = ({
  open,
  onClose,
  onSubmit,
  submitting,
  product,
  sheetDimensions,
  imageCount,
  totalPrice,
  currency,
  storeName
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; terms?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-+()]{8,15}$/.test(phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim() || undefined
    });
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setPhone('');
      setNotes('');
      setAcceptTerms(false);
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Complete Your Order
            </DialogTitle>
            <DialogDescription>
              Enter your details to submit your order to {storeName}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Order Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product</span>
                  <span>{product.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sheet Size</span>
                  <span>{sheetDimensions.width}&quot; × {sheetDimensions.height.toFixed(2)}&quot;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Images</span>
                  <span>{imageCount}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatPrice(totalPrice, currency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Your Name *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  placeholder="Enter your full name"
                  disabled={submitting}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  placeholder="Enter your phone number"
                  disabled={submitting}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.phone}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  We&apos;ll use this to contact you about your order
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => {
                    setAcceptTerms(checked as boolean);
                    if (errors.terms) setErrors({ ...errors, terms: undefined });
                  }}
                  disabled={submitting}
                  className={errors.terms ? 'border-red-500' : ''}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand this is a quote
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Payment will be collected by the store directly. This order submission
                    does not constitute a final purchase.
                  </p>
                </div>
              </div>
              {errors.terms && (
                <p className="text-sm text-red-500 flex items-center gap-1 ml-6">
                  <AlertCircle className="w-3 h-3" />
                  {errors.terms}
                </p>
              )}
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">What happens next?</p>
                <ul className="text-xs mt-1 space-y-0.5">
                  <li>• The store will receive your order</li>
                  <li>• They&apos;ll review your design and contact you</li>
                  <li>• You can track your order with the order number</li>
                  <li>• Payment is handled directly with the store</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Submit Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OrderSubmitModal;
