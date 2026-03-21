/**
 * Multi-Sheet Packer
 * 
 * Distributes images across multiple sheets when the total layout
 * would exceed the maximum sheet height.
 * 
 * Key principles:
 * - Never cut images across sheets
 * - Minimize total number of sheets
 * - Balance sheet heights for consistent output
 * - Support quantity expansion (qty:5 → 5 separate images)
 */

import { packImages, PackingImage, canFitInBin } from './maxrects';

// ============================================================================
// Constants
// ============================================================================

const DPI = 300;

// Chrome's canvas pixel limit
const CHROME_PIXEL_LIMIT = 268_000_000;

// Maximum number of sheets allowed
export const MAX_SHEETS = 5;

// Maximum image height allowed (in inches)
export const MAX_IMAGE_HEIGHT_INCHES = 100;

// ============================================================================
// Types
// ============================================================================

export interface MultiSheetImage {
  id: string;
  widthInches: number;
  heightInches: number;
  quantity?: number;
}

export interface PackedImage {
  id: string;
  instanceIndex: number;  // 0, 1, 2... for quantity copies
  x: number;
  y: number;
  widthInches: number;
  heightInches: number;
  rotated: boolean;
}

export interface PackedSheet {
  sheetNumber: number;
  widthInches: number;
  heightInches: number;  // Actual packed height
  images: PackedImage[];
  utilizationPercent: number;
}

export interface MultiSheetResult {
  success: boolean;
  sheets: PackedSheet[];
  totalImages: number;
  totalSheets: number;
  error?: string;
}

export interface SheetLimits {
  widthInches: number;
  maxHeightInches: number;
  widthPx: number;
  maxHeightPx: number;
}

// ============================================================================
// Sheet Limit Calculations
// ============================================================================

/**
 * Get sheet limits based on width
 * - Wide sheets (≥22"): 110" max height
 * - Narrow sheets (<22"): 220" max height
 */
export function getSheetLimits(sheetWidthInches: number): SheetLimits {
  const isWideSheet = sheetWidthInches >= 22;
  const maxHeightInches = isWideSheet ? 110 : 220;
  
  return {
    widthInches: sheetWidthInches,
    maxHeightInches,
    widthPx: Math.round(sheetWidthInches * DPI),
    maxHeightPx: Math.round(maxHeightInches * DPI),
  };
}

/**
 * Check if dimensions are within Chrome's canvas pixel limit
 */
export function isWithinCanvasLimit(widthInches: number, heightInches: number): boolean {
  const totalPixels = (widthInches * DPI) * (heightInches * DPI);
  return totalPixels <= CHROME_PIXEL_LIMIT;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  oversizedImages: string[];
}

/**
 * Validate images before packing
 */
