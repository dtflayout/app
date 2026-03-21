import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RotateCcw, 
  FileImage,
  Maximize,
  Loader2,
  ChevronDown,
  Files
} from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { PositionedImage } from "@/utils/layoutAlgorithm";
import { SheetTabs, SheetTabInfo } from "./SheetTabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PreviewDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  images: ImageObject[];
  layout: PositionedImage[];
  canvasWidthInches: number;
  canvasHeightInches: number;
  onDownload?: () => void;
  isExporting: boolean;
  totalSqInchesUsed: number | null;
  creditsDeductedForCurrentLayout: boolean;
  // Multi-sheet support
  sheets?: SheetTabInfo[];
  activeSheet?: number;  // 1-indexed
  onSheetChange?: (sheetNumber: number) => void;
  // Multi-sheet download handlers
  onDownloadCurrentSheet?: () => void;
  onDownloadAllPngs?: () => void;
  // Appearance
  primaryColor?: string;
}

// Preview resolution - base width in pixels
const PREVIEW_WIDTH_PX = 1200;
const RULER_SIZE = 28;

export const PreviewDrawer: React.FC<PreviewDrawerProps> = ({
  isOpen,
  onToggle,
  images,
  layout,
  canvasWidthInches,
  canvasHeightInches,
  onDownload,
  isExporting,
  totalSqInchesUsed,
  creditsDeductedForCurrentLayout,
  sheets = [],
  activeSheet = 1,
  onSheetChange,
  onDownloadCurrentSheet,
  onDownloadAllPngs,
  primaryColor,
}) => {
  const hasMultipleSheets = sheets.length > 1;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [previewBg, setPreviewBg] = useState<'transparent' | 'grey' | 'black'>('transparent');
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hRulerRef = useRef<HTMLDivElement>(null);
  const vRulerRef = useRef<HTMLDivElement>(null);

  const hasLayout = layout.length > 0;

  // Calculate preview dimensions
  const aspectRatio = canvasWidthInches / (canvasHeightInches || 1);
  const previewWidth = PREVIEW_WIDTH_PX;
  const previewHeight = PREVIEW_WIDTH_PX / aspectRatio;

  // Scaled dimensions based on zoom
  const scaledWidth = (previewWidth * zoom) / 100;
  const scaledHeight = (previewHeight * zoom) / 100;

  // Pixels per inch at current zoom
  const pixelsPerInch = scaledWidth / canvasWidthInches;

  // Determine ruler interval based on zoom level
  const getRulerInterval = () => {
    if (zoom >= 250) return 1;    // Show every inch when very zoomed in
    if (zoom >= 150) return 5;    // Show every 5 inches
    if (zoom >= 75) return 10;    // Show every 10 inches
    return 20;                     // Show every 20 inches when zoomed out
  };

  const rulerInterval = getRulerInterval();

  // Sync rulers with scroll position
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollTop } = scrollContainerRef.current;
    
    if (hRulerRef.current) {
      hRulerRef.current.scrollLeft = scrollLeft;
    }
    if (vRulerRef.current) {
      vRulerRef.current.scrollTop = scrollTop;
    }
  }, []);

  // Generate horizontal ruler marks
  const horizontalRulerMarks = useMemo(() => {
    const marks = [];
    const totalInches = Math.ceil(canvasWidthInches);
    
    for (let i = 0; i <= totalInches; i++) {
      const x = i * pixelsPerInch;
      if (x > scaledWidth + 100) break;
      
      const showNumber = i % rulerInterval === 0;
      
      marks.push(
        <div
          key={`h-${i}`}
          className="absolute flex flex-col items-center"
          style={{ left: x, top: 0, height: RULER_SIZE }}
        >
          <div className={`w-px ${showNumber ? 'h-3 bg-gray-500' : 'h-2 bg-gray-300'}`} />
          {showNumber && (
            <span className="text-[10px] font-medium text-gray-600 mt-0.5">{i}</span>
          )}
        </div>
      );
    }
    return marks;
  }, [canvasWidthInches, pixelsPerInch, scaledWidth, rulerInterval]);

  // Generate vertical ruler marks
  const verticalRulerMarks = useMemo(() => {
    const marks = [];
    const totalInches = Math.ceil(canvasHeightInches);
    
    for (let i = 0; i <= totalInches; i++) {
      const y = i * pixelsPerInch;
      if (y > scaledHeight + 100) break;
      
      const showNumber = i % rulerInterval === 0;
      
      marks.push(
        <div
          key={`v-${i}`}
          className="absolute flex items-center"
          style={{ top: y, left: 0, width: RULER_SIZE }}
        >
          <div className={`h-px ${showNumber ? 'w-3 bg-gray-500' : 'w-2 bg-gray-300'}`} />
          {showNumber && (
            <span className="text-[10px] font-medium text-gray-600 ml-1">{i}</span>
          )}
        </div>
      );
    }
    return marks;
  }, [canvasHeightInches, pixelsPerInch, scaledHeight, rulerInterval]);

  // Generate preview when layout changes
  useEffect(() => {
    if (layout.length > 0 && images.length > 0) {
      generatePreview();
    } else {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [layout, images, showBoundingBoxes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  // Drag to scroll functionality
  const dragState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 50 && scrollContainerRef.current) {
      setIsDragging(true);
      const container = scrollContainerRef.current;
      dragState.current = {
        startX: e.pageX - container.offsetLeft,
        startY: e.pageY - container.offsetTop,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const container = scrollContainerRef.current;
    const x = e.pageX - container.offsetLeft;
    const y = e.pageY - container.offsetTop;
    
    container.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
    container.scrollTop = dragState.current.scrollTop - (y - dragState.current.startY);
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const generatePreview = async () => {
    if (layout.length === 0 || images.length === 0) return;

    setIsGenerating(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = previewWidth;
      canvas.height = previewHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const imageMap = new Map<string, ImageObject>();
      images.forEach((img) => imageMap.set(img.id, img));

      const scaleX = previewWidth / canvasWidthInches;
      const scaleY = previewHeight / canvasHeightInches;

      for (const item of layout) {
        const img = imageMap.get(item.id);
        if (!img) continue;

        let imageUrl = img.previewUrl;
        let tempUrl: string | null = null;

        if (!imageUrl) {
          tempUrl = URL.createObjectURL(img.file);
          imageUrl = tempUrl;
        }

        try {
          await new Promise<void>((resolve) => {
            const imgEl = new Image();
            imgEl.onload = () => {
              const x = item.x * scaleX;
              const y = item.y * scaleY;
              const width = item.widthInches * scaleX;
              const height = item.heightInches * scaleY;

              ctx.save();
              if (item.rotated) {
                ctx.translate(x + width, y);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(imgEl, 0, 0, height, width);
              } else {
                ctx.drawImage(imgEl, x, y, width, height);
              }
              ctx.restore();

              // Draw bounding box if enabled
              if (showBoundingBoxes) {
                ctx.save();
                ctx.strokeStyle = '#8B5CF6'; // Purple color
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]); // Dashed line
                ctx.strokeRect(x, y, width, height);
                ctx.restore();
              }
              resolve();
            };
            imgEl.onerror = () => resolve();
            imgEl.src = imageUrl!;
          });
        } finally {
          if (tempUrl) URL.revokeObjectURL(tempUrl);
        }
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")),
          "image/png",
          0.9
        );
      });

      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 500));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 10));
  const handleResetZoom = () => setZoom(50);

  const handleFitToScreen = () => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.clientHeight - 100;
    const containerWidth = containerRef.current.clientWidth - 100;
    const zoomForHeight = (containerHeight / previewHeight) * 100;
    const zoomForWidth = (containerWidth / previewWidth) * 100;
    const fitZoom = Math.min(zoomForHeight, zoomForWidth);
    setZoom(Math.max(10, Math.min(500, Math.round(fitZoom))));
  };

  const getCanvasBackgroundStyle = () => {
    switch (previewBg) {
      case 'grey': return { backgroundColor: '#808080' };
      case 'black': return { backgroundColor: '#000000' };
      default: return {
        backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        backgroundColor: '#ffffff',
      };
    }
  };

  const getCursorStyle = () => {
    if (zoom > 50) return isDragging ? 'grabbing' : 'grab';
    return 'default';
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <>
      {/* Custom scrollbar styles */}
      <style>{`
        .preview-scroll::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .preview-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 6px;
        }
        .preview-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        .preview-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #64748b 0%, #475569 100%);
        }
        .preview-scroll::-webkit-scrollbar-corner {
          background: #f1f5f9;
        }
        .ruler-scroll::-webkit-scrollbar {
          display: none;
        }
        .ruler-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      {/* Sleeve/Tab - Smooth CSS transition */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setIsHoveringButton(true)}
        onMouseLeave={() => setIsHoveringButton(false)}
        className="fixed top-1/2 z-[60] cursor-pointer"
        style={{
          right: isOpen ? '50%' : '0px',
          transform: `translateY(-50%) scale(${isHoveringButton ? 1.1 : 1})`,
          transition: 'right 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s ease-out',
        }}
      >
        <div 
          className="text-white rounded-l-xl shadow-xl flex flex-col items-center justify-center gap-3"
          style={{
            padding: isHoveringButton ? '36px 16px' : '32px 12px',
            boxShadow: isHoveringButton 
              ? `0 20px 40px -5px ${primaryColor ? primaryColor + '80' : 'rgba(79, 70, 229, 0.5)'}, 0 10px 20px -5px ${primaryColor ? primaryColor + '50' : 'rgba(79, 70, 229, 0.3)'}` 
              : '0 10px 30px -5px rgba(0, 0, 0, 0.3)',
            transition: 'padding 0.2s ease-out, box-shadow 0.2s ease-out, background 0.2s ease-out',
            backgroundColor: primaryColor || '#4F46E5',
          }}
        >
          {isOpen ? (
            <ChevronRight className="w-6 h-6" />
          ) : (
            <ChevronLeft className="w-6 h-6" />
          )}
          <span 
            className="font-bold tracking-wide"
            style={{ 
              writingMode: 'vertical-rl', 
              textOrientation: 'mixed',
              fontSize: '16px',
              letterSpacing: '0.05em',
            }}
          >
            Preview
          </span>
        </div>
      </div>

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-1/2 bg-white shadow-2xl z-[60]"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Sheet Preview</h2>
              
              {/* Toolbar - Always visible when there's a layout, regardless of mode */}
              {hasLayout && (
                <div className="flex items-center gap-3">
                  {/* Zoom Controls */}
                  <div className="flex items-center bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl px-1 py-1 shadow-sm">
                    <button
                      className="h-9 w-9 rounded-xl flex items-center justify-center bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-gray-600 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleZoomOut}
                      disabled={zoom <= 10}
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <div className="px-2 min-w-[4rem] text-center">
                      <span className="text-sm font-bold text-gray-700">{zoom}%</span>
                    </div>
                    <button
                      className="h-9 w-9 rounded-xl flex items-center justify-center bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 text-gray-600 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleZoomIn}
                      disabled={zoom >= 500}
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <button
                      className="h-9 w-9 rounded-xl flex items-center justify-center bg-white hover:bg-gradient-to-br hover:from-amber-50 hover:to-amber-100 text-gray-600 hover:text-amber-600 transition-all duration-200 shadow-sm hover:shadow"
                      onClick={handleResetZoom}
                      title="Reset zoom"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      className="h-9 w-9 rounded-xl flex items-center justify-center bg-white hover:bg-gradient-to-br hover:from-indigo-50 hover:to-indigo-100 text-gray-600 hover:text-indigo-600 transition-all duration-200 shadow-sm hover:shadow"
                      onClick={handleFitToScreen}
                      title="Fit to screen"
                    >
                      <Maximize className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Background Toggle */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
                    <span className="text-xs text-gray-500 font-medium">Hold:</span>
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-blue-50 ring-1 ring-blue-200"
                      title="Default (checkered)"
                    >
                      <div
                        className="w-5 h-5 rounded-sm border border-gray-300"
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
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 select-none ${
                        previewBg === 'grey' ? 'bg-gray-200 ring-2 ring-gray-400 scale-95' : 'hover:bg-gray-100 hover:scale-105'
                      }`}
                      title="Hold to preview grey background"
                    >
                      <div className="w-5 h-5 rounded-sm bg-gray-500 border border-gray-400" />
                    </button>
                    <button
                      onMouseDown={() => setPreviewBg('black')}
                      onMouseUp={() => setPreviewBg('transparent')}
                      onMouseLeave={() => setPreviewBg('transparent')}
                      className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-150 select-none ${
                        previewBg === 'black' ? 'bg-gray-700 ring-2 ring-gray-500 scale-95' : 'hover:bg-gray-100 hover:scale-105'
                      }`}
                      title="Hold to preview black background"
                    >
                      <div className="w-5 h-5 rounded-sm bg-black border border-gray-400" />
                    </button>
                  </div>

                  {/* Bounding Box Toggle */}
                  <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
                    <span className="text-xs text-gray-500 font-medium">Bounding Box:</span>
                    <button
                      onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                      className={`h-8 px-3 rounded-lg flex items-center justify-center transition-all duration-150 select-none text-xs font-medium ${
                        showBoundingBoxes
                          ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Toggle bounding boxes around images"
                    >
                      {showBoundingBoxes ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sheet Tabs - only show when multiple sheets */}
          {sheets.length > 1 && onSheetChange && (
            <SheetTabs
              sheets={sheets}
              activeSheet={activeSheet}
              onSheetChange={onSheetChange}
            />
          )}

          {/* Content */}
          <div ref={containerRef} className="flex-1 overflow-hidden bg-gray-100 relative">
            {!hasLayout ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                <div className="w-20 h-20 mb-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <FileImage className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-semibold text-gray-600 text-center">No sheet generated yet</p>
                <p className="text-sm text-center mt-2 max-w-xs text-gray-500">
                  Upload images and click "Generate Layout" to see your sheet preview here
                </p>
              </div>
            ) : isGenerating ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                  </div>
                  <p className="text-gray-600 font-medium">Generating preview...</p>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="h-full flex flex-col">
                {/* Top row: corner + horizontal ruler */}
                <div className="flex flex-shrink-0">
                  {/* Corner */}
                  <div
                    className="flex-shrink-0 bg-gray-50 border-r border-b border-gray-200"
                    style={{ width: RULER_SIZE, height: RULER_SIZE }}
                  />
                  {/* Horizontal ruler - syncs with main scroll */}
                  <div
                    ref={hRulerRef}
                    className="flex-1 overflow-hidden ruler-scroll"
                  >
                    <div
                      className="relative bg-gray-50 border-b border-gray-200"
                      style={{ width: scaledWidth, height: RULER_SIZE, marginLeft: 24 }}
                    >
                      {horizontalRulerMarks}
                    </div>
                  </div>
                </div>

                {/* Bottom row: vertical ruler + scrollable content */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Vertical ruler - syncs with main scroll */}
                  <div
                    ref={vRulerRef}
                    className="flex-shrink-0 overflow-hidden ruler-scroll bg-gray-50 border-r border-gray-200"
                    style={{ width: RULER_SIZE }}
                  >
                    <div
                      className="relative"
                      style={{ height: scaledHeight, width: RULER_SIZE, marginTop: 24 }}
                    >
                      {verticalRulerMarks}
                    </div>
                  </div>

                  {/* Main scrollable preview */}
                  <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-auto preview-scroll select-none"
                    style={{ cursor: getCursorStyle(), userSelect: 'none' }}
                    onScroll={handleScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="p-6 select-none">
                      <div
                        className="shadow-lg flex-shrink-0 select-none"
                        style={{
                          width: scaledWidth,
                          height: scaledHeight,
                          ...getCanvasBackgroundStyle(),
                        }}
                      >
                        <img
                          src={previewUrl}
                          alt="Sheet preview"
                          style={{
                            width: scaledWidth,
                            height: scaledHeight,
                            display: 'block',
                            objectFit: 'contain',
                            pointerEvents: 'none',
                          }}
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Preview not available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {hasLayout && (
            <div className="px-6 py-4 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex-shrink-0">
              <p className="text-sm text-gray-600 mb-3">
                This is a low-resolution preview. Download for full print quality
                {canvasHeightInches > 100 ? ' (very long sheet - scroll to see full preview)' : ' (scroll to see full sheet)'}.
                {zoom > 50 && ' Drag to pan around the preview.'}
              </p>
              
              <div className="flex items-center gap-3 mb-4">
                {/* Sheet Dimensions */}
                <div className="flex items-center gap-2 rounded-xl px-5 py-3 border" style={{ backgroundColor: primaryColor ? `${primaryColor}10` : '#eff6ff', borderColor: primaryColor ? `${primaryColor}30` : '#bfdbfe' }}>
                  <svg className="w-5 h-5" style={{ color: primaryColor || '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  <span className="text-base font-bold" style={{ color: primaryColor || '#1d4ed8' }}>{canvasWidthInches}" × {formatNumber(canvasHeightInches)}"</span>
                </div>
                
                {/* Square Inches */}
                <div className="flex items-center gap-2 rounded-xl px-5 py-3 border" style={{ backgroundColor: primaryColor ? `${primaryColor}10` : '#eef2ff', borderColor: primaryColor ? `${primaryColor}30` : '#c7d2fe' }}>
                  <svg className="w-5 h-5" style={{ color: primaryColor || '#6366f1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-base font-bold" style={{ color: primaryColor || '#4338ca' }}>{formatNumber(totalSqInchesUsed ?? 0)} sq.in</span>
                </div>
                
                {/* Downloaded Badge */}
                {creditsDeductedForCurrentLayout && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: primaryColor ? `${primaryColor}20` : '#e0e7ff', borderColor: primaryColor ? `${primaryColor}40` : '#a5b4fc' }}>
                    <svg className="w-5 h-5" style={{ color: primaryColor || '#4f46e5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-base font-semibold" style={{ color: primaryColor || '#4338ca' }}>Downloaded</span>
                  </div>
                )}
              </div>
              {onDownload && (
                hasMultipleSheets ? (
                  /* Multi-sheet download dropdown */
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        disabled={isExporting}
                        className="w-full h-12 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-5 w-5" />
                            Download
                            <ChevronDown className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64 z-[60]">
                      <DropdownMenuItem 
                        onClick={onDownloadCurrentSheet || onDownload}
                        className="flex items-center gap-3 py-3 cursor-pointer"
                      >
                        <Download className="h-5 w-5 text-blue-500" />
                        <div>
                          <div className="font-medium">Download Sheet {activeSheet}</div>
                          <div className="text-xs text-gray-500">Current sheet only</div>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={onDownloadAllPngs}
                        className="flex items-center gap-3 py-3 cursor-pointer"
                      >
                        <Files className="h-5 w-5 text-indigo-500" />
                        <div>
                          <div className="font-medium">Download All as PNGs</div>
                          <div className="text-xs text-gray-500">{sheets.length} separate files</div>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  /* Single sheet download button */
                  <Button
                    onClick={onDownload}
                    disabled={isExporting}
                    className="w-full h-12 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        Download Full Quality
                      </>
                    )}
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
        onClick={onToggle}
      />
    </>
  );
};
