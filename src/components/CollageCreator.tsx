
import React, { useState, useRef, useEffect } from "react";
import { ImageUploader } from "./ImageUploader";
import { Canvas } from "./Canvas";
import { ImageManager } from "./ImageManager";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { generateLayout, ImageDimension, PositionedImage } from "@/utils/layoutAlgorithm";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ImageObject = {
  id: string;
  file: File;
  url: string;
};

export const CollageCreator = () => {
  const [images, setImages] = useState<ImageObject[]>([]);
  const [imageDimensions, setImageDimensions] = useState<ImageDimension[]>([]);
  const [layout, setLayout] = useState<PositionedImage[]>([]);
  const [canvasHeightInches, setCanvasHeightInches] = useState(12);
  const [canvasWidthInches, setCanvasWidthInches] = useState<number>(23);
  const [spacingInches, setSpacingInches] = useState(0.3);
  const [isExporting, setIsExporting] = useState(false);
  const canvasRef = useRef<any>(null);

  const handleImagesAdded = (newImages: ImageObject[]) => {
    setImages((prev) => [...prev, ...newImages]);
    toast.success(`${newImages.length} image(s) added to your collage`);
  };

  const handleImagesRemoved = (imageIds: string[]) => {
    // Remove images from the state
    setImages((prev) => prev.filter(img => !imageIds.includes(img.id)));
    
    // Remove dimensions for these images
    setImageDimensions((prev) => prev.filter(dim => !imageIds.includes(dim.id)));
    
    // If these images were in the layout, regenerate layout
    const wasInLayout = layout.some(item => imageIds.includes(item.id));
    if (wasInLayout) {
      setLayout([]);
    }
    
    toast.info(`${imageIds.length} image(s) removed`);
  };

  const handleImageDimensionsChanged = (dimensions: ImageDimension[]) => {
    console.log("Dimensions changed:", dimensions);
    setImageDimensions(dimensions);
  };

  const handleGenerateLayout = () => {
    if (imageDimensions.length === 0) {
      toast.error("No images with dimensions available");
      return;
    }
    
    // Check if any image dimensions exceed canvas width
    const oversizedImages = imageDimensions.filter(
      img => img.widthInches > canvasWidthInches || img.heightInches > canvasWidthInches
    );
    
    if (oversizedImages.length > 0) {
      toast.error("Cannot generate sheet: Some image dimensions are larger than the selected canvas size. Please reduce their dimensions and try again.");
      return;
    }
    
    console.log("Generating layout with dimensions:", imageDimensions);
    
    // Generate layout using our algorithm with selected width and spacing
    const result = generateLayout(imageDimensions, canvasWidthInches, spacingInches);
    console.log("Layout result:", result);
    
    if (result.positionedImages.length === 0) {
      toast.error("Failed to generate layout. Please check image dimensions.");
      return;
    }
    
    // Check for overlaps and show appropriate message
    const hasOverlaps = result.positionedImages.some((img1, i) => 
      result.positionedImages.some((img2, j) => 
        i !== j && 
        img1.x < img2.x + img2.widthInches && 
        img1.x + img1.widthInches > img2.x &&
        img1.y < img2.y + img2.heightInches &&
        img1.y + img1.heightInches > img2.y
      )
    );
    
    if (hasOverlaps) {
      toast.warning("Warning: Some images may overlap in the generated layout.");
    }
    
    setLayout(result.positionedImages);
    setCanvasHeightInches(result.totalHeightInches);
    
    toast.success(`Layout generated with ${result.positionedImages.length} images`);
  };

  const handleExport = async () => {
    if (!canvasRef.current || layout.length === 0) {
      toast.error("No layout to export");
      return;
    }
    
    try {
      setIsExporting(true);
      const dataUrl = await canvasRef.current.exportCanvas();
      
      const link = document.createElement("a");
      link.download = `print-sheet-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Print sheet exported successfully!");
    } catch (error) {
      toast.error("Failed to export print sheet");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setLayout([]);
      toast.info("Canvas cleared");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Layout Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-fade-in">
        <h2 className="text-xl font-semibold mb-4">Layout Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sheet-width">Sheet Width</Label>
            <Select 
              value={canvasWidthInches.toString()} 
              onValueChange={(value) => {
                setCanvasWidthInches(Number(value));
                if (layout.length > 0) {
                  setLayout([]);
                  toast.info("Sheet width changed. Please regenerate layout.");
                }
              }}
            >
              <SelectTrigger id="sheet-width">
                <SelectValue placeholder="Select width" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="23">23 inches</SelectItem>
                <SelectItem value="11">11 inches</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="spacing">Spacing (inches)</Label>
            <input
              id="spacing"
              type="number"
              step="0.1"
              min="0.1"
              max="2"
              value={spacingInches}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 2) {
                  setSpacingInches(value);
                  if (layout.length > 0) {
                    setLayout([]);
                    toast.info("Spacing changed. Please regenerate layout.");
                  }
                }
              }}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            />
          </div>
          
          <Button 
            onClick={handleGenerateLayout}
            disabled={images.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            Generate Layout
          </Button>
          
          <Button 
            onClick={handleExport} 
            disabled={layout.length === 0 || isExporting}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Download Sheet"}
          </Button>
        </div>
      </div>

      {/* Upload Images - Only show when no layout is generated */}
      {layout.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 animate-fade-in">
          <h2 className="text-xl font-semibold mb-4">Upload Images</h2>
          <ImageUploader onImagesAdded={handleImagesAdded} />
          {images.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              {images.length} / 30 images uploaded
            </div>
          )}
        </div>
      )}
      
      {images.length > 0 && (
        <ImageManager
          images={images}
          onImagesRemoved={handleImagesRemoved}
          onImagesAdded={handleImagesAdded}
          onImageDimensionsChanged={handleImageDimensionsChanged}
          onGenerateLayout={handleGenerateLayout}
          canvasWidthInches={canvasWidthInches}
          spacingInches={spacingInches}
        />
      )}
      
      {layout.length > 0 && (
        <Canvas 
          ref={canvasRef} 
          images={images} 
          layout={layout}
          canvasHeightInches={canvasHeightInches}
          canvasWidthInches={canvasWidthInches}
        />
      )}
    </div>
  );
};
