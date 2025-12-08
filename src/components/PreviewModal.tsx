import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { PositionedImage } from "@/utils/layoutAlgorithm";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: ImageObject[];
  layout: PositionedImage[];
  canvasWidthInches: number;
  canvasHeightInches: number;
  onExport: () => void;
  isExporting: boolean;
}

// Max preview dimension (longest side)
const MAX_PREVIEW_SIZE = 1200;

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  images,
  layout,
  canvasWidthInches,
  canvasHeightInches,
  onExport,
  isExporting,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate preview dimensions maintaining aspect ratio
  const aspectRatio = canvasWidthInches / canvasHeightInches;
  let previewWidth: number;
  let previewHeight: number;

  if (aspectRatio > 1) {
    // Wider than tall
    previewWidth = MAX_PREVIEW_SIZE;
    previewHeight = MAX_PREVIEW_SIZE / aspectRatio;
  } else {
    // Taller than wide
    previewHeight = MAX_PREVIEW_SIZE;
    previewWidth = MAX_PREVIEW_SIZE * aspectRatio;
  }

  // Generate low-res preview when modal opens
  useEffect(() => {
    if (isOpen && layout.length > 0) {
      generatePreview();
    }

    return () => {
      // Cleanup preview URL when modal closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    };
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const generatePreview = async () => {
    if (layout.length === 0 || images.length === 0) return;

    setIsGenerating(true);

    try {
      // Create a canvas for rendering the preview
      const canvas = document.createElement("canvas");
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill with transparent background (checkerboard will be CSS)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create image map for quick lookup
      const imageMap = new Map<string, ImageObject>();
      images.forEach((img) => imageMap.set(img.id, img));

      // Scale factor from inches to preview pixels
      const scaleX = previewWidth / canvasWidthInches;
      const scaleY = previewHeight / canvasHeightInches;

      // Padding in inches (matches layout algorithm)
      const PADDING_INCHES = 0.3;

      // Load and draw each image
      for (const item of layout) {
        const img = imageMap.get(item.id);
        if (!img) continue;

        // Use previewUrl if available, otherwise create from file
        let imageUrl = img.previewUrl;
        let tempUrl: string | null = null;

        if (!imageUrl) {
          tempUrl = URL.createObjectURL(img.file);
          imageUrl = tempUrl;
        }

        try {
          await new Promise<void>((resolve, reject) => {
            const imgEl = new Image();
            imgEl.onload = () => {
              // Calculate position and size in preview coordinates
              const x = (item.x + PADDING_INCHES) * scaleX;
              const y = item.y * scaleY;
              const width = item.widthInches * scaleX;
              const height = item.heightInches * scaleY;

              ctx.save();

              if (item.rotated) {
                // For rotated images, translate to position and rotate
                ctx.translate(x + width, y);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(imgEl, 0, 0, height, width);
              } else {
                ctx.drawImage(imgEl, x, y, width, height);
              }

              ctx.restore();
              resolve();
            };
            imgEl.onerror = () => {
              console.error(`Failed to load image: ${item.id}`);
              resolve(); // Continue with other images
            };
            imgEl.src = imageUrl!;
          });
        } finally {
          // Clean up temp URL if we created one
          if (tempUrl) {
            URL.revokeObjectURL(tempUrl);
          }
        }
      }

      // Convert canvas to blob URL
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/png",
          0.9
        );
      });

      const url = URL.createObjectURL(blob);

      // Clean up old preview URL before setting new one
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
      setZoom(100);
      setPan({ x: 0, y: 0 });
    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 400));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25));
  };

  const handleResetZoom = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  // Mouse drag handlers for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 100) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle close and cleanup
  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setZoom(100);
    setPan({ x: 0, y: 0 });
    onClose();
  };

  // Calculate the display size based on container and zoom
  const getDisplayDimensions = () => {
    const maxContainerWidth = Math.min(window.innerWidth - 100, 1400);
    const maxContainerHeight = window.innerHeight - 250;

    let displayWidth = previewWidth;
    let displayHeight = previewHeight;

    // Scale down if preview is larger than container at 100% zoom
    const widthScale = maxContainerWidth / previewWidth;
    const heightScale = maxContainerHeight / previewHeight;
    const fitScale = Math.min(widthScale, heightScale, 1);

    displayWidth = previewWidth * fitScale;
    displayHeight = previewHeight * fitScale;

    return { displayWidth, displayHeight, fitScale };
  };

  const { displayWidth, displayHeight, fitScale } = getDisplayDimensions();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Sheet Preview</DialogTitle>
            <div className="flex items-center gap-4">
              {/* Sheet dimensions */}
              <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {canvasWidthInches}" × {canvasHeightInches.toFixed(2)}"
              </span>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={zoom >= 400}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={handleResetZoom}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-slate-100 relative"
          style={{
            minHeight: "400px",
            maxHeight: "calc(95vh - 140px)",
            cursor: zoom > 100 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                </div>
                <p className="text-slate-600">Generating preview...</p>
              </div>
            </div>
          ) : previewUrl ? (
            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden"
              style={{
                // Checkerboard background for transparency
                backgroundImage:
                  "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
              }}
            >
              <div
                style={{
                  transform: `scale(${(zoom / 100) * fitScale}) translate(${pan.x / ((zoom / 100) * fitScale)}px, ${pan.y / ((zoom / 100) * fitScale)}px)`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
              >
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Sheet preview"
                  style={{
                    width: previewWidth,
                    height: previewHeight,
                    maxWidth: "none",
                    imageRendering: "crisp-edges",
                  }}
                  draggable={false}
                />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-slate-500">No preview available</p>
            </div>
          )}

          {/* Zoom hint */}
          {zoom > 100 && !isDragging && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm">
              Click and drag to pan
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <p className="text-sm text-slate-500">
            This is a low-resolution preview. Download for full print quality.
          </p>
          <Button
            onClick={onExport}
            disabled={isExporting}
            className="h-11 px-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-lg font-semibold rounded-xl shadow-md hover:shadow-xl transition-all duration-200"
          >
            <Download className="mr-2 h-5 w-5" />
            {isExporting ? "Exporting..." : "Download Full Quality"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
