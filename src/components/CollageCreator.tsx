
import React, { useState, useRef, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Canvas } from "./Canvas";
import { ImageManager } from "./ImageManager";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { generateLayout, ImageDimension, PositionedImage } from "@/utils/layoutAlgorithm";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOutseta } from "@/contexts/OutsetaContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { ConfirmLayoutDialog } from "./ConfirmLayoutDialog";
import { ErrorDialog } from "./ErrorDialog";
import { CreditWarningBanner } from "./CreditWarningBanner";
import { updateAccountCreditsWithFallback } from "@/lib/outsetaApi";
import { logSheetGeneration } from "@/lib/usageLogger";

export type ImageObject = {
  id: string;
  file: File;
  url: string;
};

export const CollageCreator = () => {
  const { user, refreshUser } = useOutseta();
  const [images, setImages] = useState<ImageObject[]>([]);
  const [imageDimensions, setImageDimensions] = useState<ImageDimension[]>([]);
  const [layout, setLayout] = useState<PositionedImage[]>([]);
  const [canvasHeightInches, setCanvasHeightInches] = useState(12);
  const [canvasWidthInches, setCanvasWidthInches] = useState<number>(23);
  const [spacingInches, setSpacingInches] = useState(0.3);
  const [isExporting, setIsExporting] = useState(false);
  const [totalSqInchesUsed, setTotalSqInchesUsed] = useState<number | null>(null);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<{
    needed: number;
    available: number;
  } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLayout, setPendingLayout] = useState<{
    positionedImages: PositionedImage[];
    totalHeightInches: number;
    sqInches: number;
  } | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogData, setErrorDialogData] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const canvasRef = useRef<any>(null);

  // Helper function to format numbers with commas and 2 decimal places
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Helper function to get user's credit balance
  const getUserCredits = (): number => {
    if (!user) return 0;
    return (
      user.Account?.credits_balance ??
      user.Account?.creditsBalance ??
      user.Account?.CreditsBalance ??
      user.credits_balance ??
      0
    );
  };

  const handleImagesAdded = (newImages: ImageObject[]) => {
    setImages((prev) => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added to your collage`);
  };

  const handleImagesRemoved = (imageIds: string[]) => {
    // Remove images from the state
    setImages((prev) => prev.filter(img => !imageIds.includes(img.id)));
    
    // Remove dimensions for these images
    setImageDimensions((prev) => prev.filter(dim => !imageIds.includes(dim.id)));
    
    // If these images were in the layout, regenerate layout
    const wasInLayout = layout.some(item => imageIds.includes(item.id));
    if (wasInLayout) {
      setLayout([]);
    }
    
    toast.info(`${imageIds.length} image(s) removed`);
  };

  const handleImageDimensionsChanged = (dimensions: ImageDimension[]) => {
    console.log("Dimensions changed:", dimensions);
    setImageDimensions(dimensions);
  };

  const handleGenerateLayout = () => {
    if (imageDimensions.length === 0) {
      toast.error("No images with dimensions available");
      return;
    }
    
    // Check if any image dimensions exceed canvas width
    const oversizedImages = imageDimensions.filter(
      img => img.widthInches > canvasWidthInches || img.heightInches > canvasWidthInches
    );
    
    if (oversizedImages.length > 0) {
      toast.error("Cannot generate sheet: Some image dimensions are larger than the selected canvas size. Please reduce their dimensions and try again.");
      return;
    }
    
    console.log("Generating layout with dimensions:", imageDimensions);
    
    // Generate layout using our algorithm with selected width and spacing
    const result = generateLayout(imageDimensions, canvasWidthInches, spacingInches);
    console.log("Layout result:", result);
    
    if (result.positionedImages.length === 0) {
      toast.error("Failed to generate layout. Please check image dimensions.");
      return;
    }
    
    // Check for overlaps and show appropriate message
    const hasOverlaps = result.positionedImages.some((img1, i) => 
      result.positionedImages.some((img2, j) => 
        i !== j && 
        img1.x < img2.x + img2.widthInches && 
        img1.x + img1.widthInches > img2.x &&
        img1.y < img2.y + img2.heightInches &&
        img1.y + img1.heightInches > img2.y
      )
    );
    
    if (hasOverlaps) {
      toast.warning("Warning: Some images may overlap in the generated layout.");
    }

    // Calculate total square inches needed for this layout
    const sqInches = canvasWidthInches * result.totalHeightInches;

    // Get user's current credit balance
    const currentCredits = getUserCredits();

    console.log(`[Credit Check] Layout requires ${sqInches.toFixed(2)} sq.in, user has ${currentCredits} credits`);

    // Check if user has enough credits
    if (currentCredits < sqInches) {
      console.log("[Credit Check] FAILED - Insufficient credits");
      // Show modal instead of toast
      setInsufficientCreditsData({
        needed: sqInches,
        available: currentCredits
      });
      setShowInsufficientCreditsModal(true);
      return; // Don't show layout or set state
    }

    console.log("[Credit Check] PASSED - Sufficient credits");

    // Credits are sufficient - show confirmation dialog
    setPendingLayout({
      positionedImages: result.positionedImages,
      totalHeightInches: result.totalHeightInches,
      sqInches: sqInches,
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmLayout = async () => {
    if (!pendingLayout || !user) {
      return;
    }

    const currentCredits = getUserCredits();
    const newBalance = currentCredits - pendingLayout.sqInches;

    // Get account UID
    const accountUid = user.Account?.Uid;
    if (!accountUid) {
      setErrorDialogData({
        title: "Error",
        message: "Unable to find your account information. Please refresh the page and try again.",
      });
      setShowErrorDialog(true);
      setShowConfirmDialog(false);
      return;
    }

    console.log("[Credit Deduction] Starting transaction...");
    console.log(`[Credit Deduction] Current: ${currentCredits}, New: ${newBalance}, Used: ${pendingLayout.sqInches}`);

    // TODO: Fix Outseta custom property update API
    // Currently blocked by 401 error - need to research correct endpoint
    // For now, updating UI state only - see TODO.md for details

    // Step 1: ATTEMPT to update credits in Outseta (tries multiple auth methods)
    // This is wrapped in a try-catch as a temporary workaround
    let outsetaSyncSuccess = false;
    try {
      const updateResult = await updateAccountCreditsWithFallback(accountUid, newBalance);

      if (!updateResult.success) {
        console.warn("[Credit Deduction] ⚠️ Outseta credit sync failed - updated UI only");
        console.warn("[Credit Deduction] Outseta error:", updateResult.error);
        console.warn("[Credit Deduction] Credits will be synced after API fix");
        console.warn("[Credit Deduction] Continuing with local state update and Supabase logging...");
        // Don't return - continue with the flow
      } else {
        console.log("[Credit Deduction] ✅ Outseta update successful");
        outsetaSyncSuccess = true;
      }
    } catch (err) {
      console.error("[Credit Deduction] ⚠️ Outseta update exception:", err);
      console.warn("[Credit Deduction] Continuing with local state update...");
      // Don't return - continue with the flow
    }

    // Step 2: Log to Supabase (this should work regardless of Outseta sync)
    const logResult = await logSheetGeneration({
      user_email: user.Email,
      outseta_account_id: accountUid,
      sq_inches_used: pendingLayout.sqInches,
      sheet_width: canvasWidthInches,
      sheet_height: pendingLayout.totalHeightInches,
      image_count: images.length,
      credits_before: currentCredits,
      credits_after: newBalance,
    });

    if (!logResult.success) {
      console.warn("[Credit Deduction] Supabase logging failed:", logResult.error);
      // We continue anyway - logging is non-critical
    } else {
      console.log("[Credit Deduction] ✅ Supabase logging successful");
    }

    // Step 3: Update local user state with new balance
    // This ensures the UI reflects the credit deduction even if Outseta sync failed
    if (!outsetaSyncSuccess && user.Account) {
      console.log("[Credit Deduction] Updating local state with new balance:", newBalance);
      // Update the user object in memory to reflect new balance
      // Note: This won't persist across page refresh if Outseta sync failed
      user.Account.credits_balance = newBalance;
      user.Account.creditsBalance = newBalance;
      user.Account.CreditsBalance = newBalance;
    }

    // Step 4: Refresh user data from Outseta (will get synced value if successful, or old value if not)
    await refreshUser();

    // Step 5: Show the layout
    setLayout(pendingLayout.positionedImages);
    setCanvasHeightInches(pendingLayout.totalHeightInches);
    setTotalSqInchesUsed(pendingLayout.sqInches);

    // Step 6: Close dialog and show success
    setShowConfirmDialog(false);
    setPendingLayout(null);

    // Show appropriate success message
    if (outsetaSyncSuccess) {
      toast.success(`Layout generated! ${formatNumber(pendingLayout.sqInches)} sq.in deducted from your balance.`);
    } else {
      toast.success(`Layout generated! ${formatNumber(pendingLayout.sqInches)} sq.in used (UI updated, Outseta sync pending).`);
    }

    console.log("[Credit Deduction] Transaction complete!");
    if (!outsetaSyncSuccess) {
      console.warn("[Credit Deduction] ⚠️ Note: Credits updated in UI only. Outseta sync failed - see TODO.md");
    }
  };

  const handleExport = async () => {
    if (!canvasRef.current || layout.length === 0) {
      toast.error("No layout to export");
      return;
    }
    
    try {
      setIsExporting(true);
      const dataUrl = await canvasRef.current.exportCanvas();
      
      const link = document.createElement("a");
      link.download = `print-sheet-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Print sheet exported successfully!");
    } catch (error) {
      toast.error("Failed to export print sheet");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setLayout([]);
      setTotalSqInchesUsed(null);
      toast.info("Canvas cleared");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Credit Warning Banner */}
      <CreditWarningBanner credits={getUserCredits()} />

      {/* Layout Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">Layout Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheet-width">Sheet Width</Label>
            <Select 
              value={canvasWidthInches.toString()} 
              onValueChange={(value) => {
                setCanvasWidthInches(Number(value));
                if (layout.length > 0) {
                  setLayout([]);
                  toast.info("Sheet width changed. Please regenerate layout.");
                }
              }}
            >
              <SelectTrigger id="sheet-width">
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="23">23 inches</SelectItem>
                <SelectItem value="11">11 inches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="spacing">Spacing (inches)</Label>
            <input
              id="spacing"
              type="number"
              step="0.1"
              min="0.1"
              max="2"
              value={spacingInches}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 2) {
                  setSpacingInches(value);
                  if (layout.length > 0) {
                    setLayout([]);
                    toast.info("Spacing changed. Please regenerate layout.");
                  }
                }
              }}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          
          <Button
            onClick={handleGenerateLayout}
            disabled={images.length === 0 || getUserCredits() === 0}
            className="bg-green-600 hover:bg-green-700"
            title={getUserCredits() === 0 ? "Out of credits! Purchase more to continue." : ""}
          >
            Generate Layout
          </Button>
          
          <Button 
            onClick={handleExport} 
            disabled={layout.length === 0 || isExporting}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Download Sheet"}
          </Button>
        </div>
      </div>

      {/* Success Card - Show after layout generation */}
      {totalSqInchesUsed !== null && layout.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Layout generated successfully!
              </h3>
              <div className="space-y-1 text-green-800">
                <p className="text-sm">
                  <span className="font-medium">Sheet size:</span> {canvasWidthInches}" × {formatNumber(canvasHeightInches)}"
                </p>
                <p className="text-lg font-bold">
                  <span className="font-medium">Total area:</span> {formatNumber(totalSqInchesUsed)} sq.inches
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Images - Only show when no layout is generated */}
      {layout.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 animate-fade-in">
          <h2 className="text-xl font-semibold mb-4">Upload Images</h2>
          <ImageUploader onImagesAdded={handleImagesAdded} />
          {images.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {images.length} / 30 images uploaded
            </div>
          )}
        </div>
      )}
      
      {images.length > 0 && (
        <ImageManager
          images={images}
          onImagesRemoved={handleImagesRemoved}
          onImagesAdded={handleImagesAdded}
          onImageDimensionsChanged={handleImageDimensionsChanged}
          onGenerateLayout={handleGenerateLayout}
          canvasWidthInches={canvasWidthInches}
          spacingInches={spacingInches}
        />
      )}
      
      {layout.length > 0 && (
        <Canvas
          ref={canvasRef}
          images={images}
          layout={layout}
          canvasHeightInches={canvasHeightInches}
          canvasWidthInches={canvasWidthInches}
        />
      )}

      {/* Insufficient Credits Modal */}
      <Dialog open={showInsufficientCreditsModal} onOpenChange={setShowInsufficientCreditsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <DialogTitle className="text-xl">Insufficient Credits</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              {insufficientCreditsData && (
                <div className="space-y-3">
                  <p className="text-gray-700">
                    You need <span className="font-bold text-amber-700">{formatNumber(insufficientCreditsData.needed)} sq.in</span> for this sheet but only have <span className="font-bold text-amber-700">{formatNumber(insufficientCreditsData.available)} sq.in</span> remaining.
                  </p>
                  <p className="text-sm text-gray-600">
                    Try reducing the number of images or their dimensions, or upgrade your plan to get more credits.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientCreditsModal(false)}
            >
              Close
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setShowInsufficientCreditsModal(false);
                window.location.href = '/pricing';
              }}
            >
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Layout Dialog */}
      {pendingLayout && (
        <ConfirmLayoutDialog
          open={showConfirmDialog}
          onOpenChange={(open) => {
            setShowConfirmDialog(open);
            if (!open) {
              setPendingLayout(null);
            }
          }}
          sheetWidth={canvasWidthInches}
          sheetHeight={pendingLayout.totalHeightInches}
          sqInchesUsed={pendingLayout.sqInches}
          currentCredits={getUserCredits()}
          onConfirm={handleConfirmLayout}
        />
      )}

      {/* Error Dialog */}
      {errorDialogData && (
        <ErrorDialog
          open={showErrorDialog}
          onOpenChange={setShowErrorDialog}
          title={errorDialogData.title}
          message={errorDialogData.message}
        />
      )}
    </div>
  );
};
