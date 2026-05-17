import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";
import { 
  Scissors, 
  Eraser, 
  Sparkles, 
  X, 
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Download,
  Undo2,
  Redo2,
  Sun,
  Contrast,
  Palette,
  Droplets,
  PenTool,
  Circle,
  Trash2,
  Eye,
  EyeOff,
  Pipette,
  Replace,
  CircleDot,
  Square,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  CircleDashed,
} from "lucide-react";
import { PreviewBackgroundToggle, PreviewBackground, getPreviewBackgroundStyle } from "./PreviewBackgroundToggle";

// Import utilities
import {
  detectContentBounds,
  cropImage,
  CropBounds,
  TrimDetectionResult,
} from "@/utils/imageTrimUtils";
import {
  RGBColor,
  ColorWithTolerance,
  removeColorsFromImage,
  generateRemovalPreviewMultiple,
  generateReplacementPreviewMultiple,
  rgbToHex,
  hexToRgb,
} from "@/utils/backgroundRemovalUtils";
import {
  EnhancementSettings,
  defaultEnhancementSettings,
  applyColorAdjustments,
  applyStrokeToCanvas,
  hasChanges,
} from "@/utils/imageEnhancementUtils";
import { generateThumbnail } from "@/utils/thumbnailUtils";
import {
  HalftoneSettings,
  HalftoneAnalysis,
  defaultHalftoneSettings,
  halftonePresets,
  generateHalftonePreview,
  applyPreset,
  strengthToLevels,
  hasHalftoneChanges,
  HalftoneMode,
  DotShape,
} from "@/utils/halftoneUtils";

export type EditTool = "trim" | "flip-rotate" | "remove-bg" | "replace-color" | "enhance" | "stroke" | "eraser" | "halftone";

type UndoEntry = {
  baseBlob: Blob;
  selectedColors: ColorWithTolerance[];
  replacementColor: string;
  enhanceSettings: EnhancementSettings;
  enhanceUndoSaved: boolean;
  eraserCanvasBlob: Blob | null;
  strokeApplied: boolean;
  strokeCanvasBlob: Blob | null;
  halftoneSettings: HalftoneSettings;
  halftoneCanvasBlob: Blob | null;
};

interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageObject[];
  initialTool?: EditTool;
  initialImageId?: string;
  onEditComplete: (editedImages: ImageObject[]) => void;
}

// Custom eyedropper cursor
const EYEDROPPER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 22 1-1h3l9-9'/%3E%3Cpath d='M3 21v-3l9-9'/%3E%3Cpath d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/%3E%3C/svg%3E") 0 24, crosshair`;

const DETECTION_TOLERANCE = 10;

