import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Copy, Trash2, Pencil, Grid3X3, LayoutGrid, List, ChevronDown, Info, Minus, Plus } from "lucide-react";
import { ImageObject } from "./CollageCreator";
import { toast } from "sonner";
import { ImageDimension } from "@/utils/layoutAlgorithm";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PreviewBackgroundToggle, PreviewBackground } from "./PreviewBackgroundToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = 'grid-4' | 'grid-3' | 'grid-5' | 'list';

interface ImageManagerProps {
  images: ImageObject[];
  onImagesRemoved: (imageIds: string[]) => void;
  onImagesAdded: (images: ImageObject[]) => void;
  onImageDimensionsChanged: (dimensions: ImageDimension[]) => void;
  onGenerateLayout: () => void;
  onTrimImage: (image: ImageObject) => void;
  onRemoveBackground: (image: ImageObject) => void;
  onEditImage?: (image: ImageObject) => void;
  canvasWidthInches: number;
  spacingInches: number;
  // Optional: existing dimensions from parent (used during session restoration)
  existingDimensions?: ImageDimension[];
  // Optional: DPI resolution thresholds from builder settings
  resolutionThresholds?: {
    optimal: number;
    good: number;
    bad: number;
    terrible: number;
    hideTerrible: boolean;
  };
  // Optional: minimum DPI floor — prevents resizing images below this DPI
  minimumResolutionDpi?: number;
  // Optional: display unit for measurements (inch/cm/mm)
  sizeUnit?: 'inch' | 'cm' | 'mm';
  // Optional: default placement DPI (300 when auto-resize is on, 150 when off)
  defaultPlacementDpi?: number;
  // Optional: primary brand color for toggles and accents
  primaryColor?: string;
  // Optional: image card background color
  cardBackgroundColor?: string;
}

