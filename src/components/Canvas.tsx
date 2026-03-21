
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageObject } from "./CollageCreator";
import { Canvas as FabricCanvas, Image as FabricImage } from "fabric";
import { toast } from "sonner";
import { PositionedImage } from "@/utils/layoutAlgorithm";

// Debug flag - set to true to enable debug logging
const DEBUG = false;

const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

/**
 * CANVAS DISPLAY OPTIMIZATION - AGGRESSIVE MEMORY MANAGEMENT
 *
 * This canvas uses a two-tier image strategy for performance on low-RAM devices (4GB):
 *
 * 1. PREVIEW MODE (default display):
 *    - Uses previewUrl (400px max) for on-screen rendering
 *    - Full-resolution URLs are NOT stored in state after layout generation
 *    - Fabric.js object caching is DISABLED to prevent duplicate copies
 *    - Target: <400MB memory for 20-image layouts
 *
 * 2. EXPORT MODE (during download):
 *    - Regenerates full-resolution blob URLs from original File objects
 *    - Renders at print quality (150 DPI)
 *    - Immediately revokes full-res URLs after export to free memory
 *    - Restores preview images on canvas
 *
 * IMPORTANT: The final exported PNG MUST use original full-resolution images.
 * Preview optimization is ONLY for on-screen display.
 */

interface CanvasProps {
  images: ImageObject[];
  layout: PositionedImage[];
  canvasHeightInches: number;
  canvasWidthInches: number;
}

// Constants for canvas sizing
const DPI = 72; // Screen DPI for preview
const DPI_PRINT = 150; // Target DPI for print-quality exports (optimized for DTF printing)
const EXPORT_MULTIPLIER = DPI_PRINT / DPI; // ~2.08x for 150 DPI output
const PADDING_INCHES = 0; // Layout algorithm now handles edge margins
const MIN_CANVAS_HEIGHT_PX = 800;

