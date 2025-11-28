import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Copy, Trash2 } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";
import { ImageDimension } from "@/utils/layoutAlgorithm";
import { Label } from "@/components/ui/label";
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
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 animate-fade-in">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Uploaded Images</h2>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7 max-h-[900px] overflow-y-auto pr-2">
            {images.map((image) => {
              const dimensions = imageDimensions.get(image.id);
              const isLocked = aspectRatioLocked.get(image.id) || false;
              const errors = dimensionErrors.get(image.id);
              const inputs = inputValues.get(image.id);

              return (
                <div
                  key={image.id}
                  className="border border-emerald-200 rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                  style={{ backgroundColor: '#f6fffb' }}
                >
                  {/* Top section: Thumbnail + Filename + DPI */}
                  <div className="flex gap-3 mb-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200">
                      <img
                        src={image.url}
                        alt={image.file.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    {/* Filename + DPI */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <p className="text-lg font-bold text-slate-800 truncate" title={image.file.name}>
                        {image.file.name}
                      </p>

                      {dimensions && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`inline-block px-3 py-1 text-white text-sm font-bold rounded-full cursor-help w-fit ${
                              dimensions.dpi < 100
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            }`}>
                              {dimensions.dpi} DPI
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{getDpiLabel(dimensions.dpi)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Dimensions section */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {/* Width */}
                    <div>
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Width</Label>
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          value={inputs?.width || ""}
                          onChange={(e) => handleInputChange(image.id, 'width', e.target.value)}
                          onBlur={() => handleInputBlur(image.id, 'width')}
                          className={`h-11 text-xl font-bold text-slate-800 pr-14 ${errors?.width ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-200'}`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          inches
                        </span>
                      </div>
                      {errors?.width && (
                        <p className="text-xs text-red-500 mt-1">Exceeds canvas</p>
                      )}
                    </div>

                    {/* Height */}
                    <div>
                      <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Height</Label>
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          value={inputs?.height || ""}
                          onChange={(e) => handleInputChange(image.id, 'height', e.target.value)}
                          onBlur={() => handleInputBlur(image.id, 'height')}
                          className={`h-11 text-xl font-bold text-slate-800 pr-14 ${errors?.height ? 'border-red-500 focus-visible:ring-red-500' : 'border-slate-200'}`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          inches
                        </span>
                      </div>
                      {errors?.height && (
                        <p className="text-xs text-red-500 mt-1">Exceeds canvas</p>
                      )}
                    </div>
                  </div>

                  {/* Original dimensions */}
                  {dimensions && (
                    <p className="text-sm text-slate-500 mb-2">
                      Original: <span className="font-mono">{dimensions.widthPixels} × {dimensions.heightPixels} px</span>
                    </p>
                  )}

                  {/* Lock Aspect Ratio Toggle - Homepage style */}
                  <div className="flex items-center gap-2 mb-3 py-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleAspectRatioLock(image.id)}
                      className="relative inline-flex items-center cursor-pointer focus:outline-none group"
                      aria-label="Toggle aspect ratio lock"
                    >
                      <div className={`w-10 h-6 rounded-full shadow-sm transition-all duration-200 ${
                        isLocked
                          ? 'bg-emerald-500 group-hover:bg-emerald-600'
                          : 'bg-slate-300 group-hover:bg-slate-400'
                      }`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                          isLocked ? 'translate-x-4' : 'translate-x-0.5'
                        }`}></div>
                      </div>
                    </button>
                    <span className="text-sm text-slate-700 select-none">Lock Aspect Ratio</span>
                  </div>

                  {/* Action buttons - Homepage style */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopyImage(image.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => onImagesRemoved([image.id])}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium text-red-600 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-base">
            No images uploaded yet
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
