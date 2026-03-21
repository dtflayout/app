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
import { PreviewBackgroundToggle, PreviewBackground, getPreviewBackgroundStyle } from "./PreviewBackgroundToggle";

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
  // Working URL for the current image - either from image.url or regenerated from File
  const [workingUrl, setWorkingUrl] = useState<string>('');
  // Preview background color
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('transparent');

  // Undo/Redo history
  const [boundsHistory, setBoundsHistory] = useState<CropBounds[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false); // Flag to prevent adding to history during undo/redo

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; bounds: CropBounds } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  // Track temporary URL created from File (for memory optimization cleanup)
  const tempUrlRef = useRef<string | null>(null);
  // Store loaded image for redrawing without reloading
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

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

    // MEMORY OPTIMIZATION: If url is empty (cleared after layout generation),
    // regenerate it from the File object temporarily for modal use
    let imageUrl = currentImage.url;
    if (!imageUrl || imageUrl === '') {
      // Revoke any previous temporary URL
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
      }
      imageUrl = URL.createObjectURL(currentImage.file);
      tempUrlRef.current = imageUrl; // Track for cleanup
      console.log(`[ImageTrimModal] Regenerated URL from File: ${imageUrl.substring(0, 50)}`);
    }
    setWorkingUrl(imageUrl);

    const detect = async () => {
      setIsLoading(true);
      try {
        const result = await detectContentBounds(
          imageUrl,
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

    // Cleanup temporary URL when image changes or modal closes
    return () => {
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
        tempUrlRef.current = null;
      }
    };
  }, [isOpen, currentImage, detectTransparent]);

  // Drawing function that renders the canvas - extracted to be reusable
  const drawCanvas = useCallback((img: HTMLImageElement) => {
    if (!canvasRef.current || !cropBounds || !detectionResult) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = getDisplayScale();
    const imageDisplayWidth = detectionResult.originalWidth * scale;
    const imageDisplayHeight = detectionResult.originalHeight * scale;

    // Calculate padding values
    const currentPadding = Number(padding) || 0;
    const paddingScaled = currentPadding * scale;
    const displayPadding = currentPadding > 0 ? Math.max(paddingScaled, 15) : 0;

    // Calculate how much the padding extends beyond the image on each side
    // This happens when crop bounds are at or near the image edges
    const cropX = cropBounds.left * scale;
    const cropY = cropBounds.top * scale;
    const cropW = cropBounds.width * scale;
    const cropH = cropBounds.height * scale;

    // Calculate padding overflow on each side
    const paddingOverflowLeft = Math.max(0, displayPadding - cropX);
    const paddingOverflowTop = Math.max(0, displayPadding - cropY);
    const paddingOverflowRight = Math.max(0, (cropX + cropW + displayPadding) - imageDisplayWidth);
    const paddingOverflowBottom = Math.max(0, (cropY + cropH + displayPadding) - imageDisplayHeight);

    // Extend canvas to accommodate padding preview
    const canvasWidth = imageDisplayWidth + paddingOverflowLeft + paddingOverflowRight;
    const canvasHeight = imageDisplayHeight + paddingOverflowTop + paddingOverflowBottom;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Offset for drawing the image (shifted by left/top padding overflow)
    const imageOffsetX = paddingOverflowLeft;
    const imageOffsetY = paddingOverflowTop;

    // Fill extended areas with transparent checkered pattern to show padding zone
    if (currentPadding > 0 && (paddingOverflowLeft > 0 || paddingOverflowTop > 0 || paddingOverflowRight > 0 || paddingOverflowBottom > 0)) {
      // Draw a subtle checkered pattern for the extended area (padding preview zone)
      const patternSize = 10;
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.fillStyle = '#e2e8f0';
      for (let y = 0; y < canvasHeight; y += patternSize) {
        for (let x = 0; x < canvasWidth; x += patternSize) {
          if ((Math.floor(x / patternSize) + Math.floor(y / patternSize)) % 2 === 0) {
            ctx.fillRect(x, y, patternSize, patternSize);
          }
        }
      }
    }

    // Draw image at offset position
    ctx.drawImage(img, imageOffsetX, imageOffsetY, imageDisplayWidth, imageDisplayHeight);

    // Adjusted crop coordinates (shifted by image offset)
    const adjCropX = cropX + imageOffsetX;
    const adjCropY = cropY + imageOffsetY;

    // Calculate the effective "keep" area (crop area + padding)
    const keepX = adjCropX - displayPadding;
    const keepY = adjCropY - displayPadding;
    const keepW = cropW + displayPadding * 2;
    const keepH = cropH + displayPadding * 2;

    // Draw semi-transparent overlay on areas that will be trimmed away
    // This covers the original image area that's outside the keep area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // We need to cover areas of the IMAGE that are outside the keep area
    // (not the extended canvas area - that shows the padding preview)
    const imgLeft = imageOffsetX;
    const imgTop = imageOffsetY;
    const imgRight = imageOffsetX + imageDisplayWidth;
    const imgBottom = imageOffsetY + imageDisplayHeight;

    // Top region of image (above keep area, within image bounds)
    if (keepY > imgTop) {
      ctx.fillRect(imgLeft, imgTop, imageDisplayWidth, keepY - imgTop);
    }
    // Bottom region of image (below keep area, within image bounds)
    const keepBottom = keepY + keepH;
    if (keepBottom < imgBottom) {
      ctx.fillRect(imgLeft, keepBottom, imageDisplayWidth, imgBottom - keepBottom);
    }
    // Left region of image (left of keep area, between top and bottom overlays)
    const overlayTop = Math.max(imgTop, keepY);
    const overlayBottom = Math.min(imgBottom, keepBottom);
    const overlayHeight = overlayBottom - overlayTop;
    if (keepX > imgLeft && overlayHeight > 0) {
      ctx.fillRect(imgLeft, overlayTop, keepX - imgLeft, overlayHeight);
    }
    // Right region of image (right of keep area, between top and bottom overlays)
    const keepRight = keepX + keepW;
    if (keepRight < imgRight && overlayHeight > 0) {
      ctx.fillRect(keepRight, overlayTop, imgRight - keepRight, overlayHeight);
    }

    // Draw crop rectangle border (green - content area)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(adjCropX, adjCropY, cropW, cropH);
    ctx.setLineDash([]);

    // Draw padding indicator (blue dashed outer box) if padding > 0
    if (currentPadding > 0) {
      // Draw the outer padding box border - bright blue, thick line
      ctx.strokeStyle = '#2563EB'; // Bright blue
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(keepX, keepY, keepW, keepH);
      ctx.setLineDash([]);

      // Draw padding label - position at bottom-right of padding box
      ctx.font = 'bold 12px sans-serif';
      const labelText = `+${currentPadding}px padding`;
      const labelWidth = ctx.measureText(labelText).width;
      const labelX = Math.max(8, keepX + keepW - labelWidth - 8);
      const labelY = keepY + keepH - 6;

      // Background for label
      ctx.fillStyle = 'rgba(37, 99, 235, 0.95)'; // Blue background
      ctx.fillRect(labelX - 4, labelY - 12, labelWidth + 8, 18);
      // Label text
      ctx.fillStyle = '#ffffff'; // White text for contrast
      ctx.fillText(labelText, labelX, labelY);
    }

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
    drawHandle(adjCropX - handleSize / 2, adjCropY - handleSize / 2, handleSize, handleSize);
    // Top-right
    drawHandle(adjCropX + cropW - handleSize / 2, adjCropY - handleSize / 2, handleSize, handleSize);
    // Bottom-left
    drawHandle(adjCropX - handleSize / 2, adjCropY + cropH - handleSize / 2, handleSize, handleSize);
    // Bottom-right
    drawHandle(adjCropX + cropW - handleSize / 2, adjCropY + cropH - handleSize / 2, handleSize, handleSize);

    // Draw edge handles - larger
    const edgeHandleWidth = 28;
    const edgeHandleHeight = 8;

    // Top edge
    drawHandle(
      adjCropX + cropW / 2 - edgeHandleWidth / 2,
      adjCropY - edgeHandleHeight / 2,
      edgeHandleWidth,
      edgeHandleHeight
    );
    // Bottom edge
    drawHandle(
      adjCropX + cropW / 2 - edgeHandleWidth / 2,
      adjCropY + cropH - edgeHandleHeight / 2,
      edgeHandleWidth,
      edgeHandleHeight
    );
    // Left edge
    drawHandle(
      adjCropX - edgeHandleHeight / 2,
      adjCropY + cropH / 2 - edgeHandleWidth / 2,
      edgeHandleHeight,
      edgeHandleWidth
    );
    // Right edge
    drawHandle(
      adjCropX + cropW - edgeHandleHeight / 2,
      adjCropY + cropH / 2 - edgeHandleWidth / 2,
      edgeHandleHeight,
      edgeHandleWidth
    );
  }, [cropBounds, detectionResult, getDisplayScale, padding]);

  // Load image when URL changes
  useEffect(() => {
    if (!workingUrl || !currentImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      drawCanvas(img);
    };
    img.src = workingUrl;
  }, [workingUrl, currentImage, drawCanvas]);

  // Redraw canvas when drawing parameters change (padding, cropBounds, zoom, etc.)
  useEffect(() => {
    if (loadedImageRef.current && cropBounds && detectionResult) {
      drawCanvas(loadedImageRef.current);
    }
  }, [cropBounds, detectionResult, getDisplayScale, zoomLevel, padding, drawCanvas]);

  // Calculate canvas offset due to padding overflow (needed for mouse handling)
  const getCanvasOffset = useCallback(() => {
    if (!cropBounds || !detectionResult) return { x: 0, y: 0 };

    const scale = getDisplayScale();
    const currentPadding = Number(padding) || 0;
    const paddingScaled = currentPadding * scale;
    const displayPadding = currentPadding > 0 ? Math.max(paddingScaled, 15) : 0;

    const cropX = cropBounds.left * scale;
    const cropY = cropBounds.top * scale;

    // Calculate padding overflow on left/top
    const paddingOverflowLeft = Math.max(0, displayPadding - cropX);
    const paddingOverflowTop = Math.max(0, displayPadding - cropY);

    return { x: paddingOverflowLeft, y: paddingOverflowTop };
  }, [cropBounds, detectionResult, getDisplayScale, padding]);

  // Handle mouse events for dragging
  const getHandleAtPosition = (x: number, y: number): DragHandle => {
    if (!cropBounds || !detectionResult) return null;

    const scale = getDisplayScale();
    const handleSize = 18; // Hit area size (slightly larger than visual handle for easier grabbing)

    // Account for canvas offset due to padding overflow
    const offset = getCanvasOffset();

    // Use cropBounds for handle positions, adjusted by offset
    const left = cropBounds.left * scale + offset.x;
    const right = (cropBounds.left + cropBounds.width) * scale + offset.x;
    const top = cropBounds.top * scale + offset.y;
    const bottom = (cropBounds.top + cropBounds.height) * scale + offset.y;

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
    if (!currentImage || !cropBounds || !detectionResult || !workingUrl) return;

    try {
      // Use workingUrl instead of currentImage.url (which may be empty after layout generation)
      // Pass padding as the 4th argument - it will add transparent space around the cropped content
      const result = await cropImage(workingUrl, cropBounds, currentImage.file.name, padding);

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
    if (!currentImage || !cropBounds || !detectionResult || !workingUrl) {
      return;
    }

    setIsLoading(true);
    try {
      // Use workingUrl instead of currentImage.url (which may be empty after layout generation)
      // Pass padding as the 4th argument - it will add transparent space around the cropped content
      const result = await cropImage(workingUrl, cropBounds, currentImage.file.name, padding);

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

  // Calculate canvas dimensions including padding overflow
  const getCanvasDimensions = () => {
    if (!detectionResult || !cropBounds) return { width: 0, height: 0 };

    const scale = getDisplayScale();
    const imageDisplayWidth = detectionResult.originalWidth * scale;
    const imageDisplayHeight = detectionResult.originalHeight * scale;

    const currentPadding = Number(padding) || 0;
    const paddingScaled = currentPadding * scale;
    const displayPadding = currentPadding > 0 ? Math.max(paddingScaled, 15) : 0;

    const cropX = cropBounds.left * scale;
    const cropY = cropBounds.top * scale;
    const cropW = cropBounds.width * scale;
    const cropH = cropBounds.height * scale;

    const paddingOverflowLeft = Math.max(0, displayPadding - cropX);
    const paddingOverflowTop = Math.max(0, displayPadding - cropY);
    const paddingOverflowRight = Math.max(0, (cropX + cropW + displayPadding) - imageDisplayWidth);
    const paddingOverflowBottom = Math.max(0, (cropY + cropH + displayPadding) - imageDisplayHeight);

    return {
      width: imageDisplayWidth + paddingOverflowLeft + paddingOverflowRight,
      height: imageDisplayHeight + paddingOverflowTop + paddingOverflowBottom
    };
  };

  const canvasDimensions = getCanvasDimensions();

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
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 p-1">
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
              <div className="w-px h-5 bg-gray-300 mx-0.5" />
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

            {/* Preview background toggle */}
            <div className="absolute top-2 left-2 z-10">
              <PreviewBackgroundToggle
                value={previewBg}
                onChange={setPreviewBg}
                className="bg-white/95 backdrop-blur-sm shadow-md"
              />
            </div>

            {/* Scrollable container for zoomed image */}
            <div
              ref={scrollContainerRef}
              className="overflow-auto rounded-lg"
              style={{
                maxHeight: '468px',
                ...getPreviewBackgroundStyle(previewBg),
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
                      width: canvasDimensions.width,
                      height: canvasDimensions.height,
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
          {detectionResult && cropBounds && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Original: </span>
                <span className="font-medium">{detectionResult.originalWidth} × {detectionResult.originalHeight} px</span>
              </div>
              <div className="bg-indigo-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Output: </span>
                <span className="font-medium text-indigo-700">
                  {cropBounds.width + (padding * 2)} × {cropBounds.height + (padding * 2)} px
                  {padding > 0 && <span className="text-indigo-600 ml-1">(+{padding}px padding)</span>}
                </span>
              </div>
              <div className="bg-blue-100 rounded-lg px-3 py-2">
                <span className="text-muted-foreground">Reduction: </span>
                <span className="font-medium text-blue-700">
                  {Math.round((1 - ((cropBounds.width + padding * 2) * (cropBounds.height + padding * 2)) / (detectionResult.originalWidth * detectionResult.originalHeight)) * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
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
                max={200}
                value={padding}
                onChange={(e) => setPadding(Math.max(0, Math.min(200, parseInt(e.target.value) || 0)))}
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
                        ? 'bg-indigo-600'
                        : trimmedImages.has(images[idx].id)
                          ? 'bg-indigo-300'
                          : 'bg-gray-300'
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
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
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
