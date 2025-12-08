import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Fixed tolerance value for background detection (0-50 range)
const DETECTION_TOLERANCE = 10;
import { ImageObject } from "./CollageCreator";
import {
  detectContentBounds,
  cropImage,
  CropBounds,
  TrimDetectionResult,
} from "@/utils/imageTrimUtils";
import { generateThumbnail } from "@/utils/thumbnailUtils";
import { toast } from "sonner";
import { Scissors, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut, Maximize2, Download, Undo2, Redo2 } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ImageTrimModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageObject[];
  onTrimComplete: (trimmedImages: ImageObject[]) => void;
}

type DragHandle = 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | null;

const MAX_HISTORY_SIZE = 20;

export const ImageTrimModal = ({ isOpen, onClose, images, onTrimComplete }: ImageTrimModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detectTransparent, setDetectTransparent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<TrimDetectionResult | null>(null);
  const [cropBounds, setCropBounds] = useState<CropBounds | null>(null);
  const isCompletingRef = useRef(false); // Flag to prevent cleanup on complete
  const [trimmedImages, setTrimmedImages] = useState<Map<string, ImageObject>>(new Map());
  const [activeHandle, setActiveHandle] = useState<DragHandle>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(75); // Zoom percentage (50-400), default 75%
  const [isPanning, setIsPanning] = useState(false); // Track if user is panning
  const [padding, setPadding] = useState(0); // Padding in pixels (0-50)

  // Undo/Redo history
  const [boundsHistory, setBoundsHistory] = useState<CropBounds[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false); // Flag to prevent adding to history during undo/redo

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; bounds: CropBounds } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  const currentImage = images[currentIndex];

  // Calculate base scale to fit image in container (without zoom)
  const getBaseScale = useCallback(() => {
    if (!detectionResult || !containerRef.current) return 1;
    const maxWidth = 675;
    const maxHeight = 450;
    const scaleX = maxWidth / detectionResult.originalWidth;
    const scaleY = maxHeight / detectionResult.originalHeight;
    return Math.min(scaleX, scaleY, 1);
  }, [detectionResult]);

  // Calculate display scale including zoom
  const getDisplayScale = useCallback(() => {
    const baseScale = getBaseScale();
    return baseScale * (zoomLevel / 100);
  }, [getBaseScale, zoomLevel]);

  // Detect content bounds when image or settings change
  useEffect(() => {
    if (!isOpen || !currentImage) return;

    const detect = async () => {
      setIsLoading(true);
      try {
        const result = await detectContentBounds(
          currentImage.url,
          DETECTION_TOLERANCE,
          detectTransparent
        );
        setDetectionResult(result);
        setCropBounds(result.bounds);
        setImageSize({ width: result.originalWidth, height: result.originalHeight });
        // Initialize history with detected bounds
        setBoundsHistory([result.bounds]);
        setHistoryIndex(0);
        setPadding(0);
      } catch (error) {
        console.error("Failed to detect content bounds:", error);
        toast.error("Failed to analyze image");
      } finally {
        setIsLoading(false);
      }
    };

    detect();
  }, [isOpen, currentImage, detectTransparent]);

  // Calculate bounds with padding applied (clamped to image bounds)
  const getBoundsWithPadding = useCallback((bounds: CropBounds, pad: number): CropBounds => {
    if (!detectionResult || pad === 0) return bounds;

    const paddedLeft = Math.max(0, bounds.left - pad);
    const paddedTop = Math.max(0, bounds.top - pad);
    const paddedRight = Math.min(detectionResult.originalWidth - 1, bounds.right + pad);
    const paddedBottom = Math.min(detectionResult.originalHeight - 1, bounds.bottom + pad);

    return {
      left: paddedLeft,
      top: paddedTop,
      right: paddedRight,
      bottom: paddedBottom,
      width: paddedRight - paddedLeft + 1,
      height: paddedBottom - paddedTop + 1,
    };
  }, [detectionResult]);

  // Get the effective bounds (with padding)
  const effectiveBounds = cropBounds ? getBoundsWithPadding(cropBounds, padding) : null;

  // Draw preview on canvas
  useEffect(() => {
    if (!canvasRef.current || !currentImage || !cropBounds || !detectionResult) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate bounds with padding
    const displayBounds = getBoundsWithPadding(cropBounds, padding);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = getDisplayScale();
      const displayWidth = detectionResult.originalWidth * scale;
      const displayHeight = detectionResult.originalHeight * scale;

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Draw image
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Draw semi-transparent overlay on areas to be cropped (using padded bounds)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

      // Top region
      ctx.fillRect(0, 0, displayWidth, displayBounds.top * scale);
      // Bottom region
      ctx.fillRect(0, (displayBounds.bottom + 1) * scale, displayWidth, displayHeight - (displayBounds.bottom + 1) * scale);
      // Left region
      ctx.fillRect(0, displayBounds.top * scale, displayBounds.left * scale, (displayBounds.bottom - displayBounds.top + 1) * scale);
      // Right region
      ctx.fillRect((displayBounds.right + 1) * scale, displayBounds.top * scale, displayWidth - (displayBounds.right + 1) * scale, (displayBounds.bottom - displayBounds.top + 1) * scale);

      // Draw crop rectangle border (padded bounds)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(
        displayBounds.left * scale,
        displayBounds.top * scale,
        displayBounds.width * scale,
        displayBounds.height * scale
      );
      ctx.setLineDash([]);

      // Draw corner handles - larger with white fill and green border
      const handleSize = 14;

      // Helper to draw a handle with white fill and green border
      const drawHandle = (x: number, y: number, width: number, height: number) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
      };

      // Top-left
      drawHandle(displayBounds.left * scale - handleSize / 2, displayBounds.top * scale - handleSize / 2, handleSize, handleSize);
      // Top-right
      drawHandle((displayBounds.right + 1) * scale - handleSize / 2, displayBounds.top * scale - handleSize / 2, handleSize, handleSize);
      // Bottom-left
      drawHandle(displayBounds.left * scale - handleSize / 2, (displayBounds.bottom + 1) * scale - handleSize / 2, handleSize, handleSize);
      // Bottom-right
      drawHandle((displayBounds.right + 1) * scale - handleSize / 2, (displayBounds.bottom + 1) * scale - handleSize / 2, handleSize, handleSize);

      // Draw edge handles - larger
      const edgeHandleWidth = 28;
      const edgeHandleHeight = 8;

      // Top edge
      drawHandle(
        (displayBounds.left + displayBounds.width / 2) * scale - edgeHandleWidth / 2,
        displayBounds.top * scale - edgeHandleHeight / 2,
        edgeHandleWidth,
        edgeHandleHeight
      );
      // Bottom edge
      drawHandle(
        (displayBounds.left + displayBounds.width / 2) * scale - edgeHandleWidth / 2,
        (displayBounds.bottom + 1) * scale - edgeHandleHeight / 2,
        edgeHandleWidth,
        edgeHandleHeight
      );
      // Left edge
      drawHandle(
        displayBounds.left * scale - edgeHandleHeight / 2,
        (displayBounds.top + displayBounds.height / 2) * scale - edgeHandleWidth / 2,
        edgeHandleHeight,
        edgeHandleWidth
      );
      // Right edge
      drawHandle(
        (displayBounds.right + 1) * scale - edgeHandleHeight / 2,
        (displayBounds.top + displayBounds.height / 2) * scale - edgeHandleWidth / 2,
        edgeHandleHeight,
        edgeHandleWidth
      );
    };
    img.src = currentImage.url;
  }, [currentImage, cropBounds, detectionResult, getDisplayScale, zoomLevel, padding, getBoundsWithPadding]);

  // Handle mouse events for dragging
  const getHandleAtPosition = (x: number, y: number): DragHandle => {
    if (!cropBounds || !detectionResult) return null;

    const scale = getDisplayScale();
    const handleSize = 18; // Hit area size (slightly larger than visual handle for easier grabbing)

    // Use padded bounds for handle positions
    const paddedBounds = getBoundsWithPadding(cropBounds, padding);
    const left = paddedBounds.left * scale;
    const right = (paddedBounds.right + 1) * scale;
    const top = paddedBounds.top * scale;
    const bottom = (paddedBounds.bottom + 1) * scale;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;

    // Check corners first
    if (Math.abs(x - left) < handleSize && Math.abs(y - top) < handleSize) return 'topLeft';
    if (Math.abs(x - right) < handleSize && Math.abs(y - top) < handleSize) return 'topRight';
    if (Math.abs(x - left) < handleSize && Math.abs(y - bottom) < handleSize) return 'bottomLeft';
    if (Math.abs(x - right) < handleSize && Math.abs(y - bottom) < handleSize) return 'bottomRight';

    // Check edges
    if (Math.abs(y - top) < handleSize && x > left && x < right) return 'top';
    if (Math.abs(y - bottom) < handleSize && x > left && x < right) return 'bottom';
    if (Math.abs(x - left) < handleSize && y > top && y < bottom) return 'left';
    if (Math.abs(x - right) < handleSize && y > top && y < bottom) return 'right';

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropBounds || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const handle = getHandleAtPosition(x, y);
    if (handle) {
      setActiveHandle(handle);
      dragStartRef.current = { x, y, bounds: { ...cropBounds } };
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !detectionResult) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update cursor based on handle
    const handle = activeHandle || getHandleAtPosition(x, y);
    switch (handle) {
      case 'topLeft':
      case 'bottomRight':
        canvasRef.current.style.cursor = 'nwse-resize';
        break;
      case 'topRight':
      case 'bottomLeft':
        canvasRef.current.style.cursor = 'nesw-resize';
        break;
      case 'top':
      case 'bottom':
        canvasRef.current.style.cursor = 'ns-resize';
        break;
      case 'left':
      case 'right':
        canvasRef.current.style.cursor = 'ew-resize';
        break;
      default:
        canvasRef.current.style.cursor = 'default';
    }

    // Handle dragging
    if (activeHandle && dragStartRef.current && cropBounds) {
      const scale = getDisplayScale();
      const dx = (x - dragStartRef.current.x) / scale;
      const dy = (y - dragStartRef.current.y) / scale;
      const startBounds = dragStartRef.current.bounds;

      let newBounds = { ...cropBounds };
      const minSize = 10; // Minimum crop size in pixels

      switch (activeHandle) {
        case 'topLeft':
          newBounds.left = Math.max(0, Math.min(startBounds.left + dx, startBounds.right - minSize));
          newBounds.top = Math.max(0, Math.min(startBounds.top + dy, startBounds.bottom - minSize));
          break;
        case 'topRight':
          newBounds.right = Math.min(detectionResult.originalWidth - 1, Math.max(startBounds.right + dx, startBounds.left + minSize));
          newBounds.top = Math.max(0, Math.min(startBounds.top + dy, startBounds.bottom - minSize));
          break;
        case 'bottomLeft':
          newBounds.left = Math.max(0, Math.min(startBounds.left + dx, startBounds.right - minSize));
          newBounds.bottom = Math.min(detectionResult.originalHeight - 1, Math.max(startBounds.bottom + dy, startBounds.top + minSize));
          break;
        case 'bottomRight':
          newBounds.right = Math.min(detectionResult.originalWidth - 1, Math.max(startBounds.right + dx, startBounds.left + minSize));
          newBounds.bottom = Math.min(detectionResult.originalHeight - 1, Math.max(startBounds.bottom + dy, startBounds.top + minSize));
          break;
        case 'top':
          newBounds.top = Math.max(0, Math.min(startBounds.top + dy, startBounds.bottom - minSize));
          break;
        case 'bottom':
          newBounds.bottom = Math.min(detectionResult.originalHeight - 1, Math.max(startBounds.bottom + dy, startBounds.top + minSize));
          break;
        case 'left':
          newBounds.left = Math.max(0, Math.min(startBounds.left + dx, startBounds.right - minSize));
          break;
        case 'right':
          newBounds.right = Math.min(detectionResult.originalWidth - 1, Math.max(startBounds.right + dx, startBounds.left + minSize));
          break;
      }

      // Recalculate width and height
      newBounds.width = Math.round(newBounds.right - newBounds.left + 1);
      newBounds.height = Math.round(newBounds.bottom - newBounds.top + 1);
      newBounds.left = Math.round(newBounds.left);
      newBounds.top = Math.round(newBounds.top);
      newBounds.right = Math.round(newBounds.right);
      newBounds.bottom = Math.round(newBounds.bottom);

      setCropBounds(newBounds);
    }
  }, [activeHandle, cropBounds, detectionResult, getDisplayScale]);

  const handleMouseUp = () => {
    // Add to history when user finishes dragging (only if bounds changed)
    if (activeHandle && cropBounds && dragStartRef.current) {
      const startBounds = dragStartRef.current.bounds;
      const boundsChanged =
        startBounds.left !== cropBounds.left ||
        startBounds.top !== cropBounds.top ||
        startBounds.right !== cropBounds.right ||
        startBounds.bottom !== cropBounds.bottom;

      if (boundsChanged && !isUndoRedoRef.current) {
        addToHistory(cropBounds);
      }
    }
    setActiveHandle(null);
    dragStartRef.current = null;
  };

  // Add bounds to history
  const addToHistory = (bounds: CropBounds) => {
    setBoundsHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push({ ...bounds });
      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY_SIZE - 1));
  };

  // Undo
  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const prevBounds = boundsHistory[historyIndex - 1];
      setCropBounds({ ...prevBounds });
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndex < boundsHistory.length - 1) {
      isUndoRedoRef.current = true;
      const nextBounds = boundsHistory[historyIndex + 1];
      setCropBounds({ ...nextBounds });
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => { isUndoRedoRef.current = false; }, 0);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < boundsHistory.length - 1;

  // Reset crop bounds to detected values
  const handleReset = () => {
    if (detectionResult) {
      setCropBounds(detectionResult.bounds);
      setPadding(0);
      // Clear history and start fresh
      setBoundsHistory([detectionResult.bounds]);
      setHistoryIndex(0);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleZoomReset = () => {
    setZoomLevel(75);
  };

  // Pan handlers for when zoomed in (zoom > 100%)
  const canPan = zoomLevel > 100;

  const handlePanStart = (e: React.MouseEvent) => {
    if (!canPan || !scrollContainerRef.current) return;

    // Only start panning if not clicking on a crop handle
    const handle = getHandleAtPosition(
      e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0),
      e.clientY - (canvasRef.current?.getBoundingClientRect().top || 0)
    );
    if (handle) return;

    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    };
    e.preventDefault();
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStartRef.current || !scrollContainerRef.current) return;

    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;

    scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handlePanEnd = () => {
    setIsPanning(false);
    panStartRef.current = null;
  };

  // Download current preview as PNG
  const handleDownload = async () => {
    if (!currentImage || !cropBounds || !detectionResult) return;

    try {
      // Use effective bounds (with padding)
      const boundsToUse = getBoundsWithPadding(cropBounds, padding);
      const result = await cropImage(currentImage.url, boundsToUse, currentImage.file.name);

      // Create download filename
      const originalName = currentImage.file.name;
      const nameParts = originalName.split('.');
      nameParts.pop();
      const baseName = nameParts.join('.');
      const downloadName = `${baseName}_trimmed.png`;

      // Create download link
      const link = document.createElement('a');
      link.href = result.url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloaded ${downloadName}`);
    } catch (error) {
      console.error("Failed to download:", error);
      toast.error("Failed to download image");
    }
  };

  // Apply trim to current image
  const handleApplyTrim = async () => {
    if (!currentImage || !cropBounds || !detectionResult) {
      return;
    }

    // Use effective bounds (with padding)
    const boundsToUse = getBoundsWithPadding(cropBounds, padding);

    setIsLoading(true);
    try {
      const result = await cropImage(currentImage.url, boundsToUse, currentImage.file.name);

      // Generate thumbnail for the trimmed image (for gallery display)
      let thumbnailUrl: string;
      try {
        thumbnailUrl = await generateThumbnail(result.file, 300);
      } catch (error) {
        console.error('Failed to generate thumbnail for trimmed image:', error);
        // Fallback to full URL if thumbnail generation fails
        thumbnailUrl = result.url;
      }

      const newTrimmedImages = new Map(trimmedImages);
      newTrimmedImages.set(currentImage.id, {
        id: currentImage.id,
        file: result.file,
        url: result.url,
        thumbnailUrl,
        // Store original dimensions so we can show the savings
        originalWidth: detectionResult.originalWidth,
        originalHeight: detectionResult.originalHeight,
      });
      setTrimmedImages(newTrimmedImages);

      toast.success("Image trimmed successfully");

      // Move to next image or complete
      if (currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All images processed, complete - pass the map directly to avoid async state issues
        handleComplete(newTrimmedImages);
      }
    } catch (error) {
      console.error("Failed to trim image:", error);
      toast.error("Failed to trim image");
    } finally {
      setIsLoading(false);
    }
  };

  // Keep original (skip trimming for current image)
  const handleKeepOriginal = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  // Complete and return all trimmed images
  // Pass the latest trimmedImages map directly to avoid async state issues
  const handleComplete = (latestTrimmedImages?: Map<string, ImageObject>) => {
    // Set flag to prevent handleClose from revoking URLs
    isCompletingRef.current = true;

    // Use passed map or fall back to state (for skip/keep original cases)
    const trimmedMap = latestTrimmedImages || trimmedImages;

    // Build final array of images, using trimmed versions where available
    const finalImages = images.map(img => {
      const trimmed = trimmedMap.get(img.id);
      return trimmed || img;
    });

    onTrimComplete(finalImages);

    // Reset state without revoking URLs (they're now owned by parent)
    setCurrentIndex(0);
    setTrimmedImages(new Map());
    setDetectionResult(null);
    setCropBounds(null);
    setZoomLevel(75);

    // Reset flag after a tick
    setTimeout(() => {
      isCompletingRef.current = false;
    }, 100);

    onClose();
  };

  // Close without completing (cancel/close button)
  const handleClose = () => {
    // Only clean up trimmed URLs if we're canceling (not completing)
    if (!isCompletingRef.current) {
      trimmedImages.forEach((trimmed) => {
        if (trimmed.url.startsWith('blob:')) {
          URL.revokeObjectURL(trimmed.url);
        }
        // Also revoke thumbnail URLs
        if (trimmed.thumbnailUrl && trimmed.thumbnailUrl.startsWith('blob:') && trimmed.thumbnailUrl !== trimmed.url) {
          URL.revokeObjectURL(trimmed.thumbnailUrl);
        }
      });
    }

    setCurrentIndex(0);
    setTrimmedImages(new Map());
    setDetectionResult(null);
    setCropBounds(null);
    setZoomLevel(75);
    onClose();
  };

  // Skip all remaining images
  const handleSkipAll = () => {
    handleComplete();
  };

  // Navigate between images
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setZoomLevel(75); // Reset zoom when changing images
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setZoomLevel(75); // Reset zoom when changing images
    }
  };

  if (!currentImage) return null;

  const scale = getDisplayScale();
  const displayWidth = detectionResult ? detectionResult.originalWidth * scale : 0;
  const displayHeight = detectionResult ? detectionResult.originalHeight * scale : 0;

  // Check if there's no reduction (0% - nothing to trim)
  const hasNoReduction = detectionResult && cropBounds
    ? cropBounds.width === detectionResult.originalWidth && cropBounds.height === detectionResult.originalHeight
    : false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Auto-Trim Image
            {images.length > 1 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                Image {currentIndex + 1} of {images.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview with zoom controls */}
          <div ref={containerRef} className="relative">
            {/* Zoom controls - positioned at top right */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-slate-200 p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                className="h-8 w-8 p-0"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[48px] text-center">{zoomLevel}%</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 400}
                className="h-8 w-8 p-0"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-5 bg-slate-300 mx-0.5" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleZoomReset}
                disabled={zoomLevel === 75}
                className="h-8 w-8 p-0"
                title="Reset zoom to 75%"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable container for zoomed image */}
            <div
              ref={scrollContainerRef}
              className="overflow-auto rounded-lg"
              style={{
                maxHeight: '468px',
                backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : 'default',
              }}
              onMouseDown={handlePanStart}
              onMouseMove={handlePanMove}
              onMouseUp={handlePanEnd}
              onMouseLeave={handlePanEnd}
            >
              <div className="flex justify-center items-center p-4 min-h-[300px]">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    <span className="text-sm text-muted-foreground">Analyzing image...</span>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onMouseDown={(e) => {
                      // Handle crop handles first, then fall through to pan
                      handleMouseDown(e);
                      if (!activeHandle) {
                        handlePanStart(e);
                      }
                    }}
                    onMouseMove={(e) => {
                      handleMouseMove(e);
                      if (!activeHandle) {
                        handlePanMove(e);
                      }
                    }}
                    onMouseUp={(e) => {
                      handleMouseUp();
                      handlePanEnd();
                    }}
                    onMouseLeave={(e) => {
                      handleMouseUp();
                      handlePanEnd();
                    }}
                    style={{
                      width: displayWidth,
                      height: displayHeight,
                      cursor: activeHandle
                        ? undefined
                        : canPan
                          ? (isPanning ? 'grabbing' : 'grab')
                          : 'crosshair',
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Image info */}
          {detectionResult && effectiveBounds && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="bg-slate-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Original: </span>
                <span className="font-medium">{detectionResult.originalWidth} × {detectionResult.originalHeight} px</span>
              </div>
              <div className="bg-emerald-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Trimmed: </span>
                <span className="font-medium text-emerald-700">{effectiveBounds.width} × {effectiveBounds.height} px</span>
              </div>
              <div className="bg-blue-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Reduction: </span>
                <span className="font-medium text-blue-700">
                  {Math.round((1 - (effectiveBounds.width * effectiveBounds.height) / (detectionResult.originalWidth * detectionResult.originalHeight)) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="p-4 bg-slate-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Detect Transparent</Label>
              <Switch
                checked={detectTransparent}
                onCheckedChange={setDetectTransparent}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Padding (px)</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={padding}
                onChange={(e) => setPadding(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                className="w-20 h-8 text-center"
              />
            </div>
          </div>

          {/* Navigation for multiple images */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex gap-1">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentIndex
                        ? 'bg-emerald-600'
                        : trimmedImages.has(images[idx].id)
                          ? 'bg-emerald-300'
                          : 'bg-slate-300'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex === images.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={isLoading || !cropBounds}
              className="flex-1 sm:flex-none"
              title="Download trimmed preview as PNG"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleUndo}
              disabled={isLoading || !canUndo}
              className="flex-1 sm:flex-none px-3"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRedo}
              disabled={isLoading || !canRedo}
              className="flex-1 sm:flex-none px-3"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || hasNoReduction}
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            {images.length > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSkipAll}
                disabled={isLoading}
                className="flex-1 sm:flex-none"
              >
                Skip All
              </Button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleKeepOriginal}
              disabled={isLoading || hasNoReduction}
              className="flex-1 sm:flex-none"
            >
              Keep Original
            </Button>
            <Button
              type="button"
              onClick={handleApplyTrim}
              disabled={isLoading || hasNoReduction}
              className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Scissors className="h-4 w-4 mr-2" />
              Apply Trim
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
