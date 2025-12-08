import React, { useState, useRef, useEffect, useMemo } from "react";
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

// Preview resolution - width in pixels (height scales with aspect ratio)
const PREVIEW_WIDTH_PX = 1200;

// Ruler dimensions
const RULER_WIDTH = 40; // pixels

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
  const [zoom, setZoom] = useState(10);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate preview dimensions maintaining aspect ratio
  // Width is fixed, height scales proportionally
  const aspectRatio = canvasWidthInches / canvasHeightInches;
  const previewWidth = PREVIEW_WIDTH_PX;
  const previewHeight = PREVIEW_WIDTH_PX / aspectRatio;

  // Pixels per inch at 100% zoom
  const pixelsPerInch = previewWidth / canvasWidthInches;

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
    setZoom((prev) => Math.max(prev - 25, 10));
  };

  const handleResetZoom = () => {
    setZoom(10);
  };

  // Handle close and cleanup
  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setZoom(100);
    onClose();
  };

  // Calculate scaled dimensions for display
  const scaledWidth = previewWidth * (zoom / 100);
  const scaledHeight = previewHeight * (zoom / 100);
  const scaledPixelsPerInch = pixelsPerInch * (zoom / 100);

  // Generate horizontal ruler marks (for width in inches)
  const horizontalRulerMarks = useMemo(() => {
    const marks: JSX.Element[] = [];
    const totalInches = Math.ceil(canvasWidthInches);

    for (let i = 0; i <= totalInches; i++) {
      const position = i * scaledPixelsPerInch;
      const isMajor = i % 5 === 0;
      const showLabel = i % 5 === 0 || i === totalInches;

      marks.push(
        <div
          key={`h-${i}`}
          className="absolute flex flex-col items-center"
          style={{ left: position }}
        >
          <div
            className={`bg-slate-500 ${isMajor ? 'w-px h-3' : 'w-px h-2'}`}
          />
          {showLabel && (
            <span className="text-[10px] text-slate-600 mt-0.5">{i}"</span>
          )}
        </div>
      );
    }
    return marks;
  }, [canvasWidthInches, scaledPixelsPerInch]);

  // Generate vertical ruler marks (for height in inches)
  const verticalRulerMarks = useMemo(() => {
    const marks: JSX.Element[] = [];
    const totalInches = Math.ceil(canvasHeightInches);

    // Determine label interval based on sheet length
    const labelInterval = canvasHeightInches > 100 ? 10 : 5;

    for (let i = 0; i <= totalInches; i++) {
      const position = i * scaledPixelsPerInch;
      const isMajor = i % labelInterval === 0;
      const showLabel = i % labelInterval === 0;

      marks.push(
        <div
          key={`v-${i}`}
          className="absolute flex items-center"
          style={{ top: position }}
        >
          <div
            className={`bg-slate-500 ${isMajor ? 'h-px w-3' : 'h-px w-2'}`}
          />
          {showLabel && (
            <span className="text-[10px] text-slate-600 ml-1">{i}"</span>
          )}
        </div>
      );
    }
    return marks;
  }, [canvasHeightInches, scaledPixelsPerInch]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none max-h-none p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed at top */}
        <DialogHeader className="px-6 py-3 border-b bg-white flex-shrink-0">
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
                  disabled={zoom <= 10}
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
                  title="Reset zoom"
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

        {/* Preview content - Scrollable area taking remaining height */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{ backgroundColor: '#f5f5f5' }}
        >
          {isGenerating ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-4 border-emerald-100"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-500 animate-spin"></div>
                </div>
                <p className="text-slate-600">Generating preview...</p>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="p-6">
              {/* Container for rulers and sheet */}
              <div className="inline-flex flex-col">
                {/* Top row: corner + horizontal ruler */}
                <div className="flex">
                  {/* Corner piece */}
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: RULER_WIDTH,
                      height: RULER_WIDTH,
                      backgroundColor: '#e5e5e5',
                      borderRight: '1px solid #d4d4d4',
                      borderBottom: '1px solid #d4d4d4',
                    }}
                  />
                  {/* Horizontal ruler */}
                  <div
                    className="relative flex-shrink-0"
                    style={{
                      width: scaledWidth,
                      height: RULER_WIDTH,
                      backgroundColor: '#e5e5e5',
                      borderBottom: '1px solid #d4d4d4',
                    }}
                  >
                    <div className="absolute bottom-0 left-0 right-0 h-full">
                      {horizontalRulerMarks}
                    </div>
                  </div>
                </div>

                {/* Bottom row: vertical ruler + sheet */}
                <div className="flex">
                  {/* Vertical ruler */}
                  <div
                    className="relative flex-shrink-0"
                    style={{
                      width: RULER_WIDTH,
                      height: scaledHeight,
                      backgroundColor: '#e5e5e5',
                      borderRight: '1px solid #d4d4d4',
                    }}
                  >
                    <div className="absolute top-0 right-0 bottom-0 w-full">
                      {verticalRulerMarks}
                    </div>
                  </div>

                  {/* Sheet with checkered background */}
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: scaledWidth,
                      height: scaledHeight,
                      // Checkerboard background for transparency
                      backgroundImage:
                        "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Sheet preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        imageRendering: zoom > 100 ? "pixelated" : "auto",
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-slate-500">No preview available</p>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 py-3 border-t bg-white flex-shrink-0 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            This is a low-resolution preview. Download for full print quality ({canvasHeightInches > 100 ? "very long sheet - scroll to see full preview" : "scroll to see full sheet"}).
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