export const Canvas = forwardRef<any, CanvasProps>(({ images, layout, canvasHeightInches, canvasWidthInches }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [layoutApplied, setLayoutApplied] = useState(false);
  const [zoom, setZoom] = useState(80);
  const [previewBg, setPreviewBg] = useState<'transparent' | 'grey' | 'black'>('transparent');
  
  // Calculate canvas dimensions based on props
  const canvasWidthPx = canvasWidthInches * DPI;
  const canvasPaddingPx = PADDING_INCHES * DPI;
  
  // Map images by ID for quick lookup
  const imageMap = React.useMemo(() => {
    debugLog('🗺️ Canvas: Creating imageMap');
    debugLog('  - images.length:', images.length);
    debugLog('  - images:', images.map(img => ({ id: img.id, name: img.file?.name, hasUrl: !!img.url, urlValid: img.url?.startsWith('blob:') })));

    const map = new Map<string, ImageObject>();
    images.forEach(img => map.set(img.id, img));

    debugLog('  - imageMap size:', map.size);
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

  /**
   * Loads images onto the canvas with the given layout.
   * @param useFullResolution - If true, regenerates full-resolution URLs from File objects. If false, uses preview URLs.
   * @returns Map of image IDs to their temporary full-res blob URLs (only populated when useFullResolution=true)
   */
  const loadImagesToCanvas = async (useFullResolution: boolean = false): Promise<Map<string, string>> => {
    const tempFullResUrls = new Map<string, string>();

    if (!fabricCanvasRef.current || !layout || layout.length === 0) return tempFullResUrls;

    const mode = useFullResolution ? 'FULL RESOLUTION (export)' : 'PREVIEW (display)';
    debugLog(`🎨 Canvas: loadImagesToCanvas - ${mode}`);
    debugLog('  - layout.length:', layout.length);
    debugLog('  - imageMap.size:', imageMap.size);

    // Clear existing canvas
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = "transparent";

    // Load each image according to its position in the layout
    for (const item of layout) {
      const img = imageMap.get(item.id);
      if (!img) continue;

      let imageUrl: string;

      if (useFullResolution) {
        // EXPORT MODE: Regenerate full-resolution blob URL from the original File object
        // This is only done during export - we don't store full-res URLs in state
        imageUrl = URL.createObjectURL(img.file);
        tempFullResUrls.set(item.id, imageUrl); // Track for cleanup after export
        debugLog(`  - Loading ${item.id}: FULL-RES (regenerated from File) - ${imageUrl.substring(0, 50)}`);
      } else {
        // PREVIEW MODE: Use the small preview URL (400px max) for display
        imageUrl = img.previewUrl || URL.createObjectURL(img.file);
        debugLog(`  - Loading ${item.id}: PREVIEW - ${imageUrl?.substring(0, 50)}`);
      }

      await new Promise<void>((resolve) => {
        FabricImage.fromURL(imageUrl).then((fabricImg) => {
          // MEMORY DEBUG: Log actual image dimensions loaded
          console.log(`[CANVAS DEBUG] Loaded image ${item.id}:`);
          console.log(`  - Source URL type: ${imageUrl?.substring(0, 30)}`);
          console.log(`  - Original dimensions: ${fabricImg.width}x${fabricImg.height}`);
          console.log(`  - Mode: ${useFullResolution ? 'FULL-RES' : 'PREVIEW'}`);

          // Determine final width/height in pixels from layout
          const layoutWidthPx = item.widthInches * DPI;
          const layoutHeightPx = item.heightInches * DPI;

          // Calculate scale factors based on original image dimensions
          let scaleX: number;
          let scaleY: number;
          let finalWidth: number;

          if (item.rotated) {
            // For rotated images: layout width corresponds to original height, layout height to original width
            scaleX = layoutWidthPx / (fabricImg.height || 1);
            scaleY = layoutHeightPx / (fabricImg.width || 1);
            finalWidth = (fabricImg.height || 0) * Math.min(scaleX, scaleY);
          } else {
            // For non-rotated images: straightforward scaling
            scaleX = layoutWidthPx / (fabricImg.width || 1);
            scaleY = layoutHeightPx / (fabricImg.height || 1);
            finalWidth = (fabricImg.width || 0) * Math.min(scaleX, scaleY);
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
            // MEMORY OPTIMIZATION: Disable Fabric.js object caching to prevent duplicate copies
            objectCaching: false,
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
    return tempFullResUrls;
  };

  // Apply layout when it changes (uses preview images for display)
  useEffect(() => {
    const applyLayout = async () => {
      if (!fabricCanvasRef.current || !layout || layout.length === 0) return;

      debugLog('🎨 Canvas: applyLayout called');
      debugLog('  - Layout IDs:', layout.map(l => l.id));

      setIsLoading(true);
      setLayoutApplied(false);

      try {
        // Load preview images for display (NOT full resolution)
        await loadImagesToCanvas(false);

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

      let tempFullResUrls: Map<string, string> = new Map();

      try {
        /**
         * EXPORT WORKFLOW - AGGRESSIVE MEMORY MANAGEMENT:
         * 1. Regenerate full-resolution blob URLs from original File objects
         * 2. Load them onto canvas and export at print quality
         * 3. IMMEDIATELY revoke full-res URLs to free memory
         * 4. Restore preview images on canvas
         *
         * This ensures the exported PNG has full print quality while
         * keeping memory usage minimal on low-RAM devices.
         */

        console.log('🔄 Export: Regenerating full-resolution images from File objects...');

        // Step 1: Load full-resolution images for export (regenerated from File objects)
        // This returns a map of temporary blob URLs that we MUST revoke after export
        tempFullResUrls = await loadImagesToCanvas(true);  // true = regenerate full resolution

        console.log(`   Created ${tempFullResUrls.size} temporary full-res blob URLs`);

        // Optimize for export
        fabricCanvasRef.current.discardActiveObject();
        fabricCanvasRef.current.renderAll();

        // Use fixed multiplier for consistent 150 DPI print-quality output
        const imageCount = layout.length;
        const expectedWidthPx = Math.round(canvasWidthInches * DPI_PRINT);
        const expectedHeightPx = Math.round(canvasHeightInches * DPI_PRINT);

        console.log(`📤 Exporting ${imageCount} images at ${DPI_PRINT} DPI (${EXPORT_MULTIPLIER.toFixed(2)}x multiplier)`);
        console.log(`   Expected output: ${expectedWidthPx}px × ${expectedHeightPx}px`);

        // Step 2: Export at full resolution
        const dataUrl = fabricCanvasRef.current.toDataURL({
          format: 'png',
          quality: 1.0,
          multiplier: EXPORT_MULTIPLIER,
          enableRetinaScaling: false,
        });

        console.log('✅ Export complete!');

        // Step 3: CRITICAL - Revoke temporary full-res blob URLs IMMEDIATELY to free memory
        console.log(`🧹 Revoking ${tempFullResUrls.size} temporary full-res blob URLs...`);
        tempFullResUrls.forEach((url, id) => {
          URL.revokeObjectURL(url);
          debugLog(`   - Revoked full-res URL for ${id}`);
        });
        tempFullResUrls.clear();

        // Step 4: Restore preview images on canvas (much smaller memory footprint)
        console.log('🔄 Restoring preview images on canvas...');
        await loadImagesToCanvas(false);  // false = use preview images

        console.log('✅ Memory restored to preview mode');

        return dataUrl;
      } catch (error) {
        console.error("Export error:", error);

        // CRITICAL: Always revoke temporary full-res URLs even on error
        if (tempFullResUrls.size > 0) {
          console.log(`🧹 Cleaning up ${tempFullResUrls.size} temporary URLs after error...`);
          tempFullResUrls.forEach((url) => {
            URL.revokeObjectURL(url);
          });
          tempFullResUrls.clear();
        }

        // Try to restore preview images even on error
        try {
          await loadImagesToCanvas(false);
        } catch {
          // Ignore restoration errors
        }

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

  // Get background style based on selected option
  const getCanvasBackgroundStyle = () => {
    switch (previewBg) {
      case 'grey':
        return { backgroundColor: '#808080' };
      case 'black':
        return { backgroundColor: '#000000' };
      default: // transparent - checkered pattern
        return {
          backgroundImage: 'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
        };
    }
  };

  // Generate ruler marks
  const generateRulerMarks = (length: number, isVertical: boolean) => {
    const marks = [];
    for (let i = 0; i <= length; i++) {
      marks.push(
        <div
          key={i}
          className="absolute flex items-center text-sm text-muted-foreground"
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
        <h3 className="text-2xl font-bold">Layout Preview</h3>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 text-lg font-semibold">
            Size: {canvasWidthInches.toFixed(2)}" × {canvasHeightInches.toFixed(2)}"
          </Badge>
          {/* Background Preview (Hold to preview) */}
          <div className="flex items-center gap-2 border rounded-md px-2 py-1" title="Hold to preview background">
            <span className="text-xs text-gray-500">Press & hold to preview:</span>
            <div
              className="h-6 w-6 rounded flex items-center justify-center bg-blue-50 ring-1 ring-blue-300"
              title="Default (checkered)"
            >
              <div
                className="w-4 h-4 rounded-sm border border-gray-300"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '6px 6px',
                  backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                }}
              />
            </div>
            <button
              onMouseDown={() => setPreviewBg('grey')}
              onMouseUp={() => setPreviewBg('transparent')}
              onMouseLeave={() => setPreviewBg('transparent')}
              className={`h-6 w-6 rounded flex items-center justify-center transition-colors select-none ${
                previewBg === 'grey'
                  ? 'bg-gray-200 ring-2 ring-gray-400'
                  : 'hover:bg-gray-100'
              }`}
              title="Hold to preview grey background"
            >
              <div className="w-4 h-4 rounded-sm bg-gray-500 border border-gray-300" />
            </button>
            <button
              onMouseDown={() => setPreviewBg('black')}
              onMouseUp={() => setPreviewBg('transparent')}
              onMouseLeave={() => setPreviewBg('transparent')}
              className={`h-6 w-6 rounded flex items-center justify-center transition-colors select-none ${
                previewBg === 'black'
                  ? 'bg-gray-700 ring-2 ring-gray-500'
                  : 'hover:bg-gray-100'
              }`}
              title="Hold to preview black background"
            >
              <div className="w-4 h-4 rounded-sm bg-black border border-gray-300" />
            </button>
          </div>
          {/* Zoom Controls */}
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
          minHeight: '1050px',
          maxHeight: '120vh',
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
            ...getCanvasBackgroundStyle()
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
