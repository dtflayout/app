
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useCredits } from "@/contexts/CreditsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { ConfirmLayoutDialog } from "./ConfirmLayoutDialog";
import { ErrorDialog } from "./ErrorDialog";
import { CreditWarningBanner } from "./CreditWarningBanner";
import { logSheetGeneration } from "@/lib/usageLogger";
import { addDpiToPng, downloadBlob } from "@/utils/pngDpiHelper";
import { estimateMemoryUsage, validateCanvasSize } from "@/utils/memoryEstimator";
import { MemoryWarningModal } from "./MemoryWarningModal";
import { ImageTrimModal } from "./ImageTrimModal";
import { BackgroundRemoverModal } from "./BackgroundRemoverModal";
import { quickPaddingCheck } from "@/utils/imageTrimUtils";

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
  // Original dimensions before trimming (only set if image was trimmed)
  originalWidth?: number;
  originalHeight?: number;
};

export interface CollageCreatorProps {
  dpi?: number;
  maxHeight?: number;
  mode?: "standard" | "hd";
}

export const CollageCreator = ({
  dpi = 150,
  maxHeight = 400,
  mode = "standard"
}: CollageCreatorProps) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useOutseta();
  const { credits, deductCredits, refreshCredits } = useCredits();
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
  const [trimModalOpen, setTrimModalOpen] = useState(false);
  const [imagesToTrim, setImagesToTrim] = useState<ImageObject[]>([]);
  const [backgroundRemoverModalOpen, setBackgroundRemoverModalOpen] = useState(false);
  const [imageToRemoveBackground, setImageToRemoveBackground] = useState<ImageObject | null>(null);
  const canvasRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

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

  // Helper function to get user's credit balance (now from Supabase via context)
  const getUserCredits = (): number => {
    return credits;
  };

  // CRITICAL: Reset state to prevent corrupted state after errors
  const resetGenerationState = () => {
    debugLog('🔄 Resetting generation state');
    setLayout([]);
    setTotalSqInchesUsed(null);
    setPendingLayout(null);
  };

  const handleImagesAdded = async (newImages: ImageObject[]) => {
    // Blob URLs are automatically tracked by useEffect when images state updates
    setImages((prev) => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added to your collage`);

    // Check for images that might benefit from trimming (only PNG files)
    const pngImages = newImages.filter(img =>
      img.file.type === 'image/png' || img.file.name.toLowerCase().endsWith('.png')
    );

    if (pngImages.length > 0) {
      // Quick check for padding on each PNG
      const imagesToCheck: ImageObject[] = [];

      for (const img of pngImages) {
        try {
          const hasPadding = await quickPaddingCheck(img.url);
          if (hasPadding) {
            imagesToCheck.push(img);
          }
        } catch {
          // Silently skip images that fail padding check
        }
      }

      if (imagesToCheck.length > 0) {
        setImagesToTrim(imagesToCheck);
        setTrimModalOpen(true);
        // Show explanatory toast when auto-opening trim modal
        toast.info(
          "We detected extra empty space around your design. You can trim it to save print area, or keep the original.",
          { duration: 6000 }
        );
      }
    }
  };

  // Handle opening trim modal for a single image from ImageManager
  const handleTrimImage = (image: ImageObject) => {
    setImagesToTrim([image]);
    setTrimModalOpen(true);
  };

  // Handle trim modal completion
  const handleTrimComplete = (trimmedImages: ImageObject[]) => {
    // Update images state with trimmed versions
    setImages(prevImages => {
      return prevImages.map(img => {
        const trimmed = trimmedImages.find(t => t.id === img.id);
        if (trimmed && trimmed.url !== img.url) {
          // Clean up old blob URL
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
            blobUrlsRef.current.delete(img.url);
          }
          // Track new blob URL
          if (trimmed.url.startsWith('blob:')) {
            blobUrlsRef.current.add(trimmed.url);
          }
          return trimmed;
        }
        return img;
      });
    });

    // Also clear the image dimensions so ImageManager recalculates them
    setImageDimensions([]);

    // Reset layout if any trimmed images were in it
    if (layout.length > 0) {
      const trimmedIds = new Set(trimmedImages.filter((t, i) =>
        t.url !== imagesToTrim[i]?.url
      ).map(t => t.id));

      if (layout.some(item => trimmedIds.has(item.id))) {
        setLayout([]);
        toast.info("Layout reset due to image changes. Please regenerate.");
      }
    }

    setTrimModalOpen(false);
    setImagesToTrim([]);
  };

  // Handle opening background remover modal for a single image from ImageManager
  const handleRemoveBackground = (image: ImageObject) => {
    setImageToRemoveBackground(image);
    setBackgroundRemoverModalOpen(true);
  };

  // Handle background removal completion
  const handleBackgroundRemovalComplete = (newImage: ImageObject) => {
    // Update images state with the new version
    setImages(prevImages => {
      return prevImages.map(img => {
        if (img.id === newImage.id) {
          // Clean up old blob URL
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
            blobUrlsRef.current.delete(img.url);
          }
          // Track new blob URL
          if (newImage.url.startsWith('blob:')) {
            blobUrlsRef.current.add(newImage.url);
          }
          return newImage;
        }
        return img;
      });
    });

    // Clear image dimensions so ImageManager recalculates them
    setImageDimensions([]);

    // Reset layout if this image was in it
    if (layout.length > 0 && layout.some(item => item.id === newImage.id)) {
      setLayout([]);
      toast.info("Layout reset due to image changes. Please regenerate.");
    }

    setBackgroundRemoverModalOpen(false);
    setImageToRemoveBackground(null);
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
    toast.error(`${imageIds.length} image(s) removed`);
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

        // Check sheet height limit (use maxHeight prop for reliable exports)
        if (result.totalHeightInches > maxHeight) {
          debugLog(`❌ Validation failed: Sheet too large (${result.totalHeightInches.toFixed(1)}" > ${maxHeight}")`);
          const recommendedCount = Math.floor(imageDimensions.length * (maxHeight / result.totalHeightInches));
          setErrorDialogData({
            title: "Sheet Too Large",
            message: `Your sheet height is ${result.totalHeightInches.toFixed(1)}" which exceeds the ${maxHeight}" limit.\n\nHow to fix it:\n• Remove some images (currently ${imageDimensions.length})\n• Reduce the size of large images\n• Or generate multiple smaller sheets (recommended: ~${recommendedCount} images per sheet)`,
          });
          setShowErrorDialog(true);
          setIsGenerating(false);
          return;
        }

        // Warn if close to height limit (>80%)
        if (result.totalHeightInches > maxHeight * 0.8) {
          toast.info(
            `Sheet height: ${result.totalHeightInches.toFixed(1)}"`,
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
      toast.error("Please set dimensions for at least one image before generating. Update the width/height for your uploaded images.");
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
    const sqInchesToDeduct = pendingLayout.sqInches;

    // Get account UID for logging
    const accountUid = user.Account?.Uid || user.Uid;
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
    console.log(`[Credit Deduction] Current: ${currentCredits}, To Deduct: ${sqInchesToDeduct}`);

    // Step 1: Deduct credits from Supabase
    const deductResult = await deductCredits(sqInchesToDeduct);

    if (!deductResult.success) {
      console.error("[Credit Deduction] ❌ Failed to deduct credits:", deductResult.error);
      setErrorDialogData({
        title: "Credit Update Failed",
        message: deductResult.error || "We couldn't update your credits. Please try again or contact support if the problem persists.",
      });
      setShowErrorDialog(true);
      setShowConfirmDialog(false);
      return; // Stop the flow - don't generate layout if we can't deduct credits
    }

    const newBalance = deductResult.newBalance ?? (currentCredits - sqInchesToDeduct);
    console.log("[Credit Deduction] ✅ Supabase credit deduction successful! New balance:", newBalance);

    // Step 2: Log to Supabase for usage tracking
    const logResult = await logSheetGeneration({
      user_email: user.Email,
      outseta_account_id: accountUid,
      sq_inches_used: sqInchesToDeduct,
      sheet_width: canvasWidthInches,
      sheet_height: pendingLayout.totalHeightInches,
      image_count: images.length,
      credits_before: currentCredits,
      credits_after: newBalance,
    });

    if (!logResult.success) {
      console.warn("[Credit Deduction] Usage logging failed:", logResult.error);
      // We continue anyway - logging is non-critical
    } else {
      console.log("[Credit Deduction] ✅ Usage logging successful");
    }

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

    // Step 7: Scroll to the canvas after it renders
    setTimeout(() => {
      if (canvasContainerRef.current) {
        canvasContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

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

      // Add DPI metadata to PNG for professional print quality
      const pngBlob = await addDpiToPng(dataUrl, dpi);
      const filename = `print-sheet-${dpi}dpi-${new Date().toISOString().slice(0, 10)}.png`;
      downloadBlob(pngBlob, filename);

      toast.success(`Print sheet exported at ${dpi} DPI!`);
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
    <div className="flex flex-col gap-6 px-16">
      {/* Credit Warning Banner */}
      <CreditWarningBanner credits={getUserCredits()} />

      {/* Layout Settings */}
      <div className="bg-white rounded-lg shadow-sm border px-6 py-8 animate-fade-in">
        <h2 className="text-2xl font-bold mb-4">Layout Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheet-width" className="text-base font-medium text-slate-700">Sheet Width</Label>
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
              <SelectTrigger id="sheet-width" className="h-11 rounded-lg bg-blue-600 text-white border-blue-600 shadow-md text-base font-medium hover:bg-blue-700 hover:border-blue-700 transition-all duration-200 [&>svg]:text-white">
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent className="rounded-lg shadow-lg border-blue-200">
                <SelectItem value="23" className="text-base font-medium">23 inches</SelectItem>
                <SelectItem value="11" className="text-base font-medium">11 inches</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="spacing" className="text-base font-medium text-slate-700">Spacing (inches)</Label>
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
              className="h-11 px-4 rounded-lg border border-gray-300 bg-background text-base shadow-sm hover:border-gray-400 transition-colors focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <Button
            onClick={handleGenerateLayout}
            disabled={images.length === 0 || getUserCredits() === 0}
            className="h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
            title={getUserCredits() === 0 ? "Out of credits! Purchase more to continue." : ""}
          >
            Generate Layout
          </Button>

          <Button
            onClick={handleExport}
            disabled={layout.length === 0 || isExporting}
            className="h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
          >
            <Download className="mr-2 h-5 w-5" />
            {isExporting ? "Exporting..." : "Download Sheet"}
          </Button>
        </div>
      </div>

      {/* Success Card - Show after layout generation */}
      {totalSqInchesUsed !== null && layout.length > 0 && (
        <div className="bg-white border-2 border-green-200 rounded-lg p-6 animate-fade-in shadow-sm">
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
              <div className="space-y-2 text-green-800">
                <p className="text-lg leading-relaxed">
                  <span className="font-medium">Sheet size:</span> {canvasWidthInches}" × {formatNumber(canvasHeightInches)}"
                </p>
                <p className="text-lg font-bold leading-relaxed">
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
          <h2 className="text-2xl font-bold mb-4">Upload Images</h2>
          <ImageUploader onImagesAdded={handleImagesAdded} currentImageCount={images.length} />
          {images.length > 0 && (
            <div className="mt-4 text-lg font-semibold text-slate-700">
              {images.length} / 40 images uploaded
            </div>
          )}
        </div>
      )}
      
      {images.length > 0 && (
        <div className="mb-8">
          <ImageManager
            images={images}
            onImagesRemoved={handleImagesRemoved}
            onImagesAdded={handleImagesAdded}
            onImageDimensionsChanged={handleImageDimensionsChanged}
            onGenerateLayout={handleGenerateLayout}
            onTrimImage={handleTrimImage}
            onRemoveBackground={handleRemoveBackground}
            canvasWidthInches={canvasWidthInches}
            spacingInches={spacingInches}
          />
        </div>
      )}

      {layout.length > 0 && (
        <div ref={canvasContainerRef} className="mt-8 pb-16">
          <Canvas
            ref={canvasRef}
            images={images}
            layout={layout}
            canvasHeightInches={canvasHeightInches}
            canvasWidthInches={canvasWidthInches}
          />
        </div>
      )}

      {/* Insufficient Credits Modal */}
      <Dialog open={showInsufficientCreditsModal} onOpenChange={setShowInsufficientCreditsModal}>
        <DialogContent className="sm:max-w-xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              Insufficient Credits
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-base pt-4">
                {insufficientCreditsData && (
                  <div className="space-y-5">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                      <p className="text-lg text-gray-600 mb-2">Credits required:</p>
                      <p className="text-3xl font-bold text-[#1e3a5f]">
                        {formatNumber(insufficientCreditsData.needed)} sq.in
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-lg text-gray-700">
                        You don't have enough credits for this sheet.
                      </p>

                      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-base text-gray-600">Your balance:</span>
                          <span className="text-lg font-semibold text-gray-900">
                            {formatNumber(insufficientCreditsData.available)} sq.in
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-base text-gray-600">Amount needed:</span>
                          <span className="text-lg font-semibold text-red-600">
                            {formatNumber(insufficientCreditsData.needed - insufficientCreditsData.available)} sq.in
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInsufficientCreditsModal(false)}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-200"
              onClick={() => {
                setShowInsufficientCreditsModal(false);
                navigate('/pricing');
              }}
            >
              Buy Credits
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

      {/* Image Trim Modal */}
      <ImageTrimModal
        isOpen={trimModalOpen}
        onClose={() => {
          setTrimModalOpen(false);
          setImagesToTrim([]);
        }}
        images={imagesToTrim}
        onTrimComplete={handleTrimComplete}
      />

      {/* Background Remover Modal */}
      <BackgroundRemoverModal
        isOpen={backgroundRemoverModalOpen}
        onClose={() => {
          setBackgroundRemoverModalOpen(false);
          setImageToRemoveBackground(null);
        }}
        image={imageToRemoveBackground}
        onRemovalComplete={handleBackgroundRemovalComplete}
      />

      {/* Loading Overlay - Layout Generation */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-lg w-full mx-4 text-center">
            {/* Modern gradient spinner */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 border-r-teal-500 animate-spin"></div>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Generating Layout...
            </h3>
            <p className="text-lg text-slate-600 mb-4">
              Please wait while we create your optimized layout.
            </p>
            <p className="text-base text-slate-500">
              Do not refresh or close this page
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay - Export */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-lg w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Exporting High-Resolution PNG...
            </h3>
            <p className="text-lg text-slate-600 mb-4">
              Creating {dpi} DPI print-ready file.
            </p>
            <p className="text-base text-slate-500">
              This may take 5-15 seconds for large layouts
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