export function validateImages(
  images: MultiSheetImage[],
  sheetWidthInches: number
): ValidationResult {
  const errors: string[] = [];
  const oversizedImages: string[] = [];
  
  for (const img of images) {
    // Check height limit
    if (img.heightInches > MAX_IMAGE_HEIGHT_INCHES) {
      errors.push(`Image "${img.id}" height (${img.heightInches.toFixed(1)}") exceeds maximum allowed (${MAX_IMAGE_HEIGHT_INCHES}").`);
      oversizedImages.push(img.id);
    }
    
    // Check if image can fit in sheet width (considering rotation)
    if (!canFitInBin(img.widthInches, img.heightInches, sheetWidthInches, true)) {
      errors.push(`Image "${img.id}" is too large to fit on a ${sheetWidthInches}" wide sheet even when rotated.`);
      oversizedImages.push(img.id);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    oversizedImages,
  };
}

// ============================================================================
// Image Expansion (Quantities)
// ============================================================================

interface ExpandedImage {
  id: string;
  originalId: string;
  instanceIndex: number;
  widthInches: number;
  heightInches: number;
}

/**
 * Expand images with quantities into individual items
 * qty:5 → 5 separate images with instanceIndex 0,1,2,3,4
 */
function expandQuantities(images: MultiSheetImage[]): ExpandedImage[] {
  const expanded: ExpandedImage[] = [];
  
  for (const img of images) {
    const qty = img.quantity || 1;
    for (let i = 0; i < qty; i++) {
      expanded.push({
        id: qty > 1 ? `${img.id}_${i}` : img.id,
        originalId: img.id,
        instanceIndex: i,
        widthInches: img.widthInches,
        heightInches: img.heightInches,
      });
    }
  }
  
  return expanded;
}

// ============================================================================
// Sheet Distribution
// ============================================================================

interface SheetAssignment {
  sheetIndex: number;
  images: ExpandedImage[];
  totalArea: number;
}

/**
 * Estimate number of sheets needed based on total area
 */
function estimateSheetCount(
  totalArea: number,
  sheetWidth: number,
  maxHeight: number,
  packingEfficiency: number = 0.75  // Conservative estimate
): number {
  const maxAreaPerSheet = sheetWidth * maxHeight * packingEfficiency;
  return Math.max(1, Math.ceil(totalArea / maxAreaPerSheet));
}

/**
 * Pre-distribute images across sheets using "least loaded" approach
 * Sorts images by area (largest first) and assigns to sheet with smallest total area
 */
function preDistributeImages(
  images: ExpandedImage[],
  numSheets: number
): SheetAssignment[] {
  // Initialize sheets
  const sheets: SheetAssignment[] = [];
  for (let i = 0; i < numSheets; i++) {
    sheets.push({
      sheetIndex: i,
      images: [],
      totalArea: 0,
    });
  }
  
  // Sort images by area (largest first)
  const sortedImages = [...images].sort((a, b) => 
    (b.widthInches * b.heightInches) - (a.widthInches * a.heightInches)
  );
  
  // Assign each image to the sheet with smallest total area
  for (const img of sortedImages) {
    const leastLoadedSheet = sheets.reduce((min, sheet) => 
      sheet.totalArea < min.totalArea ? sheet : min
    );
    
    leastLoadedSheet.images.push(img);
    leastLoadedSheet.totalArea += img.widthInches * img.heightInches;
  }
  
  return sheets;
}

// ============================================================================
// Main Multi-Sheet Packing Function
// ============================================================================

/**
 * Pack images across multiple sheets
 * 
 * @param images - Array of images with optional quantities
 * @param sheetWidthInches - Width of each sheet
 * @param spacingInches - Spacing between images (default 0.3)
 * @param edgeMargin - Margin at sheet edges (default matches spacing)
 * @param overrides - Optional overrides for max height and max sheets from builder settings
 * @returns MultiSheetResult with packed sheets or error
 */
export function packMultipleSheets(
  images: MultiSheetImage[],
  sheetWidthInches: number,
  spacingInches: number = 0.3,
  edgeMargin?: number,
  overrides?: { maxHeightInches?: number; maxSheets?: number }
): MultiSheetResult {
  const margin = edgeMargin ?? spacingInches;
  const packingWidth = sheetWidthInches - margin * 2;
  const limits = getSheetLimits(sheetWidthInches);
  // Apply overrides if provided (builder settings)
  const effectiveMaxHeight = overrides?.maxHeightInches 
    ? Math.min(overrides.maxHeightInches, limits.maxHeightInches)
    : limits.maxHeightInches;
  const effectiveMaxSheets = overrides?.maxSheets ?? MAX_SHEETS;
  const maxPackingHeight = effectiveMaxHeight - margin * 2;
  
  console.log(`[MultiSheet] Starting multi-sheet packing`);
  console.log(`[MultiSheet] Sheet: ${sheetWidthInches}" wide, max ${effectiveMaxHeight}" tall, max ${effectiveMaxSheets} sheets`);
  
  // Validate images
  const validation = validateImages(images, packingWidth);
  if (!validation.valid) {
    return {
      success: false,
      sheets: [],
      totalImages: 0,
      totalSheets: 0,
      error: validation.errors.join('\n'),
    };
  }
  
  // Expand quantities
  const expandedImages = expandQuantities(images);
  const totalImages = expandedImages.length;
  
  console.log(`[MultiSheet] Expanded ${images.length} images to ${totalImages} total (with quantities)`);
  
  // Calculate total area
  const totalArea = expandedImages.reduce(
    (sum, img) => sum + (img.widthInches + spacingInches) * (img.heightInches + spacingInches),
    0
  );
  
  // Try single sheet first
  const singleSheetResult = tryPackSingleSheet(
    expandedImages,
    packingWidth,
    maxPackingHeight,
    spacingInches,
    margin
  );
  
  if (singleSheetResult) {
    console.log(`[MultiSheet] All images fit on single sheet: ${singleSheetResult.heightInches.toFixed(2)}"`);
    return {
      success: true,
      sheets: [{
        sheetNumber: 1,
        widthInches: sheetWidthInches,
        heightInches: singleSheetResult.heightInches,
        images: singleSheetResult.images,
        utilizationPercent: singleSheetResult.utilization,
      }],
      totalImages,
      totalSheets: 1,
    };
  }
  
  // Need multiple sheets
  console.log(`[MultiSheet] Single sheet exceeded max height, distributing across multiple sheets`);
  
  // Estimate sheets needed
  const estimatedSheets = Math.min(
    effectiveMaxSheets,
    estimateSheetCount(totalArea, packingWidth, maxPackingHeight)
  );
  
  console.log(`[MultiSheet] Estimated sheets needed: ${estimatedSheets}`);
  
  // Try packing with increasing number of sheets
  for (let numSheets = estimatedSheets; numSheets <= effectiveMaxSheets; numSheets++) {
    const result = tryPackWithSheetCount(
      expandedImages,
      numSheets,
      sheetWidthInches,
      packingWidth,
      maxPackingHeight,
      spacingInches,
      margin
    );
    
    if (result.success) {
      console.log(`[MultiSheet] Successfully packed into ${result.sheets.length} sheets`);
      return {
        ...result,
        totalImages,
      };
    }
  }
  
  // Failed to pack within max sheets
  return {
    success: false,
    sheets: [],
    totalImages,
    totalSheets: 0,
    error: `Your designs require more than ${effectiveMaxSheets} sheet${effectiveMaxSheets === 1 ? '' : 's'}, which is the maximum allowed per order. Please reduce the number of images or their sizes, or generate your layout in multiple batches.`,
  };
}

/**
 * Try to pack all images on a single sheet
 */
function tryPackSingleSheet(
  images: ExpandedImage[],
  packingWidth: number,
  maxPackingHeight: number,
  spacing: number,
  margin: number
): { images: PackedImage[]; heightInches: number; utilization: number } | null {
  const packingImages: PackingImage[] = images.map(img => ({
    id: img.id,
    width: img.widthInches,
    height: img.heightInches,
    originalWidth: img.widthInches,
    originalHeight: img.heightInches,
  }));
  
  const result = packImages(packingImages, packingWidth, maxPackingHeight, spacing, true);
  
  if (!result || result.placed.length !== images.length) {
    return null;
  }
  
  // Check if within max height
  if (result.usedHeight > maxPackingHeight) {
    return null;
  }
  
  // Convert to PackedImage format
  const packedImages: PackedImage[] = result.placed.map(placed => {
    const original = images.find(img => img.id === placed.id)!;
    return {
      id: original.originalId,
      instanceIndex: original.instanceIndex,
      x: placed.x + margin,
      y: placed.y + margin,
      widthInches: placed.width,
      heightInches: placed.height,
      rotated: placed.rotated,
    };
  });
  
  return {
    images: packedImages,
    heightInches: result.usedHeight + margin * 2,
    utilization: result.utilization,
  };
}

/**
 * Try packing with a specific number of sheets
 */
function tryPackWithSheetCount(
  images: ExpandedImage[],
  numSheets: number,
  sheetWidth: number,
  packingWidth: number,
  maxPackingHeight: number,
  spacing: number,
  margin: number
): MultiSheetResult {
  // Pre-distribute images across sheets
  const assignments = preDistributeImages(images, numSheets);
  
  const packedSheets: PackedSheet[] = [];
  const unplacedImages: ExpandedImage[] = [];
  
  // Pack each sheet
  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];
    
    if (assignment.images.length === 0) {
      continue;  // Skip empty sheets
    }
    
    const packingImages: PackingImage[] = assignment.images.map(img => ({
      id: img.id,
      width: img.widthInches,
      height: img.heightInches,
      originalWidth: img.widthInches,
      originalHeight: img.heightInches,
    }));
    
    const result = packImages(packingImages, packingWidth, maxPackingHeight, spacing, true);
    
    if (!result) {
      // Couldn't pack this sheet's images
      unplacedImages.push(...assignment.images);
      continue;
    }
    
    // Check for images that exceeded max height
    if (result.usedHeight > maxPackingHeight) {
      // Some images from this sheet need to move to another sheet
      // For now, mark as failed and try with more sheets
      return { success: false, sheets: [], totalImages: 0, totalSheets: 0 };
    }
    
    // Check if all images were placed
    if (result.placed.length !== assignment.images.length) {
      // Some images didn't fit
      const placedIds = new Set(result.placed.map(p => p.id));
      const notPlaced = assignment.images.filter(img => !placedIds.has(img.id));
      unplacedImages.push(...notPlaced);
    }
    
    // Convert to PackedImage format
    const packedImages: PackedImage[] = result.placed.map(placed => {
      const original = assignment.images.find(img => img.id === placed.id)!;
      return {
        id: original.originalId,
        instanceIndex: original.instanceIndex,
        x: placed.x + margin,
        y: placed.y + margin,
        widthInches: placed.width,
        heightInches: placed.height,
        rotated: placed.rotated,
      };
    });
    
    packedSheets.push({
      sheetNumber: packedSheets.length + 1,
      widthInches: sheetWidth,
      heightInches: result.usedHeight + margin * 2,
      images: packedImages,
      utilizationPercent: result.utilization,
    });
  }
  
  // Try to place any unplaced images on existing sheets
  if (unplacedImages.length > 0) {
    console.log(`[MultiSheet] ${unplacedImages.length} images need rebalancing`);
    // For now, if we have unplaced images, try with more sheets
    return { success: false, sheets: [], totalImages: 0, totalSheets: 0 };
  }
  
  // Remove empty sheets and renumber
  const nonEmptySheets = packedSheets.filter(s => s.images.length > 0);
  nonEmptySheets.forEach((sheet, index) => {
    sheet.sheetNumber = index + 1;
  });
  
  return {
    success: true,
    sheets: nonEmptySheets,
    totalImages: images.length,
    totalSheets: nonEmptySheets.length,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate total area used across all sheets
 */
export function calculateTotalArea(result: MultiSheetResult): number {
  return result.sheets.reduce((sum, sheet) => 
    sum + sheet.widthInches * sheet.heightInches,
    0
  );
}

/**
 * Calculate average utilization across all sheets
 */
export function calculateAverageUtilization(result: MultiSheetResult): number {
  if (result.sheets.length === 0) return 0;
  const total = result.sheets.reduce((sum, sheet) => sum + sheet.utilizationPercent, 0);
  return total / result.sheets.length;
}

/**
 * Get a summary string for the packing result
 */
export function getResultSummary(result: MultiSheetResult): string {
  if (!result.success) {
    return `Packing failed: ${result.error}`;
  }
  
  const sheetInfo = result.sheets
    .map(s => `Sheet ${s.sheetNumber}: ${s.heightInches.toFixed(1)}" (${s.images.length} images, ${s.utilizationPercent.toFixed(1)}%)`)
    .join('\n');
  
  return `Packed ${result.totalImages} images across ${result.totalSheets} sheet(s):\n${sheetInfo}`;
}
