
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ImageUploader } from "./ImageUploader";
import { ImageManager } from "./ImageManager";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Eye, HelpCircle, Info, X, Loader2 } from "lucide-react";
import { 
  generateLayout, 
  generateMultiSheetLayout,
  ImageDimension, 
  PositionedImage,
  MultiSheetResult,
  PackedSheet,
  getSheetLimits,
  MAX_IMAGE_HEIGHT_INCHES,
} from "@/utils/layoutAlgorithm";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
// import { ConfirmLayoutDialog } from "./ConfirmLayoutDialog"; // No longer used - confirmation moved to download
import { ErrorDialog } from "./ErrorDialog";
import { CreditWarningBanner } from "./CreditWarningBanner";
import { logSheetGeneration, logSheetGenerationError } from "@/lib/usageLogger";
import { addDpiToPng, downloadBlob } from "@/utils/pngDpiHelper";
import { estimateMemoryUsage, validateCanvasSize } from "@/utils/memoryEstimator";
import { MemoryWarningModal } from "./MemoryWarningModal";
import { ImageTrimModal } from "./ImageTrimModal";
import { BackgroundRemoverModal } from "./BackgroundRemoverModal";
import { quickPaddingCheck } from "@/utils/imageTrimUtils";
import { generatePreviewImage, generateThumbnail } from "@/utils/thumbnailUtils";
import { PreviewModal } from "./PreviewModal";
import { generateExport } from "@/utils/exportUtils";
import { MobileTooltip } from "@/components/ui/tooltip";
import { PreviewDrawer } from "./PreviewDrawer";
import { SheetTabs, SheetTabInfo } from "./SheetTabs";
import { DownloadProgressModal, SheetProgress } from "./DownloadProgressModal";
import { 
  downloadAllAsPngs, 
  downloadAllAsZip, 
  downloadSingleSheet 
} from "@/utils/multiSheetExport";
import { FloatingLayoutBar } from "./FloatingLayoutBar";
import { SessionRecoveryModal } from "./SessionRecoveryModal";
import { Toolbox, ToolType } from "./Toolbox";
import { EditImageModal, EditTool } from "./EditImageModal";
import TextEditorModal from "./TextEditorModal";
import { UploadBar } from "./UploadBar";
import {
  saveSession,
  loadSession,
  clearSession,
  getSessionMetadata,
  getSessionKey,
  restoreImageObjects,
  SessionMetadata,
  SessionScope,
  AUTO_SAVE_DELAY,
} from "@/lib/sessionStorage";
import { BuilderSettings, DEFAULT_BUILDER_SETTINGS } from "@/types/builderSettings";

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
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export type ImageObject = {
  id: string;
  file: File;
  /** Full-resolution blob URL - use this for layout generation, trimming, background removal, and EXPORT */
  url: string;
  /**
   * Low-resolution thumbnail blob URL (max 300px) - ONLY for gallery display in ImageManager.
   * NEVER use this for any image processing or final output.
   */
  thumbnailUrl: string;
  /**
   * Medium-resolution preview blob URL (max 800px) - ONLY for Fabric.js canvas display.
   * Generated when layout is created. Optional because it's only needed after layout generation.
   * NEVER use this for final export - always use the full-resolution `url` for print quality.
   */
  previewUrl?: string;
  // Original dimensions before trimming (only set if image was trimmed)
  originalWidth?: number;
  originalHeight?: number;
  /** Whether the image contains transparent pixels (detected on upload) */
  hasTransparency?: boolean;
};

/**
 * Data for a single sheet in multi-sheet layout (used in public builder callbacks)
 */
export interface SheetLayoutData {
  sheetNumber: number;
  heightInches: number;
  widthInches: number;
  imageCount: number;
}

/**
 * Data for a single exported sheet (used in public builder callbacks)
 */
export interface SheetExportData {
  sheetNumber: number;
  blob: Blob;
  previewBlob: Blob;
  heightInches: number;
  widthInches: number;
}

export interface CollageCreatorProps {
  dpi?: number;
  maxHeight?: number;
  mode?: "standard" | "hd";
  builderMode?: "standalone" | "public";
  // Route params for public builder (used for session scoping)
  printerSlug?: string;
  productSlug?: string;
  /** Initial canvas width in inches (used by public builder to set fixed width from product) */
  initialCanvasWidth?: number;
  /** Printer's builder settings — controls trim mode, tools visibility, DPI thresholds, etc. */
  builderSettings?: BuilderSettings;
  /** Called when layout is generated - provides all sheets data */
  onLayoutGenerated?: (data: { 
    sheets: SheetLayoutData[];
    totalSheets: number;
    widthInches: number;
  }) => void;
  onExportRequest?: () => void;
  /** Called when export completes - provides all exported sheets */
  onExportComplete?: (data: { 
    sheets: SheetExportData[];
    totalSheets: number;
  }) => void;
  /** Called after each sheet is exported - for progress tracking */
  onSheetExportProgress?: (data: {
    sheetNumber: number;
    totalSheets: number;
    fileSizeMB: number;
  }) => void;
  triggerExport?: boolean;
}

