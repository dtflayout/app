import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  EnhancementSettings,
  defaultEnhancementSettings,
  applyColorAdjustments,
  applyColorAdjustmentsToCanvas,
  applyStrokeToCanvas,
  applyEnhancementsToBlob,
  hasChanges,
} from "@/utils/imageEnhancementUtils";
import { toast } from "sonner";
import {
  Upload,
  Download,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Sun,
  Contrast,
  Palette,
  Droplets,
  CircleDot,
  X,
  Check,
  Eraser,
  Scissors,
  Undo2,
  Trash2,
  Circle,
  PenTool,
  Wand2,
  Image as ImageIcon,
} from "lucide-react";
import { BackgroundRemoverModal } from "@/components/BackgroundRemoverModal";
import { ImageTrimModal } from "@/components/ImageTrimModal";
import { ImageObject } from "@/components/CollageCreator";

const ImageEnhancerPage = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [settings, setSettings] = useState<EnhancementSettings>(defaultEnhancementSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  // Stroke is applied on-demand, not in real-time
  const [strokeApplied, setStrokeApplied] = useState(false);
  const [isApplyingStroke, setIsApplyingStroke] = useState(false);
  // Modal states
  const [showBackgroundRemover, setShowBackgroundRemover] = useState(false);
  const [showTrimModal, setShowTrimModal] = useState(false);

  // Eraser tool state
  const [eraserEnabled, setEraserEnabled] = useState(false);
  const [eraserBrushSize, setEraserBrushSize] = useState(20);
  const [isErasing, setIsErasing] = useState(false);
  const [eraserStrokes, setEraserStrokes] = useState<ImageData[]>([]); // For undo

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eraserCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  // Color adjusted canvas (without stroke) - base for applying stroke
  const colorAdjustedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Pure stroked canvas (stroke applied to color-adjusted, before further color adjustments)
  const pureStrokedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Final combined canvas: stroke + color adjustments (this is what we display)
  const strokedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Store the canvas state before erasing for undo
  const preEraserCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastEraserPosRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate display scale
  const getDisplayScale = useCallback(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return 1;
    const maxWidth = 600;
    const maxHeight = 500;
    const scaleX = maxWidth / imageSize.width;
    const scaleY = maxHeight / imageSize.height;
    const baseScale = Math.min(scaleX, scaleY, 1);
    return baseScale * (zoomLevel / 100);
  }, [imageSize, zoomLevel]);

  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      toast.error("Failed to load image");
    };
    img.src = imageUrl;

    return () => {
      originalImageRef.current = null;
    };
  }, [imageUrl]);

  // Helper to draw canvas to display with checkered background
  const drawToDisplay = useCallback((sourceCanvas: HTMLCanvasElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = getDisplayScale();
    const displayWidth = sourceCanvas.width * scale;
    const displayHeight = sourceCanvas.height * scale;

    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Draw checkered background for transparency
    const checkerSize = 10;
    for (let y = 0; y < displayHeight; y += checkerSize) {
      for (let x = 0; x < displayWidth; x += checkerSize) {
        const isLight = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#ffffff' : '#e2e8f0';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    // Draw enhanced image
    ctx.drawImage(sourceCanvas, 0, 0, displayWidth, displayHeight);
  }, [getDisplayScale]);

  // Apply color adjustments in real-time (fast, no stroke)
  // If stroke has been applied, apply color adjustments on TOP of the stroked image
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    // Need original image to be loaded
    if (imageSize.width === 0) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setIsProcessing(true);
      try {
        // First, always apply color adjustments to original image (for stroke base)
        const colorCanvas = await applyColorAdjustments(imageUrl, settings);
        colorAdjustedCanvasRef.current = colorCanvas;

        // If stroke has been applied, apply color adjustments to the stroked canvas
        if (pureStrokedCanvasRef.current && strokeApplied) {
          // Apply color adjustments on top of the pure stroked canvas
          const combinedCanvas = applyColorAdjustmentsToCanvas(pureStrokedCanvasRef.current, settings);
          strokedCanvasRef.current = combinedCanvas;
          drawToDisplay(combinedCanvas);
        } else {
          // No stroke, just display color-adjusted image
          drawToDisplay(colorCanvas);
        }
      } catch {
        // Error applying enhancements - silently fail
      } finally {
        setIsProcessing(false);
      }
    }, 100);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [imageUrl, settings.brightness, settings.contrast, settings.vibrance, settings.hue, settings.saturation, zoomLevel, drawToDisplay, imageSize.width, strokeApplied]);

  // Apply stroke on-demand (when Apply Stroke button is clicked)
  const handleApplyStroke = useCallback(async () => {
    if (!colorAdjustedCanvasRef.current || !settings.stroke.enabled) {
      return;
    }

    setIsApplyingStroke(true);

    // Use requestAnimationFrame to ensure UI updates before heavy processing
    requestAnimationFrame(() => {
      try {
        // Apply stroke to the color-adjusted canvas (no color adjustments yet on stroke)
        const strokeCanvas = applyStrokeToCanvas(
          colorAdjustedCanvasRef.current!,
          settings.stroke.color,
          settings.stroke.width
        );

        // Store the "pure" stroked canvas (stroke applied, but no color adjustments on stroke pixels)
        pureStrokedCanvasRef.current = strokeCanvas;

        // Also apply current color adjustments to get the final display canvas
        const combinedCanvas = applyColorAdjustmentsToCanvas(strokeCanvas, settings);
        strokedCanvasRef.current = combinedCanvas;

        drawToDisplay(combinedCanvas);
        setStrokeApplied(true);
        setImageSize({ width: strokeCanvas.width, height: strokeCanvas.height });

        toast.success("Stroke applied!");
      } catch {
        toast.error("Failed to apply stroke");
      } finally {
        setIsApplyingStroke(false);
      }
    });
  }, [settings.stroke.enabled, settings.stroke.color, settings.stroke.width, settings, drawToDisplay]);

  // Remove stroke
  const handleRemoveStroke = useCallback(async () => {
    if (!imageUrl) return;

    // Clear the stroked canvas refs
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    setStrokeApplied(false);

    // Re-render without stroke
    if (colorAdjustedCanvasRef.current) {
      drawToDisplay(colorAdjustedCanvasRef.current);
      // Reset image size to original
      const img = originalImageRef.current;
      if (img) {
        setImageSize({ width: img.width, height: img.height });
      }
    }
    toast.info("Stroke removed");
  }, [imageUrl, drawToDisplay]);

  // Eraser tool handlers
  const getEraserPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = eraserCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scale = getDisplayScale();

    // Get position relative to canvas, then convert to image coordinates
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    return { x, y };
  }, [getDisplayScale]);

  const saveStateForUndo = useCallback(() => {
    const canvas = eraserCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setEraserStrokes(prev => [...prev.slice(-19), imageData]); // Keep last 20 states
  }, []);

  const handleEraserMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eraserEnabled) return;

    const pos = getEraserPosition(e);
    if (!pos) return;

    // Save state before starting to erase
    saveStateForUndo();

    setIsErasing(true);
    lastEraserPosRef.current = pos;

    // Draw initial point
    const canvas = eraserCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, eraserBrushSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Redraw to main canvas
    redrawWithEraser();
  }, [eraserEnabled, getEraserPosition, saveStateForUndo, eraserBrushSize]);

  const handleEraserMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!eraserEnabled || !isErasing) return;

    const pos = getEraserPosition(e);
    if (!pos || !lastEraserPosRef.current) return;

    const canvas = eraserCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = eraserBrushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastEraserPosRef.current.x, lastEraserPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastEraserPosRef.current = pos;

    // Redraw to main canvas
    redrawWithEraser();
  }, [eraserEnabled, isErasing, getEraserPosition, eraserBrushSize]);

  const handleEraserMouseUp = useCallback(() => {
    setIsErasing(false);
    lastEraserPosRef.current = null;
  }, []);

  const redrawWithEraser = useCallback(() => {
    const mainCanvas = canvasRef.current;
    const eraserCanvas = eraserCanvasRef.current;
    if (!mainCanvas || !eraserCanvas) return;

    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    const scale = getDisplayScale();
    const displayWidth = eraserCanvas.width * scale;
    const displayHeight = eraserCanvas.height * scale;

    mainCanvas.width = displayWidth;
    mainCanvas.height = displayHeight;

    // Draw checkered background
    const checkerSize = 10;
    for (let y = 0; y < displayHeight; y += checkerSize) {
      for (let x = 0; x < displayWidth; x += checkerSize) {
        const isLight = ((x / checkerSize) + (y / checkerSize)) % 2 === 0;
        ctx.fillStyle = isLight ? '#ffffff' : '#e2e8f0';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    // Draw the eraser canvas content (which has the erased image)
    ctx.drawImage(eraserCanvas, 0, 0, displayWidth, displayHeight);
  }, [getDisplayScale]);

  const handleUndoErase = useCallback(() => {
    if (eraserStrokes.length === 0) return;

    const canvas = eraserCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = eraserStrokes[eraserStrokes.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setEraserStrokes(prev => prev.slice(0, -1));

    redrawWithEraser();
    toast.info("Undo eraser stroke");
  }, [eraserStrokes, redrawWithEraser]);

  const handleClearErasing = useCallback(() => {
    // Reset eraser canvas to the current processed image
    const sourceCanvas = strokedCanvasRef.current || colorAdjustedCanvasRef.current;
    if (!sourceCanvas) return;

    const eraserCanvas = eraserCanvasRef.current;
    if (!eraserCanvas) return;

    const ctx = eraserCanvas.getContext('2d');
    if (!ctx) return;

    eraserCanvas.width = sourceCanvas.width;
    eraserCanvas.height = sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0);

    setEraserStrokes([]);
    redrawWithEraser();
    toast.info("Erasing cleared");
  }, [redrawWithEraser]);

  // Initialize eraser canvas when eraser mode is enabled or image changes
  useEffect(() => {
    if (!eraserEnabled) return;

    const sourceCanvas = strokedCanvasRef.current || colorAdjustedCanvasRef.current;
    if (!sourceCanvas) return;

    const eraserCanvas = eraserCanvasRef.current;
    if (!eraserCanvas) return;

    const ctx = eraserCanvas.getContext('2d');
    if (!ctx) return;

    // Initialize eraser canvas with current image state
    eraserCanvas.width = sourceCanvas.width;
    eraserCanvas.height = sourceCanvas.height;
    ctx.drawImage(sourceCanvas, 0, 0);

    // Store pre-eraser state for potential reset
    preEraserCanvasRef.current = sourceCanvas;
  }, [eraserEnabled, strokeApplied]);

  // Handle file upload
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Cleanup old URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageFile(file);
    setSettings(defaultEnhancementSettings);
    setStrokeApplied(false);
    setEraserEnabled(false);
    setEraserStrokes([]);
    colorAdjustedCanvasRef.current = null;
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    preEraserCanvasRef.current = null;
    toast.success(`Loaded: ${file.name}`);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Update a single setting
  const updateSetting = <K extends keyof EnhancementSettings>(
    key: K,
    value: EnhancementSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Update stroke settings
  const updateStrokeSetting = <K extends keyof EnhancementSettings['stroke']>(
    key: K,
    value: EnhancementSettings['stroke'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      stroke: { ...prev.stroke, [key]: value },
    }));
  };

  // Reset all settings
  const handleReset = () => {
    setSettings(defaultEnhancementSettings);
    setStrokeApplied(false);
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    // Re-render without stroke by reloading the image
    if (originalImageRef.current) {
      setImageSize({ width: originalImageRef.current.width, height: originalImageRef.current.height });
    }
    toast.info("Settings reset to default");
  };

  // Download enhanced image
  const handleDownload = async () => {
    if (!imageUrl || !imageFile) return;

    setIsProcessing(true);
    try {
      let downloadCanvas: HTMLCanvasElement | null = null;

      // If eraser is enabled and has been used, use the eraser canvas
      if (eraserEnabled && eraserCanvasRef.current) {
        downloadCanvas = eraserCanvasRef.current;
      } else if (strokedCanvasRef.current) {
        downloadCanvas = strokedCanvasRef.current;
      } else if (colorAdjustedCanvasRef.current) {
        downloadCanvas = colorAdjustedCanvasRef.current;
      }

      if (downloadCanvas) {
        // Create blob from canvas directly
        const blob = await new Promise<Blob | null>((resolve) => {
          downloadCanvas!.toBlob(resolve, 'image/png', 1.0);
        });

        if (!blob) {
          throw new Error('Failed to create blob');
        }

        const nameParts = imageFile.name.split('.');
        nameParts.pop();
        const baseName = nameParts.join('.');
        const newFileName = `${baseName}_enhanced.png`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = newFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Downloaded: ${newFileName}`);
      } else {
        // Fallback to original method
        const result = await applyEnhancementsToBlob(imageUrl, settings, imageFile.name);

        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(result.url);

        toast.success(`Downloaded: ${result.file.name}`);
      }
    } catch {
      toast.error("Failed to download image");
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear image
  const handleClear = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageUrl(null);
    setImageFile(null);
    setSettings(defaultEnhancementSettings);
    setImageSize({ width: 0, height: 0 });
    setStrokeApplied(false);
    setEraserEnabled(false);
    setEraserStrokes([]);
    colorAdjustedCanvasRef.current = null;
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    preEraserCanvasRef.current = null;
  };

  // Create an ImageObject for both modals (they both use ImageObject with 'url' property)
  const currentImageForModal: ImageObject | null = imageUrl && imageFile ? {
    id: 'enhancer-image',
    file: imageFile,
    url: imageUrl,
  } : null;

  // Handle background removal completion (receives ImageObject)
  const handleBackgroundRemovalComplete = (newImage: ImageObject) => {
    // Cleanup old URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    // Update with new image
    setImageUrl(newImage.url);
    setImageFile(newImage.file);
    setSettings(defaultEnhancementSettings);
    setStrokeApplied(false);
    colorAdjustedCanvasRef.current = null;
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    setShowBackgroundRemover(false);
    toast.success("Background removed!");
  };

  // Handle trim completion (receives array of ImageObject)
  const handleTrimComplete = (trimmedImages: ImageObject[]) => {
    // We only pass one image, so get the first result
    const trimmedImage = trimmedImages[0];
    if (!trimmedImage) {
      setShowTrimModal(false);
      return;
    }

    // Cleanup old URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    // Update with new image
    setImageUrl(trimmedImage.url);
    setImageFile(trimmedImage.file);
    setSettings(defaultEnhancementSettings);
    setStrokeApplied(false);
    colorAdjustedCanvasRef.current = null;
    strokedCanvasRef.current = null;
    pureStrokedCanvasRef.current = null;
    setShowTrimModal(false);
    toast.success("Image trimmed!");
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 400));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 25));
  const handleZoomReset = () => setZoomLevel(100);

  const scale = getDisplayScale();
  const displayWidth = imageSize.width * scale;
  const displayHeight = imageSize.height * scale;

  return (
    <AppLayout>
      <div className="p-6 bg-transparent">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-indigo-600" />
              Image Enhancer
            </h1>
            <p className="text-gray-500 mt-1">
              Adjust brightness, contrast, saturation, and more. Add strokes and download your enhanced image.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left side - Image preview */}
            <div className="flex-1">
              {!imageUrl ? (
                // Upload area - entire zone is clickable
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 bg-white shadow-sm cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50 hover:shadow-md'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Upload an image
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Drag and drop or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent double trigger
                      fileInputRef.current?.click();
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              ) : (
                // Image preview
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-100">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">
                        {imageFile?.name}
                      </span>
                      <button
                        onClick={handleClear}
                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 25}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <span className="text-xs font-medium min-w-[40px] text-center">
                        {zoomLevel}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 400}
                        className="h-7 w-7 p-0"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <div className="w-px h-4 bg-gray-300 mx-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomReset}
                        disabled={zoomLevel === 100}
                        className="h-7 w-7 p-0"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Canvas container */}
                  <div
                    ref={scrollContainerRef}
                    className="overflow-auto bg-gray-100"
                    style={{ maxHeight: '500px' }}
                  >
                    <div
                      ref={containerRef}
                      className="flex justify-center items-center p-4 min-h-[300px] relative"
                    >
                      {isProcessing && (
                        <div className="absolute z-20 bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg border border-gray-200">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                          <span className="text-sm text-gray-600 font-medium">Processing...</span>
                        </div>
                      )}
                      {/* Main display canvas */}
                      <canvas
                        ref={canvasRef}
                        style={{
                          width: displayWidth || 'auto',
                          height: displayHeight || 'auto',
                        }}
                      />
                      {/* Eraser overlay canvas - positioned on top when eraser is enabled */}
                      {eraserEnabled && (
                        <canvas
                          ref={eraserCanvasRef}
                          className="absolute"
                          style={{
                            width: displayWidth || 'auto',
                            height: displayHeight || 'auto',
                            cursor: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(eraserBrushSize * scale, 8)}" height="${Math.max(eraserBrushSize * scale, 8)}" viewBox="0 0 ${Math.max(eraserBrushSize * scale, 8)} ${Math.max(eraserBrushSize * scale, 8)}"><circle cx="${Math.max(eraserBrushSize * scale, 8) / 2}" cy="${Math.max(eraserBrushSize * scale, 8) / 2}" r="${Math.max(eraserBrushSize * scale - 2, 6) / 2}" fill="none" stroke="%23000" stroke-width="1"/><circle cx="${Math.max(eraserBrushSize * scale, 8) / 2}" cy="${Math.max(eraserBrushSize * scale, 8) / 2}" r="${Math.max(eraserBrushSize * scale - 2, 6) / 2}" fill="none" stroke="%23fff" stroke-width="1" stroke-dasharray="2,2"/></svg>') ${Math.max(eraserBrushSize * scale, 8) / 2} ${Math.max(eraserBrushSize * scale, 8) / 2}, crosshair`,
                            opacity: 0, // Hide the actual canvas, we draw to main canvas
                            pointerEvents: 'auto',
                          }}
                          onMouseDown={handleEraserMouseDown}
                          onMouseMove={handleEraserMouseMove}
                          onMouseUp={handleEraserMouseUp}
                          onMouseLeave={handleEraserMouseUp}
                        />
                      )}
                      {/* Eraser mode indicator */}
                      {eraserEnabled && (
                        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10 shadow-md">
                          <Eraser className="h-3 w-3" />
                          <span className="font-medium">Eraser Mode</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Image info */}
                  <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-100">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="bg-white border border-gray-200 rounded-full px-3 py-1 font-medium text-gray-600">
                        {imageSize.width} × {imageSize.height} px
                      </span>
                      {hasChanges(settings) && (
                        <span className="bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 font-medium">
                          Modified
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Image Tools - always visible, disabled when no image */}
              <div className="mt-4 bg-gradient-to-br from-gray-50 to-slate-100 rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-indigo-600" />
                  Image Tools
                </h3>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBackgroundRemover(true)}
                    disabled={!imageUrl}
                    className="flex-1 bg-white hover:bg-indigo-50 hover:border-teal-300 hover:text-indigo-700 transition-all"
                  >
                    <Eraser className="h-4 w-4 mr-1.5" />
                    Remove BG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTrimModal(true)}
                    disabled={!imageUrl}
                    className="flex-1 bg-white hover:bg-indigo-50 hover:border-teal-300 hover:text-indigo-700 transition-all"
                  >
                    <Scissors className="h-4 w-4 mr-1.5" />
                    Trim
                  </Button>
                </div>
              </div>
            </div>

            {/* Right side - Controls */}
            <div className="w-full lg:w-80 space-y-4">
              {/* Color Adjustments */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-indigo-600" />
                  Color Adjustments
                </h3>
                <p className="text-xs text-gray-500 mb-4">Fine-tune your image colors</p>

                <div className="space-y-5">
                  {/* Brightness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Sun className="h-3.5 w-3.5 text-amber-500" />
                        Brightness
                      </Label>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {settings.brightness}
                      </span>
                    </div>
                    <Slider
                      value={[settings.brightness]}
                      onValueChange={([v]) => updateSetting('brightness', v)}
                      min={-100}
                      max={100}
                      step={1}
                      disabled={!imageUrl}
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Contrast className="h-3.5 w-3.5 text-gray-600" />
                        Contrast
                      </Label>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {settings.contrast}
                      </span>
                    </div>
                    <Slider
                      value={[settings.contrast]}
                      onValueChange={([v]) => updateSetting('contrast', v)}
                      min={-100}
                      max={100}
                      step={1}
                      disabled={!imageUrl}
                    />
                  </div>

                  {/* Vibrance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-pink-500" />
                        Vibrance
                      </Label>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {settings.vibrance}
                      </span>
                    </div>
                    <Slider
                      value={[settings.vibrance]}
                      onValueChange={([v]) => updateSetting('vibrance', v)}
                      min={-100}
                      max={100}
                      step={1}
                      disabled={!imageUrl}
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5 text-blue-500" />
                        Saturation
                      </Label>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {settings.saturation}
                      </span>
                    </div>
                    <Slider
                      value={[settings.saturation]}
                      onValueChange={([v]) => updateSetting('saturation', v)}
                      min={-100}
                      max={100}
                      step={1}
                      disabled={!imageUrl}
                    />
                  </div>

                  {/* Hue */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <CircleDot className="h-3.5 w-3.5 text-indigo-500" />
                        Hue Shift
                      </Label>
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">
                        {settings.hue}°
                      </span>
                    </div>
                    <Slider
                      value={[settings.hue]}
                      onValueChange={([v]) => updateSetting('hue', v)}
                      min={-180}
                      max={180}
                      step={1}
                      disabled={!imageUrl}
                    />
                  </div>
                </div>
              </div>

              {/* Stroke Settings */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-base">
                      <PenTool className="h-4 w-4 text-indigo-600" />
                      Stroke / Outline
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Add border around shapes</p>
                  </div>
                  <Switch
                    checked={settings.stroke.enabled}
                    onCheckedChange={(v) => {
                      updateStrokeSetting('enabled', v);
                      if (!v && strokeApplied) {
                        handleRemoveStroke();
                      }
                    }}
                    disabled={!imageUrl}
                  />
                </div>

                {settings.stroke.enabled && (
                  <div className="space-y-4">
                    {/* Stroke Color */}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Color</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <input
                            type="color"
                            value={settings.stroke.color}
                            onChange={(e) => updateStrokeSetting('color', e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={!imageUrl}
                          />
                          <div
                            className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer shadow-sm"
                            style={{ backgroundColor: settings.stroke.color }}
                          />
                        </div>
                        <span className="text-xs font-mono text-gray-500">
                          {settings.stroke.color}
                        </span>
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Width</Label>
                        <span className="text-xs font-mono text-gray-500">
                          {settings.stroke.width}px
                        </span>
                      </div>
                      <Slider
                        value={[settings.stroke.width]}
                        onValueChange={([v]) => updateStrokeSetting('width', v)}
                        min={1}
                        max={40}
                        step={1}
                        disabled={!imageUrl}
                      />
                    </div>

                    {/* Apply/Remove Stroke Button */}
                    <div className="pt-3 border-t border-gray-200">
                      {!strokeApplied ? (
                        <Button
                          onClick={handleApplyStroke}
                          variant="outline"
                          className="w-full bg-indigo-50 border-teal-200 text-indigo-700 hover:bg-indigo-100 hover:border-teal-300 transition-all"
                          disabled={!imageUrl || isApplyingStroke}
                        >
                          {isApplyingStroke ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                              Applying...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Apply Stroke
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                            <Check className="h-4 w-4" />
                            <span className="font-medium">Stroke applied</span>
                          </div>
                          <Button
                            onClick={handleRemoveStroke}
                            variant="outline"
                            size="sm"
                            className="w-full text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
                          >
                            <X className="h-3.5 w-3.5 mr-1.5" />
                            Remove Stroke
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Eraser Tool */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-base">
                      <Eraser className="h-4 w-4 text-indigo-600" />
                      Eraser Tool
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Remove parts of the image</p>
                  </div>
                  <Switch
                    checked={eraserEnabled}
                    onCheckedChange={(v) => {
                      setEraserEnabled(v);
                      if (!v) {
                        setEraserStrokes([]);
                      }
                    }}
                    disabled={!imageUrl || (!colorAdjustedCanvasRef.current && !strokedCanvasRef.current)}
                  />
                </div>

                {eraserEnabled && (
                  <div className="space-y-4">
                    {/* Brush Size */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm flex items-center gap-1.5">
                          <Circle className="h-3.5 w-3.5 text-gray-500" />
                          Brush Size
                        </Label>
                        <span className="text-xs font-mono text-gray-500">
                          {eraserBrushSize}px
                        </span>
                      </div>
                      <Slider
                        value={[eraserBrushSize]}
                        onValueChange={([v]) => setEraserBrushSize(v)}
                        min={5}
                        max={150}
                        step={1}
                        disabled={!imageUrl}
                      />
                    </div>

                    {/* Brush preview */}
                    <div className="flex items-center justify-center py-2">
                      <div
                        className="rounded-full border-2 border-gray-400 bg-gray-100"
                        style={{
                          width: Math.min(eraserBrushSize, 60),
                          height: Math.min(eraserBrushSize, 60),
                        }}
                      />
                    </div>

                    {/* Undo and Clear buttons */}
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <Button
                        onClick={handleUndoErase}
                        variant="outline"
                        size="sm"
                        className="w-full hover:bg-gray-100 transition-all"
                        disabled={eraserStrokes.length === 0}
                      >
                        <Undo2 className="h-4 w-4 mr-2" />
                        Undo Last Stroke
                        {eraserStrokes.length > 0 && (
                          <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                            {eraserStrokes.length}
                          </span>
                        )}
                      </Button>
                      <Button
                        onClick={handleClearErasing}
                        variant="outline"
                        size="sm"
                        className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-all"
                        disabled={eraserStrokes.length === 0}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Erasing
                      </Button>
                    </div>

                    {/* Instructions */}
                    <p className="text-xs text-gray-400 text-center bg-gray-100 rounded-lg py-2 px-3">
                      Click and drag on the image to erase areas
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all"
                  disabled={!imageUrl || !hasChanges(settings)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
                <Button
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-md hover:shadow-lg transition-all"
                  disabled={!imageUrl || isProcessing}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Enhanced
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Remover Modal */}
      {currentImageForModal && (
        <BackgroundRemoverModal
          isOpen={showBackgroundRemover}
          onClose={() => setShowBackgroundRemover(false)}
          image={currentImageForModal}
          onRemovalComplete={handleBackgroundRemovalComplete}
        />
      )}

      {/* Image Trim Modal */}
      {currentImageForModal && (
        <ImageTrimModal
          isOpen={showTrimModal}
          onClose={() => setShowTrimModal(false)}
          images={[currentImageForModal]}
          onTrimComplete={handleTrimComplete}
        />
      )}
    </AppLayout>
  );
};

export default ImageEnhancerPage;
