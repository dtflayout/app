/**
 * Memory estimation utility for preventing browser crashes
 * Estimates memory usage before generating layouts or exports
 * 
 * Features:
 * - Smart device memory detection (uses navigator.deviceMemory where available)
 * - Adaptive warnings based on device RAM
 * - Professional, helpful messaging
 */

// Default DPI for professional print quality
const DEFAULT_DPI = 300;

// Chrome's canvas pixel limit
const CHROME_PIXEL_LIMIT = 268_000_000;

// Memory thresholds in MB
const THRESHOLDS = {
  HIGH: 2000,    // 2 GB - show warning
  CRITICAL: 3000 // 3 GB - show stronger warning
};

export interface MemoryEstimate {
  canvasMemoryMB: number;
  imagesMemoryMB: number;
  exportPeakMB: number;
  totalEstimateMB: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  canProceed: boolean;
  warningMessage?: string;
  shouldShowWarning: boolean;
  deviceMemoryGB: number | null;
}

/**
 * Get device memory in GB (if available)
 * Only works in Chrome/Edge, returns null in other browsers
 */
export function getDeviceMemory(): number | null {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    return (navigator as any).deviceMemory as number;
  }
  return null;
}

/**
 * Determine if we should show a warning based on device RAM and estimated usage
 * 
 * Logic:
 * - 16GB+ device: Skip warning if usage < 50% of RAM
 * - 8GB device: Show warning only for critical usage (3GB+)
 * - 4GB or unknown: Always show warning at thresholds
 */
function shouldShowMemoryWarning(
  estimatedMB: number,
  deviceMemoryGB: number | null
): { shouldShow: boolean; reason: string } {
  const estimatedGB = estimatedMB / 1024;
  
  // If we can't detect device memory, be conservative
  if (deviceMemoryGB === null) {
    if (estimatedMB >= THRESHOLDS.HIGH) {
      return { shouldShow: true, reason: 'unknown_device' };
    }
    return { shouldShow: false, reason: 'below_threshold' };
  }
  
  // High-RAM devices (16GB+): Skip warning if usage is reasonable
  if (deviceMemoryGB >= 16) {
    // Only warn if using more than 50% of RAM
    if (estimatedGB > deviceMemoryGB * 0.5) {
      return { shouldShow: true, reason: 'high_percentage_of_ram' };
    }
    // Skip warning for 16GB+ devices with reasonable usage
    return { shouldShow: false, reason: 'plenty_of_ram' };
  }
  
  // Medium-RAM devices (8GB): Show warning only for critical
  if (deviceMemoryGB >= 8) {
    if (estimatedMB >= THRESHOLDS.CRITICAL) {
      return { shouldShow: true, reason: 'critical_on_8gb' };
    }
    // Skip high warning for 8GB devices
    if (estimatedMB >= THRESHOLDS.HIGH) {
      return { shouldShow: false, reason: '8gb_can_handle_high' };
    }
    return { shouldShow: false, reason: 'below_threshold' };
  }
  
  // Low-RAM devices (4GB or less): Always show at thresholds
  if (estimatedMB >= THRESHOLDS.HIGH) {
    return { shouldShow: true, reason: 'low_ram_device' };
  }
  
  return { shouldShow: false, reason: 'below_threshold' };
}

/**
 * Get professional, helpful warning message (Option C style)
 */
function getWarningMessage(
  totalEstimateMB: number,
  riskLevel: 'high' | 'critical'
): string {
  const estimateGB = (totalEstimateMB / 1024).toFixed(1);
  
  if (riskLevel === 'critical') {
    return `This layout will use approximately ${estimateGB} GB of memory during export. To ensure smooth processing:\n\n✓ Close unnecessary browser tabs\n✓ Save work in other applications\n✓ Keep this tab in focus during export`;
  }
  
  // High
  return `This layout will use approximately ${estimateGB} GB of memory during export. To ensure smooth processing:\n\n✓ Close unnecessary browser tabs\n✓ Save work in other applications\n✓ Keep this tab in focus during export`;
}

/**
 * Estimates memory usage for a given sheet size and image set
 * @param sheetWidthInches - Width of the sheet in inches
 * @param sheetHeightInches - Height of the sheet in inches
 * @param images - Array of image objects with File property
 * @param dpi - Target DPI (default 300 for professional print quality)
 * @returns MemoryEstimate object with risk assessment
 */
