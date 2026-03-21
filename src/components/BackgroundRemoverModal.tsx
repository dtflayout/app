import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImageObject } from "./CollageCreator";
import {
  RGBColor,
  ColorWithTolerance,
  removeColorsFromImage,
  generateRemovalPreviewMultiple,
  rgbToHex,
} from "@/utils/backgroundRemovalUtils";
import { generateThumbnail } from "@/utils/thumbnailUtils";
import { toast } from "sonner";
import { Eraser, ZoomIn, ZoomOut, Maximize2, RotateCcw, Eye, EyeOff, X, Trash2, Download } from "lucide-react";
import { PreviewBackgroundToggle, PreviewBackground, getPreviewBackgroundStyle } from "./PreviewBackgroundToggle";

// Custom eyedropper cursor as data URL
const EYEDROPPER_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 22 1-1h3l9-9'/%3E%3Cpath d='M3 21v-3l9-9'/%3E%3Cpath d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z'/%3E%3C/svg%3E") 0 24, crosshair`;

interface BackgroundRemoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageObject | null;
  onRemovalComplete: (newImage: ImageObject) => void;
}

export const BackgroundRemoverModal = ({
  isOpen,
  onClose,
  image,
  onRemovalComplete,
}: BackgroundRemoverModalProps) => {
  const [selectedColors, setSelectedColors] = useState<ColorWithTolerance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(75);
  const [isPanning, setIsPanning] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  // Working URL for the image - either from image.url or regenerated from File
  const [workingUrl, setWorkingUrl] = useState<string>('');
  // Preview background color
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('transparent');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate base scale to fit image in container
  const getBaseScale = useCallback(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return 1;
    const maxWidth = 675;
    const maxHeight = 450;
    const scaleX = maxWidth / imageSize.width;
    const scaleY = maxHeight / imageSize.height;
    return Math.min(scaleX, scaleY, 1);
  }, [imageSize]);

  // Calculate display scale including zoom
  const getDisplayScale = useCallback(() => {
    const baseScale = getBaseScale();
    return baseScale * (zoomLevel / 100);
  }, [getBaseScale, zoomLevel]);

  // Track temporary URL created from File (for memory optimization cleanup)
  const tempUrlRef = useRef<string | null>(null);

  // Load image when modal opens
  useEffect(() => {
    if (!isOpen || !image) return;

    setIsLoading(true);
    setSelectedColors([]);
    setShowOriginal(false);
    setPreviewCanvas(null);

    // MEMORY OPTIMIZATION: If url is empty (cleared after layout generation),
    // regenerate it from the File object temporarily for modal use
    let imageUrl = image.url;
    if (!imageUrl || imageUrl === '') {
      imageUrl = URL.createObjectURL(image.file);
      tempUrlRef.current = imageUrl; // Track for cleanup
      console.log(`[BackgroundRemover] Regenerated URL from File: ${imageUrl.substring(0, 50)}`);
    }
    // Store the working URL for use throughout the modal
    setWorkingUrl(imageUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });

      // Store original image data for color sampling
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        originalImageDataRef.current = tempCtx.getImageData(0, 0, img.width, img.height);
      }

      setIsLoading(false);
    };
    img.onerror = () => {
      toast.error("Failed to load image");
      setIsLoading(false);
    };
    img.src = imageUrl;

    return () => {
      originalImageDataRef.current = null;
      imageRef.current = null;
      setWorkingUrl('');
      // MEMORY OPTIMIZATION: Revoke temporary URL when modal closes
      if (tempUrlRef.current) {
        URL.revokeObjectURL(tempUrlRef.current);
        tempUrlRef.current = null;
      }
    };
  }, [isOpen, image]);

  // Draw canvas (either original or preview)
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || imageSize.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = getDisplayScale();
    const displayWidth = imageSize.width * scale;
    const displayHeight = imageSize.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw background based on preview mode
    if (previewBg === 'grey') {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else if (previewBg === 'black') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, displayWidth, displayHeight);
    } else {
      // Draw checkered background for transparency
      const checkerSize = 10;
      for (let y = 0; y < displayHeight; y += checkerSize) {
        for (let x = 0; x < displayWidth; x += checkerSize) {
          const isLight = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
          ctx.fillStyle = isLight ? '#ffffff' : '#e2e8f0';
          ctx.fillRect(x, y, checkerSize, checkerSize);
        }
      }
    }

    // Draw image (original or preview)
    if (showOriginal || !previewCanvas || selectedColors.length === 0) {
      ctx.drawImage(imageRef.current, 0, 0, displayWidth, displayHeight);
    } else {
      ctx.drawImage(previewCanvas, 0, 0, displayWidth, displayHeight);
    }
  }, [imageSize, getDisplayScale, zoomLevel, showOriginal, previewCanvas, selectedColors.length, previewBg]);

  // Generate preview when colors or tolerances change (debounced)
  useEffect(() => {
    if (selectedColors.length === 0 || !image) {
      setPreviewCanvas(null);
      return;
    }

    // Clear any pending timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce preview generation
    debounceTimeoutRef.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        // Use workingUrl instead of image.url (which may be empty after layout generation)
        const preview = await generateRemovalPreviewMultiple(workingUrl, selectedColors);
        setPreviewCanvas(preview);
      } catch (error) {
        console.error("Failed to generate preview:", error);
      } finally {
        setIsProcessing(false);
      }
    }, 150);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedColors, workingUrl]);

  // Check if a color is already in the selected list (within a small tolerance)
  const isColorAlreadySelected = (newColor: RGBColor): boolean => {
    return selectedColors.some(({ color }) =>
      Math.abs(color.r - newColor.r) < 5 &&
      Math.abs(color.g - newColor.g) < 5 &&
      Math.abs(color.b - newColor.b) < 5
    );
  };

  // Handle canvas click to sample and ADD color
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !originalImageDataRef.current || isPanning) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Scale to original image coordinates
    const scale = getDisplayScale();
    const imgX = Math.floor(canvasX / scale);
    const imgY = Math.floor(canvasY / scale);

    // Get color from original image data
    const data = originalImageDataRef.current.data;
    const idx = (imgY * imageSize.width + imgX) * 4;

    if (idx >= 0 && idx < data.length - 3) {
      const color: RGBColor = {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
      };

      // Check if color is already selected
      if (isColorAlreadySelected(color)) {
        toast.info(`Color ${rgbToHex(color)} is already selected`);
        return;
      }

      // Add to selected colors with default 30% tolerance
      setSelectedColors(prev => [...prev, { color, tolerance: 30 }]);
      toast.success(`Added color: ${rgbToHex(color)}`);
    }
  };

  // Update tolerance for a specific color
  const handleToleranceChange = (index: number, newTolerance: number) => {
    setSelectedColors(prev => prev.map((item, i) =>
      i === index ? { ...item, tolerance: newTolerance } : item
    ));
  };

  // Remove a specific color from the list
  const handleRemoveColor = (index: number) => {
    setSelectedColors(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all selected colors
  const handleClearAllColors = () => {
    setSelectedColors([]);
    setPreviewCanvas(null);
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

  // Pan handlers
  const canPan = zoomLevel > 100;

  const handlePanStart = (e: React.MouseEvent) => {
    if (!canPan || !scrollContainerRef.current) return;

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

  // Reset to original
  const handleReset = () => {
    setSelectedColors([]);
    setPreviewCanvas(null);
  };

  // Download current preview as PNG
  const handleDownload = () => {
    if (!previewCanvas || !image) return;

    // Convert canvas to blob and download
    previewCanvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to generate download");
        return;
      }

      // Create filename: originalName_nobg.png
      const originalName = image.file.name;
      const nameParts = originalName.split('.');
      nameParts.pop(); // Remove extension
      const baseName = nameParts.join('.');
      const downloadName = `${baseName}_nobg.png`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${downloadName}`);
    }, 'image/png', 1.0);
  };

  // Keep original (close without changes)
  const handleKeepOriginal = () => {
    handleClose();
  };

  // Apply removal
  const handleApply = async () => {
    if (!image || selectedColors.length === 0 || !workingUrl) return;

    setIsLoading(true);
    try {
      // Use workingUrl instead of image.url (which may be empty after layout generation)
      const result = await removeColorsFromImage(
        workingUrl,
        selectedColors,
        image.file.name
      );

      // Generate thumbnail for the processed image (for gallery display)
      let thumbnailUrl: string;
      try {
        thumbnailUrl = await generateThumbnail(result.file, 300);
      } catch (error) {
        console.error('Failed to generate thumbnail for processed image:', error);
        // Fallback to full URL if thumbnail generation fails
        thumbnailUrl = result.url;
      }

      const newImage: ImageObject = {
        id: image.id,
        file: result.file,
        url: result.url,
        thumbnailUrl,
        originalWidth: image.originalWidth || imageSize.width,
        originalHeight: image.originalHeight || imageSize.height,
      };

      onRemovalComplete(newImage);
      toast.success("Background removed successfully!");
      handleClose();
    } catch (error) {
      console.error("Failed to remove background:", error);
      toast.error("Failed to remove background");
    } finally {
      setIsLoading(false);
    }
  };

  // Close and cleanup
  const handleClose = () => {
    setSelectedColors([]);
    setPreviewCanvas(null);
    setZoomLevel(75);
    setShowOriginal(false);
    originalImageDataRef.current = null;
    imageRef.current = null;
    onClose();
  };

  if (!image) return null;

  const scale = getDisplayScale();
  const displayWidth = imageSize.width * scale;
  const displayHeight = imageSize.height * scale;

  // Determine cursor style
  const getCursorStyle = () => {
    if (canPan) {
      return isPanning ? 'grabbing' : 'grab';
    }
    return EYEDROPPER_CURSOR;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eraser className="h-5 w-5" />
            Remove Background Color
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            Click on the image to select background colors to remove. Each color has its own tolerance slider.
          </div>

          {/* Image preview with zoom controls */}
          <div ref={containerRef} className="relative">
            {/* Zoom controls */}
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

            {/* Before/After toggle and preview background */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
              {selectedColors.length > 0 && (
                <Button
                  type="button"
                  variant={showOriginal ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="h-8 gap-1.5"
                >
                  {showOriginal ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {showOriginal ? "Original" : "Preview"}
                </Button>
              )}
              <PreviewBackgroundToggle
                value={previewBg}
                onChange={setPreviewBg}
                className="bg-white/95 backdrop-blur-sm shadow-md"
              />
            </div>

            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute top-14 left-2 z-10 bg-white/90 rounded-lg px-3 py-1.5 text-sm text-gray-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                Processing...
              </div>
            )}

            {/* Scrollable container for zoomed image */}
            <div
              ref={scrollContainerRef}
              className="overflow-auto rounded-lg border border-gray-200"
              style={{
                maxHeight: '468px',
                cursor: getCursorStyle(),
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
                    <span className="text-sm text-muted-foreground">Loading image...</span>
                  </div>
                ) : (
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{
                      width: displayWidth,
                      height: displayHeight,
                      cursor: getCursorStyle(),
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Selected colors with individual tolerance controls */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Colors to remove:</Label>
              {selectedColors.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllColors}
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {selectedColors.length > 0 ? (
              <div className="space-y-2">
                {selectedColors.map(({ color, tolerance }, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm"
                  >
                    {/* Color swatch */}
                    <div
                      className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: rgbToHex(color) }}
                    />
                    {/* Hex code */}
                    <span className="text-xs font-mono text-gray-600 w-16 flex-shrink-0">
                      {rgbToHex(color)}
                    </span>
                    {/* Tolerance slider */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Slider
                        value={[tolerance]}
                        onValueChange={([value]) => handleToleranceChange(index, value)}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono text-gray-500 w-10 text-right flex-shrink-0">
                        {tolerance}%
                      </span>
                    </div>
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(index)}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                      title="Remove this color"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                Click on the image to select colors to remove
              </p>
            )}

            {selectedColors.length > 0 && (
              <p className="text-xs text-gray-500">
                Adjust each color's tolerance individually. Higher values remove more similar colors.
              </p>
            )}
          </div>

          {/* Image info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <span className="text-muted-foreground">Size: </span>
              <span className="font-medium">{imageSize.width} x {imageSize.height} px</span>
            </div>
            <div className="bg-gray-100 rounded-lg px-3 py-2">
              <span className="text-muted-foreground">File: </span>
              <span className="font-medium">{image.file.name}</span>
            </div>
            {selectedColors.length > 0 && (
              <div className="bg-purple-100 rounded-lg px-3 py-2">
                <span className="text-purple-700 font-medium">{selectedColors.length} color(s) selected</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto sm:mr-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              disabled={isLoading || !previewCanvas || selectedColors.length === 0}
              className="flex-1 sm:flex-none"
              title="Download preview as PNG with transparency"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || selectedColors.length === 0}
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleKeepOriginal}
              disabled={isLoading}
              className="flex-1 sm:flex-none"
            >
              Keep Original
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={isLoading || selectedColors.length === 0}
              className="flex-1 sm:flex-none bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              <Eraser className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