export const EditImageModal: React.FC<EditImageModalProps> = ({
  isOpen,
  onClose,
  images,
  initialTool = "trim",
  initialImageId,
  onEditComplete,
}) => {
  // View state
  const [selectedImageId, setSelectedImageId] = useState<string | null>(initialImageId || null);
  const [activeTool, setActiveTool] = useState<EditTool>(initialTool);
  const [workingUrl, setWorkingUrl] = useState<string>("");
  const [previewBg, setPreviewBg] = useState<PreviewBackground>("transparent");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Track if any changes were made
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Working canvas for current edits
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tempUrlRef = useRef<string | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  
  // Image dimensions
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // ============ TRIM TOOL STATE ============
  const [trimDetection, setTrimDetection] = useState<TrimDetectionResult | null>(null);
  const [trimBounds, setTrimBounds] = useState<CropBounds | null>(null);
  const [detectTransparent, setDetectTransparent] = useState(true);
  const [trimHistory, setTrimHistory] = useState<CropBounds[]>([]);
  const [trimHistoryIndex, setTrimHistoryIndex] = useState(-1);
  // Trim drag handles
  const [trimDragHandle, setTrimDragHandle] = useState<string | null>(null);
  const [trimHoverHandle, setTrimHoverHandle] = useState<string | null>(null);
  const trimDragStartRef = useRef<{ x: number; y: number; bounds: CropBounds } | null>(null);

  // ============ REMOVE BG TOOL STATE ============
  const [selectedColors, setSelectedColors] = useState<ColorWithTolerance[]>([]);
  const [bgPreviewCanvas, setBgPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  // BG replacement color (for replace-color tool)
  const [replacementColor, setReplacementColor] = useState("#ffffff");

  // Helper: is either color tool active?
  const isColorToolActive = activeTool === "remove-bg" || activeTool === "replace-color";

  // ============ COLOR MAGNIFIER STATE ============
  const [hoveredColor, setHoveredColor] = useState<RGBColor | null>(null);
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const magnifierCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const magnifierDisplayRef = useRef<HTMLCanvasElement>(null);

  // ============ ERASER TOOL STATE ============
  const [eraserSize, setEraserSize] = useState(30);
  const [eraserType, setEraserType] = useState<"round-soft" | "round-hard" | "square">("round-hard");
  const [isErasing, setIsErasing] = useState(false);
  const eraserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eraserCursorPos = useRef<{ x: number; y: number } | null>(null);

  // ============ ENHANCE TOOL STATE ============
  const [enhanceSettings, setEnhanceSettings] = useState<EnhancementSettings>(defaultEnhancementSettings);
  const colorAdjustedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ============ STROKE TOOL STATE ============
  const [strokeToolColor, setStrokeToolColor] = useState("#000000");
  const [strokeToolWidth, setStrokeToolWidth] = useState(5);
  const [strokeApplied, setStrokeApplied] = useState(false);
  const [isApplyingStroke, setIsApplyingStroke] = useState(false);
  const strokeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ============ HALFTONE TOOL STATE ============
  const [halftoneSettings, setHalftoneSettings] = useState<HalftoneSettings>(defaultHalftoneSettings);
  const [halftoneAnalysis, setHalftoneAnalysis] = useState<HalftoneAnalysis | null>(null);
  const halftoneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [halftoneMode, setHalftoneMode] = useState<'easy' | 'pro'>('easy');
  const [halftonePresetName, setHalftonePresetName] = useState<string>('Soft hand');
  const [halftoneStrength, setHalftoneStrength] = useState(50);
  const [garmentColor, setGarmentColor] = useState<string | null>(null);

  // ============ PIPELINE STATE (commit-on-switch) ============
  // Refs to capture tool results - persist even when tool state is reset
  const bgResultRef = useRef<HTMLCanvasElement | null>(null);
  const enhanceResultRef = useRef<HTMLCanvasElement | null>(null);
  const strokeResultRef = useRef<HTMLCanvasElement | null>(null);
  const eraserResultRef = useRef<HTMLCanvasElement | null>(null);
  const halftoneResultRef = useRef<HTMLCanvasElement | null>(null);
  // Track previous tool for commit detection
  const prevToolRef = useRef<EditTool>(initialTool);
  // Flag to prevent tool effects from running during commit
  const isCommittingRef = useRef(false);
  // Flag to prevent effects from firing during apply/close
  const isApplyingRef = useRef(false);
  // Canvas holding the last committed result (shown during async commit)
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Track intermediate blob URLs for cleanup on modal close
  const intermediateUrlsRef = useRef<Set<string>>(new Set());

  // ============ UNDO STACK (up to 5 steps, full state capture) ============
  const MAX_UNDO = 5;
  const undoStackRef = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Get selected image
  const selectedImage = images.find(img => img.id === selectedImageId) || null;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedImageId(initialImageId || null);
      setActiveTool(initialTool);
      setHasUnsavedChanges(false);
      setZoomLevel(100);
      // Reset tool states
      resetTrimState();
      resetBgState();
      resetEnhanceState();
      resetStrokeState();
      resetEraserState();
      // Reset pipeline state
      prevToolRef.current = initialTool;
      isCommittingRef.current = false;
      isApplyingRef.current = false;
      bgResultRef.current = null;
      enhanceResultRef.current = null;
      strokeResultRef.current = null;
      eraserResultRef.current = null;
      committedCanvasRef.current = null;
      // Clear stale image refs to prevent flash of previous image
      originalImageRef.current = null as any;
      bgImageRef.current = null;
      originalImageDataRef.current = null;
      workingCanvasRef.current = null;
      setWorkingUrl("");
      setImageSize({ width: 0, height: 0 });
      // Clear the display canvas pixels so old image doesn't linger
      const canvas = displayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;
      }
      // Clear undo stack
      undoStackRef.current = [];
      setCanUndo(false);
    } else {
      // Cleanup temp URL
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
        tempUrlRef.current = null;
      }
      // Cleanup intermediate pipeline URLs
      intermediateUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      intermediateUrlsRef.current.clear();
      // Clear pipeline refs
      bgResultRef.current = null;
      enhanceResultRef.current = null;
      strokeResultRef.current = null;
      eraserResultRef.current = null;
      committedCanvasRef.current = null;
    }
  }, [isOpen, initialImageId, initialTool]);

  // Load image when selection changes
  useEffect(() => {
    if (!isOpen || !selectedImage) return;

    // Get working URL
    let imageUrl = selectedImage.url;
    if (!imageUrl || imageUrl === "") {
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
      }
      imageUrl = URL.createObjectURL(selectedImage.file);
      tempUrlRef.current = imageUrl;
    }
    setWorkingUrl(imageUrl);

    // Load image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      bgImageRef.current = img;
      setImageSize({ width: img.width, height: img.height });

      // Store original image data for BG removal color sampling
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        originalImageDataRef.current = tempCtx.getImageData(0, 0, img.width, img.height);
      }

      // Initialize working canvas
      workingCanvasRef.current = tempCanvas;
    };
    img.onerror = () => {
      toast.error("Failed to load image");
    };
    img.src = imageUrl;

    return () => {
      originalImageDataRef.current = null;
      bgImageRef.current = null;
    };
  }, [isOpen, selectedImage]);

  // Initialize trim detection when tool changes to trim
  useEffect(() => {
    if (isCommittingRef.current || isApplyingRef.current) return;
    if (activeTool !== "trim" || !workingUrl || !selectedImage) return;

    const detect = async () => {
      setIsProcessing(true);
      try {
        const result = await detectContentBounds(workingUrl, DETECTION_TOLERANCE, detectTransparent);
        setTrimDetection(result);
        setTrimBounds(result.bounds);
        setTrimHistory([result.bounds]);
        setTrimHistoryIndex(0);
      } catch (error) {
        console.error("Failed to detect bounds:", error);
        toast.error("Failed to analyze image");
      } finally {
        setIsProcessing(false);
      }
    };

    detect();
  }, [activeTool, workingUrl, detectTransparent, selectedImage]);

  // Reset functions
  const resetTrimState = () => {
    setTrimDetection(null);
    setTrimBounds(null);
    setDetectTransparent(true);
    setTrimHistory([]);
    setTrimHistoryIndex(-1);
    setTrimDragHandle(null);
    setTrimHoverHandle(null);
    trimDragStartRef.current = null;
  };

  const resetBgState = () => {
    setSelectedColors([]);
    setBgPreviewCanvas(null);
    setShowOriginal(false);
    setReplacementColor("#ffffff");
    setShowMagnifier(false);
    setHoveredColor(null);
    setMagnifierPos(null);
  };

  const enhanceUndoSavedRef = useRef(false);

  const resetEnhanceState = () => {
    setEnhanceSettings(defaultEnhancementSettings);
    colorAdjustedCanvasRef.current = null;
    enhanceUndoSavedRef.current = false;
  };

  const resetStrokeState = () => {
    setStrokeToolColor("#000000");
    setStrokeToolWidth(5);
    setStrokeApplied(false);
    setIsApplyingStroke(false);
    strokeCanvasRef.current = null;
  };

  const resetEraserState = () => {
    setEraserSize(30);
    setEraserType("round-hard");
    setIsErasing(false);
    eraserCanvasRef.current = null;
    eraserCursorPos.current = null;
  };

  const resetHalftoneState = () => {
    setHalftoneSettings(defaultHalftoneSettings);
    setHalftoneAnalysis(null);
    setHalftoneStrength(50);
    setHalftonePresetName('Soft hand');
    setGarmentColor(null);
    halftoneCanvasRef.current = null;
  };

  // Calculate display scale
  const getDisplayScale = useCallback(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return 1;
    const maxWidth = 720;
    const maxHeight = 520;
    const scaleX = maxWidth / imageSize.width;
    const scaleY = maxHeight / imageSize.height;
    const baseScale = Math.min(scaleX, scaleY, 1);
    return baseScale * (zoomLevel / 100);
  }, [imageSize, zoomLevel]);

  // Draw display canvas
  const drawDisplayCanvas = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas || !originalImageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = getDisplayScale();
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw background
    // When halftone tool is active and garment color is set, use garment color
    if (activeTool === "halftone" && garmentColor) {
      ctx.fillStyle = garmentColor;
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else if (previewBg === "grey") {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else if (previewBg === "black") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else {
      // Checkered
      const checkerSize = 10;
      for (let y = 0; y < displayHeight; y += checkerSize) {
        for (let x = 0; x < displayWidth; x += checkerSize) {
          const isLight = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
          ctx.fillStyle = isLight ? "#ffffff" : "#e2e8f0";
          ctx.fillRect(x, y, checkerSize, checkerSize);
        }
      }
    }

    // Draw the appropriate image based on tool
    // During commit, show the committed canvas to prevent flicker
    if (isCommittingRef.current && committedCanvasRef.current) {
      ctx.drawImage(committedCanvasRef.current, 0, 0, displayWidth, displayHeight);
    } else if (activeTool === "eraser" && eraserCanvasRef.current) {
      ctx.drawImage(eraserCanvasRef.current, 0, 0, displayWidth, displayHeight);
    } else if ((activeTool === "remove-bg" || activeTool === "replace-color") && bgPreviewCanvas && selectedColors.length > 0 && !showOriginal) {
      ctx.drawImage(bgPreviewCanvas, 0, 0, displayWidth, displayHeight);
    } else if (activeTool === "stroke" && strokeCanvasRef.current && strokeApplied) {
      ctx.drawImage(strokeCanvasRef.current, 0, 0, displayWidth, displayHeight);
    } else if (activeTool === "enhance" && colorAdjustedCanvasRef.current) {
      ctx.drawImage(colorAdjustedCanvasRef.current, 0, 0, displayWidth, displayHeight);
    } else if (activeTool === "halftone" && halftoneCanvasRef.current && !showOriginal) {
      ctx.drawImage(halftoneCanvasRef.current, 0, 0, displayWidth, displayHeight);
    } else {
      ctx.drawImage(originalImageRef.current, 0, 0, displayWidth, displayHeight);
    }

    // Draw trim bounds overlay if in trim mode
    if (activeTool === "trim" && trimBounds && trimDetection) {
      const scaleX = displayWidth / trimDetection.originalWidth;
      const scaleY = displayHeight / trimDetection.originalHeight;

      // Darken outside crop area
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, displayWidth, trimBounds.top * scaleY);
      ctx.fillRect(0, (trimBounds.top + trimBounds.height) * scaleY, displayWidth, displayHeight - (trimBounds.top + trimBounds.height) * scaleY);
      ctx.fillRect(0, trimBounds.top * scaleY, trimBounds.left * scaleX, trimBounds.height * scaleY);
      ctx.fillRect((trimBounds.left + trimBounds.width) * scaleX, trimBounds.top * scaleY, displayWidth - (trimBounds.left + trimBounds.width) * scaleX, trimBounds.height * scaleY);

      // Draw crop border
      ctx.strokeStyle = "#4F46E5";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(trimBounds.left * scaleX, trimBounds.top * scaleY, trimBounds.width * scaleX, trimBounds.height * scaleY);
      ctx.setLineDash([]);

      // Draw 8 drag handles - large squares for easy grabbing
      const handleSize = 10;
      const cornerHandles = [
        { x: trimBounds.left * scaleX, y: trimBounds.top * scaleY },
        { x: (trimBounds.left + trimBounds.width) * scaleX, y: trimBounds.top * scaleY },
        { x: trimBounds.left * scaleX, y: (trimBounds.top + trimBounds.height) * scaleY },
        { x: (trimBounds.left + trimBounds.width) * scaleX, y: (trimBounds.top + trimBounds.height) * scaleY },
      ];
      const edgeHandles = [
        { x: (trimBounds.left + trimBounds.width / 2) * scaleX, y: trimBounds.top * scaleY },
        { x: (trimBounds.left + trimBounds.width / 2) * scaleX, y: (trimBounds.top + trimBounds.height) * scaleY },
        { x: trimBounds.left * scaleX, y: (trimBounds.top + trimBounds.height / 2) * scaleY },
        { x: (trimBounds.left + trimBounds.width) * scaleX, y: (trimBounds.top + trimBounds.height / 2) * scaleY },
      ];

      // Corner handles: larger filled squares
      cornerHandles.forEach(h => {
        ctx.fillStyle = "#4F46E5";
        ctx.fillRect(h.x - handleSize, h.y - handleSize, handleSize * 2, handleSize * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x - handleSize, h.y - handleSize, handleSize * 2, handleSize * 2);
      });

      // Edge handles: slightly smaller filled squares
      const edgeSize = 7;
      edgeHandles.forEach(h => {
        ctx.fillStyle = "#4F46E5";
        ctx.fillRect(h.x - edgeSize, h.y - edgeSize, edgeSize * 2, edgeSize * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.strokeRect(h.x - edgeSize, h.y - edgeSize, edgeSize * 2, edgeSize * 2);
      });
    }
  }, [activeTool, getDisplayScale, imageSize, previewBg, garmentColor, trimBounds, trimDetection, bgPreviewCanvas, selectedColors.length, showOriginal, strokeApplied]);

  // Redraw when relevant state changes
  useEffect(() => {
    drawDisplayCanvas();
  }, [drawDisplayCanvas, zoomLevel, previewBg, garmentColor, trimBounds, bgPreviewCanvas, showOriginal, enhanceSettings, strokeApplied, halftoneSettings]);

  // Ensure canvas is redrawn after processing completes (fixes blank canvas on tool switch)
  const prevProcessingRef = useRef(isProcessing);
  useEffect(() => {
    if (prevProcessingRef.current && !isProcessing) {
      // Processing just finished - redraw to ensure canvas has content
      requestAnimationFrame(() => drawDisplayCanvas());
    }
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, drawDisplayCanvas]);

  // ============ PIPELINE: Commit tool changes when switching tools ============
  // When the user switches to a different tool, bake the current tool's result
  // into a new base image so the next tool operates on the cumulative result.
  useEffect(() => {
    const prevTool = prevToolRef.current;
    prevToolRef.current = activeTool;

    // Skip if same tool, no image, or already committing
    if (prevTool === activeTool || !selectedImage || isCommittingRef.current || isApplyingRef.current) return;

    // Determine if previous tool had changes to commit
    let resultCanvas: HTMLCanvasElement | null = null;

    if ((prevTool === "remove-bg" || prevTool === "replace-color") && bgResultRef.current) {
      resultCanvas = bgResultRef.current;
    } else if (prevTool === "enhance" && enhanceResultRef.current) {
      resultCanvas = enhanceResultRef.current;
    } else if (prevTool === "stroke" && strokeResultRef.current) {
      resultCanvas = strokeResultRef.current;
    } else if (prevTool === "eraser" && eraserResultRef.current) {
      resultCanvas = eraserResultRef.current;
    } else if (prevTool === "halftone" && halftoneResultRef.current) {
      resultCanvas = halftoneResultRef.current;
    }
    // Trim doesn't produce a live canvas - it only crops on Apply

    if (!resultCanvas) return;

    // Save undo state before baking changes into base
    saveUndoState();

    // Start commit - block tool effects during async bake
    isCommittingRef.current = true;
    // Store the result canvas so drawDisplayCanvas can show it during commit
    committedCanvasRef.current = resultCanvas;
    // Redraw immediately to show committed canvas (prevents flicker)
    drawDisplayCanvas();

    resultCanvas.toBlob((blob) => {
      if (!blob) {
        isCommittingRef.current = false;
        committedCanvasRef.current = null;
        return;
      }

      const newUrl = URL.createObjectURL(blob);
      intermediateUrlsRef.current.add(newUrl);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Update base image refs to the committed result
        originalImageRef.current = img;
        bgImageRef.current = img;
        setImageSize({ width: img.width, height: img.height });

        // Update pixel data for BG removal color sampling
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          originalImageDataRef.current = ctx.getImageData(0, 0, img.width, img.height);
        }
        workingCanvasRef.current = tempCanvas;

        // Update working URL (triggers tool effects for the new active tool)
        setWorkingUrl(newUrl);
        setHasUnsavedChanges(true);

        // Clear tool-specific results (changes are now baked into the base)
        bgResultRef.current = null;
        enhanceResultRef.current = null;
        strokeResultRef.current = null;
        eraserResultRef.current = null;
        halftoneResultRef.current = null;

        if (prevTool === "remove-bg" || prevTool === "replace-color") {
          setSelectedColors([]);
          setBgPreviewCanvas(null);
          setShowOriginal(false);
        } else if (prevTool === "enhance") {
          setEnhanceSettings(defaultEnhancementSettings);
          colorAdjustedCanvasRef.current = null;
        } else if (prevTool === "stroke") {
          setStrokeApplied(false);
          setIsApplyingStroke(false);
          strokeCanvasRef.current = null;
        } else if (prevTool === "eraser") {
          eraserCanvasRef.current = null;
        } else if (prevTool === "halftone") {
          resetHalftoneState();
        }

        // End commit
        isCommittingRef.current = false;
        committedCanvasRef.current = null;
      };
      img.onerror = () => {
        isCommittingRef.current = false;
        committedCanvasRef.current = null;
      };
      img.src = newUrl;
    }, "image/png");
  }, [activeTool, selectedImage]);

  // Color removal/replacement preview generation
  useEffect(() => {
    // Skip during pipeline commit
    if (isCommittingRef.current || isApplyingRef.current) return;
    // Only process when a color tool is active
    if (activeTool !== "remove-bg" && activeTool !== "replace-color") return;

    if (selectedColors.length === 0 || !workingUrl) {
      setBgPreviewCanvas(null);
      bgResultRef.current = null;
      return;
    }

    const debounce = setTimeout(async () => {
      setIsProcessing(true);
      try {
        let preview: HTMLCanvasElement;
        if (activeTool === "replace-color") {
          const replColor = hexToRgb(replacementColor);
          if (replColor) {
            preview = await generateReplacementPreviewMultiple(workingUrl, selectedColors, replColor);
          } else {
            preview = await generateRemovalPreviewMultiple(workingUrl, selectedColors);
          }
        } else {
          preview = await generateRemovalPreviewMultiple(workingUrl, selectedColors);
        }
        setBgPreviewCanvas(preview);
        bgResultRef.current = preview;
        setHasUnsavedChanges(true);
      } catch (error) {
        console.error("Failed to generate preview:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 100);

    return () => clearTimeout(debounce);
  }, [activeTool, selectedColors, workingUrl, replacementColor]);

  // Enhance preview generation
  useEffect(() => {
    // Skip during pipeline commit
    if (isCommittingRef.current || isApplyingRef.current) return;
    if (activeTool !== "enhance" || !workingUrl || imageSize.width === 0) return;

    const debounce = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const colorCanvas = await applyColorAdjustments(workingUrl, enhanceSettings);
        colorAdjustedCanvasRef.current = colorCanvas;
        enhanceResultRef.current = colorCanvas;

        if (hasChanges(enhanceSettings)) {
          setHasUnsavedChanges(true);
        }

        drawDisplayCanvas();
      } catch (error) {
        console.error("Enhancement failed:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 100);

    return () => { clearTimeout(debounce); };
  }, [activeTool, workingUrl, imageSize.width, enhanceSettings]);

  // Halftone preview generation
  useEffect(() => {
    if (isCommittingRef.current || isApplyingRef.current) return;
    if (activeTool !== "halftone" || !workingUrl || imageSize.width === 0) return;

    const debounce = setTimeout(async () => {
      setIsProcessing(true);
      try {
        const { canvas, analysis } = await generateHalftonePreview(workingUrl, halftoneSettings);
        halftoneCanvasRef.current = canvas;
        halftoneResultRef.current = canvas;
        setHalftoneAnalysis(analysis);

        if (hasHalftoneChanges(halftoneSettings)) {
          setHasUnsavedChanges(true);
        }

        drawDisplayCanvas();
      } catch (error) {
        console.error("Halftone generation failed:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 150);

    return () => { clearTimeout(debounce); };
  }, [activeTool, workingUrl, imageSize.width, halftoneSettings]);

  // ============ ERASER: Initialize eraser canvas when switching to eraser ============
  useEffect(() => {
    if (isCommittingRef.current || isApplyingRef.current) return;
    if (activeTool !== "eraser" || !originalImageRef.current || imageSize.width === 0) return;

    // Create eraser canvas from current base image
    if (!eraserCanvasRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = originalImageRef.current.naturalWidth;
      canvas.height = originalImageRef.current.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(originalImageRef.current, 0, 0);
      }
      eraserCanvasRef.current = canvas;
      eraserResultRef.current = canvas;
      drawDisplayCanvas();
    }
  }, [activeTool, imageSize.width]);

  // ============ ERASER: Paint function ============
  const eraseAtPoint = useCallback((imgX: number, imgY: number) => {
    const canvas = eraserCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    const halfSize = eraserSize / 2;
    if (eraserType === "square") {
      ctx.fillRect(imgX - halfSize, imgY - halfSize, eraserSize, eraserSize);
    } else if (eraserType === "round-hard") {
      ctx.beginPath();
      ctx.arc(imgX, imgY, halfSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // round-soft: gradient from center
      const gradient = ctx.createRadialGradient(imgX, imgY, 0, imgX, imgY, halfSize);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(0.7, "rgba(0,0,0,0.8)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(imgX - halfSize, imgY - halfSize, eraserSize, eraserSize);
    }

    ctx.restore();
    eraserResultRef.current = canvas;
    setHasUnsavedChanges(true);
    drawDisplayCanvas();
  }, [eraserSize, eraserType, drawDisplayCanvas]);

  // ============ MAGNIFIER: Render zoomed pixel loupe ============
  const MAGNIFIER_SIZE = 140;
  const MAGNIFIER_PIXELS = 11; // source pixels across (odd number for center)
  const PIXEL_SIZE = MAGNIFIER_SIZE / MAGNIFIER_PIXELS;

  const renderMagnifier = useCallback((imgX: number, imgY: number) => {
    if (!originalImageDataRef.current) return;

    // Create or reuse magnifier canvas
    if (!magnifierCanvasRef.current) {
      magnifierCanvasRef.current = document.createElement("canvas");
    }
    const magCanvas = magnifierCanvasRef.current;
    magCanvas.width = MAGNIFIER_SIZE;
    magCanvas.height = MAGNIFIER_SIZE;
    const ctx = magCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = originalImageDataRef.current;
    const w = imageSize.width;
    const h = imageSize.height;
    const half = Math.floor(MAGNIFIER_PIXELS / 2);

    // Draw each pixel as a zoomed square
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = imgX + dx;
        const py = imgY + dy;

        if (px >= 0 && px < w && py >= 0 && py < h) {
          const idx = (py * w + px) * 4;
          const r = imgData.data[idx];
          const g = imgData.data[idx + 1];
          const b = imgData.data[idx + 2];
          const a = imgData.data[idx + 3];

          if (a < 255) {
            // Draw checkerboard for transparent pixels
            const cx = (dx + half) * PIXEL_SIZE;
            const cy = (dy + half) * PIXEL_SIZE;
            const checkerSize = PIXEL_SIZE / 2;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(cx, cy, PIXEL_SIZE, PIXEL_SIZE);
            ctx.fillStyle = "#d1d5db";
            ctx.fillRect(cx, cy, checkerSize, checkerSize);
            ctx.fillRect(cx + checkerSize, cy + checkerSize, checkerSize, checkerSize);
            if (a > 0) {
              ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
              ctx.fillRect(cx, cy, PIXEL_SIZE, PIXEL_SIZE);
            }
          } else {
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(
              (dx + half) * PIXEL_SIZE,
              (dy + half) * PIXEL_SIZE,
              PIXEL_SIZE,
              PIXEL_SIZE
            );
          }
        } else {
          // Out of bounds — draw light grey
          ctx.fillStyle = "#f1f5f9";
          ctx.fillRect(
            (dx + half) * PIXEL_SIZE,
            (dy + half) * PIXEL_SIZE,
            PIXEL_SIZE,
            PIXEL_SIZE
          );
        }
      }
    }

    // Draw subtle grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= MAGNIFIER_PIXELS; i++) {
      const pos = i * PIXEL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, MAGNIFIER_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(MAGNIFIER_SIZE, pos);
      ctx.stroke();
    }

    // Highlight center pixel with border
    const centerX = half * PIXEL_SIZE;
    const centerY = half * PIXEL_SIZE;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX + 1, centerY + 1, PIXEL_SIZE - 2, PIXEL_SIZE - 2);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(centerX, centerY, PIXEL_SIZE, PIXEL_SIZE);

    // Copy to visible display canvas
    const displayEl = magnifierDisplayRef.current;
    if (displayEl) {
      displayEl.width = MAGNIFIER_SIZE;
      displayEl.height = MAGNIFIER_SIZE;
      const dCtx = displayEl.getContext("2d");
      if (dCtx) {
        dCtx.drawImage(magCanvas, 0, 0);
      }
    }
  }, [imageSize]);

  // ============ MAGNIFIER: Canvas mousemove handler ============
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = getDisplayScale();
    const imgX = Math.floor(x / scale);
    const imgY = Math.floor(y / scale);

    // Color magnifier for color tools
    if (isColorToolActive && originalImageDataRef.current) {
      if (imgX >= 0 && imgX < imageSize.width && imgY >= 0 && imgY < imageSize.height) {
        const data = originalImageDataRef.current.data;
        const idx = (imgY * imageSize.width + imgX) * 4;
        setHoveredColor({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
        setMagnifierPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setShowMagnifier(true);
        // Render zoomed pixel loupe
        renderMagnifier(imgX, imgY);
      } else {
        setShowMagnifier(false);
      }
    }

    // Eraser painting while dragging + cursor tracking
    if (activeTool === "eraser") {
      setMagnifierPos({ x, y });
      if (isErasing) {
        eraseAtPoint(imgX, imgY);
      }
    }

    // Trim handle dragging
    if (activeTool === "trim" && trimDragHandle && trimDragStartRef.current && trimDetection) {
      const startBounds = trimDragStartRef.current.bounds;
      const dx = imgX - Math.floor(trimDragStartRef.current.x / scale);
      const dy = imgY - Math.floor(trimDragStartRef.current.y / scale);
      const maxW = trimDetection.originalWidth;
      const maxH = trimDetection.originalHeight;

      let newBounds = { ...startBounds };

      if (trimDragHandle.includes("t")) {
        const newTop = Math.max(0, Math.min(startBounds.top + dy, startBounds.top + startBounds.height - 20));
        newBounds.height = startBounds.height - (newTop - startBounds.top);
        newBounds.top = newTop;
      }
      if (trimDragHandle.includes("b")) {
        newBounds.height = Math.max(20, Math.min(startBounds.height + dy, maxH - startBounds.top));
      }
      if (trimDragHandle.includes("l")) {
        const newLeft = Math.max(0, Math.min(startBounds.left + dx, startBounds.left + startBounds.width - 20));
        newBounds.width = startBounds.width - (newLeft - startBounds.left);
        newBounds.left = newLeft;
      }
      if (trimDragHandle.includes("r")) {
        newBounds.width = Math.max(20, Math.min(startBounds.width + dx, maxW - startBounds.left));
      }

      setTrimBounds(newBounds);
      setHasUnsavedChanges(true);
    }

    // Trim: detect handle hover for cursor changes
    if (activeTool === "trim" && trimBounds && trimDetection && !trimDragHandle) {
      const hitSize = 18;
      const handlePositions: { name: string; cx: number; cy: number }[] = [
        { name: "tl", cx: trimBounds.left * scale, cy: trimBounds.top * scale },
        { name: "tr", cx: (trimBounds.left + trimBounds.width) * scale, cy: trimBounds.top * scale },
        { name: "bl", cx: trimBounds.left * scale, cy: (trimBounds.top + trimBounds.height) * scale },
        { name: "br", cx: (trimBounds.left + trimBounds.width) * scale, cy: (trimBounds.top + trimBounds.height) * scale },
        { name: "t", cx: (trimBounds.left + trimBounds.width / 2) * scale, cy: trimBounds.top * scale },
        { name: "b", cx: (trimBounds.left + trimBounds.width / 2) * scale, cy: (trimBounds.top + trimBounds.height) * scale },
        { name: "l", cx: trimBounds.left * scale, cy: (trimBounds.top + trimBounds.height / 2) * scale },
        { name: "r", cx: (trimBounds.left + trimBounds.width) * scale, cy: (trimBounds.top + trimBounds.height / 2) * scale },
      ];
      let found: string | null = null;
      for (const h of handlePositions) {
        if (Math.abs(x - h.cx) < hitSize && Math.abs(y - h.cy) < hitSize) {
          found = h.name;
          break;
        }
      }
      setTrimHoverHandle(found);
    }
  }, [activeTool, getDisplayScale, imageSize, isErasing, eraseAtPoint, renderMagnifier, trimDragHandle, trimDetection, trimBounds]);

  const handleCanvasMouseLeave = useCallback(() => {
    setShowMagnifier(false);
    setMagnifierPos(null);
    if (isErasing) setIsErasing(false);
    setTrimHoverHandle(null);
    if (trimDragHandle) {
      setTrimDragHandle(null);
      trimDragStartRef.current = null;
    }
  }, [isErasing, trimDragHandle]);

  // ============ CANVAS: Unified mousedown handler ============
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scale = getDisplayScale();
    const imgX = Math.floor(x / scale);
    const imgY = Math.floor(y / scale);

    // Eraser: start erasing
    if (activeTool === "eraser") {
      saveUndoState();
      setIsErasing(true);
      eraseAtPoint(imgX, imgY);
      return;
    }

    // Trim: check if clicking on a handle
    if (activeTool === "trim" && trimBounds && trimDetection) {
      const scaleX = scale;
      const scaleY = scale;
      const hitSize = 18; // generous hit area for easy grabbing

      const handles: { name: string; cx: number; cy: number }[] = [
        { name: "tl", cx: trimBounds.left * scaleX, cy: trimBounds.top * scaleY },
        { name: "tr", cx: (trimBounds.left + trimBounds.width) * scaleX, cy: trimBounds.top * scaleY },
        { name: "bl", cx: trimBounds.left * scaleX, cy: (trimBounds.top + trimBounds.height) * scaleY },
        { name: "br", cx: (trimBounds.left + trimBounds.width) * scaleX, cy: (trimBounds.top + trimBounds.height) * scaleY },
        { name: "t", cx: (trimBounds.left + trimBounds.width / 2) * scaleX, cy: trimBounds.top * scaleY },
        { name: "b", cx: (trimBounds.left + trimBounds.width / 2) * scaleX, cy: (trimBounds.top + trimBounds.height) * scaleY },
        { name: "l", cx: trimBounds.left * scaleX, cy: (trimBounds.top + trimBounds.height / 2) * scaleY },
        { name: "r", cx: (trimBounds.left + trimBounds.width) * scaleX, cy: (trimBounds.top + trimBounds.height / 2) * scaleY },
      ];

      for (const h of handles) {
        if (Math.abs(x - h.cx) < hitSize && Math.abs(y - h.cy) < hitSize) {
          setTrimDragHandle(h.name);
          trimDragStartRef.current = { x, y, bounds: { ...trimBounds } };
          return;
        }
      }
    }
  }, [activeTool, getDisplayScale, trimBounds, trimDetection, eraseAtPoint]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isErasing) setIsErasing(false);
    if (trimDragHandle) {
      setTrimDragHandle(null);
      trimDragStartRef.current = null;
    }
  }, [isErasing, trimDragHandle]);

  // Handle color pick for BG removal (click to select color)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isColorToolActive || !originalImageDataRef.current) return;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scale = getDisplayScale();
    const imgX = Math.floor(x / scale);
    const imgY = Math.floor(y / scale);

    if (imgX < 0 || imgX >= imageSize.width || imgY < 0 || imgY >= imageSize.height) return;

    const data = originalImageDataRef.current.data;
    const idx = (imgY * imageSize.width + imgX) * 4;
    const color: RGBColor = {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
    };

    // Check if color already selected
    const exists = selectedColors.some(
      (c) => c.color.r === color.r && c.color.g === color.g && c.color.b === color.b
    );

    if (!exists && selectedColors.length < 10) {
      saveUndoState();
      setSelectedColors([...selectedColors, { color, tolerance: 30 }]);
    }
  };

  // Handle zoom
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 600));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoomLevel(100);

  // Handle apply - save changes and close
  const handleApply = async () => {
    if (!selectedImage || !hasUnsavedChanges) {
      onClose();
      return;
    }

    setIsProcessing(true);
    isApplyingRef.current = true;

    try {
      let resultCanvas: HTMLCanvasElement | null = null;

      if (activeTool === "trim" && trimBounds && trimDetection) {
        // Apply trim - cropImage returns {url, file} not a canvas
        const trimResult = await cropImage(workingUrl, trimBounds, selectedImage.file.name);
        // Convert to canvas for unified pipeline
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error("Failed to load trimmed image"));
          i.src = trimResult.url;
        });
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const cx = c.getContext("2d");
        if (cx) cx.drawImage(img, 0, 0);
        resultCanvas = c;
        URL.revokeObjectURL(trimResult.url);
      } else if ((activeTool === "remove-bg" || activeTool === "replace-color") && bgPreviewCanvas) {
        resultCanvas = bgPreviewCanvas;
      } else if (activeTool === "enhance") {
        resultCanvas = colorAdjustedCanvasRef.current;
      } else if (activeTool === "stroke" && strokeCanvasRef.current) {
        resultCanvas = strokeCanvasRef.current;
      } else if (activeTool === "eraser" && eraserCanvasRef.current) {
        resultCanvas = eraserCanvasRef.current;
      } else if (activeTool === "halftone" && halftoneCanvasRef.current) {
        resultCanvas = halftoneCanvasRef.current;
      }

      // Pipeline fallback: if current tool has no specific result but we have
      // committed changes from previous tools, use the current base image
      if (!resultCanvas && hasUnsavedChanges && originalImageRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = originalImageRef.current.naturalWidth;
        canvas.height = originalImageRef.current.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(originalImageRef.current, 0, 0);
          resultCanvas = canvas;
        }
      }

      if (resultCanvas) {
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          resultCanvas!.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        });

        // Create new file and URL
        const newFile = new File([blob], selectedImage.file.name, { type: "image/png" });
        const newUrl = URL.createObjectURL(blob);
        const newThumbnail = await generateThumbnail(blob, 300);

        // Create updated image object
        const updatedImage: ImageObject = {
          ...selectedImage,
          file: newFile,
          url: newUrl,
          thumbnailUrl: newThumbnail,
          originalWidth: activeTool === "trim" ? selectedImage.originalWidth || imageSize.width : selectedImage.originalWidth,
          originalHeight: activeTool === "trim" ? selectedImage.originalHeight || imageSize.height : selectedImage.originalHeight,
        };

        // Revoke old URLs
        if (selectedImage.url && selectedImage.url !== newUrl) {
          URL.revokeObjectURL(selectedImage.url);
        }
        if (selectedImage.thumbnailUrl && selectedImage.thumbnailUrl !== newThumbnail) {
          URL.revokeObjectURL(selectedImage.thumbnailUrl);
        }

        onEditComplete([updatedImage]);
        toast.success("Changes applied successfully");
      }
    } catch (error) {
      console.error("Failed to apply changes:", error);
      toast.error("Failed to apply changes");
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  // Update enhance settings
  const updateEnhanceSetting = <K extends keyof EnhancementSettings>(
    key: K,
    value: EnhancementSettings[K]
  ) => {
    // Save undo once per enhance session (first slider touch)
    if (!enhanceUndoSavedRef.current) {
      enhanceUndoSavedRef.current = true;
      saveUndoState();
    }
    setEnhanceSettings((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  // ============ STROKE TOOL: Update settings and apply ============
  const handleApplyStroke = async () => {
    if (!originalImageRef.current) return;

    saveUndoState();
    setIsApplyingStroke(true);
    try {
      // Create canvas from current base image
      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = originalImageRef.current.naturalWidth;
      baseCanvas.height = originalImageRef.current.naturalHeight;
      const baseCtx = baseCanvas.getContext("2d");
      if (baseCtx) {
        baseCtx.drawImage(originalImageRef.current, 0, 0);
      }

      const stroked = await applyStrokeToCanvas(
        baseCanvas,
        strokeToolColor,
        strokeToolWidth
      );
      strokeCanvasRef.current = stroked;
      strokeResultRef.current = stroked;
      setStrokeApplied(true);
      setHasUnsavedChanges(true);
      drawDisplayCanvas();
    } catch (error) {
      console.error("Failed to apply stroke:", error);
      toast.error("Failed to apply stroke");
    } finally {
      setIsApplyingStroke(false);
    }
  };

  // ============ HELPERS: Canvas/Blob conversion ============
  const canvasToBlob = (canvas: HTMLCanvasElement | null): Promise<Blob | null> => {
    if (!canvas) return Promise.resolve(null);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const blobToImage = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image from blob"));
      };
      img.src = url;
    });
  };

  // ============ UNDO: Capture full editing state ============
  const saveUndoState = useCallback(() => {
    if (!originalImageRef.current) return;

    const capturedColors = selectedColors.map(c => ({
      color: { ...c.color },
      tolerance: c.tolerance,
    }));
    const capturedReplacementColor = replacementColor;
    const capturedEnhanceSettings = { ...enhanceSettings };
    const capturedEnhanceUndoSaved = enhanceUndoSavedRef.current;
    const capturedStrokeApplied = strokeApplied;
    const eraserCanvas = eraserCanvasRef.current;
    const strokeCanvas = strokeCanvasRef.current;
    const capturedHalftoneSettings = { ...halftoneSettings };
    const halftoneCanvas = halftoneCanvasRef.current;

    const img = originalImageRef.current;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    Promise.all([
      canvasToBlob(c),
      canvasToBlob(eraserCanvas),
      capturedStrokeApplied ? canvasToBlob(strokeCanvas) : Promise.resolve(null),
      canvasToBlob(halftoneCanvas),
    ]).then(([baseBlob, eraserBlob, strokeBlob, halftoneBlob]) => {
      if (!baseBlob) return;

      const entry: UndoEntry = {
        baseBlob,
        selectedColors: capturedColors,
        replacementColor: capturedReplacementColor,
        enhanceSettings: capturedEnhanceSettings,
        enhanceUndoSaved: capturedEnhanceUndoSaved,
        eraserCanvasBlob: eraserBlob,
        strokeApplied: capturedStrokeApplied,
        strokeCanvasBlob: strokeBlob,
        halftoneSettings: capturedHalftoneSettings,
        halftoneCanvasBlob: halftoneBlob,
      };

      const stack = undoStackRef.current;
      stack.push(entry);
      if (stack.length > MAX_UNDO) stack.shift();
      undoStackRef.current = stack;
      setCanUndo(true);
    });
  }, [selectedColors, replacementColor, enhanceSettings, strokeApplied, halftoneSettings]);

  // ============ FLIP/ROTATE: Apply transform to base image ============
  type TransformType = "flip-h" | "flip-v" | "rotate-cw" | "rotate-ccw" | "rotate-180";

  const applyTransform = useCallback(async (type: TransformType) => {
    if (!originalImageRef.current) return;

    saveUndoState();
    setIsProcessing(true);

    try {
      const img = originalImageRef.current;
      const sw = img.naturalWidth;
      const sh = img.naturalHeight;

      // Determine output dimensions (rotations swap w/h)
      const isRotate90 = type === "rotate-cw" || type === "rotate-ccw";
      const outW = isRotate90 ? sh : sw;
      const outH = isRotate90 ? sw : sh;

      const c = document.createElement("canvas");
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext("2d");
      if (!ctx) return;

      ctx.save();
      switch (type) {
        case "flip-h":
          ctx.translate(outW, 0);
          ctx.scale(-1, 1);
          break;
        case "flip-v":
          ctx.translate(0, outH);
          ctx.scale(1, -1);
          break;
        case "rotate-cw":
          ctx.translate(outW, 0);
          ctx.rotate(Math.PI / 2);
          break;
        case "rotate-ccw":
          ctx.translate(0, outH);
          ctx.rotate(-Math.PI / 2);
          break;
        case "rotate-180":
          ctx.translate(outW, outH);
          ctx.rotate(Math.PI);
          break;
      }
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      // Convert to blob → URL → Image
      const blob = await canvasToBlob(c);
      if (!blob) return;
      const newUrl = URL.createObjectURL(blob);
      intermediateUrlsRef.current.add(newUrl);

      const newImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Transform failed"));
        i.src = newUrl;
      });

      // Update base refs
      originalImageRef.current = newImg;
      bgImageRef.current = newImg;
      setImageSize({ width: outW, height: outH });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = outW;
      tempCanvas.height = outH;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.drawImage(newImg, 0, 0);
        originalImageDataRef.current = tempCtx.getImageData(0, 0, outW, outH);
      }
      workingCanvasRef.current = tempCanvas;
      setWorkingUrl(newUrl);

      // Reset other tool states since base image changed
      resetTrimState();
      resetBgState();
      resetEnhanceState();
      resetStrokeState();
      resetEraserState();
      bgResultRef.current = null;
      enhanceResultRef.current = null;
      strokeResultRef.current = null;
      eraserResultRef.current = null;

      setHasUnsavedChanges(true);

      const labels: Record<TransformType, string> = {
        "flip-h": "Flipped horizontal",
        "flip-v": "Flipped vertical",
        "rotate-cw": "Rotated 90° CW",
        "rotate-ccw": "Rotated 90° CCW",
        "rotate-180": "Rotated 180°",
      };
      toast.success(labels[type]);
    } catch (error) {
      console.error("Transform failed:", error);
      toast.error("Transform failed");
    } finally {
      setIsProcessing(false);
    }
  }, [saveUndoState]);

  // ============ UNDO: Pop and restore full state ============

  const performUndo = useCallback(async () => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;

    const entry = stack.pop()!;
    undoStackRef.current = stack;
    setCanUndo(stack.length > 0);

    setIsProcessing(true);
    try {
      // Load base image from blob
      const img = await blobToImage(entry.baseBlob);

      // Create a fresh URL for workingUrl
      const newUrl = URL.createObjectURL(entry.baseBlob);
      intermediateUrlsRef.current.add(newUrl);

      // Reset all tool states and pipeline refs
      resetTrimState();
      resetBgState();
      resetEnhanceState();
      resetStrokeState();
      resetEraserState();
      resetHalftoneState();
      bgResultRef.current = null;
      enhanceResultRef.current = null;
      strokeResultRef.current = null;
      eraserResultRef.current = null;
      halftoneResultRef.current = null;
      committedCanvasRef.current = null;

      // Rebuild base image refs
      originalImageRef.current = img;
      bgImageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        originalImageDataRef.current = tempCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      }
      workingCanvasRef.current = tempCanvas;
      setWorkingUrl(newUrl);

      // Restore color tool state
      setSelectedColors(entry.selectedColors);
      setReplacementColor(entry.replacementColor);

      // Restore enhance state
      setEnhanceSettings(entry.enhanceSettings);
      enhanceUndoSavedRef.current = entry.enhanceUndoSaved;

      // Restore eraser canvas if present
      if (entry.eraserCanvasBlob) {
        const eraserImg = await blobToImage(entry.eraserCanvasBlob);
        const ec = document.createElement("canvas");
        ec.width = eraserImg.naturalWidth;
        ec.height = eraserImg.naturalHeight;
        const ectx = ec.getContext("2d");
        if (ectx) ectx.drawImage(eraserImg, 0, 0);
        eraserCanvasRef.current = ec;
        eraserResultRef.current = ec;
      }

      // Restore stroke canvas if it was applied
      if (entry.strokeApplied && entry.strokeCanvasBlob) {
        const strokeImg = await blobToImage(entry.strokeCanvasBlob);
        const sc = document.createElement("canvas");
        sc.width = strokeImg.naturalWidth;
        sc.height = strokeImg.naturalHeight;
        const sctx = sc.getContext("2d");
        if (sctx) sctx.drawImage(strokeImg, 0, 0);
        strokeCanvasRef.current = sc;
        strokeResultRef.current = sc;
        setStrokeApplied(true);
      }

      // Restore halftone state
      setHalftoneSettings(entry.halftoneSettings);
      if (entry.halftoneCanvasBlob) {
        const htImg = await blobToImage(entry.halftoneCanvasBlob);
        const hc = document.createElement("canvas");
        hc.width = htImg.naturalWidth;
        hc.height = htImg.naturalHeight;
        const hctx = hc.getContext("2d");
        if (hctx) hctx.drawImage(htImg, 0, 0);
        halftoneCanvasRef.current = hc;
        halftoneResultRef.current = hc;
      } else {
        halftoneCanvasRef.current = null;
        halftoneResultRef.current = null;
        setHalftoneAnalysis(null);
      }

      setHasUnsavedChanges(true);
      toast.success(`Undo applied (${stack.length} left)`);
    } catch (error) {
      console.error("Undo failed:", error);
      toast.error("Undo failed");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ============ INLINE TRIM: Apply trim without closing modal ============
  const handleApplyTrimInline = useCallback(async () => {
    if (!trimBounds || !trimDetection || !workingUrl || !selectedImage) return;

    // Save undo state before trim
    saveUndoState();
    setIsProcessing(true);
    try {
      const trimResult = await cropImage(workingUrl, trimBounds, selectedImage.file.name);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Failed to load trimmed image"));
        i.src = trimResult.url;
      });

      // Update base image refs
      originalImageRef.current = img;
      bgImageRef.current = img;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.naturalWidth;
      tempCanvas.height = img.naturalHeight;
      const ctx = tempCanvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        originalImageDataRef.current = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
      }
      workingCanvasRef.current = tempCanvas;

      // Update working URL
      intermediateUrlsRef.current.add(trimResult.url);
      setWorkingUrl(trimResult.url);

      // Reset trim state for fresh detection
      setTrimDetection(null);
      setTrimBounds(null);
      setTrimHistory([]);
      setTrimHistoryIndex(-1);
      setHasUnsavedChanges(true);

      toast.success("Trim applied");
    } catch (error) {
      console.error("Failed to apply trim:", error);
      toast.error("Failed to apply trim");
    } finally {
      setIsProcessing(false);
    }
  }, [trimBounds, trimDetection, workingUrl, selectedImage, saveUndoState]);

  // ============ KEYBOARD: Ctrl+Z for undo ============
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) performUndo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, canUndo, performUndo]);

  // Image picker view
  if (!selectedImageId) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
              {initialTool === "trim" && <Scissors className="w-5 h-5 text-indigo-600" />}
              {initialTool === "flip-rotate" && <RotateCw className="w-5 h-5 text-sky-600" />}
              {(initialTool === "remove-bg" || initialTool === "replace-color") && <Pipette className="w-5 h-5 text-purple-600" />}
              {initialTool === "enhance" && <Sparkles className="w-5 h-5 text-amber-600" />}
              {initialTool === "stroke" && <PenTool className="w-5 h-5 text-indigo-600" />}
              Select an image to edit
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500 mb-4">
              Choose an image to {initialTool === "trim" ? "trim" : initialTool === "flip-rotate" ? "transform" : (initialTool === "remove-bg" || initialTool === "replace-color") ? "edit colors" : initialTool === "stroke" ? "add stroke to" : "enhance"}:
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto p-1">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageId(image.id)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all group"
                >
                  <img
                    src={image.thumbnailUrl || image.url}
                    alt={image.file.name}
                    className="w-full h-full object-contain bg-gray-100"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="text-xs text-white truncate">{image.file.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Edit view
  const displayWidth = imageSize.width * getDisplayScale();
  const displayHeight = imageSize.height * getDisplayScale();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[85vw] max-h-[95vh] overflow-hidden p-0 [&>button[class*='absolute']]:hidden">
        <div className="flex h-[88vh]">
          {/* Left sidebar - Tool panel (Canva-style minimal design) */}
          <div className="w-80 border-r border-gray-100 bg-white flex flex-col">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Image</h2>
              <p className="text-sm text-gray-400 truncate mt-1">{selectedImage?.file.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-2">
              <Accordion
                type="single"
                value={activeTool}
                onValueChange={(v) => v && setActiveTool(v as EditTool)}
                className="w-full"
              >
                {/* TRIM TOOL */}
                <AccordionItem value="trim" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-indigo-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Scissors className="w-[18px] h-[18px] text-indigo-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Trim</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-indigo-50/60 rounded-b-xl space-y-5">
                    <div className="bg-white/80 rounded-xl p-4 border border-gray-100 shadow-sm text-[13px] text-gray-500 leading-relaxed">
                      Auto-detects content bounds. Drag the <span className="text-indigo-600 font-medium">green handles</span> on corners or edges to adjust the crop area, then click Apply Trim.
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <Label className="text-[13px] text-gray-600 font-medium">Detect Transparent</Label>
                      <Switch
                        checked={detectTransparent}
                        onCheckedChange={setDetectTransparent}
                      />
                    </div>
                    {trimDetection && trimBounds && (
                      <>
                        <div className="text-[13px] space-y-1.5 text-gray-500 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                          <p>Original: <span className="text-gray-700 font-medium">{trimDetection.originalWidth} × {trimDetection.originalHeight}</span> px</p>
                          <p>Output: <span className="text-indigo-600 font-medium">{trimBounds.width} × {trimBounds.height}</span> px</p>
                          <p>Reduction: <span className="text-blue-600 font-medium">{Math.round((1 - (trimBounds.width * trimBounds.height) / (trimDetection.originalWidth * trimDetection.originalHeight)) * 100)}%</span></p>
                        </div>
                        <Button
                          onClick={handleApplyTrimInline}
                          className="w-full h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-[13px] font-medium"
                          disabled={isProcessing}
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Apply Trim
                        </Button>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* FLIP/ROTATE TOOL */}
                <AccordionItem value="flip-rotate" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-sky-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
                        <RotateCw className="w-[18px] h-[18px] text-sky-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Flip / Rotate</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-sky-50/60 rounded-b-xl space-y-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Transform your image orientation
                    </p>

                    {/* Flip buttons */}
                    <div className="space-y-2">
                      <Label className="text-[13px] text-gray-600 font-medium">Flip</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTransform("flip-h")}
                          disabled={isProcessing}
                          className="h-10 rounded-xl border-gray-200 hover:bg-sky-50 hover:border-sky-300 text-[13px] font-medium gap-2"
                        >
                          <FlipHorizontal2 className="w-4 h-4" />
                          Horizontal
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTransform("flip-v")}
                          disabled={isProcessing}
                          className="h-10 rounded-xl border-gray-200 hover:bg-sky-50 hover:border-sky-300 text-[13px] font-medium gap-2"
                        >
                          <FlipVertical2 className="w-4 h-4" />
                          Vertical
                        </Button>
                      </div>
                    </div>

                    {/* Rotate buttons */}
                    <div className="space-y-2">
                      <Label className="text-[13px] text-gray-600 font-medium">Rotate</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTransform("rotate-ccw")}
                          disabled={isProcessing}
                          className="h-10 rounded-xl border-gray-200 hover:bg-sky-50 hover:border-sky-300 text-[13px] font-medium gap-1.5"
                        >
                          <RotateCcw className="w-4 h-4" />
                          90° L
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTransform("rotate-180")}
                          disabled={isProcessing}
                          className="h-10 rounded-xl border-gray-200 hover:bg-sky-50 hover:border-sky-300 text-[13px] font-medium gap-1.5"
                        >
                          <RotateCw className="w-4 h-4" />
                          180°
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => applyTransform("rotate-cw")}
                          disabled={isProcessing}
                          className="h-10 rounded-xl border-gray-200 hover:bg-sky-50 hover:border-sky-300 text-[13px] font-medium gap-1.5"
                        >
                          <RotateCw className="w-4 h-4" />
                          90° R
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* REMOVE COLOR TOOL */}
                <AccordionItem value="remove-bg" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-purple-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Pipette className="w-[18px] h-[18px] text-purple-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Remove Color</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-purple-50/60 rounded-b-xl space-y-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Click on the image to pick colors to make transparent
                    </p>

                    {selectedColors.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] text-gray-600 font-medium">Selected Colors</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedColors([])}
                            className="h-8 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Clear all
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {selectedColors.map(({ color, tolerance }, index) => (
                            <div key={index} className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <div
                                className="w-7 h-7 rounded-lg border border-gray-200 flex-shrink-0"
                                style={{ backgroundColor: rgbToHex(color) }}
                              />
                              <span className="text-xs font-mono text-gray-500 flex-1">{rgbToHex(color)}</span>
                              <Slider
                                value={[tolerance]}
                                onValueChange={([v]) => {
                                  const updated = [...selectedColors];
                                  updated[index].tolerance = v;
                                  setSelectedColors(updated);
                                }}
                                min={0}
                                max={100}
                                className="w-20"
                              />
                              <span className="text-xs text-gray-400 w-8">{tolerance}%</span>
                              <button
                                onClick={() => setSelectedColors(selectedColors.filter((_, i) => i !== index))}
                                className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedColors.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      >
                        {showOriginal ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                        {showOriginal ? "Show Preview" : "Show Original"}
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* REPLACE COLOR TOOL */}
                <AccordionItem value="replace-color" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-pink-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center">
                        <Replace className="w-[18px] h-[18px] text-pink-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Replace Color</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-pink-50/60 rounded-b-xl space-y-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Click on the image to pick colors to replace
                    </p>

                    {/* Replacement color picker */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                      <Label className="text-[13px] text-gray-600 font-medium whitespace-nowrap">Replace with:</Label>
                      <input
                        type="color"
                        value={replacementColor}
                        onChange={(e) => setReplacementColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                      />
                      <span className="text-xs font-mono text-gray-500">{replacementColor}</span>
                    </div>

                    {selectedColors.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[13px] text-gray-600 font-medium">Selected Colors</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedColors([])}
                            className="h-8 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Clear all
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {selectedColors.map(({ color, tolerance }, index) => (
                            <div key={index} className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <div
                                className="w-7 h-7 rounded-lg border border-gray-200 flex-shrink-0"
                                style={{ backgroundColor: rgbToHex(color) }}
                              />
                              <span className="text-xs font-mono text-gray-500 flex-1">{rgbToHex(color)}</span>
                              <Slider
                                value={[tolerance]}
                                onValueChange={([v]) => {
                                  const updated = [...selectedColors];
                                  updated[index].tolerance = v;
                                  setSelectedColors(updated);
                                }}
                                min={0}
                                max={100}
                                className="w-20"
                              />
                              <span className="text-xs text-gray-400 w-8">{tolerance}%</span>
                              <button
                                onClick={() => setSelectedColors(selectedColors.filter((_, i) => i !== index))}
                                className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedColors.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      >
                        {showOriginal ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                        {showOriginal ? "Show Preview" : "Show Original"}
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* ENHANCE TOOL */}
                <AccordionItem value="enhance" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-amber-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Sparkles className="w-[18px] h-[18px] text-amber-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Enhance</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-amber-50/60 rounded-b-xl space-y-5">
                    {/* Brightness */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium flex items-center gap-2">
                          <Sun className="w-4 h-4 text-gray-400" />
                          Brightness
                        </Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{enhanceSettings.brightness}</span>
                      </div>
                      <Slider
                        value={[enhanceSettings.brightness]}
                        onValueChange={([v]) => updateEnhanceSetting("brightness", v)}
                        min={-100}
                        max={100}
                      />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium flex items-center gap-2">
                          <Contrast className="w-4 h-4 text-gray-400" />
                          Contrast
                        </Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{enhanceSettings.contrast}</span>
                      </div>
                      <Slider
                        value={[enhanceSettings.contrast]}
                        onValueChange={([v]) => updateEnhanceSetting("contrast", v)}
                        min={-100}
                        max={100}
                      />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium flex items-center gap-2">
                          <Droplets className="w-4 h-4 text-gray-400" />
                          Saturation
                        </Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{enhanceSettings.saturation}</span>
                      </div>
                      <Slider
                        value={[enhanceSettings.saturation]}
                        onValueChange={([v]) => updateEnhanceSetting("saturation", v)}
                        min={-100}
                        max={100}
                      />
                    </div>

                    {/* Vibrance */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium flex items-center gap-2">
                          <Palette className="w-4 h-4 text-gray-400" />
                          Vibrance
                        </Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{enhanceSettings.vibrance}</span>
                      </div>
                      <Slider
                        value={[enhanceSettings.vibrance]}
                        onValueChange={([v]) => updateEnhanceSetting("vibrance", v)}
                        min={-100}
                        max={100}
                      />
                    </div>

                    {/* Reset */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetEnhanceState}
                      className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      disabled={!hasChanges(enhanceSettings)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Reset Enhancements
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* STROKE/OUTLINE TOOL */}
                <AccordionItem value="stroke" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-indigo-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <PenTool className="w-[18px] h-[18px] text-indigo-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Stroke / Outline</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-indigo-50/60 rounded-b-xl space-y-5">
                    <div className="bg-white/80 rounded-xl p-4 border border-gray-100 shadow-sm text-[13px] text-gray-500 leading-relaxed">
                      Add an outline/stroke around the visible content in your image. Set color and width, then click Apply.
                    </div>

                    {/* Color */}
                    <div className="space-y-2.5">
                      <Label className="text-[13px] text-gray-600 font-medium">Stroke Color</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={strokeToolColor}
                          onChange={(e) => {
                            setStrokeToolColor(e.target.value);
                            if (strokeApplied) {
                              setStrokeApplied(false);
                              strokeCanvasRef.current = null;
                              strokeResultRef.current = null;
                            }
                          }}
                          className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                        />
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded-md border border-gray-100">
                          {strokeToolColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Width */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium">Stroke Width</Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{strokeToolWidth}px</span>
                      </div>
                      <Slider
                        value={[strokeToolWidth]}
                        onValueChange={([v]) => {
                          setStrokeToolWidth(v);
                          if (strokeApplied) {
                            setStrokeApplied(false);
                            strokeCanvasRef.current = null;
                            strokeResultRef.current = null;
                          }
                        }}
                        min={1}
                        max={40}
                      />
                    </div>

                    {/* Apply button */}
                    <Button
                      onClick={handleApplyStroke}
                      className={`w-full h-10 rounded-xl text-[13px] font-medium transition-all ${
                        strokeApplied
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                      disabled={isApplyingStroke}
                    >
                      {strokeApplied ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Stroke Applied
                        </>
                      ) : isApplyingStroke ? (
                        "Applying..."
                      ) : (
                        "Apply Stroke"
                      )}
                    </Button>

                    {strokeApplied && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetStrokeState}
                        className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        Reset Stroke
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* HALFTONE TOOL */}
                <AccordionItem value="halftone" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-violet-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                        <CircleDashed className="w-[18px] h-[18px] text-violet-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Halftone</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-violet-50/60 rounded-b-xl space-y-4">
                    {/* Mode toggle: Easy / Pro */}
                    <div className="flex bg-white/80 rounded-lg p-1 border border-gray-100">
                      <button
                        onClick={() => setHalftoneMode('easy')}
                        className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                          halftoneMode === 'easy' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Easy
                      </button>
                      <button
                        onClick={() => setHalftoneMode('pro')}
                        className={`flex-1 text-[12px] font-medium py-1.5 rounded-md transition-colors ${
                          halftoneMode === 'pro' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Pro
                      </button>
                    </div>

                    {/* ─── EASY MODE ─── */}
                    {halftoneMode === 'easy' && (
                      <>
                        <div className="bg-white/80 rounded-xl p-3 border border-gray-100 shadow-sm text-[12px] text-gray-500 leading-relaxed">
                          Pick a style, adjust strength. We handle the rest.
                        </div>

                        {/* Presets grid */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {halftonePresets.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => {
                                setHalftonePresetName(preset.name);
                                const levels = strengthToLevels(halftoneStrength);
                                const newSettings = applyPreset(preset.name, {
                                  ...halftoneSettings,
                                  ...levels,
                                });
                                setHalftoneSettings(newSettings);
                              }}
                              className={`text-left p-2.5 rounded-lg border text-[11px] transition-colors ${
                                halftonePresetName === preset.name
                                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                                  : 'border-gray-100 bg-white/80 text-gray-600 hover:border-gray-200'
                              }`}
                            >
                              <span className="font-medium block leading-tight">{preset.name}</span>
                              <span className="text-[10px] opacity-70">{preset.description}</span>
                            </button>
                          ))}
                        </div>

                        {/* Strength slider */}
                        <div className="space-y-2">
                          <Label className="text-[13px] text-gray-600 font-medium">Strength</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 w-12">More solid</span>
                            <Slider
                              value={[halftoneStrength]}
                              onValueChange={([v]) => {
                                setHalftoneStrength(v);
                                const levels = strengthToLevels(v);
                                setHalftoneSettings(prev => ({ ...prev, ...levels }));
                              }}
                              min={0}
                              max={100}
                            />
                            <span className="text-[10px] text-gray-400 w-12 text-right">More dots</span>
                          </div>
                        </div>

                        {/* Garment color preview (Easy) */}
                        <div className="space-y-2">
                          <Label className="text-[13px] text-gray-600 font-medium">Preview on garment</Label>
                          <div className="flex gap-1.5">
                            {[
                              { color: null, label: "None" },
                              { color: "#1a1a1a", label: "Black" },
                              { color: "#ffffff", label: "White" },
                              { color: "#6b7280", label: "Heather" },
                              { color: "#1e3a5f", label: "Navy" },
                              { color: "#7f1d1d", label: "Maroon" },
                              { color: "#f5f5dc", label: "Cream" },
                            ].map(({ color, label }) => (
                              <button
                                key={label}
                                title={label}
                                onClick={() => {
                                  setGarmentColor(color);
                                  if (color) {
                                    setPreviewBg("transparent" as PreviewBackground);
                                  }
                                }}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${
                                  garmentColor === color
                                    ? 'border-violet-500 scale-110'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={color ? { backgroundColor: color } : {
                                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                  backgroundSize: '6px 6px',
                                  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* ─── PRO MODE ─── */}
                    {halftoneMode === 'pro' && (
                      <>
                        {/* Mode chips */}
                        <div className="flex gap-1.5">
                          {(['standard', 'black-knockout', 'color-knockout'] as HalftoneMode[]).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setHalftoneSettings(prev => ({ ...prev, mode }))}
                              className={`text-[11px] px-2.5 py-1.5 rounded-full border transition-colors ${
                                halftoneSettings.mode === mode
                                  ? 'border-violet-400 bg-violet-50 text-violet-700'
                                  : 'border-gray-200 bg-white/80 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {mode === 'standard' ? 'Standard' : mode === 'black-knockout' ? 'Black KO' : 'Color KO'}
                            </button>
                          ))}
                        </div>

                        {/* Dot settings */}
                        <div className="space-y-2.5">
                          <Label className="text-[13px] text-gray-600 font-medium">Dot settings</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500 w-16">Frequency</span>
                              <Slider
                                value={[halftoneSettings.lpi]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, lpi: v }))}
                                min={20} max={60}
                              />
                              <span className="text-[11px] font-mono text-gray-400 w-12 text-right">{halftoneSettings.lpi} LPI</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500 w-16">Angle</span>
                              <Slider
                                value={[halftoneSettings.angle]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, angle: v }))}
                                min={0} max={90}
                              />
                              <span className="text-[11px] font-mono text-gray-400 w-12 text-right">{halftoneSettings.angle}°</span>
                            </div>
                          </div>
                        </div>

                        {/* Dot shape */}
                        <div className="space-y-2">
                          <Label className="text-[13px] text-gray-600 font-medium">Dot shape</Label>
                          <div className="flex gap-1.5">
                            {([
                              { id: 'round' as DotShape, label: '●' },
                              { id: 'ellipse' as DotShape, label: '⬮' },
                              { id: 'diamond' as DotShape, label: '◆' },
                              { id: 'line' as DotShape, label: '━' },
                            ]).map(({ id, label }) => (
                              <button
                                key={id}
                                onClick={() => setHalftoneSettings(prev => ({ ...prev, dotShape: id }))}
                                className={`w-9 h-9 rounded-lg border text-[16px] flex items-center justify-center transition-colors ${
                                  halftoneSettings.dotShape === id
                                    ? 'border-violet-400 bg-violet-50 text-violet-700'
                                    : 'border-gray-200 bg-white/80 text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tone control */}
                        <div className="space-y-2.5">
                          <Label className="text-[13px] text-gray-600 font-medium">Tone control</Label>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500 w-16">Shadows</span>
                              <Slider
                                value={[halftoneSettings.shadows]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, shadows: v }))}
                                min={0} max={255}
                              />
                              <span className="text-[11px] font-mono text-gray-400 w-8 text-right">{halftoneSettings.shadows}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500 w-16">Midtones</span>
                              <Slider
                                value={[halftoneSettings.midtones]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, midtones: v }))}
                                min={0} max={255}
                              />
                              <span className="text-[11px] font-mono text-gray-400 w-8 text-right">{halftoneSettings.midtones}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] text-gray-500 w-16">Highlights</span>
                              <Slider
                                value={[halftoneSettings.highlights]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, highlights: v }))}
                                min={0} max={255}
                              />
                              <span className="text-[11px] font-mono text-gray-400 w-8 text-right">{halftoneSettings.highlights}</span>
                            </div>
                          </div>
                        </div>

                        {/* Knockout color (only for color-knockout mode) */}
                        {halftoneSettings.mode === 'color-knockout' && (
                          <div className="space-y-2">
                            <Label className="text-[13px] text-gray-600 font-medium">Knockout color</Label>
                            <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-lg border border-gray-100">
                              <input
                                type="color"
                                value={`#${halftoneSettings.knockoutColor.r.toString(16).padStart(2,'0')}${halftoneSettings.knockoutColor.g.toString(16).padStart(2,'0')}${halftoneSettings.knockoutColor.b.toString(16).padStart(2,'0')}`}
                                onChange={(e) => {
                                  const hex = e.target.value;
                                  const r = parseInt(hex.slice(1, 3), 16);
                                  const g = parseInt(hex.slice(3, 5), 16);
                                  const b = parseInt(hex.slice(5, 7), 16);
                                  setHalftoneSettings(prev => ({ ...prev, knockoutColor: { r, g, b } }));
                                }}
                                className="w-8 h-8 rounded-md border border-gray-200 cursor-pointer p-0.5"
                              />
                              <Slider
                                value={[halftoneSettings.knockoutTolerance]}
                                onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, knockoutTolerance: v }))}
                                min={0} max={100}
                                className="flex-1"
                              />
                              <span className="text-[11px] text-gray-400 w-8 text-right">{halftoneSettings.knockoutTolerance}%</span>
                            </div>
                          </div>
                        )}

                        {/* Min dot size */}
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-gray-500 w-16">Min dot</span>
                          <Slider
                            value={[halftoneSettings.minDotSizeMm * 10]}
                            onValueChange={([v]) => setHalftoneSettings(prev => ({ ...prev, minDotSizeMm: v / 10 }))}
                            min={3} max={15}
                          />
                          <span className="text-[11px] font-mono text-gray-400 w-14 text-right">{halftoneSettings.minDotSizeMm.toFixed(1)} mm</span>
                        </div>

                        {/* Auto-cleanup toggle */}
                        <div className="flex items-center justify-between py-1">
                          <Label className="text-[12px] text-gray-600 font-medium">Auto-clean semi-transparent px</Label>
                          <Switch
                            checked={halftoneSettings.autoCleanup}
                            onCheckedChange={(checked) => setHalftoneSettings(prev => ({ ...prev, autoCleanup: checked }))}
                          />
                        </div>

                        {/* Garment color preview (Pro) */}
                        <div className="space-y-2">
                          <Label className="text-[13px] text-gray-600 font-medium">Preview on garment</Label>
                          <div className="flex gap-1.5">
                            {[
                              { color: null, label: "None" },
                              { color: "#1a1a1a", label: "Black" },
                              { color: "#ffffff", label: "White" },
                              { color: "#6b7280", label: "Heather" },
                              { color: "#1e3a5f", label: "Navy" },
                              { color: "#7f1d1d", label: "Maroon" },
                              { color: "#f5f5dc", label: "Cream" },
                            ].map(({ color, label }) => (
                              <button
                                key={label}
                                title={label}
                                onClick={() => {
                                  setGarmentColor(color);
                                  if (color) {
                                    setPreviewBg("transparent" as PreviewBackground);
                                  }
                                }}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${
                                  garmentColor === color
                                    ? 'border-violet-500 scale-110'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={color ? { backgroundColor: color } : {
                                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                                  backgroundSize: '6px 6px',
                                  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Analysis warnings (both modes) */}
                    {halftoneAnalysis && halftoneAnalysis.smallDotCount > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        <span>⚠</span>
                        <span>{halftoneAnalysis.smallDotCount} dots below {halftoneSettings.minDotSizeMm}mm — may not transfer</span>
                      </div>
                    )}

                    {halftoneAnalysis && (
                      <div className="flex gap-3 text-[11px] text-gray-400">
                        <span>{halftoneAnalysis.totalDots.toLocaleString()} dots</span>
                        <span>~{halftoneAnalysis.inkCoverage}% ink coverage</span>
                      </div>
                    )}

                    {/* Show original toggle */}
                    {halftoneCanvasRef.current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      >
                        {showOriginal ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                        {showOriginal ? "Show Halftone" : "Show Original"}
                      </Button>
                    )}

                    {/* Reset */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setHalftoneSettings(defaultHalftoneSettings);
                        setHalftoneStrength(50);
                        setHalftonePresetName('Soft hand');
                        setGarmentColor(null);
                        halftoneCanvasRef.current = null;
                        setHalftoneAnalysis(null);
                      }}
                      className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                      disabled={!hasHalftoneChanges(halftoneSettings)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Reset Halftone
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Subtle divider */}
                <div className="mx-4 border-b border-gray-100" />

                {/* ERASER TOOL */}
                <AccordionItem value="eraser" className="border-none">
                  <AccordionTrigger className="px-4 py-4 rounded-xl mx-0 hover:no-underline hover:bg-gray-50 [&[data-state=open]]:bg-rose-50/60 [&[data-state=open]]:rounded-b-none transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                        <Eraser className="w-[18px] h-[18px] text-rose-600" />
                      </div>
                      <span className="text-[15px] font-semibold text-gray-800">Eraser</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-5 pt-2 mx-0 bg-rose-50/60 rounded-b-xl space-y-4">
                    <p className="text-[13px] text-gray-500 leading-relaxed">
                      Paint over the image to erase parts. Erased areas become transparent.
                    </p>

                    {/* Eraser type selector */}
                    <div className="space-y-2">
                      <Label className="text-[13px] text-gray-600 font-medium">Eraser Type</Label>
                      <div className="flex rounded-lg bg-white border border-gray-200 p-1 gap-1">
                        <button
                          onClick={() => setEraserType("round-hard")}
                          className={`flex-1 text-xs font-medium py-2 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${eraserType === "round-hard" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                          title="Round Hard"
                        >
                          <Circle className="w-3.5 h-3.5" />
                          Hard
                        </button>
                        <button
                          onClick={() => setEraserType("round-soft")}
                          className={`flex-1 text-xs font-medium py-2 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${eraserType === "round-soft" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                          title="Round Soft"
                        >
                          <CircleDot className="w-3.5 h-3.5" />
                          Soft
                        </button>
                        <button
                          onClick={() => setEraserType("square")}
                          className={`flex-1 text-xs font-medium py-2 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${eraserType === "square" ? "bg-rose-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                          title="Square"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Square
                        </button>
                      </div>
                    </div>

                    {/* Eraser size */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[13px] text-gray-600 font-medium">Brush Size</Label>
                        <span className="text-xs font-mono text-gray-400 bg-white px-2 py-0.5 rounded-md">{eraserSize}px</span>
                      </div>
                      <Slider
                        value={[eraserSize]}
                        onValueChange={([v]) => setEraserSize(v)}
                        min={5}
                        max={150}
                        step={1}
                      />
                    </div>

                    {/* Eraser size preview */}
                    <div className="flex items-center justify-center py-3 bg-white rounded-xl border border-gray-100">
                      <div
                        className="border-2 border-rose-400 bg-rose-50"
                        style={{
                          width: Math.min(eraserSize, 80),
                          height: Math.min(eraserSize, 80),
                          borderRadius: eraserType === "square" ? "2px" : "50%",
                          opacity: eraserType === "round-soft" ? 0.6 : 1,
                        }}
                      />
                    </div>

                    {/* Reset eraser (re-draw from base) */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (originalImageRef.current) {
                          const canvas = document.createElement("canvas");
                          canvas.width = originalImageRef.current.naturalWidth;
                          canvas.height = originalImageRef.current.naturalHeight;
                          const ctx = canvas.getContext("2d");
                          if (ctx) ctx.drawImage(originalImageRef.current, 0, 0);
                          eraserCanvasRef.current = canvas;
                          eraserResultRef.current = canvas;
                          setHasUnsavedChanges(false);
                          drawDisplayCanvas();
                          toast.success("Eraser reset");
                        }
                      }}
                      className="w-full h-10 rounded-xl border-gray-200 hover:bg-gray-50 text-[13px] font-medium"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5" />
                      Reset Eraser
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          {/* Main content - Preview */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 50} className="h-9 w-9 p-0 rounded-lg border-gray-200">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-semibold w-14 text-center text-gray-600">{zoomLevel}%</span>
                <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 600} className="h-9 w-9 p-0 rounded-lg border-gray-200">
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomReset} className="h-9 w-9 p-0 rounded-lg border-gray-200">
                  <Maximize2 className="w-4 h-4" />
                </Button>
                {/* Separator + Undo */}
                <div className="w-px h-6 bg-gray-200 mx-0.5" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={performUndo}
                  disabled={!canUndo}
                  className={`h-9 px-2.5 rounded-lg gap-1.5 transition-all ${
                    canUndo
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400"
                      : "border-gray-200 text-gray-400 opacity-50"
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Undo</span>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <PreviewBackgroundToggle value={previewBg} onChange={setPreviewBg} />
                <button
                  onClick={onClose}
                  className="w-9 h-9 flex items-center justify-center rounded-full transition-colors hover:bg-red-50 group"
                  title="Close"
                >
                  <X className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                </button>
              </div>
            </div>

            {/* Canvas area */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-50/50 relative"
              style={{ cursor: (() => {
                if (activeTool === "remove-bg" || activeTool === "replace-color") return "crosshair";
                if (activeTool === "eraser") return "none";
                const handle = trimDragHandle || trimHoverHandle;
                if (activeTool === "trim" && handle) {
                  if (handle === "t" || handle === "b") return "ns-resize";
                  if (handle === "l" || handle === "r") return "ew-resize";
                  if (handle === "tl" || handle === "br") return "nwse-resize";
                  return "nesw-resize";
                }
                return "default";
              })() }}
            >
              <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
                <canvas
                  ref={displayCanvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseLeave}
                  style={{ width: displayWidth, height: displayHeight }}
                  className="shadow-lg rounded"
                />
                {/* Pixel magnifier loupe for BG removal */}
                {(activeTool === "remove-bg" || activeTool === "replace-color") && showMagnifier && magnifierPos && hoveredColor && (
                  <div
                    className="absolute pointer-events-none z-20"
                    style={{
                      left: Math.max(0, Math.min(magnifierPos.x - 70, displayWidth - 144)),
                      top: magnifierPos.y > 200
                        ? magnifierPos.y - 190
                        : magnifierPos.y + 24,
                    }}
                  >
                    {/* Circular loupe */}
                    <div className="flex flex-col items-center">
                      <div
                        className="relative rounded-full overflow-hidden"
                        style={{
                          width: 140,
                          height: 140,
                          border: "3px solid white",
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.25)",
                        }}
                      >
                        <canvas
                          ref={magnifierDisplayRef}
                          width={140}
                          height={140}
                          style={{ width: 140, height: 140 }}
                        />
                      </div>
                      {/* Color info pill below the loupe */}
                      <div
                        className="mt-2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-lg"
                        style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: rgbToHex(hoveredColor),
                            border: "1.5px solid rgba(0,0,0,0.15)",
                          }}
                        />
                        <span className="text-[11px] font-mono font-medium text-gray-700 tracking-wide">
                          {rgbToHex(hoveredColor).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* Eraser cursor */}
                {activeTool === "eraser" && magnifierPos && (
                  <div
                    className="absolute pointer-events-none z-20 border-2 border-white mix-blend-difference"
                    style={{
                      left: magnifierPos.x - (eraserSize * getDisplayScale()) / 2,
                      top: magnifierPos.y - (eraserSize * getDisplayScale()) / 2,
                      width: eraserSize * getDisplayScale(),
                      height: eraserSize * getDisplayScale(),
                      borderRadius: eraserType === "square" ? "2px" : "50%",
                    }}
                  />
                )}
              </div>
              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] z-10 pointer-events-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    <span className="text-sm text-gray-500 font-medium">Processing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-white">
              <div className="text-sm text-gray-400 font-medium">
                {imageSize.width} × {imageSize.height} px
                {isProcessing && <span className="ml-2 text-amber-500">Processing...</span>}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl border-gray-200 text-[13px] font-medium">
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={isProcessing}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-[13px] font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditImageModal;
