import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetWidth: number;
  sheetHeight: number;
  sqInchesUsed: number;
  currentCredits: number;
  onConfirm: () => Promise<void>;
}

export const ConfirmLayoutDialog: React.FC<ConfirmLayoutDialogProps> = ({
  open,
  onOpenChange,
  sheetWidth,
  sheetHeight,
  sqInchesUsed,
  currentCredits,
  onConfirm,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const creditsAfter = currentCredits - sqInchesUsed;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Confirm Layout Generation</DialogTitle>
          <DialogDescription className="text-base pt-3">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Sheet dimensions:</p>
                <p className="text-2xl font-bold text-blue-900">
                  {sheetWidth}" × {formatNumber(sheetHeight)}"
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700">
                  This layout will use{" "}
                  <span className="font-bold text-gray-900">
                    {formatNumber(sqInchesUsed)} sq.inches
                  </span>
                </p>

                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current balance:</span>
                    <span className="font-semibold text-gray-900">
                      {formatNumber(currentCredits)} sq.in
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-gray-600">After generation:</span>
                    <span className="font-semibold text-green-700">
                      {formatNumber(creditsAfter)} sq.in
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm & Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
