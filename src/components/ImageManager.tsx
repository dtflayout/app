import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Copy, Trash2, Scissors, Eraser } from "lucide-react";
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
  onTrimImage: (image: ImageObject) => void;
  onRemoveBackground: (image: ImageObject) => void;
  canvasWidthInches: number;
  spacingInches: number;
}

export const ImageManager = ({
  images,
  onImagesRemoved,
  onImagesAdded,
  onImageDimensionsChanged,
  onGenerateLayout,
  onTrimImage,
  onRemoveBackground,
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
  const [thumbnailBg, setThumbnailBg] = useState<'transparent' | 'grey' | 'black'>('transparent');
  // Use ref to track image URLs (avoids stale closure issues)
  const imageUrlsRef = useRef<Map<string, string>>(new Map());
  // Track temporary URLs created from File objects (for cleanup)
  const tempUrlsRef = useRef<Map<string, string>>(new Map());

  // Cleanup temporary URLs on unmount
  useEffect(() => {
    return () => {
      tempUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      tempUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    images.forEach(img => {
      const previousUrl = imageUrlsRef.current.get(img.id);
      const isNewImage = !imageDimensions.has(img.id);
      const urlChanged = previousUrl !== undefined && previousUrl !== img.url;

      // MEMORY OPTIMIZATION FIX: If url is empty (cleared after layout generation),
      // regenerate it from the File object for dimension calculation
      let effectiveUrl = img.url;
      if (!effectiveUrl || effectiveUrl === '') {
        // Check if we already have a temp URL for this image
        const existingTempUrl = tempUrlsRef.current.get(img.id);
        if (existingTempUrl) {
          effectiveUrl = existingTempUrl;
        } else {
          // Create new temporary URL from File
          effectiveUrl = URL.createObjectURL(img.file);
          tempUrlsRef.current.set(img.id, effectiveUrl);
          console.log(`[ImageManager] Regenerated URL from File for ${img.id}: ${effectiveUrl.substring(0, 50)}`);
        }
      }

      // Detect if URL was cleared for memory optimization (not a real image change)
      // When URL is cleared after layout generation, we should preserve user-entered dimensions
      const wasMemoryOptimizationClear = urlChanged && previousUrl && (!img.url || img.url === '');

      // Need to recalculate if it's a new image OR if the URL changed due to actual image modification
      // (e.g., after trimming/bg removal), but NOT if URL was just cleared for memory optimization
      if (isNewImage || (urlChanged && !wasMemoryOptimizationClear)) {
        // Update the ref immediately with the effective URL
        imageUrlsRef.current.set(img.id, effectiveUrl);

        // IMPORTANT: Clear old cached dimensions immediately when URL changes due to image modification
        // This forces recalculation and prevents stale dimensions from being used
        // But skip this if we're just clearing URL for memory optimization
        if (urlChanged && !wasMemoryOptimizationClear) {
          setImageDimensions(prev => {
            const updated = new Map(prev);
            updated.delete(img.id);
            return updated;
          });
          setInputValues(prev => {
            const updated = new Map(prev);
            updated.delete(img.id);
            return updated;
          });
        }

        const imageEl = new Image();
        imageEl.onload = () => {
          const widthPixels = imageEl.naturalWidth;
          const heightPixels = imageEl.naturalHeight;

          // Validate dimensions - protect against invalid image data
          if (widthPixels <= 0 || heightPixels <= 0) {
            console.error(`[ImageManager] Invalid dimensions for image ${img.id}: ${widthPixels}x${heightPixels}`);
            return;
          }

          // Assume 150 DPI as standard for calculating initial inch dimensions (matches export resolution)
          const standardDpi = 150;
          const widthInches = parseFloat((widthPixels / standardDpi).toFixed(2));
          const heightInches = parseFloat((heightPixels / standardDpi).toFixed(2));

          setImageDimensions(prev => {
            const updated = new Map(prev);
            updated.set(img.id, {
              width: widthInches,
              height: heightInches,
              widthPixels,
              heightPixels,
              dpi: standardDpi
            });
            return updated;
          });

          setAspectRatioLocked(prev => {
            const updated = new Map(prev);
            updated.set(img.id, true);
            return updated;
          });

          setInputValues(prev => {
            const updated = new Map(prev);
            updated.set(img.id, {
              width: widthInches.toFixed(2),
              height: heightInches.toFixed(2)
            });
            return updated;
          });

          // Immediately notify parent about dimensions when URL changed (e.g., after bg removal)
          // This ensures the layout algorithm always has fresh dimensions
          if (urlChanged) {
            const dimensionsArray: ImageDimension[] = [];
            // Include this newly calculated dimension
            dimensionsArray.push({
              id: img.id,
              widthInches: widthInches,
              heightInches: heightInches
            });
            // Include all other existing dimensions
            imageDimensions.forEach((dims, imgId) => {
              if (imgId !== img.id) {
                dimensionsArray.push({
                  id: imgId,
                  widthInches: dims.width,
                  heightInches: dims.height
                });
              }
            });
            onImageDimensionsChanged(dimensionsArray);
          }
        };
        // Use effectiveUrl (regenerated from File if original was empty)
        imageEl.src = effectiveUrl;
      } else if (wasMemoryOptimizationClear) {
        // URL was cleared for memory optimization - just update the ref to track the new temp URL
        // but don't recalculate dimensions (user-entered dimensions should be preserved)
        imageUrlsRef.current.set(img.id, effectiveUrl);
      } else if (!imageUrlsRef.current.has(img.id)) {
        // Track URL for existing images that weren't tracked before
        imageUrlsRef.current.set(img.id, effectiveUrl);
      }
    });

    // Clean up URLs for removed images
    imageUrlsRef.current.forEach((_, id) => {
      if (!images.find(img => img.id === id)) {
        imageUrlsRef.current.delete(id);
      }
    });

    // Clean up temporary URLs for removed images
    tempUrlsRef.current.forEach((url, id) => {
      if (!images.find(img => img.id === id)) {
        URL.revokeObjectURL(url);
        tempUrlsRef.current.delete(id);
      }
    });

    // CRITICAL FIX: Clean up internal imageDimensions Map for removed images
    // This prevents stale dimension data from being synced to parent
    const currentImageIds = new Set(images.map(img => img.id));
    let dimensionsNeedCleanup = false;
    imageDimensions.forEach((_, id) => {
      if (!currentImageIds.has(id)) {
        dimensionsNeedCleanup = true;
      }
    });

    if (dimensionsNeedCleanup) {
      setImageDimensions(prev => {
        const updated = new Map(prev);
        prev.forEach((_, id) => {
          if (!currentImageIds.has(id)) {
            updated.delete(id);
          }
        });
        return updated;
      });

      // Also clean up related state maps
      setAspectRatioLocked(prev => {
        const updated = new Map(prev);
        prev.forEach((_, id) => {
          if (!currentImageIds.has(id)) {
            updated.delete(id);
          }
        });
        return updated;
      });

      setInputValues(prev => {
        const updated = new Map(prev);
        prev.forEach((_, id) => {
          if (!currentImageIds.has(id)) {
            updated.delete(id);
          }
        });
        return updated;
      });

      setDimensionErrors(prev => {
        const updated = new Map(prev);
        prev.forEach((_, id) => {
          if (!currentImageIds.has(id)) {
            updated.delete(id);
          }
        });
        return updated;
      });
    }
  }, [images]);

  // Sync dimensions to parent whenever all images have dimensions calculated
  // This ensures parent always has the latest dimensions for layout generation
  useEffect(() => {
    // Only sync when we have dimensions for all images
    if (images.length === 0) return;
    if (imageDimensions.size === 0) return;

    // Check if all images have dimensions
    const allHaveDimensions = images.every(img => imageDimensions.has(img.id));
    if (!allHaveDimensions) return;

    const dimensionsArray: ImageDimension[] = [];
    imageDimensions.forEach((dims, imgId) => {
      // Skip invalid dimensions
      if (dims.width <= 0 || dims.height <= 0) return;
      dimensionsArray.push({
        id: imgId,
        widthInches: dims.width,
        heightInches: dims.height
      });
    });

    if (dimensionsArray.length > 0) {
      onImageDimensionsChanged(dimensionsArray);
    }
  }, [imageDimensions, images, onImageDimensionsChanged]);

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

    // Reuse the same thumbnail URL since it's the same image content
    // The full-resolution url is also reused for consistency
    const newImageObject: ImageObject = {
      id: newId,
      file: newFile,
      url: imageToCopy.url,
      thumbnailUrl: imageToCopy.thumbnailUrl
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

  // Get thumbnail background style based on selected option
  const getThumbnailBgStyle = () => {
    switch (thumbnailBg) {
      case 'grey':
        return { backgroundColor: '#808080' };
      case 'black':
        return { backgroundColor: '#000000' };
      default: // transparent - checkered pattern
        return {
          backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
          backgroundColor: '#f8fafc'
        };
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Uploaded Images</h2>
          {/* Thumbnail Background Preview (Hold to preview) */}
          {images.length > 0 && (
            <div className="flex items-center gap-2 border rounded-md px-2 py-1" title="Hold to preview background">
              <span className="text-xs text-slate-500">Press & hold to preview:</span>
              <div
                className="h-5 w-5 rounded flex items-center justify-center bg-blue-50 ring-1 ring-blue-300"
                title="Default (checkered)"
              >
                <div
                  className="w-3.5 h-3.5 rounded-sm border border-slate-300"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                    backgroundSize: '4px 4px',
                    backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                  }}
                />
              </div>
              <button
                onMouseDown={() => setThumbnailBg('grey')}
                onMouseUp={() => setThumbnailBg('transparent')}
                onMouseLeave={() => setThumbnailBg('transparent')}
                className={`h-5 w-5 rounded flex items-center justify-center transition-colors select-none ${
                  thumbnailBg === 'grey'
                    ? 'bg-gray-200 ring-2 ring-gray-400'
                    : 'hover:bg-slate-100'
                }`}
                title="Hold to preview grey background"
              >
                <div className="w-3.5 h-3.5 rounded-sm bg-gray-500 border border-slate-300" />
              </button>
              <button
                onMouseDown={() => setThumbnailBg('black')}
                onMouseUp={() => setThumbnailBg('transparent')}
                onMouseLeave={() => setThumbnailBg('transparent')}
                className={`h-5 w-5 rounded flex items-center justify-center transition-colors select-none ${
                  thumbnailBg === 'black'
                    ? 'bg-gray-700 ring-2 ring-gray-500'
                    : 'hover:bg-slate-100'
                }`}
                title="Hold to preview black background"
              >
                <div className="w-3.5 h-3.5 rounded-sm bg-black border border-slate-300" />
              </button>
            </div>
          )}
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7 max-h-[900px] overflow-y-auto pr-2">
            {images.map((image) => {
              const dimensions = imageDimensions.get(image.id);
              const isLocked = aspectRatioLocked.get(image.id) || false;
              const errors = dimensionErrors.get(image.id);
              const inputs = inputValues.get(image.id);

              // Check if image exceeds canvas dimensions
              const exceedsCanvas = errors?.width || errors?.height;

              return (
                <div
                  key={image.id}
                  className={`rounded-xl p-5 shadow-lg hover:shadow-xl transition-shadow ${
                    exceedsCanvas
                      ? 'border-2 border-red-300 bg-red-50'
                      : 'border border-emerald-200'
                  }`}
                  style={exceedsCanvas ? undefined : { backgroundColor: '#f6fffb' }}
                >
                  {/* Top section: Thumbnail + Filename + DPI */}
                  <div className="flex gap-3 mb-3">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-slate-200"
                      style={getThumbnailBgStyle()}
                    >
                      {/* Use thumbnailUrl for gallery display to reduce memory usage on low-RAM devices.
                          The full-resolution image.url is preserved for layout generation, trimming,
                          background removal, and export operations. */}
                      <img
                        src={image.thumbnailUrl}
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

                  {/* Image dimensions - show original and trimmed if image was trimmed */}
                  {dimensions && (
                    <div className="text-sm text-slate-500 mb-2 space-y-0.5">
                      {image.originalWidth && image.originalHeight ? (
                        <>
                          <p>
                            Original: <span className="font-mono">{image.originalWidth} × {image.originalHeight} px</span>
                          </p>
                          <p className="text-emerald-600">
                            Trimmed: <span className="font-mono">{dimensions.widthPixels} × {dimensions.heightPixels} px</span>
                            <span className="ml-1 text-xs">
                              (-{Math.round((1 - (dimensions.widthPixels * dimensions.heightPixels) / (image.originalWidth * image.originalHeight)) * 100)}%)
                            </span>
                          </p>
                        </>
                      ) : (
                        <p>
                          Original: <span className="font-mono">{dimensions.widthPixels} × {dimensions.heightPixels} px</span>
                        </p>
                      )}
                    </div>
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

                  {/* Action buttons */}
                  <div className="space-y-2">
                    {/* Row 1: Trim and Remove Background */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onTrimImage(image)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium text-emerald-600 bg-white border border-slate-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        Trim
                      </button>
                      <button
                        onClick={() => onRemoveBackground(image)}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-medium text-purple-600 bg-white border border-slate-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        Remove BG
                      </button>
                    </div>
                    {/* Row 2: Duplicate and Delete */}
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
