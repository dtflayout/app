import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Lock } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";
import { ImageDimension } from "@/utils/layoutAlgorithm";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input as SearchInput } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImageManagerProps {
  images: ImageObject[];
  onImagesRemoved: (imageIds: string[]) => void;
  onImagesAdded: (images: ImageObject[]) => void;
  onImageDimensionsChanged: (dimensions: ImageDimension[]) => void;
  onGenerateLayout: () => void;
  canvasWidthInches: number;
  spacingInches: number;
}

export const ImageManager = ({ 
  images, 
  onImagesRemoved, 
  onImagesAdded,
  onImageDimensionsChanged,
  onGenerateLayout,
  canvasWidthInches,
  spacingInches
}: ImageManagerProps) => {
  const [imageDimensions, setImageDimensions] = useState<Map<string, { 
    width: number; 
    height: number; 
    widthPixels: number; 
    heightPixels: number; 
    dpi: number; 
  }>>(new Map());
  const [aspectRatioLocked, setAspectRatioLocked] = useState<Map<string, boolean>>(new Map());
  const [dimensionErrors, setDimensionErrors] = useState<Map<string, { width: boolean; height: boolean }>>(new Map());
  const [inputValues, setInputValues] = useState<Map<string, { width: string; height: string }>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const newDimensions = new Map(imageDimensions);
    const newAspectRatioLocks = new Map(aspectRatioLocked);
    let hasNewImages = false;
    
    images.forEach(img => {
      if (!newDimensions.has(img.id)) {
        hasNewImages = true;
        const imageEl = new Image();
        imageEl.onload = () => {
          const widthPixels = imageEl.naturalWidth;
          const heightPixels = imageEl.naturalHeight;
          
          // Assume 150 DPI as standard for calculating initial inch dimensions (matches export resolution)
          const standardDpi = 150;
          const widthInches = parseFloat((widthPixels / standardDpi).toFixed(2));
          const heightInches = parseFloat((heightPixels / standardDpi).toFixed(2));
          
          newDimensions.set(img.id, { 
            width: widthInches, 
            height: heightInches,
            widthPixels,
            heightPixels,
            dpi: standardDpi
          });
          newAspectRatioLocks.set(img.id, true);
          
          const newInputValues = new Map(inputValues);
          newInputValues.set(img.id, { 
            width: widthInches.toFixed(2), 
            height: heightInches.toFixed(2) 
          });
          setInputValues(newInputValues);
          
          setImageDimensions(new Map(newDimensions));
          setAspectRatioLocked(new Map(newAspectRatioLocks));
        };
        imageEl.src = img.url;
      }
    });
    
    if (hasNewImages) {
      setImageDimensions(newDimensions);
      setAspectRatioLocked(newAspectRatioLocks);
    }
  }, [images]);

  const handleCopyImage = (id: string) => {
    const imageToCopy = images.find(img => img.id === id);
    if (!imageToCopy) return;

    const dimensions = imageDimensions.get(id);
    if (!dimensions) return;

    const originalFileName = imageToCopy.file.name;
    const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'));
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
    
    const existingCopies = images.filter(img => 
      img.file.name.startsWith(baseName) && 
      (img.file.name === originalFileName || img.file.name.match(new RegExp(`${baseName}_\\d{2}${fileExtension.replace('.', '\\.')}$`)))
    ).length;
    
    const copyNumber = existingCopies.toString().padStart(2, '0');
    const newFileName = `${baseName}_${copyNumber}${fileExtension}`;

    const newId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newFile = new File([imageToCopy.file], newFileName, { type: imageToCopy.file.type });
    
    const newImageObject: ImageObject = {
      id: newId,
      file: newFile,
      url: imageToCopy.url
    };
    
    const newDimensions = new Map(imageDimensions);
    newDimensions.set(newId, { ...dimensions });
    setImageDimensions(newDimensions);
    
    const newAspectRatioLocks = new Map(aspectRatioLocked);
    newAspectRatioLocks.set(newId, aspectRatioLocked.get(id) || true);
    setAspectRatioLocked(newAspectRatioLocks);
    
    const newInputValues = new Map(inputValues);
    newInputValues.set(newId, {
      width: dimensions.width.toFixed(2),
      height: dimensions.height.toFixed(2)
    });
    setInputValues(newInputValues);
    
    // Notify parent about new dimensions
    const dimensionsArray: ImageDimension[] = [];
    newDimensions.forEach((dims, imgId) => {
      dimensionsArray.push({
        id: imgId,
        widthInches: dims.width,
        heightInches: dims.height
      });
    });
    onImageDimensionsChanged(dimensionsArray);
    
    onImagesAdded([newImageObject]);
    toast.success(`Image duplicated`);
  };

  const handleInputChange = (id: string, dimension: 'width' | 'height', value: string) => {
    const newInputValues = new Map(inputValues);
    const currentInput = newInputValues.get(id) || { width: '', height: '' };
    
    if (dimension === 'width') {
      currentInput.width = value;
    } else {
      currentInput.height = value;
    }
    
    newInputValues.set(id, currentInput);
    setInputValues(newInputValues);
  };

  const handleInputBlur = (id: string, dimension: 'width' | 'height') => {
    const inputValue = inputValues.get(id);
    if (!inputValue) return;
    
    const value = dimension === 'width' ? inputValue.width : inputValue.height;
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      const currentDim = imageDimensions.get(id);
      if (currentDim) {
        const newInputValues = new Map(inputValues);
        newInputValues.set(id, {
          width: currentDim.width.toFixed(2),
          height: currentDim.height.toFixed(2)
        });
        setInputValues(newInputValues);
      }
      return;
    }
    
    const PADDING_INCHES = spacingInches;
    const maxAllowedDimension = canvasWidthInches - (PADDING_INCHES * 2);
    
    const newDimensions = new Map(imageDimensions);
    const currentDimensions = newDimensions.get(id);
    
    if (currentDimensions) {
      const isLocked = aspectRatioLocked.get(id);
      let newWidth = currentDimensions.width;
      let newHeight = currentDimensions.height;
      
      if (isLocked) {
        const aspectRatio = currentDimensions.width / currentDimensions.height;
        
        if (dimension === 'width') {
          newWidth = parseFloat(numValue.toFixed(2));
          newHeight = parseFloat((newWidth / aspectRatio).toFixed(2));
        } else {
          newHeight = parseFloat(numValue.toFixed(2));
          newWidth = parseFloat((newHeight * aspectRatio).toFixed(2));
        }
      } else {
        if (dimension === 'width') {
          newWidth = parseFloat(numValue.toFixed(2));
        } else {
          newHeight = parseFloat(numValue.toFixed(2));
        }
      }
      
      const newErrors = new Map(dimensionErrors);
      const widthExceeds = newWidth > maxAllowedDimension;
      const heightExceeds = newHeight > maxAllowedDimension;
      
      newErrors.set(id, { width: widthExceeds, height: heightExceeds });
      setDimensionErrors(newErrors);
      
      // Recalculate DPI based on new dimensions
      const currentDims = imageDimensions.get(id);
      if (currentDims) {
        const dpiFromWidth = currentDims.widthPixels / newWidth;
        const dpiFromHeight = currentDims.heightPixels / newHeight;
        const calculatedDpi = Math.round(Math.min(dpiFromWidth, dpiFromHeight));
        
        newDimensions.set(id, { 
          width: newWidth, 
          height: newHeight,
          widthPixels: currentDims.widthPixels,
          heightPixels: currentDims.heightPixels,
          dpi: calculatedDpi
        });
        setImageDimensions(newDimensions);
      }
      
      const newInputValues = new Map(inputValues);
      newInputValues.set(id, {
        width: newWidth.toFixed(2),
        height: newHeight.toFixed(2)
      });
      setInputValues(newInputValues);
      
      const dimensionsArray: ImageDimension[] = [];
      newDimensions.forEach((dims, imgId) => {
        dimensionsArray.push({
          id: imgId,
          widthInches: dims.width,
          heightInches: dims.height
        });
      });
      onImageDimensionsChanged(dimensionsArray);
    }
  };

  const toggleAspectRatioLock = (id: string) => {
    const newAspectRatioLocks = new Map(aspectRatioLocked);
    const currentLockState = aspectRatioLocked.get(id) || false;
    newAspectRatioLocks.set(id, !currentLockState);
    setAspectRatioLocked(newAspectRatioLocks);
  };

  const filteredImages = images.filter(img => 
    img.file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDpiColor = (dpi: number) => {
    if (dpi < 150) return "bg-red-600";
    if (dpi < 250) return "bg-yellow-600";
    return "bg-green-600";
  };

  const getDpiLabel = (dpi: number) => {
    if (dpi < 150) return "Bad resolution";
    if (dpi < 250) return "Good Resolution";
    if (dpi < 300) return "Excellent Resolution";
    return "Excellent Resolution";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white rounded-lg shadow-sm border p-6 animate-fade-in">
      <h2 className="text-xl font-semibold mb-4">Upload Images</h2>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <SearchInput
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
          {filteredImages.map((image) => {
            const dimensions = imageDimensions.get(image.id);
            const isLocked = aspectRatioLocked.get(image.id) || false;
            const errors = dimensionErrors.get(image.id);
            const inputs = inputValues.get(image.id);
            
            return (
              <div key={image.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                <div className="flex gap-3">
                  <img 
                    src={image.url} 
                    alt={image.file.name}
                    className="w-20 h-20 object-contain border rounded flex-shrink-0" 
                  />
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-sm font-medium truncate" title={image.file.name}>
                      {image.file.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Width</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={inputs?.width || ""}
                            onChange={(e) => handleInputChange(image.id, 'width', e.target.value)}
                            onBlur={() => handleInputBlur(image.id, 'width')}
                            className={`h-8 text-sm ${errors?.width ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            inches
                          </span>
                        </div>
                        {errors?.width && (
                          <p className="text-xs text-red-500 mt-0.5">Exceeds canvas limit</p>
                        )}
                      </div>
                      
                      <div>
                        <Label className="text-xs text-muted-foreground">Height</Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={inputs?.height || ""}
                            onChange={(e) => handleInputChange(image.id, 'height', e.target.value)}
                            onBlur={() => handleInputBlur(image.id, 'height')}
                            className={`h-8 text-sm ${errors?.height ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            inches
                          </span>
                        </div>
                        {errors?.height && (
                          <p className="text-xs text-red-500 mt-0.5">Exceeds canvas limit</p>
                        )}
                      </div>
                    </div>
                    
                    {dimensions && (
                      <p className="text-xs text-muted-foreground">
                        Original: {dimensions.widthPixels} × {dimensions.heightPixels} px
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`lock-${image.id}`}
                        checked={isLocked}
                        onCheckedChange={() => toggleAspectRatioLock(image.id)}
                      />
                      <Label
                        htmlFor={`lock-${image.id}`}
                        className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        Lock Aspect Ratio
                      </Label>
                    </div>
                    
                    {dimensions && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className={`${getDpiColor(dimensions.dpi)} text-white hover:opacity-90 cursor-help`}>
                            {dimensions.dpi} DPI
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getDpiLabel(dimensions.dpi)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyImage(image.id)}
                        className="flex-1 h-8"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onImagesRemoved([image.id])}
                        className="flex-1 h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No images match your search" : "No images uploaded yet"}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};