export const ImageManager = ({
  images,
  onImagesRemoved,
  onImagesAdded,
  onImageDimensionsChanged,
  onGenerateLayout,
  onTrimImage,
  onRemoveBackground,
  onEditImage,
  canvasWidthInches,
  spacingInches,
  existingDimensions,
  resolutionThresholds,
  minimumResolutionDpi,
  sizeUnit = 'inch',
  defaultPlacementDpi = 300,
  primaryColor,
  cardBackgroundColor
}: ImageManagerProps) => {

  // Conversion helpers: internal state is always inches
  const conversionFactor = sizeUnit === 'cm' ? 2.54 : sizeUnit === 'mm' ? 25.4 : 1;
  const unitLabel = sizeUnit === 'cm' ? 'cm' : sizeUnit === 'mm' ? 'mm' : 'inches';
  const unitDecimals = sizeUnit === 'mm' ? 1 : 2;
  const inchesToDisplay = (inches: number): string => (inches * conversionFactor).toFixed(unitDecimals);
  const displayToInches = (val: number): number => val / conversionFactor;
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
  const [thumbnailBg, setThumbnailBg] = useState<PreviewBackground>('transparent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid-4');
  const [copyQuantities, setCopyQuantities] = useState<Map<string, number>>(new Map());
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

      // Check if we have existing dimensions from parent (e.g., during session restoration)
      const existingDim = existingDimensions?.find(d => d.id === img.id);
      
      // If we have existing dimensions from parent for a new image, use those instead of calculating
      if (isNewImage && existingDim && !urlChanged) {
        console.log(`[ImageManager] Using existing dimensions for ${img.id}:`, existingDim);
        
        // Update the ref with the effective URL
        imageUrlsRef.current.set(img.id, effectiveUrl);
        
        // We still need pixel dimensions for DPI calculation - load image to get them
        const imageEl = new Image();
        imageEl.onload = () => {
          const widthPixels = imageEl.naturalWidth;
          const heightPixels = imageEl.naturalHeight;
          
          // Calculate DPI based on existing dimensions
          const dpiWidth = widthPixels / existingDim.widthInches;
          const dpiHeight = heightPixels / existingDim.heightInches;
          const dpi = Math.round((dpiWidth + dpiHeight) / 2);
          
          setImageDimensions(prev => {
            const updated = new Map(prev);
            updated.set(img.id, {
              width: existingDim.widthInches,
              height: existingDim.heightInches,
              widthPixels,
              heightPixels,
              dpi
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
              width: inchesToDisplay(existingDim.widthInches),
              height: inchesToDisplay(existingDim.heightInches)
            });
            return updated;
          });
        };
        imageEl.src = effectiveUrl;
        return; // Skip default calculation
      }

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

          // Use configured placement DPI for calculating initial inch dimensions
          const standardDpi = defaultPlacementDpi;
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
              width: inchesToDisplay(widthInches),
              height: inchesToDisplay(heightInches)
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

  // Recalculate dimension errors when canvas width changes
  // An image only "exceeds canvas" if its SMALLER dimension is too large
  // (because the layout algorithm can rotate images to fit)
  useEffect(() => {
    if (images.length === 0 || imageDimensions.size === 0) return;

    const PADDING_INCHES = 0.3;
    const maxAllowedDimension = canvasWidthInches - (PADDING_INCHES * 2);

    const newErrors = new Map<string, { width: boolean; height: boolean }>();

    imageDimensions.forEach((dims, imgId) => {
      // Image can be rotated, so only the SMALLER dimension needs to fit
      const smallerDimension = Math.min(dims.width, dims.height);
      const exceedsCanvas = smallerDimension > maxAllowedDimension;
      
      // If image exceeds canvas, mark both dimensions as error (for visual consistency)
      // If it fits, no errors
      newErrors.set(imgId, { width: exceedsCanvas, height: exceedsCanvas });
    });

    setDimensionErrors(newErrors);
  }, [canvasWidthInches, imageDimensions, images.length]);

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
      width: inchesToDisplay(dimensions.width),
      height: inchesToDisplay(dimensions.height)
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

  const getCopyQuantity = (id: string): number => copyQuantities.get(id) || 1;

  const setCopyQuantity = (id: string, value: number) => {
    const clamped = Math.max(1, Math.min(80, value));
    setCopyQuantities(prev => {
      const next = new Map(prev);
      next.set(id, clamped);
      return next;
    });
  };

  const handleMultiCopy = (id: string) => {
    const count = getCopyQuantity(id);
    const imageToCopy = images.find(img => img.id === id);
    if (!imageToCopy) return;

    const dimensions = imageDimensions.get(id);
    if (!dimensions) return;

    const originalFileName = imageToCopy.file.name;
    const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.'));
    const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));

    const newImages: ImageObject[] = [];
    const newDimensions = new Map(imageDimensions);
    const newAspectRatioLocks = new Map(aspectRatioLocked);
    const newInputVals = new Map(inputValues);

    // Count existing copies to start numbering from the right place
    let existingCopies = images.filter(img =>
      img.file.name.startsWith(baseName) &&
      (img.file.name === originalFileName || img.file.name.match(new RegExp(`${baseName}_\\d{2}${fileExtension.replace('.', '\\.')}$`)))
    ).length;

    for (let i = 0; i < count; i++) {
      const copyNumber = (existingCopies + i).toString().padStart(2, '0');
      const newFileName = `${baseName}_${copyNumber}${fileExtension}`;
      const newId = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`;
      const newFile = new File([imageToCopy.file], newFileName, { type: imageToCopy.file.type });

      newImages.push({
        id: newId,
        file: newFile,
        url: imageToCopy.url,
        thumbnailUrl: imageToCopy.thumbnailUrl
      });

      newDimensions.set(newId, { ...dimensions });
      newAspectRatioLocks.set(newId, aspectRatioLocked.get(id) || true);
      newInputVals.set(newId, {
        width: inchesToDisplay(dimensions.width),
        height: inchesToDisplay(dimensions.height)
      });
    }

    setImageDimensions(newDimensions);
    setAspectRatioLocked(newAspectRatioLocks);
    setInputValues(newInputVals);

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

    onImagesAdded(newImages);
    toast.success(`${count} ${count === 1 ? 'copy' : 'copies'} added`);

    // Reset quantity back to 1
    setCopyQuantities(prev => {
      const next = new Map(prev);
      next.set(id, 1);
      return next;
    });
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
    const numValueDisplay = parseFloat(value);
    
    if (isNaN(numValueDisplay) || numValueDisplay <= 0) {
      const currentDim = imageDimensions.get(id);
      if (currentDim) {
        const newInputValues = new Map(inputValues);
        newInputValues.set(id, {
          width: inchesToDisplay(currentDim.width),
          height: inchesToDisplay(currentDim.height)
        });
        setInputValues(newInputValues);
      }
      return;
    }

    // Convert user input from display unit to inches for internal processing
    const numValue = displayToInches(numValueDisplay);
    
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
      // Image can be rotated, so only the SMALLER dimension needs to fit
      const smallerDimension = Math.min(newWidth, newHeight);
      const exceedsCanvas = smallerDimension > maxAllowedDimension;
      
      // If image exceeds canvas, mark both dimensions as error
      newErrors.set(id, { width: exceedsCanvas, height: exceedsCanvas });
      setDimensionErrors(newErrors);
      
      // Recalculate DPI based on new dimensions
      const currentDims = imageDimensions.get(id);
      if (currentDims) {
        // === DPI floor enforcement: clamp size so DPI doesn't drop below minimum ===
        if (minimumResolutionDpi && minimumResolutionDpi > 0) {
          const maxWidthForMinDpi = currentDims.widthPixels / minimumResolutionDpi;
          const maxHeightForMinDpi = currentDims.heightPixels / minimumResolutionDpi;
          
          if (newWidth > maxWidthForMinDpi || newHeight > maxHeightForMinDpi) {
            // Clamp to maximum allowed size
            const isLocked = aspectRatioLocked.get(id);
            if (isLocked) {
              const aspectRatio = currentDims.width / currentDims.height;
              // Clamp based on whichever dimension exceeds the limit
              const clampedWidth = Math.min(newWidth, maxWidthForMinDpi);
              const clampedHeight = Math.min(newHeight, maxHeightForMinDpi);
              // Recalculate the other dimension to maintain aspect ratio
              if (dimension === 'width') {
                newWidth = parseFloat(clampedWidth.toFixed(2));
                newHeight = parseFloat((newWidth / aspectRatio).toFixed(2));
              } else {
                newHeight = parseFloat(clampedHeight.toFixed(2));
                newWidth = parseFloat((newHeight * aspectRatio).toFixed(2));
              }
            } else {
              newWidth = parseFloat(Math.min(newWidth, maxWidthForMinDpi).toFixed(2));
              newHeight = parseFloat(Math.min(newHeight, maxHeightForMinDpi).toFixed(2));
            }
            
            toast.warning(
              `Size clamped — image can't be enlarged beyond ${minimumResolutionDpi} DPI minimum`,
              { duration: 4000 }
            );
          }
        }

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
      
      // Convert back to display unit for input fields
      const newInputValues = new Map(inputValues);
      newInputValues.set(id, {
        width: inchesToDisplay(newWidth),
        height: inchesToDisplay(newHeight)
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

  /** Returns a hex color string for the DPI badge */
  const getDpiColor = (dpi: number): string => {
    const optimal = resolutionThresholds?.optimal ?? 300;
    const good = resolutionThresholds?.good ?? 150;
    const bad = resolutionThresholds?.bad ?? 72;
    
    if (dpi >= optimal) return "#22c55e"; // green
    if (dpi >= good) return "#f4dc00"; // yellow
    if (dpi >= bad) return "#ef4444"; // red
    return "#171717"; // near-black for terrible
  };

  const getDpiLabel = (dpi: number) => {
    const optimal = resolutionThresholds?.optimal ?? 300;
    const good = resolutionThresholds?.good ?? 150;
    const bad = resolutionThresholds?.bad ?? 72;
    
    if (dpi >= optimal) return "Optimal Resolution";
    if (dpi >= good) return "Good Resolution";
    if (dpi >= bad) return "Bad Resolution";
    if (resolutionThresholds?.hideTerrible) return "";
    return "Terrible Resolution";
  };

  /** Should the DPI badge be completely hidden for this value? */
  const shouldHideDpi = (dpi: number) => {
    if (!resolutionThresholds?.hideTerrible) return false;
    const bad = resolutionThresholds?.bad ?? 72;
    return dpi < bad;
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-gray-800 tracking-tight">Uploaded Images</h2>
            <p className="text-sm text-gray-500 mt-1">
              {images.length} image{images.length !== 1 ? 's' : ''} ready for layout
            </p>
          </div>
          
          {/* Controls */}
          {images.length > 0 && (
            <div className="flex items-center gap-4">
              {/* Thumbnail Background Preview */}
              <PreviewBackgroundToggle
                value={thumbnailBg}
                onChange={setThumbnailBg}
              />

              {/* View Mode Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700">
                    {viewMode === 'list' ? (
                      <List className="w-4 h-4" />
                    ) : (
                      <LayoutGrid className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {viewMode === 'grid-3' && 'Grid 3'}
                      {viewMode === 'grid-4' && 'Grid 4'}
                      {viewMode === 'grid-5' && 'Grid 5'}
                      {viewMode === 'list' && 'List'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem 
                    onClick={() => setViewMode('grid-4')}
                    className={`flex items-center gap-2 cursor-pointer ${viewMode === 'grid-4' ? 'bg-indigo-50 text-indigo-700' : ''}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Grid 4
                    {viewMode === 'grid-4' && <span className="ml-auto text-indigo-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setViewMode('grid-3')}
                    className={`flex items-center gap-2 cursor-pointer ${viewMode === 'grid-3' ? 'bg-indigo-50 text-indigo-700' : ''}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Grid 3
                    {viewMode === 'grid-3' && <span className="ml-auto text-indigo-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setViewMode('grid-5')}
                    className={`flex items-center gap-2 cursor-pointer ${viewMode === 'grid-5' ? 'bg-indigo-50 text-indigo-700' : ''}`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Grid 5
                    {viewMode === 'grid-5' && <span className="ml-auto text-indigo-500">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 cursor-pointer ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-700' : ''}`}
                  >
                    <List className="w-4 h-4" />
                    List
                    {viewMode === 'list' && <span className="ml-auto text-indigo-500">✓</span>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {images.length > 0 ? (
          <>
            {/* List View Header */}
            {viewMode === 'list' && (
              <div className="grid grid-cols-[64px_1fr_240px_140px_80px_160px] items-center gap-4 px-6 py-3 border-b border-gray-200 text-sm font-medium text-gray-500">
                <div></div>
                <div>Name</div>
                <div className="text-center">Size ({unitLabel})</div>
                <div className="text-center">Pixels</div>
                <div className="text-center">DPI</div>
                <div className="text-right pr-2">Actions</div>
              </div>
            )}
            
            <div className={`max-h-[800px] overflow-y-auto pr-2 ${
              viewMode === 'list' 
                ? 'flex flex-col' 
                : viewMode === 'grid-3'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                  : viewMode === 'grid-5'
                    ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
            }`}>
              {images.map((image) => {
                const dimensions = imageDimensions.get(image.id);
                const isLocked = aspectRatioLocked.get(image.id) || false;
                const errors = dimensionErrors.get(image.id);
                const inputs = inputValues.get(image.id);

                // Check if image exceeds canvas dimensions
                const exceedsCanvas = errors?.width || errors?.height;

                // List View Layout
                if (viewMode === 'list') {
                  return (
                    <div
                      key={image.id}
                      className={`grid grid-cols-[64px_1fr_240px_140px_80px_160px] items-center gap-4 px-6 py-5 transition-all duration-200 hover:bg-gray-50 border-b border-gray-100 ${
                        exceedsCanvas ? 'bg-red-50/50' : ''
                      }`}
                    >
                      {/* Thumbnail */}
                      <div
                        className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200"
                        style={getThumbnailBgStyle()}
                      >
                        <img
                          src={image.thumbnailUrl}
                          alt={image.file.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Filename + Transparency */}
                      <div className="min-w-0 flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate" title={image.file.name}>
                          {image.file.name}
                        </p>
                        {image.hasTransparency && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 cursor-help flex-shrink-0">
                                <Info className="w-2.5 h-2.5 text-amber-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-sm">
                              <p>This image has transparent areas. In DTF printing, transparent pixels won't transfer onto the garment.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      {/* Size in Inches */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="text"
                            value={inputs?.width || ''}
                            onChange={(e) => handleInputChange(image.id, 'width', e.target.value)}
                            onBlur={() => handleInputBlur(image.id, 'width')}
                            className={`w-24 h-10 text-center text-sm font-medium ${errors?.width ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400' : 'border-gray-200'}`}
                          />
                          <span className="text-gray-400 text-sm">×</span>
                          <Input
                            type="text"
                            value={inputs?.height || ''}
                            onChange={(e) => handleInputChange(image.id, 'height', e.target.value)}
                            onBlur={() => handleInputBlur(image.id, 'height')}
                            className={`w-24 h-10 text-center text-sm font-medium ${errors?.height ? 'border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400' : 'border-gray-200'}`}
                          />
                        </div>
                        {(errors?.width || errors?.height) && (
                          <p className="text-xs text-red-500 mt-1">Exceeds canvas</p>
                        )}
                      </div>

                      {/* Pixels */}
                      <div className="text-center text-sm text-gray-600">
                        {dimensions ? `${dimensions.widthPixels} × ${dimensions.heightPixels}` : '—'}
                      </div>

                      {/* DPI */}
                      <div className="text-center">
                        {dimensions && !shouldHideDpi(dimensions.dpi) && (
                          <span 
                            className="inline-block px-2.5 py-1 text-xs font-bold rounded-full"
                            style={{ backgroundColor: getDpiColor(dimensions.dpi), color: getDpiColor(dimensions.dpi) === '#f4dc00' ? '#000' : '#fff' }}
                          >
                            {dimensions.dpi}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2">
                        {onEditImage && (
                          <button
                            onClick={() => onEditImage(image)}
                            className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                          >
                            Edit Image
                          </button>
                        )}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCopyQuantity(image.id, getCopyQuantity(image.id) - 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 bg-white rounded-l-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={getCopyQuantity(image.id) <= 1}
                          >
                            <Minus className="h-2.5 w-2.5 text-gray-500" />
                          </button>
                          <input
                            type="text"
                            value={getCopyQuantity(image.id)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) setCopyQuantity(image.id, val);
                              else if (e.target.value === '') setCopyQuantity(image.id, 1);
                            }}
                            className="w-8 h-6 text-center text-xs font-medium border-t border-b border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => setCopyQuantity(image.id, getCopyQuantity(image.id) + 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 bg-white rounded-r-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={getCopyQuantity(image.id) >= 80}
                          >
                            <Plus className="h-2.5 w-2.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleMultiCopy(image.id)}
                            className="h-6 px-2.5 text-xs font-semibold text-white rounded-md transition-colors hover:opacity-90"
                            style={{ backgroundColor: primaryColor || '#4f46e5' }}
                            title="Add copies"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => onImagesRemoved([image.id])}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Grid View Layout
                return (
                  <div
                    key={image.id}
                    className={`group relative rounded-xl p-10 transition-all duration-300 ${
                      exceedsCanvas
                        ? 'border-2 border-red-300 bg-red-50 shadow-md'
                        : 'border border-gray-200 shadow-sm'
                    }`}
                    style={!exceedsCanvas ? { backgroundColor: cardBackgroundColor || '#ffffff' } : undefined}
                  >
                  {/* Top section: Thumbnail + Filename + DPI */}
                  <div className="flex gap-3 mb-3">
                    {/* Thumbnail */}
                    <div
                      className="w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200"
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

                    {/* Filename + DPI + Transparency */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <p className="text-base font-semibold text-gray-800 truncate" title={image.file.name}>
                        {image.file.name}
                      </p>

                      <div className="flex items-center gap-2">
                        {dimensions && !shouldHideDpi(dimensions.dpi) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span 
                                className="inline-block px-3 py-1 text-sm font-bold rounded-full cursor-help w-fit"
                                style={{ backgroundColor: getDpiColor(dimensions.dpi), color: getDpiColor(dimensions.dpi) === '#f4dc00' ? '#000' : '#fff' }}
                              >
                                {dimensions.dpi} DPI
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{getDpiLabel(dimensions.dpi)}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {image.hasTransparency && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 cursor-help flex-shrink-0">
                                <Info className="w-3 h-3 text-amber-600" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-sm">
                              <p>This image has transparent areas. In DTF printing, transparent pixels won't transfer onto the garment. If you notice unexpected gaps in your print, try using the Remove Color tool to clean up semi-transparent edges.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions section */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    {/* Width */}
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Width</Label>
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          value={inputs?.width || ""}
                          onChange={(e) => handleInputChange(image.id, 'width', e.target.value)}
                          onBlur={() => handleInputBlur(image.id, 'width')}
                          className={`h-11 text-xl font-bold text-gray-800 pr-14 ${errors?.width ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {unitLabel}
                        </span>
                      </div>
                      {errors?.width && (
                        <p className="text-xs text-red-500 mt-1">Exceeds canvas</p>
                      )}
                    </div>

                    {/* Height */}
                    <div>
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Height</Label>
                      <div className="relative mt-1">
                        <Input
                          type="text"
                          value={inputs?.height || ""}
                          onChange={(e) => handleInputChange(image.id, 'height', e.target.value)}
                          onBlur={() => handleInputBlur(image.id, 'height')}
                          className={`h-11 text-xl font-bold text-gray-800 pr-14 ${errors?.height ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-200'}`}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          {unitLabel}
                        </span>
                      </div>
                      {errors?.height && (
                        <p className="text-xs text-red-500 mt-1">Exceeds canvas</p>
                      )}
                    </div>
                  </div>

                  {/* Image dimensions - show original and trimmed if image was trimmed */}
                  {dimensions && (
                    <div className="text-sm text-gray-500 mb-2 space-y-0.5">
                      {image.originalWidth && image.originalHeight ? (
                        <>
                          <p>
                            Original: <span className="font-mono">{image.originalWidth} × {image.originalHeight} px</span>
                          </p>
                          <p className="text-indigo-600">
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

                  {/* Lock Aspect Ratio Toggle */}
                  <div className="flex items-center gap-2 mb-3 py-2 border-t border-gray-100">
                    <button
                      onClick={() => toggleAspectRatioLock(image.id)}
                      className="relative inline-flex items-center cursor-pointer focus:outline-none group"
                      aria-label="Toggle aspect ratio lock"
                    >
                      <div 
                        className={`w-10 h-6 rounded-full shadow-sm transition-all duration-200 ${
                          !isLocked ? 'bg-gray-300 group-hover:bg-gray-400' : ''
                        }`}
                        style={isLocked ? { backgroundColor: primaryColor || '#6366f1' } : undefined}
                      >
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                          isLocked ? 'translate-x-4' : 'translate-x-0.5'
                        }`}></div>
                      </div>
                    </button>
                    <span className="text-sm text-gray-700 select-none">Lock Aspect Ratio</span>
                  </div>

                  {/* Copies row */}
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-gray-50 rounded-lg">
                    <Copy className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-500">Copies</span>
                    <div className="flex items-center ml-auto">
                      <button
                        onClick={() => setCopyQuantity(image.id, getCopyQuantity(image.id) - 1)}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 bg-white rounded-l-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={getCopyQuantity(image.id) <= 1}
                      >
                        <Minus className="h-3 w-3 text-gray-500" />
                      </button>
                      <input
                        type="text"
                        value={getCopyQuantity(image.id)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) setCopyQuantity(image.id, val);
                          else if (e.target.value === '') setCopyQuantity(image.id, 1);
                        }}
                        className="w-10 h-7 text-center text-sm font-medium border-t border-b border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setCopyQuantity(image.id, getCopyQuantity(image.id) + 1)}
                        className="w-7 h-7 flex items-center justify-center border border-gray-300 bg-white rounded-r-md hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={getCopyQuantity(image.id) >= 80}
                      >
                        <Plus className="h-3 w-3 text-gray-500" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleMultiCopy(image.id)}
                      className="h-7 px-3 text-xs font-semibold text-white rounded-md transition-colors hover:opacity-90"
                      style={{ backgroundColor: primaryColor || '#4f46e5' }}
                    >
                      Add
                    </button>
                  </div>

                  {/* Action buttons - single row */}
                  <div className="flex gap-2">
                    {onEditImage && (
                      <button
                        onClick={() => onEditImage(image)}
                        className="flex-[2] flex items-center justify-center gap-1.5 h-9 px-3 text-sm font-semibold text-gray-800 border-[1.5px] border-gray-200 bg-transparent rounded-full group-hover:bg-white hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-600/[0.04] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => onImagesRemoved([image.id])}
                      className="flex-[1] flex items-center justify-center h-9 text-gray-500 bg-transparent border-[1.5px] border-gray-200 rounded-full group-hover:bg-white hover:border-red-400 hover:text-red-500 hover:bg-red-500/[0.04] hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-base">No images uploaded yet</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