export function estimateMemoryUsage(
  sheetWidthInches: number,
  sheetHeightInches: number,
  images: { file: File }[],
  dpi: number = DEFAULT_DPI
): MemoryEstimate {
  // Canvas memory at specified DPI (300 DPI is default for print quality)
  const widthPx = Math.round(sheetWidthInches * dpi);
  const heightPx = Math.round(sheetHeightInches * dpi);
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
  const totalEstimateMB = Math.round(exportPeakMB);

  // Get device memory
  const deviceMemoryGB = getDeviceMemory();

  // Determine risk level based on thresholds
  let riskLevel: MemoryEstimate['riskLevel'];
  let warningMessage: string | undefined;

  if (totalEstimateMB < 1500) {
    riskLevel = 'low';
  } else if (totalEstimateMB < THRESHOLDS.HIGH) {
    riskLevel = 'medium';
  } else if (totalEstimateMB < THRESHOLDS.CRITICAL) {
    riskLevel = 'high';
    warningMessage = getWarningMessage(totalEstimateMB, 'high');
  } else {
    riskLevel = 'critical';
    warningMessage = getWarningMessage(totalEstimateMB, 'critical');
  }

  // Determine if we should actually show a warning (smart detection)
  const { shouldShow } = shouldShowMemoryWarning(totalEstimateMB, deviceMemoryGB);

  return {
    canvasMemoryMB: Math.round(canvasMemoryMB),
    imagesMemoryMB: Math.round(imagesMemoryMB),
    exportPeakMB: Math.round(exportPeakMB),
    totalEstimateMB,
    riskLevel,
    canProceed: true, // Always allow - user can proceed at their own risk
    warningMessage,
    shouldShowWarning: shouldShow && (riskLevel === 'high' || riskLevel === 'critical'),
    deviceMemoryGB
  };
}

/**
 * Get a color class for the risk level
 */
export function getRiskColor(riskLevel: MemoryEstimate['riskLevel']): string {
  switch (riskLevel) {
    case 'low': return 'text-indigo-600';
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
    case 'low': return 'bg-indigo-50 border-indigo-200';
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
 * @param dpi - Target DPI (default 300 for professional print quality)
 * @returns CanvasSizeCheck with validation result
 */
export function validateCanvasSize(
  widthInches: number,
  heightInches: number,
  dpi: number = DEFAULT_DPI
): CanvasSizeCheck {
  const widthPx = Math.round(widthInches * dpi);
  const heightPx = Math.round(heightInches * dpi);
  const totalPixels = widthPx * heightPx;

  // Browser limits
  // Chrome's canvas pixel limit is 268 million pixels
  // At 300 DPI:
  //   - 23" width = 6,900 px, max height ~129" (we use 110")
  //   - 11" width = 3,300 px, max height ~270" (we use 220")
  const MAX_DIMENSION = 100000; // pixels per side (~333 inches at 300 DPI)
  const MAX_TOTAL_PIXELS = CHROME_PIXEL_LIMIT;

  let isValid = true;
  let errorMessage: string | undefined;
  let suggestedMaxHeight: number | undefined;

  const maxHeightInches = Math.floor(MAX_DIMENSION / dpi);
  const maxHeightForArea = Math.floor(MAX_TOTAL_PIXELS / widthPx / dpi);

  if (widthPx > MAX_DIMENSION) {
    isValid = false;
    errorMessage = `Canvas width too large!\n\nYour width: ${widthInches.toFixed(1)}" (${widthPx.toLocaleString()} pixels)\nMaximum allowed: ${maxHeightInches}" (${MAX_DIMENSION.toLocaleString()} pixels)\n\nPlease use a narrower canvas.`;
  } else if (heightPx > MAX_DIMENSION) {
    isValid = false;
    suggestedMaxHeight = maxHeightInches;
    errorMessage = `Canvas height too large!\n\nYour height: ${heightInches.toFixed(1)}" (${heightPx.toLocaleString()} pixels)\nMaximum allowed: ${maxHeightInches}" (${MAX_DIMENSION.toLocaleString()} pixels)\n\nPlease generate fewer images or split into multiple sheets.`;
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
