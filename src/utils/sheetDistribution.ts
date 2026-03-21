/**
 * Sheet Distribution Algorithm
 * Distributes images across multiple sheets based on total area
 * Used when a single sheet would exceed the maximum height limit
 */

import { ImageObject } from "@/components/CollageCreator";
import { ImageDimension } from "@/utils/layoutAlgorithm";

export interface ImageWithArea {
  image: ImageObject;
  dimension: ImageDimension;
  area: number;
}

export interface SheetDistribution {
  sheetNumber: number;
  images: ImageObject[];
  dimensions: ImageDimension[];
  totalArea: number;
  estimatedHeight?: number;
}

export interface DistributionResult {
  success: boolean;
  sheets?: SheetDistribution[];
  error?: string;
}

/**
 * Maximum number of sheets allowed
 */
export const MAX_SHEETS = 5;

/**
 * Calculate if multiple sheets are needed based on layout height
 */
export function needsMultipleSheets(
  layoutHeightInches: number,
  maxHeightPerSheet: number
): boolean {
  return layoutHeightInches > maxHeightPerSheet;
}

/**
 * Estimate number of sheets needed based on total area
 */
export function estimateSheetCount(
  totalArea: number,
  canvasWidth: number,
  maxHeightPerSheet: number,
  packingEfficiency: number = 0.85
): number {
  const maxAreaPerSheet = canvasWidth * maxHeightPerSheet * packingEfficiency;
  return Math.ceil(totalArea / maxAreaPerSheet);
}

/**
 * Distribute images across multiple sheets based on area
 * Uses a "first fit decreasing" algorithm for balanced distribution
 *
 * @param images - Array of image objects
 * @param dimensions - Array of image dimensions (parallel to images)
 * @param maxHeightPerSheet - Maximum height allowed per sheet
 * @param canvasWidth - Width of the canvas in inches
 * @returns Distribution result with sheets or error
 */
export function distributeImagesByArea(
  images: ImageObject[],
  dimensions: ImageDimension[],
  maxHeightPerSheet: number,
  canvasWidth: number
): DistributionResult {
  if (images.length !== dimensions.length) {
    return {
      success: false,
      error: "Images and dimensions arrays must have the same length",
    };
  }

  if (images.length === 0) {
    return {
      success: false,
      error: "No images to distribute",
    };
  }

  // Calculate area for each image and create paired data
  const imageData: ImageWithArea[] = images.map((img, idx) => ({
    image: img,
    dimension: dimensions[idx],
    area: dimensions[idx].widthInches * dimensions[idx].heightInches,
  }));

  // Check if any single image is too tall for a sheet
  const oversizedImages = imageData.filter(
    (item) => item.dimension.heightInches > maxHeightPerSheet
  );
  if (oversizedImages.length > 0) {
    return {
      success: false,
      error: `${oversizedImages.length} image(s) are too tall to fit on a single sheet. Maximum height is ${maxHeightPerSheet} inches.`,
    };
  }

  // Calculate total area
  const totalArea = imageData.reduce((sum, item) => sum + item.area, 0);

  // Estimate sheets needed (with 85% packing efficiency assumption)
  const estimatedSheets = estimateSheetCount(totalArea, canvasWidth, maxHeightPerSheet);

  console.log("[SheetDistribution] Total area:", totalArea.toFixed(2), "sq.in");
  console.log("[SheetDistribution] Estimated sheets needed:", estimatedSheets);

  // Check if we exceed max sheets
  if (estimatedSheets > MAX_SHEETS) {
    const maxImages = Math.floor(
      (MAX_SHEETS * canvasWidth * maxHeightPerSheet * 0.85) / (totalArea / images.length)
    );
    return {
      success: false,
      error: `Your images require ${estimatedSheets} sheets but maximum allowed is ${MAX_SHEETS}. Please remove some images (recommended: ~${maxImages} images maximum).`,
    };
  }

  // Sort images by area descending (place large images first)
  const sortedImageData = [...imageData].sort((a, b) => b.area - a.area);

  // Initialize sheets
  const numSheets = Math.max(estimatedSheets, 1);
  const sheets: SheetDistribution[] = [];
  for (let i = 0; i < numSheets; i++) {
    sheets.push({
      sheetNumber: i + 1,
      images: [],
      dimensions: [],
      totalArea: 0,
    });
  }

  // Distribute images using "first fit decreasing" algorithm
  // Place each image in the sheet with the least total area
  for (const item of sortedImageData) {
    // Find sheet with minimum area (most space available)
    let minSheet = sheets[0];
    for (const sheet of sheets) {
      if (sheet.totalArea < minSheet.totalArea) {
        minSheet = sheet;
      }
    }

    // Add image to this sheet
    minSheet.images.push(item.image);
    minSheet.dimensions.push(item.dimension);
    minSheet.totalArea += item.area;
  }

  // Calculate estimated heights for each sheet
  for (const sheet of sheets) {
    // Rough estimate: area / width, adjusted for packing inefficiency
    sheet.estimatedHeight = sheet.totalArea / canvasWidth / 0.85;
  }

  // Remove any empty sheets (shouldn't happen, but safety check)
  const nonEmptySheets = sheets.filter((s) => s.images.length > 0);

  console.log("[SheetDistribution] Distribution complete:");
  nonEmptySheets.forEach((sheet) => {
    console.log(
      `  Sheet ${sheet.sheetNumber}: ${sheet.images.length} images, ${sheet.totalArea.toFixed(2)} sq.in, ~${sheet.estimatedHeight?.toFixed(1)}" estimated height`
    );
  });

  return {
    success: true,
    sheets: nonEmptySheets,
  };
}

