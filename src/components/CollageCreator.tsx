
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
import { logSheetGeneration } from "@/lib/usageLogger";
import { addDpiToPng, downloadBlob } from "@/utils/pngDpiHelper";
import { estimateMemoryUsage, validateCanvasSize } from "@/utils/memoryEstimator";
import { MemoryWarningModal } from "./MemoryWarningModal";

// Debug flag - set to true to enable debug logging
const DEBUG = false;

const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

// Helper functions (moved outside component for performance)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [memoryWarning, setMemoryWarning] = useState<{
    isOpen: boolean;
    riskLevel: 'medium' | 'high' | 'critical';
    memoryMB: number;
    message: string;
  }>({
    isOpen: false,
    riskLevel: 'medium',
    memoryMB: 0,
    message: ''
  });
  const canvasRef = useRef<any>(null);

  // Track blob URLs for cleanup, but DON'T auto-revoke during renders/HMR
  // Only revoke when explicitly deleting images or on true unmount
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    // Track all current blob URLs
    images.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        blobUrlsRef.current.add(img.url);
      }
    });
  }, [images]);

  // Only cleanup on ACTUAL unmount (not during HMR or re-renders)
  useEffect(() => {
    return () => {
      // Set flag to indicate true unmount
      isUnmountingRef.current = true;

      // Give React a tick to complete unmount
      setTimeout(() => {
        if (isUnmountingRef.current) {
          debugLog(`[Memory Cleanup] Component unmounting, cleaning up ${blobUrlsRef.current.size} blob URLs`);
          blobUrlsRef.current.forEach(url => {
            URL.revokeObjectURL(url);
          });
          blobUrlsRef.current.clear();
        }
      }, 0);
    };
  }, []); // Empty deps - only runs on mount/unmount

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

  // CRITICAL: Reset state to prevent corrupted state after errors
  const resetGenerationState = () => {
    debugLog('🔄 Resetting generation state');
    setLayout([]);
    setTotalSqInchesUsed(null);
    setPendingLayout(null);
  };

  const handleImagesAdded = (newImages: ImageObject[]) => {
    // Blob URLs are automatically tracked by useEffect when images state updates
    setImages((prev) => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added to your collage`);
  };

  const handleImagesRemoved = (imageIds: string[]) => {
    // CRITICAL: ONLY revoke blob URLs for images being deleted
    const imagesToRemove = images.filter(img => imageIds.includes(img.id));
    const imagesToKeep = images.filter(img => !imageIds.includes(img.id));

    // Revoke ONLY the deleted images' URLs
    imagesToRemove.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
        blobUrlsRef.current.delete(img.url);
      }
    });

    // Remove images from the state
    setImages((prev) => prev.filter(img => !imageIds.includes(img.id)));

    // Remove dimensions for these images
    setImageDimensions((prev) => prev.filter(dim => !imageIds.includes(dim.id)));

    // If these images were in the layout, regenerate layout
    const wasInLayout = layout.some(item => imageIds.includes(item.id));
    if (wasInLayout) {
      setLayout([]);
    }

    debugLog(`[Memory Cleanup] Removed ${imageIds.length} image(s), ${imagesToKeep.length} remaining`);
    toast.info(`${imageIds.length} image(s) removed`);
  };

  const handleImageDimensionsChanged = (dimensions: ImageDimension[]) => {
    debugLog("Dimensions changed:", dimensions);
    setImageDimensions(dimensions);
  };

  // Actual layout generation logic (called after memory check passes)
  const proceedWithGeneration = () => {
    debugLog('🎨 proceedWithGeneration called');
    debugLog('  - imageDimensions.length:', imageDimensions.length);
    debugLog('  - images.length:', images.length);
    debugLog('  - imageDimensions:', imageDimensions.map(dim => ({ id: dim.id, w: dim.widthInches, h: dim.heightInches })));

    setIsGenerating(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        debugLog("🔧 Generating layout with dimensions:", imageDimensions);

        // Generate layout using our algorithm with selected width and spacing
        const result = generateLayout(imageDimensions, canvasWidthInches, spacingInches);
        debugLog("Layout result:", result);

        if (result.positionedImages.length === 0) {
          debugLog('❌ Validation failed: No positioned images generated');
          toast.error("Failed to generate layout. Please check image dimensions.");
          setIsGenerating(false);
          return;
        }

        // Check sheet height limit (400 inches max for reliable exports)
        const MAX_SHEET_HEIGHT = 400;
        if (result.totalHeightInches > MAX_SHEET_HEIGHT) {
          debugLog(`❌ Validation failed: Sheet too large (${result.totalHeightInches.toFixed(1)}" > ${MAX_SHEET_HEIGHT}")`);
          const recommendedCount = Math.floor(imageDimensions.length * (MAX_SHEET_HEIGHT / result.totalHeightInches));
          setErrorDialogData({
            title: "Sheet Too Large",
            message: `Your sheet height is ${result.totalHeightInches.toFixed(1)}" which exceeds the ${MAX_SHEET_HEIGHT}" limit.\n\nHow to fix it:\n• Remove some images (currently ${imageDimensions.length})\n• Reduce the size of large images\n• Or generate multiple smaller sheets (recommended: ~${recommendedCount} images per sheet)`,
          });
          setShowErrorDialog(true);
          setIsGenerating(false);
          return;
        }

        // Warn if close to height limit (>80%)
        if (result.totalHeightInches > MAX_SHEET_HEIGHT * 0.8) {
          toast.warning(
            `Sheet height: ${result.totalHeightInches.toFixed(1)}" (${((result.totalHeightInches / MAX_SHEET_HEIGHT) * 100).toFixed(0)}% of ${MAX_SHEET_HEIGHT}" limit)`,
            { duration: 5000 }
          );
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

        // Validate canvas size against browser limits (with actual calculated height)
        const sizeCheck = validateCanvasSize(canvasWidthInches, result.totalHeightInches);
        if (!sizeCheck.isValid) {
          debugLog('❌ Validation failed: Canvas size exceeds browser limits');
          setErrorDialogData({
            title: "Canvas Too Large",
            message: sizeCheck.errorMessage || "Canvas exceeds maximum size limits.",
          });
          setShowErrorDialog(true);
          setIsGenerating(false);
          return;
        }

        // Calculate total square inches needed for this layout
        const sqInches = canvasWidthInches * result.totalHeightInches;

        // Get user's current credit balance
        const currentCredits = getUserCredits();

        console.log(`[Credit Check] Layout requires ${sqInches.toFixed(2)} sq.in, user has ${currentCredits} credits`);

        // Check if user has enough credits
        if (currentCredits < sqInches) {
          debugLog("❌ Validation failed: Insufficient credits");
          setInsufficientCreditsData({
            needed: sqInches,
            available: currentCredits
          });
          setShowInsufficientCreditsModal(true);
          setIsGenerating(false);
          return;
        }

        debugLog("✅ All validations passed! Layout is ready for confirmation.");

        // Credits are sufficient - show confirmation dialog
        setPendingLayout({
          positionedImages: result.positionedImages,
          totalHeightInches: result.totalHeightInches,
          sqInches: sqInches,
        });
        setShowConfirmDialog(true);
        setIsGenerating(false);
      } catch (error) {
        console.error("Layout generation error:", error);
        toast.error("Failed to generate layout. Please try again.");
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleGenerateLayout = () => {
    debugLog('🚀 Starting layout generation');
    debugLog('📋 Current state snapshot:');
    debugLog('  - images.length:', images.length);
    debugLog('  - imageDimensions.length:', imageDimensions.length);
    debugLog('  - images:', images.map(img => ({ id: img.id, name: img.file.name, hasUrl: !!img.url })));

    // CRITICAL: Reset state FIRST to clear any stale data from previous attempts
    resetGenerationState();

    if (imageDimensions.length === 0) {
      toast.error("No images with dimensions available");
      return;
    }

    // Check if any image dimensions exceed canvas width
    // An image can fit if its smaller dimension is <= canvas width (can rotate if needed)
    const oversizedImages = imageDimensions.filter(
      img => Math.min(img.widthInches, img.heightInches) > canvasWidthInches
    );

    if (oversizedImages.length > 0) {
      debugLog('❌ Validation failed: Oversized images');
      const names = oversizedImages.map(img => `${img.widthInches.toFixed(1)}" × ${img.heightInches.toFixed(1)}"`).join(', ');
      toast.error(`Cannot generate sheet: Some images are too large to fit on a ${canvasWidthInches}" wide canvas (${names}). Please reduce their dimensions.`);
      return;
    }

    // Estimate memory usage before proceeding
    const prelimEstimate = estimateMemoryUsage(canvasWidthInches, canvasHeightInches, images);

    // Show modal for high or critical risk
    if (prelimEstimate.riskLevel === 'high' || prelimEstimate.riskLevel === 'critical') {
      setMemoryWarning({
        isOpen: true,
        riskLevel: prelimEstimate.riskLevel,
        memoryMB: prelimEstimate.totalEstimateMB,
        message: prelimEstimate.warningMessage || ''
      });
      return;
    }

    // Low/medium risk - proceed directly
    proceedWithGeneration();
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

    // Step 1: Update credits in Outseta using SDK's user.update() method
    try {
      console.log("[Credit Deduction] Getting fresh user object...");
      const freshUser = await window.Outseta.getUser();

      if (!freshUser || !freshUser.Account) {
        throw new Error("Unable to get user account");
      }

      console.log("[Credit Deduction] Updating credits via user.update()...");
      console.log(`[Credit Deduction] Setting CreditsBalance from ${freshUser.Account.CreditsBalance} to ${newBalance}`);

      // Use the SDK method that we confirmed works: user.update({ Account: { CreditsBalance } })
      await freshUser.update({
        Account: {
          CreditsBalance: newBalance,
        },
      });

      console.log("[Credit Deduction] ✅ Outseta update successful!");
    } catch (err) {
      console.error("[Credit Deduction] ❌ Failed to update credits in Outseta:", err);
      setErrorDialogData({
        title: "Credit Update Failed",
        message: "We couldn't update your credits in Outseta. Please try again or contact support if the problem persists.",
      });
      setShowErrorDialog(true);
      setShowConfirmDialog(false);
      return; // Stop the flow - don't generate layout if we can't deduct credits
    }

    // Step 2: Log to Supabase for usage tracking
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

    // Step 3: Refresh user data from Outseta to update navbar
    await refreshUser();

    // Step 4: Convert images to base64 to avoid blob URL issues
    console.log('🔄 Converting images to base64 for canvas generation...');
    try {
      const imagesWithBase64 = await Promise.all(
        images.map(async (img) => {
          const base64 = await fileToBase64(img.file);
          return {
            ...img,
            url: base64, // Replace blob URL with base64
          };
        })
      );

      console.log('✅ All images converted to base64');
      console.log('📸 Images with base64:', imagesWithBase64.length);

      // CRITICAL: Revoke old blob URLs to prevent memory leak
      debugLog('[Memory] Revoking old blob URLs after base64 conversion');
      images.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          debugLog('[Memory]   - Revoking blob:', img.url.substring(0, 50) + '...');
          URL.revokeObjectURL(img.url);
          if (blobUrlsRef && blobUrlsRef.current) {
            blobUrlsRef.current.delete(img.url);
          }
        }
      });
      debugLog('[Memory] ✅ Old blob URLs revoked');

      // Now update images state with base64 URLs
      setImages(imagesWithBase64);

      // Step 5: Show the layout
      setLayout(pendingLayout.positionedImages);
      setCanvasHeightInches(pendingLayout.totalHeightInches);
      setTotalSqInchesUsed(pendingLayout.sqInches);
    } catch (error) {
      console.error('❌ Failed to convert images to base64:', error);
      toast.error('Failed to prepare images for canvas. Please try again.');
      return;
    }

    // Step 6: Close dialog and show success
    setShowConfirmDialog(false);
    setPendingLayout(null);

    // Show success message
    toast.success(`Layout generated! ${formatNumber(pendingLayout.sqInches)} sq.in deducted from your balance.`);

    console.log("[Credit Deduction] ✅ Transaction complete!");
  };

  const handleExport = async () => {
    if (!canvasRef.current || layout.length === 0) {
      toast.error("No layout to export");
      return;
    }

    // Check memory estimate before export (this is the heavy operation)
    const exportEstimate = estimateMemoryUsage(canvasWidthInches, canvasHeightInches, images);

    if (exportEstimate.riskLevel === 'high') {
      toast.warning(`High memory usage expected (~${exportEstimate.totalEstimateMB}MB). Export may be slow.`);
    } else if (exportEstimate.riskLevel === 'critical') {
      toast.warning(`Critical memory usage (~${exportEstimate.totalEstimateMB}MB). Export may freeze browser.`);
    }

    try {
      setIsExporting(true);
      toast.info("Generating high-resolution export...");
      const dataUrl = await canvasRef.current.exportCanvas();

      // Add 150 DPI metadata to PNG for professional print quality
      const pngBlob = await addDpiToPng(dataUrl, 150);
      const filename = `print-sheet-${new Date().toISOString().slice(0, 10)}.png`;
      downloadBlob(pngBlob, filename);

      toast.success("Print sheet exported at 150 DPI!");
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
          <p className="text-xs text-gray-500">Max sheet height: 400"</p>

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
          <ImageUploader onImagesAdded={handleImagesAdded} currentImageCount={images.length} />
          {images.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {images.length} / 40 images uploaded
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

      {/* Memory Warning Modal */}
      <MemoryWarningModal
        isOpen={memoryWarning.isOpen}
        onClose={() => setMemoryWarning(prev => ({ ...prev, isOpen: false }))}
        onProceed={proceedWithGeneration}
        riskLevel={memoryWarning.riskLevel}
        memoryMB={memoryWarning.memoryMB}
        message={memoryWarning.message}
      />

      {/* Loading Overlay - Layout Generation */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Generating Layout...
            </h3>
            <p className="text-slate-600 mb-4">
              Please wait while we create your optimized layout.
            </p>
            <p className="text-sm text-slate-500">
              Do not refresh or close this page
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay - Export */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Exporting High-Resolution PNG...
            </h3>
            <p className="text-slate-600 mb-4">
              Creating 150 DPI print-ready file.
            </p>
            <p className="text-sm text-slate-500">
              This may take 5-15 seconds for large layouts
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
