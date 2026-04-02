import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  onOpenChange,
  title,
  message,
}) => {
  // Check if this is the "Sheet Too Large" error for special formatting
  const isSheetTooLarge = title === "Sheet Too Large";

  // Parse the sheet too large message to extract values
  const parseSheetTooLargeMessage = (msg: string) => {
    const heightMatch = msg.match(/(\d+\.?\d*)" which exceeds/);
    const limitMatch = msg.match(/exceeds the (\d+)"/);
    const imageCountMatch = msg.match(/currently (\d+)\)/);
    const recommendedMatch = msg.match(/~(\d+) images per sheet/);

    return {
      height: heightMatch ? heightMatch[1] : "0",
      limit: limitMatch ? limitMatch[1] : "400",
      imageCount: imageCountMatch ? imageCountMatch[1] : "0",
      recommended: recommendedMatch ? recommendedMatch[1] : "0",
    };
  };

  if (isSheetTooLarge) {
    const { height, limit, imageCount, recommended } = parseSheetTooLargeMessage(message);

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-3 text-2xl font-extrabold text-red-600 tracking-tight">
              <AlertCircle className="h-7 w-7" />
              Sheet Too Large
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <p className="text-lg leading-relaxed text-gray-700">
              Your sheet height is{" "}
              <span className="font-semibold text-red-600">{height}"</span> which
              exceeds the <span className="font-semibold">{limit}"</span> limit.
            </p>

            <div className="bg-gray-50 p-5 rounded-lg">
              <p className="text-xl font-semibold text-gray-900 mb-4">How to fix it:</p>

              <div className="space-y-3 text-lg text-gray-700">
                <div className="flex gap-3">
                  <span className="text-gray-400">•</span>
                  <span>
                    Remove some images (currently{" "}
                    <span className="font-semibold">{imageCount}</span>)
                  </span>
                </div>

                <div className="flex gap-3">
                  <span className="text-gray-400">•</span>
                  <span>Reduce the size of large images</span>
                </div>

                <div className="flex gap-3">
                  <span className="text-gray-400">•</span>
                  <span>
                    Generate multiple smaller sheets (recommended:{" "}
                    <span className="font-semibold">~{recommended} images per sheet</span>)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto px-6 py-3 text-base font-medium h-auto"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default error dialog for other errors
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            <p className="text-gray-700 whitespace-pre-line">{message}</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