/**
 * Rebalance sheets after layout generation
 * Called if one sheet ends up significantly taller than others
 *
 * @param sheets - Current sheet distributions
 * @param actualHeights - Actual heights after layout generation
 * @param maxHeightPerSheet - Maximum allowed height
 * @returns Rebalanced sheets or null if no rebalancing needed
 */
export function rebalanceSheetsIfNeeded(
  sheets: SheetDistribution[],
  actualHeights: number[],
  maxHeightPerSheet: number
): SheetDistribution[] | null {
  // Check if any sheet exceeds the max height
  const exceedsMax = actualHeights.some((h) => h > maxHeightPerSheet);

  if (!exceedsMax) {
    return null; // No rebalancing needed
  }

  console.log("[SheetDistribution] Rebalancing needed - some sheets exceed max height");

  // For now, we just return null and let the caller handle the error
  // A more sophisticated implementation could move images between sheets
  return null;
}

/**
 * Validate that a distribution result is valid
 */
export function validateDistribution(
  distribution: DistributionResult,
  originalImageCount: number
): { valid: boolean; error?: string } {
  if (!distribution.success || !distribution.sheets) {
    return { valid: false, error: distribution.error || "Distribution failed" };
  }

  // Check that all images are accounted for
  const distributedCount = distribution.sheets.reduce(
    (sum, sheet) => sum + sheet.images.length,
    0
  );

  if (distributedCount !== originalImageCount) {
    return {
      valid: false,
      error: `Image count mismatch: expected ${originalImageCount}, got ${distributedCount}`,
    };
  }

  // Check that no sheet is empty
  const emptySheets = distribution.sheets.filter((s) => s.images.length === 0);
  if (emptySheets.length > 0) {
    return {
      valid: false,
      error: `${emptySheets.length} sheet(s) are empty`,
    };
  }

  // Check that we don't exceed max sheets
  if (distribution.sheets.length > MAX_SHEETS) {
    return {
      valid: false,
      error: `Too many sheets: ${distribution.sheets.length} (max ${MAX_SHEETS})`,
    };
  }

  return { valid: true };
}

/**
 * Calculate the variance in sheet areas (for measuring balance)
 * Lower variance = better balance
 */
export function calculateDistributionBalance(sheets: SheetDistribution[]): number {
  if (sheets.length <= 1) return 0;

  const areas = sheets.map((s) => s.totalArea);
  const mean = areas.reduce((sum, a) => sum + a, 0) / areas.length;
  const variance =
    areas.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / areas.length;

  return Math.sqrt(variance); // Standard deviation
}
