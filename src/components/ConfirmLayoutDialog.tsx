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

/**
 * CREDIT FLOW NOTE:
 * Credits are NOT deducted when confirming layout generation.
 * Credits are only deducted when the user downloads the sheet.
 * This dialog shows a preview of what will be charged on download.
 */
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
      <DialogContent className="sm:max-w-xl p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Confirm Layout Generation</DialogTitle>
          <DialogDescription className="text-base pt-4">
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <p className="text-lg text-gray-600 mb-2">Sheet dimensions:</p>
                <p className="text-3xl font-bold text-blue-900">
                  {sheetWidth}" × {formatNumber(sheetHeight)}"
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-lg text-gray-700">
                  This layout will use{" "}
                  <span className="font-bold text-gray-900">
                    {formatNumber(sqInchesUsed)} sq.inches
                  </span>
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Note:</span> Credits will be charged when you download the sheet, not now.
                    You can regenerate layouts freely until you're satisfied.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-base text-gray-600">Your current balance:</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatNumber(currentCredits)} sq.in
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-base text-gray-600">Cost on download:</span>
                    <span className="text-lg font-semibold text-blue-700">
                      {formatNumber(sqInchesUsed)} sq.in
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3 sm:gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="h-11 px-6"
          >
            Cancel
          </Button>
          <Button
            className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-200"
            onClick={handleConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Generate Layout"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
