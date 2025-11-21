/**
 * Memory estimation utility for preventing browser crashes
 * Estimates memory usage before generating layouts or exports
 */

export interface MemoryEstimate {
  canvasMemoryMB: number;
  imagesMemoryMB: number;
  exportPeakMB: number;
  totalEstimateMB: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;
  warningMessage?: string;
}

/**
 * Estimates memory usage for a given sheet size and image set
 * @param sheetWidthInches - Width of the sheet in inches
 * @param sheetHeightInches - Height of the sheet in inches
 * @param images - Array of image objects with File property
 * @returns MemoryEstimate object with risk assessment
 */
export function estimateMemoryUsage(
  sheetWidthInches: number,
  sheetHeightInches: number,
  images: { file: File }[]
): MemoryEstimate {
  // Canvas memory at 150 DPI (export resolution)
  const widthPx = Math.round(sheetWidthInches * 150);
  const heightPx = Math.round(sheetHeightInches * 150);
  const canvasMemoryMB = (widthPx * heightPx * 4) / (1024 * 1024); // RGBA = 4 bytes per pixel

  // Estimate decoded image memory
  // Compressed images typically expand 3-6x when decoded to bitmap
  // Using conservative 4x estimate
  const imagesMemoryMB = images.reduce((total, img) => {
    const fileSizeMB = img.file.size / (1024 * 1024);
    const decodedMB = fileSizeMB * 4; // Rough estimate for decoded bitmap
    return total + decodedMB;
  }, 0);

  // Export peak includes:
  // - Canvas memory (for rendering)
  // - Image memory (decoded images)
  // - PNG encoding buffer (~50% of canvas size)
  // - Base64 string overhead (~33% more than binary)
  const exportPeakMB = canvasMemoryMB + imagesMemoryMB + (canvasMemoryMB * 0.8);
  const totalEstimateMB = exportPeakMB;

  // Determine risk level based on typical browser limits
  // Chrome: ~1-2 GB per tab
  // Safari: ~1 GB (stricter)
  // Mobile: ~300-500 MB
  let riskLevel: MemoryEstimate['riskLevel'];
  let canProceed = true;
  let warningMessage: string | undefined;

  if (totalEstimateMB < 600) {
    riskLevel = 'low';
  } else if (totalEstimateMB < 1200) {
    riskLevel = 'medium';
    warningMessage = `This layout will use approximately ${Math.round(totalEstimateMB)}MB of memory. Export may take a moment.`;
  } else if (totalEstimateMB < 2000) {
    riskLevel = 'high';
    warningMessage = `⚠️ High memory usage (~${Math.round(totalEstimateMB)}MB). This may freeze your browser. Consider reducing image count or sizes.`;
  } else {
    riskLevel = 'critical';
    canProceed = true; // Always allow - user can proceed at their own risk
    warningMessage = `⚠️ CRITICAL memory usage (~${Math.round(totalEstimateMB)}MB)! This will likely freeze or crash your browser. We strongly recommend reducing images.`;
  }

  return {
    canvasMemoryMB: Math.round(canvasMemoryMB),
    imagesMemoryMB: Math.round(imagesMemoryMB),
    exportPeakMB: Math.round(exportPeakMB),
    totalEstimateMB: Math.round(totalEstimateMB),
    riskLevel,
    canProceed,
    warningMessage
  };
}

/**
 * Get a color class for the risk level
 */
export function getRiskColor(riskLevel: MemoryEstimate['riskLevel']): string {
  switch (riskLevel) {
    case 'low': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-orange-600';
    case 'critical': return 'text-red-600';
  }
}

/**
 * Get a background color class for the risk level
 */
export function getRiskBgColor(riskLevel: MemoryEstimate['riskLevel']): string {
  switch (riskLevel) {
    case 'low': return 'bg-green-50 border-green-200';
    case 'medium': return 'bg-yellow-50 border-yellow-200';
    case 'high': return 'bg-orange-50 border-orange-200';
    case 'critical': return 'bg-red-50 border-red-200';
  }
}

/**
 * Canvas size validation result
 */
export interface CanvasSizeCheck {
  isValid: boolean;
  widthPx: number;
  heightPx: number;
  totalPixels: number;
  exceedsLimit: boolean;
  errorMessage?: string;
  suggestedMaxHeight?: number;
}

/**
 * Validates canvas size against browser limits
 * @param widthInches - Canvas width in inches
 * @param heightInches - Canvas height in inches
 * @param dpi - Target DPI (default 150)
 * @returns CanvasSizeCheck with validation result
 */
export function validateCanvasSize(
  widthInches: number,
  heightInches: number,
  dpi: number = 150
): CanvasSizeCheck {
  const widthPx = Math.round(widthInches * dpi);
  const heightPx = Math.round(heightInches * dpi);
  const totalPixels = widthPx * heightPx;

  // Browser limits - permissive for long banners (150 DPI allows larger canvases)
  const MAX_DIMENSION = 150000; // pixels per side (1000 inches at 150 DPI)
  const MAX_TOTAL_PIXELS = 2_000_000_000; // ~2 billion pixels

  let isValid = true;
  let errorMessage: string | undefined;
  let suggestedMaxHeight: number | undefined;

  const maxHeightInches = Math.floor(MAX_DIMENSION / dpi);
  const maxHeightForArea = Math.floor(MAX_TOTAL_PIXELS / widthPx / dpi);

  if (widthPx > MAX_DIMENSION) {
    isValid = false;
    errorMessage = `Canvas width too large!\n\nYour width: ${widthInches.toFixed(1)}" (${widthPx.toLocaleString()} pixels)\nMaximum allowed: 1000" (${MAX_DIMENSION.toLocaleString()} pixels)\n\nPlease use a narrower canvas.`;
  } else if (heightPx > MAX_DIMENSION) {
    isValid = false;
    suggestedMaxHeight = maxHeightInches;
    errorMessage = `Canvas height too large!\n\nYour height: ${heightInches.toFixed(1)}" (${heightPx.toLocaleString()} pixels)\nMaximum allowed: 1000" (${MAX_DIMENSION.toLocaleString()} pixels)\n\nPlease generate fewer images or split into multiple sheets.`;
  } else if (totalPixels > MAX_TOTAL_PIXELS) {
    isValid = false;
    suggestedMaxHeight = maxHeightForArea;
    errorMessage = `Canvas area too large!\n\nYour canvas: ${(totalPixels / 1_000_000).toFixed(0)} million pixels\nMaximum allowed: ${(MAX_TOTAL_PIXELS / 1_000_000).toFixed(0)} million pixels\n\nFor ${widthInches}" width, max height is ~${maxHeightForArea}".\nPlease reduce images or split into multiple sheets.`;
  }

  return {
    isValid,
    widthPx,
    heightPx,
    totalPixels,
    exceedsLimit: !isValid,
    errorMessage,
    suggestedMaxHeight
  };
}
