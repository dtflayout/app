
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageObject } from "./CollageCreator";
import { Canvas as FabricCanvas, Image as FabricImage } from "fabric";
import { toast } from "sonner";
import { PositionedImage } from "@/utils/layoutAlgorithm";

interface CanvasProps {
  images: ImageObject[];
  layout: PositionedImage[];
  canvasHeightInches: number;
  canvasWidthInches: number;
}

// Constants for canvas sizing
const DPI = 72; // Default screen DPI
const PADDING_INCHES = 0.3; // Match the padding between images
const MIN_CANVAS_HEIGHT_PX = 800;

export const Canvas = forwardRef<any, CanvasProps>(({ images, layout, canvasHeightInches, canvasWidthInches }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [layoutApplied, setLayoutApplied] = useState(false);
  const [zoom, setZoom] = useState(100);
  
  // Calculate canvas dimensions based on props
  const canvasWidthPx = canvasWidthInches * DPI;
  const canvasPaddingPx = PADDING_INCHES * DPI;
  
  // Map images by ID for quick lookup
  const imageMap = React.useMemo(() => {
    const map = new Map<string, ImageObject>();
    images.forEach(img => map.set(img.id, img));
    return map;
  }, [images]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvasHeight = Math.max(canvasHeightInches * DPI, MIN_CANVAS_HEIGHT_PX);
      
      fabricCanvasRef.current = new FabricCanvas(canvasRef.current, {
        width: canvasWidthPx,
        height: canvasHeight,
        backgroundColor: "transparent",
        preserveObjectStacking: true,
      });

      return () => {
        fabricCanvasRef.current?.dispose();
      };
    }
  }, [canvasHeightInches, canvasWidthPx]);

  // Update canvas dimensions when they change
  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvasHeight = Math.max(canvasHeightInches * DPI, MIN_CANVAS_HEIGHT_PX);
      fabricCanvasRef.current.setWidth(canvasWidthPx);
      fabricCanvasRef.current.setHeight(canvasHeight);
      fabricCanvasRef.current.renderAll();
    }
  }, [canvasHeightInches, canvasWidthPx]);

  // Apply layout when it changes
  useEffect(() => {
    const applyLayout = async () => {
      if (!fabricCanvasRef.current || !layout || layout.length === 0) return;
      
      setIsLoading(true);
      setLayoutApplied(false);
      
      try {
        // Clear existing canvas
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.backgroundColor = "transparent";
        
        // Load each image according to its position in the layout
        for (const item of layout) {
          const img = imageMap.get(item.id);
          if (!img) continue;
          
          await new Promise<void>((resolve) => {
            FabricImage.fromURL(img.url).then((fabricImg) => {
              // Determine final width/height in pixels from layout
              const layoutWidthPx = item.widthInches * DPI;
              const layoutHeightPx = item.heightInches * DPI;
              
              // Calculate scale factors based on original image dimensions
              let scaleX, scaleY, finalWidth, finalHeight;
              
              if (item.rotated) {
                // For rotated images: layout width corresponds to original height, layout height to original width
                scaleX = layoutWidthPx / (fabricImg.height || 1);
                scaleY = layoutHeightPx / (fabricImg.width || 1);
                finalWidth = fabricImg.height * Math.min(scaleX, scaleY);
                finalHeight = fabricImg.width * Math.min(scaleX, scaleY);
              } else {
                // For non-rotated images: straightforward scaling
                scaleX = layoutWidthPx / (fabricImg.width || 1);
                scaleY = layoutHeightPx / (fabricImg.height || 1);
                finalWidth = fabricImg.width * Math.min(scaleX, scaleY);
                finalHeight = fabricImg.height * Math.min(scaleX, scaleY);
              }
              
              // Use the smaller scale factor to ensure image fits within allocated bounds
              const scaleFactor = Math.min(scaleX, scaleY);
              fabricImg.scale(scaleFactor);
              
              // Set position and rotation
              if (item.rotated) {
                fabricImg.set({
                  angle: 90,
                  originX: 'left',
                  originY: 'top',
                  left: (item.x * DPI) + canvasPaddingPx + finalWidth,
                  top: item.y * DPI,
                });
              } else {
                fabricImg.set({
                  angle: 0,
                  originX: 'left',
                  originY: 'top',
                  left: (item.x * DPI) + canvasPaddingPx,
                  top: item.y * DPI,
                });
              }
              
              fabricImg.set({
                cornerSize: 8,
                borderColor: "#2563eb",
                cornerColor: "#2563eb",
                transparentCorners: false,
                selectable: false, // Make non-selectable in the final layout
              });
              
              // Add custom property to identify image
              fabricImg.set("id", item.id);
              
              fabricCanvasRef.current?.add(fabricImg);
              resolve();
            }).catch(error => {
              console.error("Error loading image:", error);
              resolve(); // Resolve anyway to continue with other images
            });
          });
        }
        
        fabricCanvasRef.current.renderAll();
        setLayoutApplied(true);
        
        // Auto-fit zoom to width after layout is applied
        setTimeout(() => {
          if (containerRef.current && fabricCanvasRef.current) {
            const containerWidth = containerRef.current.clientWidth - 100; // Account for rulers and padding
            const canvasWidth = fabricCanvasRef.current.getWidth();
            const fitZoom = Math.floor((containerWidth / canvasWidth) * 100);
            setZoom(Math.max(Math.min(fitZoom, 100), 10)); // Between 10% and 100%
          }
        }, 100);
        
      } catch (error) {
        console.error("Error applying layout:", error);
        toast.error("Failed to apply layout");
      } finally {
        setIsLoading(false);
      }
    };
    
    applyLayout();
  }, [layout, imageMap]);

  // Expose canvas methods to parent via ref
  useImperativeHandle(ref, () => ({
    exportCanvas: async () => {
      if (!fabricCanvasRef.current) {
        throw new Error("Canvas not initialized");
      }
      
      try {
        // Optimize for export
        fabricCanvasRef.current.discardActiveObject();
        fabricCanvasRef.current.renderAll();
        
        // Calculate appropriate multiplier based on image count and canvas size
        // to prevent memory issues while maintaining quality
        const imageCount = layout.length;
        const canvasArea = (canvasWidthPx * (canvasHeightInches * DPI)) / 1000000; // in megapixels
        
        let multiplier = 2; // Default 144 DPI (72 × 2)
        let quality = 1.0;
        
        // Adjust based on total canvas complexity
        if (imageCount > 20 || canvasArea > 15) {
          multiplier = 1.5; // 108 DPI
          quality = 0.95;
        } else if (imageCount > 15 || canvasArea > 10) {
          multiplier = 1.75; // 126 DPI
          quality = 0.98;
        }
        
        console.log(`Exporting ${imageCount} images with multiplier ${multiplier}x and quality ${quality}`);
        
        const dataUrl = fabricCanvasRef.current.toDataURL({
          format: 'png',
          quality: quality,
          multiplier: multiplier,
          enableRetinaScaling: false,
        });
        
        return dataUrl;
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Canvas too large. Try reducing the number of images or their sizes.");
        throw error;
      }
    },
    clearCanvas: () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.set('backgroundColor', 'transparent');
        fabricCanvasRef.current.renderAll();
        setLayoutApplied(false);
      }
    }
  }));

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  // Generate ruler marks
  const generateRulerMarks = (length: number, isVertical: boolean) => {
    const marks = [];
    for (let i = 0; i <= length; i++) {
      marks.push(
        <div
          key={i}
          className="absolute flex items-center text-xs text-muted-foreground"
          style={
            isVertical
              ? { top: `${i * DPI}px`, left: '2px' }
              : { left: `${i * DPI}px`, top: '2px' }
          }
        >
          {i}"
        </div>
      );
    }
    return marks;
  };

  return (
    <Card className="p-6 bg-white shadow-md animate-fade-in">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-xl font-semibold">Layout Preview</h3>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2">
            Size: {canvasWidthInches.toFixed(2)}" × {canvasHeightInches.toFixed(2)}"
          </Badge>
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={handleResetZoom}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="canvas-container border border-border rounded-md overflow-auto relative bg-background"
        style={{ 
          maxWidth: '100%', 
          minHeight: '500px',
          maxHeight: '70vh',
        }}
      >
        {/* Horizontal Ruler */}
        <div 
          className="absolute top-0 left-[40px] h-[40px] bg-muted border-b border-border z-10"
          style={{ width: `${canvasWidthPx * (zoom / 100)}px` }}
        >
          <div className="relative h-full" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {generateRulerMarks(canvasWidthInches, false)}
          </div>
        </div>
        
        {/* Vertical Ruler */}
        <div 
          className="absolute left-0 top-[40px] w-[40px] bg-muted border-r border-border z-10"
          style={{ height: `${Math.max(canvasHeightInches * DPI, MIN_CANVAS_HEIGHT_PX) * (zoom / 100)}px` }}
        >
          <div className="relative h-full" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {generateRulerMarks(canvasHeightInches, true)}
          </div>
        </div>
        
        {/* Canvas Area */}
        <div 
          className="absolute top-[40px] left-[40px]"
          style={{
            width: `${canvasWidthPx * (zoom / 100)}px`,
            height: `${Math.max(canvasHeightInches * DPI, MIN_CANVAS_HEIGHT_PX) * (zoom / 100)}px`,
            backgroundImage: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        >
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </Card>
  );
});

Canvas.displayName = "Canvas";