export const CollageCreator = ({
  dpi = 300,
  maxHeight = 400,
  mode = "standard",
  builderMode = "standalone",
  printerSlug,
  productSlug,
  initialCanvasWidth,
  builderSettings,
  onLayoutGenerated,
  onExportRequest,
  onExportComplete,
  onSheetExportProgress,
  triggerExport
}: CollageCreatorProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { credits, deductCredits, refreshCredits } = useCredits();
  const [images, setImages] = useState<ImageObject[]>([]);
  const [imageDimensions, setImageDimensions] = useState<ImageDimension[]>([]);
  const [layout, setLayout] = useState<PositionedImage[]>([]);
  const [canvasHeightInches, setCanvasHeightInches] = useState(12);
  const [canvasWidthInches, setCanvasWidthInches] = useState<number>(initialCanvasWidth ?? 23);
  const [spacingInches, setSpacingInches] = useState(
    builderSettings?.default_margin_inches ?? 0.3
  );
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
  
  // Ref to track if export was cancelled (for abort checking)
  const exportAbortedRef = useRef(false);
  
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showFeatureGuideModal, setShowFeatureGuideModal] = useState(false);
  
  // Edit Image Modal state (new unified editor)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalInitialTool, setEditModalInitialTool] = useState<EditTool>("trim");
  const [editModalInitialImageId, setEditModalInitialImageId] = useState<string | undefined>(undefined);
  // Text Editor Modal state
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  // Track whether credits have been deducted for the current layout
  // Prevents double-charging on re-downloads of the same layout
  const [creditsDeductedForCurrentLayout, setCreditsDeductedForCurrentLayout] = useState(false);
  // State for download confirmation dialog
  const [showDownloadConfirmDialog, setShowDownloadConfirmDialog] = useState(false);
  // Track which download type was requested (for after credit confirmation)
  const [pendingDownloadType, setPendingDownloadType] = useState<'single' | 'current' | 'allPng' | 'zip'>('single');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasAutoOpenedDrawer, setHasAutoOpenedDrawer] = useState(false);

  // Session recovery state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryMetadata, setRecoveryMetadata] = useState<SessionMetadata | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  // Ref to track if we should skip auto-save (during restoration)
  const skipAutoSaveRef = useRef(false);
  // Ref to track the auto-save timeout
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to block dimension updates from ImageManager during restoration
  // This stays true longer than isRestoring state to handle async image loads
  const blockDimensionUpdatesRef = useRef(false);

  // Compute session key based on builder mode and route params
  const sessionKey = useMemo(() => {
    const scope: SessionScope = {
      mode: builderMode === 'public' ? 'public' : 'standalone',
      printerSlug,
      productSlug,
    };
    return getSessionKey(scope);
  }, [builderMode, printerSlug, productSlug]);

  // Multi-sheet support state
  const [multiSheetResult, setMultiSheetResult] = useState<MultiSheetResult | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0); // 0-indexed

  // Derived state for active sheet
  const activeSheet = useMemo(() => {
    if (!multiSheetResult?.success || multiSheetResult.sheets.length === 0) {
      return null;
    }
    return multiSheetResult.sheets[activeSheetIndex] || multiSheetResult.sheets[0];
  }, [multiSheetResult, activeSheetIndex]);

  // Convert active sheet to legacy format for PreviewDrawer
  const activeSheetLayout = useMemo((): PositionedImage[] => {
    if (!activeSheet) return layout; // Fallback to legacy layout state
    return activeSheet.images.map(img => ({
      id: img.id,
      x: img.x,
      y: img.y,
      widthInches: img.widthInches,
      heightInches: img.heightInches,
      rotated: img.rotated,
    }));
  }, [activeSheet, layout]);

  const activeSheetHeight = activeSheet?.heightInches ?? canvasHeightInches;

  // Sheet tabs data for UI
  const sheetTabsData = useMemo(() => {
    if (!multiSheetResult?.success) return [];
    return multiSheetResult.sheets.map(sheet => ({
      sheetNumber: sheet.sheetNumber,
      heightInches: sheet.heightInches,
      imageCount: sheet.images.length,
      utilizationPercent: sheet.utilizationPercent,
    }));
  }, [multiSheetResult]);

  // Multi-sheet download progress state
  const [downloadProgress, setDownloadProgress] = useState<{
    isOpen: boolean;
    sheets: SheetProgress[];
    currentSheet: number;
    totalSheets: number;
    downloadType: 'png' | 'zip';
  }>({
    isOpen: false,
    sheets: [],
    currentSheet: 0,
    totalSheets: 0,
    downloadType: 'png',
  });

  // Track blob URLs for cleanup, but DON'T auto-revoke during renders/HMR
  // Only revoke when explicitly deleting images or on true unmount
  const blobUrlsRef = useRef<Set<string>>(new Set());
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    // Track all current blob URLs (full-resolution, thumbnails, and previews)
    images.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        blobUrlsRef.current.add(img.url);
      }
      if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
        blobUrlsRef.current.add(img.thumbnailUrl);
      }
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        blobUrlsRef.current.add(img.previewUrl);
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

  // Session saver is gated by builder settings in public mode
  const isSessionSaverEnabled = builderMode === 'standalone' || (builderSettings?.enable_session_saver !== false);

  // ============================================================================
  // Session Recovery: Check for existing session on mount
  // ============================================================================
  useEffect(() => {
    // Skip session check if session saver is disabled
    if (!isSessionSaverEnabled) {
      console.log(`[Session] Session saver disabled, skipping recovery check`);
      setSessionChecked(true);
      return;
    }

    console.log(`[Session] Checking for session with key: ${sessionKey}`);
    
    const checkForSession = async () => {
      try {
        const metadata = await getSessionMetadata(sessionKey);
        if (metadata && metadata.imageCount > 0) {
          console.log(`[Session] Found previous session (${sessionKey}):`, metadata);
          setRecoveryMetadata(metadata);
          setShowRecoveryModal(true);
        } else {
          console.log(`[Session] No previous session found for: ${sessionKey}`);
        }
      } catch (error) {
        console.error('[Session] Error checking for session:', error);
      } finally {
        setSessionChecked(true);
      }
    };

    checkForSession();
  }, [sessionKey, isSessionSaverEnabled]);

  // ============================================================================
  // Session Recovery: Auto-save when images or dimensions change
  // ============================================================================
  
  // Use refs to store current values - avoids stale closure issues
  const imagesRef = useRef(images);
  const imageDimensionsRef = useRef(imageDimensions);
  const canvasWidthRef = useRef(canvasWidthInches);
  const spacingRef = useRef(spacingInches);
  const sessionKeyRef = useRef(sessionKey);
  
  // Keep refs in sync
  useEffect(() => {
    imagesRef.current = images;
    imageDimensionsRef.current = imageDimensions;
    canvasWidthRef.current = canvasWidthInches;
    spacingRef.current = spacingInches;
    sessionKeyRef.current = sessionKey;
  });
  
  // Trigger save when images change - use a simple counter
  const [saveCounter, setSaveCounter] = useState(0);
  
  // Create a stable string representation of dimensions to detect value changes
  const dimensionsFingerprint = useMemo(() => {
    return imageDimensions
      .map(d => `${d.id}:${d.widthInches}:${d.heightInches}:${d.quantity || 1}`)
      .sort()
      .join('|');
  }, [imageDimensions]);
  
  // Increment counter when images or dimensions actually change
  useEffect(() => {
    if (images.length > 0 && sessionChecked && !skipAutoSaveRef.current && isSessionSaverEnabled) {
      console.log('[Session] Data changed, triggering save...');
      setSaveCounter(c => c + 1);
    }
  }, [images.length, dimensionsFingerprint, canvasWidthInches, spacingInches, sessionChecked, isSessionSaverEnabled]);
  
  // Handle the actual save - only depends on saveCounter
  useEffect(() => {
    if (saveCounter === 0) return;
    if (imagesRef.current.length === 0) return;
    
    console.log(`[Session] Scheduling auto-save for ${imagesRef.current.length} images...`);
    
    const timeoutId = setTimeout(async () => {
      const currentImages = imagesRef.current;
      const currentDimensions = imageDimensionsRef.current;
      const currentWidth = canvasWidthRef.current;
      const currentSpacing = spacingRef.current;
      const currentKey = sessionKeyRef.current;
      
      if (currentImages.length === 0) {
        console.log('[Session] No images to save, skipping');
        return;
      }
      
      try {
        console.log(`[Session] Executing auto-save for ${currentImages.length} images...`);
        await saveSession(currentKey, currentImages, currentDimensions, currentWidth, currentSpacing);
        console.log(`[Session] ✅ Auto-saved: ${currentImages.length} images`);
      } catch (error) {
        console.error('[Session] Auto-save failed:', error);
      }
    }, AUTO_SAVE_DELAY);
    
    return () => clearTimeout(timeoutId);
  }, [saveCounter]);
  
  // Clear session when all images are removed (but not on initial load or during recovery)
  const hasHadImagesRef = useRef(false);
  const isRecoveryPendingRef = useRef(false);
  
  useEffect(() => {
    if (images.length > 0) {
      hasHadImagesRef.current = true;
    }
  }, [images.length]);
  
  // Track when recovery modal is shown
  useEffect(() => {
    isRecoveryPendingRef.current = showRecoveryModal;
  }, [showRecoveryModal]);
  
  useEffect(() => {
    // Only clear if:
    // 1. User HAD images and removed them all
    // 2. Not on initial page load when images start empty
    // 3. Not when recovery modal is showing
    if (sessionChecked && images.length === 0 && hasHadImagesRef.current && !isRecoveryPendingRef.current) {
      console.log('[Session] All images removed, clearing session');
      clearSession(sessionKey).catch(console.error);
    }
  }, [images.length, sessionKey, sessionChecked]);

  // ============================================================================
  // Session Recovery: Handle restore and discard
  // ============================================================================
  const handleRestoreSession = useCallback(async () => {
    console.log(`[Session] Attempting to restore session with key: ${sessionKey}`);
    setIsRestoring(true);
    skipAutoSaveRef.current = true; // Prevent auto-save during restoration
    blockDimensionUpdatesRef.current = true; // Block ImageManager dimension updates

    try {
      const session = await loadSession(sessionKey);
      console.log('[Session] Loaded session:', session);
      
      if (!session) {
        console.error('[Session] loadSession returned null');
        toast.error('Session data not found');
        setShowRecoveryModal(false);
        setIsRestoring(false);
        skipAutoSaveRef.current = false;
        blockDimensionUpdatesRef.current = false;
        return;
      }

      console.log(`[Session] Restoring ${session.images.length} images...`);
      console.log(`[Session] Restoring ${session.imageDimensions.length} dimensions:`, session.imageDimensions);
      
      // Restore images (regenerates blob URLs from File objects)
      const restoredImages = await restoreImageObjects(session.images);
      
      console.log(`[Session] Restored ${restoredImages.length} image objects`);
      
      // Store the dimensions we want to restore
      const dimensionsToRestore = session.imageDimensions;
      
      // Update state
      setImages(restoredImages);
      setImageDimensions(dimensionsToRestore);
      setCanvasWidthInches(session.canvasWidthInches);
      setSpacingInches(session.spacingInches);

      toast.success(`Restored ${restoredImages.length} images from previous session`);
      console.log('[Session] Restored session successfully');
      
      // Unblock dimension updates after ImageManager has finished loading images
      // Use a longer delay to ensure all async image loads complete
      setTimeout(() => {
        console.log('[Session] Unblocking dimension updates');
        blockDimensionUpdatesRef.current = false;
      }, 2000);
      
    } catch (error) {
      console.error('[Session] Failed to restore session:', error);
      toast.error('Failed to restore session. Starting fresh.');
      await clearSession(sessionKey);
      blockDimensionUpdatesRef.current = false;
    } finally {
      setShowRecoveryModal(false);
      setIsRestoring(false);
      // Re-enable auto-save after a delay to let state settle
      setTimeout(() => {
        skipAutoSaveRef.current = false;
      }, 2500);
    }
  }, [sessionKey]);

  const handleDiscardSession = useCallback(async () => {
    try {
      await clearSession(sessionKey);
      console.log('[Session] Discarded previous session');
    } catch (error) {
      console.error('[Session] Failed to clear session:', error);
    } finally {
      setShowRecoveryModal(false);
      setRecoveryMetadata(null);
    }
  }, [sessionKey]);

  /**
   * Export for Add to Cart flow - generates blobs for all sheets and calls onExportComplete
   * No UI feedback (toasts/modals) - parent handles that
   */
  const handleExportForCart = useCallback(async () => {
    if (!onExportComplete) {
      return;
    }

    // Check if we have multi-sheet result
    if (!multiSheetResult?.success || multiSheetResult.sheets.length === 0) {
      // Fallback to legacy single-sheet export
      if (layout.length === 0) {
        console.error("[CollageCreator] Cannot export: no layout");
        return;
      }

      try {
        if (onExportRequest) {
          onExportRequest();
        }

        const dataUrl = await generateExport({
          images,
          layout,
          canvasWidthInches,
          canvasHeightInches,
          dpi,
        });

        const pngBlob = await addDpiToPng(dataUrl, dpi);

        // Generate preview
        const exportImage = new Image();
        await new Promise<void>((resolve, reject) => {
          exportImage.onload = () => resolve();
          exportImage.onerror = () => reject(new Error('Failed to load export image'));
          exportImage.src = dataUrl;
        });

        const previewCanvas = document.createElement('canvas');
        const maxPreviewWidth = 250;
        const scale = Math.min(maxPreviewWidth / (canvasWidthInches * dpi), 1);
        previewCanvas.width = Math.round(canvasWidthInches * dpi * scale);
        previewCanvas.height = Math.round(canvasHeightInches * dpi * scale);
        const previewCtx = previewCanvas.getContext('2d');
        if (previewCtx) {
          previewCtx.imageSmoothingEnabled = true;
          previewCtx.imageSmoothingQuality = 'high';
          previewCtx.drawImage(exportImage, 0, 0, previewCanvas.width, previewCanvas.height);
        }

        const previewBlob = await new Promise<Blob>((resolve, reject) => {
          previewCanvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Failed to create preview')),
            'image/png',
            0.8
          );
        });

        onExportComplete({
          sheets: [{
            sheetNumber: 1,
            blob: pngBlob,
            previewBlob,
            heightInches: canvasHeightInches,
            widthInches: canvasWidthInches,
          }],
          totalSheets: 1,
        });
      } catch (error) {
        console.error("[CollageCreator] Export for cart failed:", error);
      }
      return;
    }

    // Multi-sheet export
    try {
      if (onExportRequest) {
        onExportRequest();
      }

      console.log(`[CollageCreator] Exporting ${multiSheetResult.totalSheets} sheets for cart...`);

      const exportedSheets: SheetExportData[] = [];

      console.log(`[CollageCreator] 🚀 Starting multi-sheet export...`);
      console.log(`[CollageCreator] Export settings: ${dpi} DPI, ${canvasWidthInches}" width`);
      
      for (const sheet of multiSheetResult.sheets) {
        console.log(`[CollageCreator] ━━━ Exporting sheet ${sheet.sheetNumber} of ${multiSheetResult.totalSheets} ━━━`);
        console.log(`[CollageCreator] Sheet ${sheet.sheetNumber}: ${sheet.images.length} images, ${sheet.heightInches.toFixed(2)}" height`);

        // Convert sheet layout to PositionedImage format
        const sheetLayout: PositionedImage[] = sheet.images.map(img => ({
          id: img.id,
          x: img.x,
          y: img.y,
          widthInches: img.widthInches,
          heightInches: img.heightInches,
          rotated: img.rotated,
        }));

        // Generate export for this sheet
        const dataUrl = await generateExport({
          images,
          layout: sheetLayout,
          canvasWidthInches,
          canvasHeightInches: sheet.heightInches,
          dpi,
        });

        const pngBlob = await addDpiToPng(dataUrl, dpi);

        // Generate preview (250px max width)
        const exportImage = new Image();
        await new Promise<void>((resolve, reject) => {
          exportImage.onload = () => resolve();
          exportImage.onerror = () => reject(new Error(`Failed to load export image for sheet ${sheet.sheetNumber}`));
          exportImage.src = dataUrl;
        });

        const previewCanvas = document.createElement('canvas');
        const maxPreviewWidth = 250;
        const exportWidthPx = canvasWidthInches * dpi;
        const exportHeightPx = sheet.heightInches * dpi;
        const scale = Math.min(maxPreviewWidth / exportWidthPx, 1);
        previewCanvas.width = Math.round(exportWidthPx * scale);
        previewCanvas.height = Math.round(exportHeightPx * scale);
        const previewCtx = previewCanvas.getContext('2d');

        if (!previewCtx) {
          throw new Error(`Failed to get preview canvas context for sheet ${sheet.sheetNumber}`);
        }

        previewCtx.imageSmoothingEnabled = true;
        previewCtx.imageSmoothingQuality = 'high';
        previewCtx.drawImage(exportImage, 0, 0, previewCanvas.width, previewCanvas.height);

        const previewBlob = await new Promise<Blob>((resolve, reject) => {
          previewCanvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error(`Failed to create preview for sheet ${sheet.sheetNumber}`)),
            'image/png',
            0.8
          );
        });

        exportedSheets.push({
          sheetNumber: sheet.sheetNumber,
          blob: pngBlob,
          previewBlob,
          heightInches: sheet.heightInches,
          widthInches: canvasWidthInches,
        });

        const fileSizeMB = (pngBlob.size / 1024 / 1024).toFixed(2);
        const previewSizeKB = (previewBlob.size / 1024).toFixed(1);
        console.log(`[CollageCreator] ✅ Sheet ${sheet.sheetNumber} exported: ${fileSizeMB} MB (preview: ${previewSizeKB} KB)`);
        
        // Check if export was cancelled before notifying parent
        if (exportAbortedRef.current) {
          console.log(`[CollageCreator] Export was cancelled, skipping callbacks`);
          return;
        }
        
        // Notify parent of individual sheet export progress
        if (onSheetExportProgress) {
          onSheetExportProgress({
            sheetNumber: sheet.sheetNumber,
            totalSheets: multiSheetResult.totalSheets,
            fileSizeMB: parseFloat(fileSizeMB),
          });
        }
      }

      // Check if export was cancelled before calling onExportComplete
      if (exportAbortedRef.current) {
        console.log(`[CollageCreator] Export was cancelled, not calling onExportComplete`);
        return;
      }

      // Call onExportComplete with all sheets
      onExportComplete({
        sheets: exportedSheets,
        totalSheets: multiSheetResult.totalSheets,
      });

      console.log(`[CollageCreator] All ${exportedSheets.length} sheets exported successfully`);

    } catch (error) {
      console.error("[CollageCreator] Multi-sheet export for cart failed:", error);
      // Parent component should handle error feedback
    }
  }, [images, layout, canvasWidthInches, canvasHeightInches, dpi, onExportRequest, onExportComplete, onSheetExportProgress, multiSheetResult]);

  // Watch for triggerExport from parent component (for Add to Cart flow)
  useEffect(() => {
    // Trigger export if we have either multi-sheet result or legacy single-sheet layout
    const hasLayout = (multiSheetResult?.success && multiSheetResult.sheets.length > 0) || layout.length > 0;
    
    if (triggerExport && onExportComplete && hasLayout) {
      // Starting new export - reset abort flag
      exportAbortedRef.current = false;
      handleExportForCart();
    } else if (!triggerExport) {
      // Export was cancelled - set abort flag to prevent callbacks
      exportAbortedRef.current = true;
    }
  }, [triggerExport, onExportComplete, layout.length, multiSheetResult, handleExportForCart]);

  // Helper function to get user's credit balance (now from Supabase via context)
  const getUserCredits = (): number => {
    return credits;
  };

  // CRITICAL: Reset state to prevent corrupted state after errors
  const resetGenerationState = () => {
    debugLog('🔄 Resetting generation state');
    setLayout([]);
    setMultiSheetResult(null);
    setActiveSheetIndex(0);
    setCreditsDeductedForCurrentLayout(false);
    setTotalSqInchesUsed(null);
    setPendingLayout(null);
  };

  // Handle sheet tab change
  const handleSheetChange = (sheetNumber: number) => {
    if (!multiSheetResult?.success) return;
    
    const newIndex = sheetNumber - 1; // Convert 1-indexed to 0-indexed
    if (newIndex >= 0 && newIndex < multiSheetResult.sheets.length) {
      setActiveSheetIndex(newIndex);
      
      // Update legacy state for PreviewDrawer
      const sheet = multiSheetResult.sheets[newIndex];
      setLayout(sheet.images.map(img => ({
        id: img.id,
        x: img.x,
        y: img.y,
        widthInches: img.widthInches,
        heightInches: img.heightInches,
        rotated: img.rotated,
      })));
      setCanvasHeightInches(sheet.heightInches);
    }
  };

  // Helper to log generation errors to usage_logs table
  const logGenerationError = async (errorMessage: string, extraData?: {
    sqInches?: number;
    sheetWidth?: number;
    sheetHeight?: number;
    creditsBalance?: number;
  }) => {
    if (!user?.id || !user?.email) return; // Can't log without user ID and email

    const userId = user.id;
    const userEmail = user.email;
    const currentCredits = extraData?.creditsBalance ?? getUserCredits();

    try {
      await logSheetGenerationError({
        user_id: userId,
        user_email: userEmail,
        error_message: errorMessage,
        sq_inches_used: extraData?.sqInches ?? 0,
        sheet_width: extraData?.sheetWidth ?? canvasWidthInches,
        sheet_height: extraData?.sheetHeight ?? 0,
        image_count: images.length,
        credits_before: currentCredits,
        credits_after: currentCredits, // No deduction on error
      });
    } catch (e) {
      console.error('[Error Logging] Failed to log error:', e);
    }
  };

  const handleImagesAdded = async (newImages: ImageObject[]) => {
    // NOTE: auto_resize_to_300dpi is intentionally not implemented at upload time.
    // Upscaling every image 2x via canvas on upload is too slow and memory-heavy.
    // The export pipeline already renders at 300 DPI, so this setting should be
    // implemented as a server-side post-processing step (e.g. Real-ESRGAN via Replicate)
    // if AI upscaling is desired in the future.

    // === Resolution gate: reject images below minimum DPI if disallow_lower_resolution is on ===
    // At default placement (÷300), all images start at 300 DPI. But if an image has so few
    // pixels that even at default placement it can't meet the minimum, reject it.
    // Also reject if the image's native pixel density is below the threshold at default size.
    if (builderSettings?.disallow_lower_resolution && builderSettings.minimum_resolution_dpi > 0) {
      const minDpi = builderSettings.minimum_resolution_dpi;
      const defaultPlacementDpi = 300;
      const rejected: string[] = [];
      const accepted: ImageObject[] = [];

      for (const img of newImages) {
        try {
          const el = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('load failed'));
            i.src = img.url;
          });
          // At default placement, DPI = defaultPlacementDpi (300).
          // But if the image is extremely small (e.g. 50x50 px), it would
          // be 0.17" at 300 DPI — still 300 DPI. So the upload gate only
          // rejects if defaultPlacementDpi < minDpi (which is unlikely).
          // The real enforcement happens in ImageManager when resizing.
          if (defaultPlacementDpi < minDpi) {
            rejected.push(img.file.name);
            if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
            if (img.thumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(img.thumbnailUrl);
          } else {
            accepted.push(img);
          }
        } catch {
          accepted.push(img);
        }
      }

      if (rejected.length > 0) {
        toast.error(
          `${rejected.length} image(s) rejected — resolution below ${minDpi} DPI minimum: ${rejected.slice(0, 3).join(', ')}${rejected.length > 3 ? '...' : ''}`,
          { duration: 6000 }
        );
      }

      if (accepted.length === 0) return;
      newImages = accepted;
    }

    // === Transparent pixel detection: mark images that have transparency (before adding to state) ===
    if (builderSettings?.enable_transparent_pixel_warning !== false) {
      const pngsForTransparency = newImages.filter(img =>
        img.file.type === 'image/png' || img.file.name.toLowerCase().endsWith('.png')
      );

      for (const img of pngsForTransparency) {
        try {
          const el = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('load failed'));
            i.src = img.url;
          });
          const canvas = document.createElement('canvas');
          const sampleSize = Math.min(el.naturalWidth, el.naturalHeight, 200);
          canvas.width = sampleSize;
          canvas.height = sampleSize;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(el, 0, 0, sampleSize, sampleSize);
            const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
            const data = imageData.data;
            let transparentPixels = 0;
            const totalPixels = sampleSize * sampleSize;
            for (let i = 3; i < data.length; i += 4) {
              if (data[i] < 250) transparentPixels++;
            }
            if (transparentPixels / totalPixels > 0.01) {
              img.hasTransparency = true;
            }
          }
        } catch {
          // Silently skip
        }
      }
    }

    // Blob URLs are automatically tracked by useEffect when images state updates
    setImages((prev) => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added to your collage`);

    // === Trim detection — gated by image_trim_mode setting ===
    const trimMode = builderSettings?.image_trim_mode ?? 'auto';
    const trimWarningEnabled = builderSettings?.enable_trim_warning !== false;

    if (trimMode !== 'off') {
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
          if (trimMode === 'auto') {
            // Auto-trim: open trim modal automatically
            setImagesToTrim(imagesToCheck);
            setTrimModalOpen(true);
            if (trimWarningEnabled) {
              toast.info(
                "We detected extra empty space around your design. You can trim it to save print area, or keep the original.",
                { duration: 6000 }
              );
            }
          } else if (trimMode === 'manual' && trimWarningEnabled) {
            // Manual: just show a warning toast, don't open modal
            toast.info(
              "This image has excess whitespace. Consider using the trim tool.",
              { duration: 6000 }
            );
          }
        }
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
          // Clean up old blob URLs (full-resolution, thumbnail, and preview)
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
            blobUrlsRef.current.delete(img.url);
          }
          if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.thumbnailUrl);
            blobUrlsRef.current.delete(img.thumbnailUrl);
          }
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.previewUrl);
            blobUrlsRef.current.delete(img.previewUrl);
          }
          // Track new blob URLs (preview will be regenerated when layout is created)
          if (trimmed.url.startsWith('blob:')) {
            blobUrlsRef.current.add(trimmed.url);
          }
          if (trimmed.thumbnailUrl && trimmed.thumbnailUrl.startsWith('blob:')) {
            blobUrlsRef.current.add(trimmed.thumbnailUrl);
          }
          // Note: previewUrl is not set here - it will be generated when layout is created
          return { ...trimmed, previewUrl: undefined };
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
        setCreditsDeductedForCurrentLayout(false);
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
          // Clean up old blob URLs (full-resolution, thumbnail, and preview)
          if (img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
            blobUrlsRef.current.delete(img.url);
          }
          if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.thumbnailUrl);
            blobUrlsRef.current.delete(img.thumbnailUrl);
          }
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.previewUrl);
            blobUrlsRef.current.delete(img.previewUrl);
          }
          // Track new blob URLs (preview will be regenerated when layout is created)
          if (newImage.url.startsWith('blob:')) {
            blobUrlsRef.current.add(newImage.url);
          }
          if (newImage.thumbnailUrl && newImage.thumbnailUrl.startsWith('blob:')) {
            blobUrlsRef.current.add(newImage.thumbnailUrl);
          }
          // Note: previewUrl is not set here - it will be generated when layout is created
          return { ...newImage, previewUrl: undefined };
        }
        return img;
      });
    });

    // Clear image dimensions so ImageManager recalculates them
    setImageDimensions([]);

    // Reset layout if this image was in it
    if (layout.length > 0 && layout.some(item => item.id === newImage.id)) {
      setLayout([]);
      setCreditsDeductedForCurrentLayout(false);
      toast.info("Layout reset due to image changes. Please regenerate.");
    }

    setBackgroundRemoverModalOpen(false);
    setImageToRemoveBackground(null);
  };

  // Handle text added from TextEditorModal
  const handleTextImageAdded = async (blob: Blob, url: string, width: number, height: number, fileName: string) => {
    const file = new File([blob], fileName, { type: "image/png" });
    const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    let thumbnailUrl: string;
    try {
      thumbnailUrl = await generateThumbnail(file, 300);
    } catch {
      thumbnailUrl = url;
    }

    const imageObj: ImageObject = { id, file, url, thumbnailUrl };
    handleImagesAdded([imageObj]);
  };

  // Handle toolbox tool click
  const handleToolClick = (toolId: ToolType) => {
    // Guide opens feature guide modal
    if (toolId === "guide") {
      setShowFeatureGuideModal(true);
      return;
    }

    // Type Text opens text editor modal (doesn't need existing images)
    if (toolId === "type-text") {
      setTextEditorOpen(true);
      return;
    }

    // Disabled tools
    if (toolId === "create" || toolId.startsWith("placeholder")) {
      toast.info("This feature is coming soon!");
      return;
    }

    // Image editing tools need images
    if (images.length === 0) {
      toast.warning("Please upload images first");
      return;
    }

    // Map toolId to EditTool
    const toolMap: Record<string, EditTool> = {
      "trim": "trim",
      "flip-rotate": "flip-rotate",
      "remove-bg": "remove-bg",
      "replace-color": "replace-color",
      "enhance": "enhance",
    };

    const editTool = toolMap[toolId];
    if (editTool) {
      setEditModalInitialTool(editTool);
      setEditModalInitialImageId(undefined); // Will show image picker
      setEditModalOpen(true);
    }
  };

  // Handle opening edit modal from image card
  const handleEditImage = (image: ImageObject) => {
    setEditModalInitialTool("trim"); // Default to trim tool
    setEditModalInitialImageId(image.id);
    setEditModalOpen(true);
  };

  // Handle edit modal completion
  const handleEditComplete = (editedImages: ImageObject[]) => {
    // Update images state with edited versions
    setImages(prevImages => {
      return prevImages.map(img => {
        const edited = editedImages.find(e => e.id === img.id);
        if (edited && edited.url !== img.url) {
          // Clean up old blob URLs
          if (img.url && img.url.startsWith('blob:')) {
            URL.revokeObjectURL(img.url);
            blobUrlsRef.current.delete(img.url);
          }
          if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.thumbnailUrl);
            blobUrlsRef.current.delete(img.thumbnailUrl);
          }
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(img.previewUrl);
            blobUrlsRef.current.delete(img.previewUrl);
          }
          // Track new blob URLs
          if (edited.url.startsWith('blob:')) {
            blobUrlsRef.current.add(edited.url);
          }
          if (edited.thumbnailUrl && edited.thumbnailUrl.startsWith('blob:')) {
            blobUrlsRef.current.add(edited.thumbnailUrl);
          }
          return { ...edited, previewUrl: undefined };
        }
        return img;
      });
    });

    // Clear image dimensions so ImageManager recalculates
    setImageDimensions([]);

    // Reset layout if edited images were in it
    if (layout.length > 0) {
      const editedIds = new Set(editedImages.map(e => e.id));
      if (layout.some(item => editedIds.has(item.id))) {
        setLayout([]);
        setMultiSheetResult(null);
        setCreditsDeductedForCurrentLayout(false);
        toast.info("Layout reset due to image changes. Please regenerate.");
      }
    }

    setEditModalOpen(false);
  };

  const handleImagesRemoved = (imageIds: string[]) => {
    // CRITICAL: ONLY revoke blob URLs for images being deleted
    const imagesToRemove = images.filter(img => imageIds.includes(img.id));
    const imagesToKeep = images.filter(img => !imageIds.includes(img.id));

    // Revoke ONLY the deleted images' URLs (full-resolution, thumbnails, and previews)
    imagesToRemove.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
        blobUrlsRef.current.delete(img.url);
      }
      if (img.thumbnailUrl && img.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.thumbnailUrl);
        blobUrlsRef.current.delete(img.thumbnailUrl);
      }
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
        blobUrlsRef.current.delete(img.previewUrl);
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
      setCreditsDeductedForCurrentLayout(false);
    }

    debugLog(`[Memory Cleanup] Removed ${imageIds.length} image(s), ${imagesToKeep.length} remaining`);
    toast.error(`${imageIds.length} image(s) removed`);
  };

  const handleImageDimensionsChanged = (dimensions: ImageDimension[]) => {
    // Skip dimension updates from ImageManager during session restoration
    // This prevents ImageManager's recalculated defaults from overwriting restored dimensions
    if (blockDimensionUpdatesRef.current) {
      console.log('[Session] Blocking dimension update during restoration');
      return;
    }
    debugLog("Dimensions changed:", dimensions);
    setImageDimensions(dimensions);
  };

  // Actual layout generation logic (called after memory check passes)
  const proceedWithGeneration = async () => {
    debugLog('🎨 proceedWithGeneration called');
    debugLog('  - imageDimensions.length:', imageDimensions.length);
    debugLog('  - images.length:', images.length);
    debugLog('  - imageDimensions:', imageDimensions.map(dim => ({ id: dim.id, w: dim.widthInches, h: dim.heightInches })));

    setIsGenerating(true);

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(async () => {
      try {
        // CRITICAL FIX: Filter imageDimensions to only include dimensions for images that currently exist
        // This prevents stale dimensions from deleted images being used in layout generation
        const currentImageIds = new Set(images.map(img => img.id));
        const validDimensions = imageDimensions.filter(dim => currentImageIds.has(dim.id));

        debugLog('🔍 Dimension validation:');
        debugLog('  - Current image IDs:', Array.from(currentImageIds));
        debugLog('  - Original dimensions count:', imageDimensions.length);
        debugLog('  - Valid dimensions count:', validDimensions.length);

        // Check if we're missing dimensions for any current images
        if (validDimensions.length !== images.length) {
          debugLog('⚠️ Dimension mismatch: validDimensions.length !== images.length');
          debugLog('  - Missing dimensions for:', images.filter(img => !validDimensions.some(d => d.id === img.id)).map(img => img.id));

          // If we have fewer valid dimensions than images, some images haven't been processed yet
          if (validDimensions.length < images.length) {
            toast.error("Please wait for all images to load before generating layout.");
            setIsGenerating(false);
            return;
          }
        }

        debugLog("🔧 Generating layout with validated dimensions:", validDimensions);

        // Get sheet limits based on width
        const sheetLimits = getSheetLimits(canvasWidthInches);
        debugLog(`[Layout] Sheet limits: ${sheetLimits.maxHeightInches}" max height for ${canvasWidthInches}" width`);

        // Use multi-sheet layout which automatically handles:
        // - Image height validation (max 100")
        // - Automatic splitting when exceeding max height
        // - Quantity expansion
        const layoutOverrides = builderSettings ? {
          maxHeightInches: builderSettings.max_height_inches,
          maxSheets: builderSettings.max_sheets,
        } : undefined;
        const multiResult = generateMultiSheetLayout(validDimensions, canvasWidthInches, spacingInches, layoutOverrides);
        debugLog("Multi-sheet result:", multiResult);

        if (!multiResult.success) {
          debugLog('❌ Multi-sheet layout failed:', multiResult.error);
          setErrorDialogData({
            title: "Layout Error",
            message: multiResult.error || "Failed to generate layout. Please check image dimensions.",
          });
          setShowErrorDialog(true);
          setIsGenerating(false);
          return;
        }

        if (multiResult.sheets.length === 0) {
          debugLog('❌ No sheets generated');
          toast.error("Failed to generate layout. Please check image dimensions.");
          setIsGenerating(false);
          return;
        }

        // Validate each sheet's canvas size against browser limits
        for (const sheet of multiResult.sheets) {
          const sizeCheck = validateCanvasSize(canvasWidthInches, sheet.heightInches, dpi);
          if (!sizeCheck.isValid) {
            debugLog(`❌ Sheet ${sheet.sheetNumber} exceeds browser canvas limits`);
            setErrorDialogData({
              title: "Canvas Too Large",
              message: sizeCheck.errorMessage || "Canvas exceeds maximum size limits.",
            });
            setShowErrorDialog(true);
            setIsGenerating(false);
            return;
          }
        }

        // Calculate total square inches across all sheets
        const totalSqInches = multiResult.sheets.reduce(
          (sum, sheet) => sum + (canvasWidthInches * sheet.heightInches),
          0
        );

        // Check if user has enough credits BEFORE showing confirmation dialog (only in standalone mode)
        if (builderMode === "standalone") {
          const currentCredits = getUserCredits();
          console.log(`[Layout] ${multiResult.totalSheets} sheet(s) require ${totalSqInches.toFixed(2)} sq.in total, user has ${currentCredits} credits`);

          if (currentCredits < totalSqInches) {
            debugLog('❌ Validation failed: Insufficient credits');
            setInsufficientCreditsData({
              needed: totalSqInches,
              available: currentCredits
            });
            setShowInsufficientCreditsModal(true);
            setIsGenerating(false);
            return;
          }
        }

        debugLog("✅ All validations passed! Layout is ready.");
        debugLog(`   ${multiResult.totalSheets} sheet(s), ${multiResult.totalImages} images`);

        // Generate layout immediately (no confirmation needed - credits charged on download)
        // MEMORY OPTIMIZATION: Generate only preview images for canvas display
        // Full-resolution URLs are NOT stored in state - they're regenerated from File objects at export time
        console.log('🔄 Preparing images for canvas (previews only - full-res generated on export)...');
        
        const imagesWithPreview = await Promise.all(
          images.map(async (img) => {
            // Generate preview image (400px max) for canvas display
            let previewUrl: string;
            try {
              previewUrl = await generatePreviewImage(img.file, 400);
              console.log(`[MEMORY DEBUG] Generated preview for ${img.file.name}`);
            } catch (error) {
              console.error(`Failed to generate preview for ${img.file.name}:`, error);
              // Fallback: create a blob URL from the file (will use more memory but at least works)
              previewUrl = URL.createObjectURL(img.file);
            }

            return {
              ...img,
              // MEMORY OPTIMIZATION: Don't store full-res URL in state
              // Set url to empty - full-res will be regenerated from File at export time
              url: '',
              previewUrl,        // 400px preview for canvas display (memory optimization)
              // Keep thumbnailUrl unchanged for gallery
            };
          })
        );

        // CRITICAL: Revoke old blob URLs to prevent memory leak
        debugLog('[Memory] Revoking old blob URLs after preview generation');
        images.forEach(img => {
          if (img.url && img.url.startsWith('blob:')) {
            debugLog('[Memory]   - Revoking full-res blob:', img.url.substring(0, 50) + '...');
            URL.revokeObjectURL(img.url);
            if (blobUrlsRef && blobUrlsRef.current) {
              blobUrlsRef.current.delete(img.url);
            }
          }
          // Also revoke old preview URLs if they exist (they'll be replaced with new ones)
          if (img.previewUrl && img.previewUrl.startsWith('blob:')) {
            debugLog('[Memory]   - Revoking old preview:', img.previewUrl.substring(0, 50) + '...');
            URL.revokeObjectURL(img.previewUrl);
            if (blobUrlsRef && blobUrlsRef.current) {
              blobUrlsRef.current.delete(img.previewUrl);
            }
          }
        });
        debugLog('[Memory] ✅ Old blob URLs revoked - full-res URLs NOT stored in state');

        // Update images state with preview URLs only (no full-res URLs stored)
        setImages(imagesWithPreview);

        // Store multi-sheet result and set active sheet to first
        setMultiSheetResult(multiResult);
        setActiveSheetIndex(0);

        // Also set legacy single-sheet state for backwards compatibility
        // Use first sheet's data
        const firstSheet = multiResult.sheets[0];
        setLayout(firstSheet.images.map(img => ({
          id: img.id,
          x: img.x,
          y: img.y,
          widthInches: img.widthInches,
          heightInches: img.heightInches,
          rotated: img.rotated,
        })));
        setCanvasHeightInches(firstSheet.heightInches);
        setTotalSqInchesUsed(totalSqInches);
        setCreditsDeductedForCurrentLayout(false); // Reset for new layout

        setIsGenerating(false);
        
        // Show appropriate success message
        if (multiResult.totalSheets > 1) {
          toast.success(`Layout generated across ${multiResult.totalSheets} sheets! Use tabs to switch between sheets.`);
        } else {
          toast.success("Layout generated! Click Download to save your sheet.");
        }

        // Call onLayoutGenerated callback if provided (for public builder mode)
        if (onLayoutGenerated) {
          const sheetsData: SheetLayoutData[] = multiResult.sheets.map(sheet => ({
            sheetNumber: sheet.sheetNumber,
            heightInches: sheet.heightInches,
            widthInches: canvasWidthInches,
            imageCount: sheet.images.length,
          }));
          
          onLayoutGenerated({ 
            sheets: sheetsData,
            totalSheets: multiResult.totalSheets,
            widthInches: canvasWidthInches,
          });
        }

        // Auto-open drawer on successful generation
        setIsDrawerOpen(true);

        // Auto-open preview modal
        // setShowPreviewModal(true); // Removed - drawer is now the primary preview
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
      logGenerationError("No images with dimensions set");
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
      logGenerationError(`Oversized images: ${names}`);
      return;
    }

    // Estimate memory usage before proceeding
    const prelimEstimate = estimateMemoryUsage(canvasWidthInches, canvasHeightInches, images);

    // Show modal only if smart detection says we should
    if (prelimEstimate.shouldShowWarning) {
      setMemoryWarning({
        isOpen: true,
        riskLevel: prelimEstimate.riskLevel as 'high' | 'critical',
        memoryMB: prelimEstimate.totalEstimateMB,
        message: prelimEstimate.warningMessage || ''
      });
      return;
    }

    // Below threshold or device has enough RAM - proceed directly
    proceedWithGeneration();
  };


  /**
   * Export handler - show confirmation, deduct credits, then download
   * Credits are only charged once per layout (tracked via creditsDeductedForCurrentLayout)
   */
  const handleExport = async () => {
    if (layout.length === 0) {
      toast.error("No layout to export");
      return;
    }

    // Only check for user login in standalone mode
    if (builderMode === "standalone" && !user) {
      toast.error("Please log in to download");
      return;
    }

    const sqInchesToCharge = totalSqInchesUsed ?? 0;

    // Credit logic only applies in standalone mode
    if (builderMode === "standalone") {
      // If credits haven't been deducted for this layout, show confirmation dialog
      if (!creditsDeductedForCurrentLayout && sqInchesToCharge > 0) {
        setPendingDownloadType('single');
        setShowDownloadConfirmDialog(true);
        return; // Wait for user to confirm
      }
    }

    // Credits already deducted for this layout (or in public mode) - just download
    await performDownload();
  };

  /**
   * Called after user confirms download - deducts credits and downloads
   * Only used in standalone mode
   */
  const handleConfirmDownload = async () => {
    // This should only be called in standalone mode
    if (builderMode !== "standalone") {
      await performDownload();
      return;
    }

    const currentCredits = credits;
    const sqInchesToCharge = totalSqInchesUsed ?? 0;

    // Verify user has enough credits
    if (currentCredits < sqInchesToCharge) {
      setShowDownloadConfirmDialog(false);
      setInsufficientCreditsData({
        needed: sqInchesToCharge,
        available: currentCredits,
      });
      setShowInsufficientCreditsModal(true);
      return;
    }

    // Deduct credits
    console.log('[CollageCreator] Deducting credits for download');
    console.log("[Credit Deduction] Starting transaction...");
    console.log(`[Credit Deduction] Current: ${currentCredits}, To Deduct: ${sqInchesToCharge}`);

    const deductResult = await deductCredits(sqInchesToCharge, "Sheet download");

    if (!deductResult.success) {
      console.error("[Credit Deduction] ❌ Failed:", deductResult.error);
      toast.error("Failed to deduct credits. Please try again.");
      setShowDownloadConfirmDialog(false);
      return;
    }

    const newBalance = deductResult.newBalance ?? (currentCredits - sqInchesToCharge);
    console.log("[Credit Deduction] ✅ Credits deducted successfully! New balance:", newBalance);

    // Log the download to Supabase
    const userId = user?.id;
    const userEmail = user?.email || '';

    if (userId && userEmail) {
      const logResult = await logSheetGeneration({
        user_id: userId,
        user_email: userEmail,
        sq_inches_used: sqInchesToCharge,
        sheet_width: canvasWidthInches,
        sheet_height: canvasHeightInches,
        image_count: images.length,
        credits_before: currentCredits,
        credits_after: newBalance,
        source: 'standalone',
      });

      if (!logResult.success) {
        console.error("[Credit Deduction] ❌ Usage logging failed:", logResult.error);
      }
    }

    // Mark this layout as paid for (prevents re-charging on re-download)
    setCreditsDeductedForCurrentLayout(true);

    // Refresh credits to update UI
    await refreshCredits();

    // Close dialog and perform the appropriate download based on pending type
    setShowDownloadConfirmDialog(false);
    
    // Call the appropriate download function based on what was requested
    switch (pendingDownloadType) {
      case 'zip':
        await performAllZipDownload();
        break;
      case 'allPng':
        await performAllPngsDownload();
        break;
      case 'current':
        await performCurrentSheetDownload();
        break;
      case 'single':
      default:
        await performDownload();
        break;
    }

    // Show success with credit info
    toast.success(`Sheet downloaded! ${formatNumber(sqInchesToCharge)} sq.in deducted.`);

    // Clear session after successful download (user's work is complete)
    clearSession(sessionKey).catch(err => console.error('[Session] Failed to clear after download:', err));
  };

  /**
   * Performs the actual file download (no credit logic here)
   */
  const performDownload = async () => {
    // Check memory estimate before export
    const exportEstimate = estimateMemoryUsage(canvasWidthInches, canvasHeightInches, images);

    // Show a gentle toast warning if needed
    if (exportEstimate.shouldShowWarning) {
      const memoryGB = (exportEstimate.totalEstimateMB / 1024).toFixed(1);
      toast.info(`Large layout (~${memoryGB} GB). Export may take a moment.`, {
        duration: 5000,
      });
    }

    try {
      setIsExporting(true);
      toast.info("Generating high-resolution export...");

      // Generate export using standalone utility
      const dataUrl = await generateExport({
        images,
        layout,
        canvasWidthInches,
        canvasHeightInches,
        dpi,
      });

      // Add DPI metadata to PNG for professional print quality
      const pngBlob = await addDpiToPng(dataUrl, dpi);
      const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `gangsheet_${Math.round(canvasWidthInches)}x${Math.round(canvasHeightInches)}in_${dpi}dpi_${date}.png`;
      downloadBlob(pngBlob, filename);

    } catch (error) {
      toast.error("Failed to export print sheet");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // ============================================================================
  // Multi-Sheet Download Handlers
  // ============================================================================

  /**
   * Download only the currently active sheet
   */
  const handleDownloadCurrentSheet = async () => {
    if (!multiSheetResult?.success || !activeSheet) {
      // Fallback to single-sheet export
      handleExport();
      return;
    }

    // Only check for user login in standalone mode
    if (builderMode === "standalone" && !user) {
      toast.error("Please log in to download");
      return;
    }

    // Get current sheet's square inches
    const currentSheetSqInches = canvasWidthInches * activeSheet.heightInches;

    // Credit logic only applies in standalone mode
    if (builderMode === "standalone") {
      if (!creditsDeductedForCurrentLayout && currentSheetSqInches > 0) {
        // For current sheet only, just use the standard flow
        setPendingDownloadType('current');
        setShowDownloadConfirmDialog(true);
        return;
      }
    }

    // Proceed with download
    await performCurrentSheetDownload();
  };

  /**
   * Actually perform the current sheet download (after credits confirmed)
   */
  const performCurrentSheetDownload = async () => {
    if (!multiSheetResult?.success || !activeSheet) {
      await performDownload();
      return;
    }

    setIsExporting(true);
    try {
      const result = await downloadSingleSheet(
        activeSheet,
        images,
        canvasWidthInches,
        dpi,
        activeSheetIndex + 1,
        multiSheetResult.totalSheets
      );

      if (result.success) {
        toast.success(`Sheet ${activeSheetIndex + 1} downloaded!`);
        // Clear session after successful download
        clearSession(sessionKey).catch(err => console.error('[Session] Failed to clear after download:', err));
      } else {
        toast.error(result.error || 'Download failed');
      }
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Download all sheets as individual PNG files
   */
  const handleDownloadAllPngs = async () => {
    if (!multiSheetResult?.success) {
      toast.error("No sheets to download");
      return;
    }

    // Only check for user login in standalone mode
    if (builderMode === "standalone" && !user) {
      toast.error("Please log in to download");
      return;
    }

    const totalSqInches = totalSqInchesUsed ?? 0;

    // Credit logic only applies in standalone mode
    if (builderMode === "standalone") {
      if (!creditsDeductedForCurrentLayout && totalSqInches > 0) {
        setPendingDownloadType('allPng');
        setShowDownloadConfirmDialog(true);
        return;
      }
    }

    // Proceed with download
    await performAllPngsDownload();
  };

  /**
   * Actually perform the all PNGs download (after credits confirmed)
   */
  const performAllPngsDownload = async () => {
    if (!multiSheetResult?.success) return;

    // Initialize progress modal
    const initialProgress: SheetProgress[] = multiSheetResult.sheets.map(sheet => ({
      sheetNumber: sheet.sheetNumber,
      heightInches: sheet.heightInches,
      status: 'pending' as const,
    }));

    setDownloadProgress({
      isOpen: true,
      sheets: initialProgress,
      currentSheet: 0,
      totalSheets: multiSheetResult.totalSheets,
      downloadType: 'png',
    });

    // Note: Don't set isExporting here - we have our own progress modal

    const result = await downloadAllAsPngs(
      multiSheetResult.sheets,
      images,
      canvasWidthInches,
      dpi,
      (sheetNumber, status, error) => {
        setDownloadProgress(prev => ({
          ...prev,
          currentSheet: sheetNumber,
          sheets: prev.sheets.map(s => 
            s.sheetNumber === sheetNumber 
              ? { ...s, status, error } 
              : s
          ),
        }));
      }
    );

    if (result.success) {
      toast.success(`All ${multiSheetResult.totalSheets} sheets downloaded!`);
      // Clear session after successful download
      clearSession(sessionKey).catch(err => console.error('[Session] Failed to clear after download:', err));
    }
  };

  /**
   * Download all sheets as a single ZIP file
   */
  const handleDownloadAllZip = async () => {
    if (!multiSheetResult?.success) {
      toast.error("No sheets to download");
      return;
    }

    // Only check for user login in standalone mode
    if (builderMode === "standalone" && !user) {
      toast.error("Please log in to download");
      return;
    }

    const totalSqInches = totalSqInchesUsed ?? 0;

    // Credit logic only applies in standalone mode
    if (builderMode === "standalone") {
      if (!creditsDeductedForCurrentLayout && totalSqInches > 0) {
        setPendingDownloadType('zip');
        setShowDownloadConfirmDialog(true);
        return;
      }
    }

    // Proceed with download
    await performAllZipDownload();
  };

  /**
   * Actually perform the ZIP download (after credits confirmed)
   */
  const performAllZipDownload = async () => {
    if (!multiSheetResult?.success) return;

    // Initialize progress modal
    const initialProgress: SheetProgress[] = multiSheetResult.sheets.map(sheet => ({
      sheetNumber: sheet.sheetNumber,
      heightInches: sheet.heightInches,
      status: 'pending' as const,
    }));

    setDownloadProgress({
      isOpen: true,
      sheets: initialProgress,
      currentSheet: 0,
      totalSheets: multiSheetResult.totalSheets,
      downloadType: 'zip',
    });

    // Note: Don't set isExporting here - we have our own progress modal

    const result = await downloadAllAsZip(
      multiSheetResult.sheets,
      images,
      canvasWidthInches,
      dpi,
      (sheetNumber, status, error) => {
        setDownloadProgress(prev => ({
          ...prev,
          currentSheet: sheetNumber,
          sheets: prev.sheets.map(s => 
            s.sheetNumber === sheetNumber 
              ? { ...s, status, error } 
              : s
          ),
        }));
      }
    );

    if (result.success) {
      toast.success(`ZIP file with ${multiSheetResult.totalSheets} sheets downloaded!`);
      // Clear session after successful download
      clearSession(sessionKey).catch(err => console.error('[Session] Failed to clear after download:', err));
    }
  };

  /**
   * Close download progress modal
   */
  const handleCloseDownloadProgress = () => {
    setDownloadProgress(prev => ({ ...prev, isOpen: false }));
  };

  // Compute hidden tools based on builder settings (only in public builder mode)
  const hiddenTools = useMemo((): ToolType[] => {
    if (builderMode !== 'public' || !builderSettings) return [];
    const hidden: ToolType[] = [];
    if (builderSettings.image_trim_mode === 'off') hidden.push('trim');
    if (!builderSettings.enable_background_remover) hidden.push('remove-bg');
    return hidden;
  }, [builderMode, builderSettings]);

  return (
    <div className="flex flex-col pb-24 min-h-screen">
      {/* Credit Warning Banner - only show in standalone mode */}
      {builderMode === "standalone" && (
        <div className="px-8 md:px-16 pt-4">
          <CreditWarningBanner credits={getUserCredits()} />
        </div>
      )}

      {/* ============ HERO SECTION ============ */}
      <div className="overflow-hidden">
        {/* Hero Content */}
        <div className="px-8 md:px-16 pt-16 pb-14">
          {/* Headline */}
          <div className="text-center mb-10">
            <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
              Create Your Gang Sheet
            </h1>
            <p className="text-lg text-gray-500 font-medium">
              Upload your designs and generate optimized layouts for DTF printing
            </p>
          </div>

          {/* Upload Bar */}
          <div className="relative z-10 mb-10">
            <UploadBar 
              onImagesAdded={handleImagesAdded} 
              currentImageCount={images.length}
              accentColor={builderSettings?.color_primary || undefined}
              buttonRadius={builderSettings?.button_style === 'pill' ? '9999px' : builderSettings?.button_style === 'square' ? '2px' : undefined}
            />
          </div>

          {/* Toolbox */}
          <div className="relative z-10">
            <Toolbox 
              onToolClick={handleToolClick} 
              hasImages={images.length > 0} 
              variant="default"
              hiddenTools={hiddenTools}
              iconColor={builderSettings?.toolbox_icon_color || undefined}
            />
          </div>
        </div>
      </div>

      {/* ============ UPLOADED IMAGES SECTION ============ */}
      <div className="px-8 md:px-16 pt-8">
        {images.length > 0 ? (
          <div className="mb-8">
            <ImageManager
              images={images}
              onImagesRemoved={handleImagesRemoved}
              onImagesAdded={handleImagesAdded}
              onImageDimensionsChanged={handleImageDimensionsChanged}
              onGenerateLayout={handleGenerateLayout}
              onTrimImage={handleTrimImage}
              onRemoveBackground={handleRemoveBackground}
              onEditImage={handleEditImage}
              canvasWidthInches={canvasWidthInches}
              spacingInches={spacingInches}
              existingDimensions={imageDimensions}
              resolutionThresholds={builderSettings ? {
                optimal: builderSettings.resolution_optimal_dpi,
                good: builderSettings.resolution_good_dpi,
                bad: builderSettings.resolution_bad_dpi,
                terrible: builderSettings.resolution_terrible_dpi,
                hideTerrible: builderSettings.hide_terrible_resolution,
              } : undefined}
              minimumResolutionDpi={
                builderSettings?.disallow_lower_resolution 
                  ? builderSettings.minimum_resolution_dpi 
                  : undefined
              }
              sizeUnit={builderSettings?.size_unit}
              defaultPlacementDpi={builderSettings?.auto_resize_to_300dpi !== false ? 300 : 150}
              primaryColor={builderSettings?.color_primary || undefined}
              cardBackgroundColor={builderSettings?.card_background_color || undefined}
            />
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-full mb-4">
              <svg className="w-10 h-10 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No images uploaded yet</h3>
            <p className="text-gray-400">Upload your designs above to get started</p>
          </div>
        )}
      </div>

      {/* Canvas is rendered inside PreviewModal only when preview is opened */}

      {/* Session Recovery Modal - works for both standalone and public builder */}
      <SessionRecoveryModal
        isOpen={showRecoveryModal}
        metadata={recoveryMetadata}
        isRestoring={isRestoring}
        onRestore={handleRestoreSession}
        onDiscard={handleDiscardSession}
        primaryColor={builderSettings?.color_primary || undefined}
      />

      {/* Insufficient Credits Modal - only show in standalone mode */}
      {builderMode === "standalone" && (
      <Dialog open={showInsufficientCreditsModal} onOpenChange={setShowInsufficientCreditsModal}>
        <DialogContent className="sm:max-w-xl p-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight flex items-center gap-3">
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
              className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-lg font-semibold rounded-full shadow-md hover:shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all duration-200"
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
      )}

      {/* Download Confirmation Dialog - only show in standalone mode */}
      {builderMode === "standalone" && (
      <Dialog open={showDownloadConfirmDialog} onOpenChange={setShowDownloadConfirmDialog}>
        <DialogContent className="sm:max-w-xl p-8">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight">Confirm Download</DialogTitle>
            <DialogDescription className="text-base pt-4">
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  {/* Show different info based on download type */}
                  {(pendingDownloadType === 'zip' || pendingDownloadType === 'allPng') && multiSheetResult?.success && multiSheetResult.totalSheets > 1 ? (
                    <>
                      <p className="text-lg text-gray-600 mb-2">
                        {pendingDownloadType === 'zip' ? 'ZIP download:' : 'All sheets download:'}
                      </p>
                      <p className="text-3xl font-bold text-blue-900">
                        {multiSheetResult.totalSheets} sheets × {canvasWidthInches}" wide
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Total height: {formatNumber(multiSheetResult.sheets.reduce((sum, s) => sum + s.heightInches, 0))}"
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg text-gray-600 mb-2">Sheet dimensions:</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {canvasWidthInches}" × {formatNumber(canvasHeightInches)}"
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-lg text-gray-700">
                    This download will use{" "}
                    <span className="font-bold text-gray-900">
                      {formatNumber(totalSqInchesUsed ?? 0)} sq.inches
                    </span>
                  </p>

                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base text-gray-600">Your current balance:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatNumber(credits)} sq.in
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-base text-gray-600">After download:</span>
                      <span className="text-lg font-semibold text-blue-700">
                        {formatNumber(credits - (totalSqInchesUsed ?? 0))} sq.in
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
              onClick={() => setShowDownloadConfirmDialog(false)}
              disabled={isExporting}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            <Button
              className="h-11 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-lg font-semibold rounded-full shadow-md hover:shadow-[0_8px_24px_rgba(79,70,229,0.35)] transition-all duration-200"
              onClick={handleConfirmDownload}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Confirm & Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* Old Confirm Layout Dialog - Disabled (no longer used) */}
      {/* {pendingLayout && (
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
      )} */}

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

      {/* Edit Image Modal (New Unified Editor) */}
      <EditImageModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        images={images}
        initialTool={editModalInitialTool}
        initialImageId={editModalInitialImageId}
        onEditComplete={handleEditComplete}
      />

      {/* Text Editor Modal */}
      <TextEditorModal
        isOpen={textEditorOpen}
        onClose={() => setTextEditorOpen(false)}
        onAddImage={handleTextImageAdded}
      />

      {/* Preview Modal - Lightweight preview with zoom/pan */}
      <PreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        images={images}
        layout={layout}
        canvasWidthInches={canvasWidthInches}
        canvasHeightInches={canvasHeightInches}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Feature Guide Modal */}
      <Dialog open={showFeatureGuideModal} onOpenChange={setShowFeatureGuideModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-8">
          <DialogHeader className="mb-2">
            <DialogTitle className="font-heading text-2xl font-extrabold tracking-tight flex items-center gap-3">
              <span className="text-3xl">📚</span>
              Feature Guide
            </DialogTitle>
            <DialogDescription className="text-base text-gray-500">
              Learn how to use all the features to create perfect gang sheets
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-6">
            {/* Sheet Width */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">📐</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Sheet Width</h3>
                  <p className="text-base text-gray-500">
                    Set the width of your DTF film roll. Common sizes are 23" for wide format printers and 11" for A3 printers. 
                    The generated layout will match this exact width for perfect printing.
                  </p>
                </div>
              </div>
            </div>

            {/* Spacing */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">📏</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Spacing</h3>
                  <p className="text-base text-gray-500">
                    The gap between images on your sheet. Default is 0.3 inches which works well for most cutting needs. 
                    Increase for easier hand-cutting or decrease to fit more designs.
                  </p>
                </div>
              </div>
            </div>

            {/* Trim */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">✂️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Trim</h3>
                  <p className="text-base text-gray-500">
                    Automatically removes extra transparent or white space around your images. 
                    This helps pack more designs on each sheet and reduces wasted film. 
                    Look for the trim icon on each image card.
                  </p>
                </div>
              </div>
            </div>

            {/* Background Remover */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">🎨</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Background Remover</h3>
                  <p className="text-base text-gray-500">
                    AI-powered tool that removes backgrounds from your images. Perfect for photos or designs 
                    that aren't already on transparent backgrounds. Creates clean, print-ready PNGs.
                  </p>
                </div>
              </div>
            </div>

            {/* Quantities */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">🔢</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Quantities</h3>
                  <p className="text-base text-gray-500">
                    Set how many copies of each design you need. Use the +/- buttons or type a number directly. 
                    The layout algorithm will automatically arrange all copies efficiently.
                  </p>
                </div>
              </div>
            </div>

            {/* Resize */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">↔️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Resize</h3>
                  <p className="text-base text-gray-500">
                    Adjust the print size of each image in inches. Width and height are linked to maintain 
                    aspect ratio. Enter your desired dimensions and the layout will use the new size.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview & Download */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl">⬇️</span>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview & Download</h3>
                  <p className="text-base text-gray-500">
                    After generating your layout, preview it to check placement. When satisfied, 
                    download the high-resolution PNG file ready for printing. The file includes 
                    embedded DPI information for accurate sizing.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              onClick={() => setShowFeatureGuideModal(false)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-6"
            >
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay - Layout Generation */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-lg w-full mx-4 text-center">
            {/* Spinner using primary color */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4" style={{ borderColor: builderSettings?.color_primary ? `${builderSettings.color_primary}20` : '#e0e7ff' }}></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: builderSettings?.color_primary || '#6366f1', borderRightColor: builderSettings?.color_primary || '#6366f1' }}></div>
            </div>
            <h3 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight mb-3">
              Generating Layout...
            </h3>
            <p className="text-lg text-gray-500 mb-4">
              Please wait while we create your optimized layout.
            </p>
            <p className="text-base text-gray-500">
              Do not refresh or close this page
            </p>
          </div>
        </div>
      )}

      {/* Loading Overlay - Export */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-10 shadow-2xl max-w-lg w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-6" style={{ borderBottomColor: builderSettings?.color_primary || '#2563eb' }}></div>
            <h3 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight mb-3">
              Exporting High-Resolution PNG...
            </h3>
            <p className="text-lg text-gray-500 mb-4">
              Creating {dpi} DPI print-ready file.
            </p>
            <p className="text-base text-gray-500">
              This may take 5-15 seconds for large layouts
            </p>
          </div>
        </div>
      )}

      {/* Preview Drawer - only show download in standalone mode */}
      <PreviewDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        images={images}
        layout={layout}
        canvasWidthInches={canvasWidthInches}
        canvasHeightInches={canvasHeightInches}
        onDownload={builderMode === "standalone" ? handleExport : undefined}
        isExporting={isExporting}
        totalSqInchesUsed={totalSqInchesUsed}
        creditsDeductedForCurrentLayout={creditsDeductedForCurrentLayout}
        sheets={sheetTabsData}
        activeSheet={activeSheetIndex + 1}
        onSheetChange={handleSheetChange}
        onDownloadCurrentSheet={builderMode === "standalone" ? handleDownloadCurrentSheet : undefined}
        onDownloadAllPngs={builderMode === "standalone" ? handleDownloadAllPngs : undefined}
        primaryColor={builderSettings?.color_primary || undefined}
      />

      {/* Download Progress Modal */}
      <DownloadProgressModal
        isOpen={downloadProgress.isOpen}
        sheets={downloadProgress.sheets}
        currentSheet={downloadProgress.currentSheet}
        totalSheets={downloadProgress.totalSheets}
        downloadType={downloadProgress.downloadType}
        onClose={handleCloseDownloadProgress}
      />

      {/* Floating Layout Bar - shown in both standalone and public builder modes */}
      <FloatingLayoutBar
        canvasWidthInches={canvasWidthInches}
        onWidthChange={(width) => {
          setCanvasWidthInches(width);
          if (layout.length > 0) {
            setLayout([]);
            setMultiSheetResult(null);
            setCreditsDeductedForCurrentLayout(false);
            toast.info("Sheet width changed. Please regenerate layout.");
          }
        }}
        spacingInches={spacingInches}
        onSpacingChange={(spacing) => {
          setSpacingInches(spacing);
          if (layout.length > 0) {
            setLayout([]);
            setMultiSheetResult(null);
            setCreditsDeductedForCurrentLayout(false);
            toast.info("Spacing changed. Please regenerate layout.");
          }
        }}
        onGenerateLayout={handleGenerateLayout}
        onOpenPreview={() => setIsDrawerOpen(true)}
        imageCount={images.length}
        hasLayout={layout.length > 0}
        isGenerating={isGenerating}
        creditsDisabled={builderMode === "standalone" && getUserCredits() === 0}
        widthReadOnly={builderMode === "public"}
        barColor={builderSettings?.action_bar_color || builderSettings?.color_top_bar || undefined}
        accentColor={builderSettings?.color_primary || undefined}
        buttonRadius={builderSettings?.button_style === 'pill' ? '9999px' : builderSettings?.button_style === 'square' ? '2px' : undefined}
      />
    </div>
  );
};
