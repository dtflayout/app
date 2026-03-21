
// Types for the layout algorithm
export interface ImageDimension {
  id: string;
  widthInches: number;
  heightInches: number;
  rotated?: boolean;
  quantity?: number;  // For multi-sheet support
}

export interface PositionedImage extends ImageDimension {
  x: number;
  y: number;
  rotated: boolean;
}

// Import Maxrects packer
import { packImages, PackingImage, PlacedImage, canFitInBin } from './maxrects';

// Import Multi-sheet packer
import {
  packMultipleSheets,
  MultiSheetImage,
  MultiSheetResult,
  PackedSheet,
  PackedImage as MultiSheetPackedImage,
  getSheetLimits,
  validateImages,
  MAX_SHEETS,
  MAX_IMAGE_HEIGHT_INCHES,
} from './multiSheetPacker';

// Re-export multi-sheet types for convenience
export type {
  MultiSheetResult,
  PackedSheet,
  MultiSheetPackedImage,
};
export { getSheetLimits, MAX_SHEETS, MAX_IMAGE_HEIGHT_INCHES };

// Spacing between images (set by generateLayout)
let SPACING_INCHES = 0.3;
// Edge margin will be set dynamically to match spacing
let EDGE_MARGIN = 0;

// ============================================================================
// NEW: Orientation Pre-Analysis for Identical Images
// ============================================================================

interface OrientationRecommendation {
  shouldRotate: boolean;
  reason: string;
}

/**
 * Groups images by their dimensions (within tolerance).
 * Returns a map of dimension key -> array of image IDs
 */
const groupImagesByDimensions = (
  images: ImageDimension[],
  tolerance: number = 0.1
): Map<string, string[]> => {
  const groups = new Map<string, string[]>();

  for (const img of images) {
    // Normalize dimensions (smaller first) to group rotated versions together
    const w = Math.min(img.widthInches, img.heightInches);
    const h = Math.max(img.widthInches, img.heightInches);

    // Round to tolerance for grouping
    const key = `${(Math.round(w / tolerance) * tolerance).toFixed(2)}x${(Math.round(h / tolerance) * tolerance).toFixed(2)}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(img.id);
  }

  return groups;
};

/**
 * For a group of identical images, calculate which orientation minimizes total height.
 *
 * This is the KEY FIX: Instead of deciding orientation per-image based on immediate
 * height, we calculate the total sheet height for all images in the group.
 */
const calculateOptimalOrientationForGroup = (
  count: number,
  width: number,
  height: number,
  sheetWidthInches: number,
  spacingInches: number
): OrientationRecommendation => {
  // Original orientation (as uploaded)
  const origWidth = width;
  const origHeight = height;
  const imagesPerRowOrig = Math.floor((sheetWidthInches + spacingInches) / (origWidth + spacingInches));
  const rowsOrig = imagesPerRowOrig > 0 ? Math.ceil(count / imagesPerRowOrig) : count;
  const totalHeightOrig = rowsOrig * origHeight + Math.max(0, rowsOrig - 1) * spacingInches;

  // Rotated orientation (swapped dimensions)
  const rotWidth = height;
  const rotHeight = width;
  const imagesPerRowRot = Math.floor((sheetWidthInches + spacingInches) / (rotWidth + spacingInches));
  const rowsRot = imagesPerRowRot > 0 ? Math.ceil(count / imagesPerRowRot) : count;
  const totalHeightRot = rowsRot * rotHeight + Math.max(0, rowsRot - 1) * spacingInches;

  // Handle edge cases where one orientation doesn't fit at all
  const origFits = origWidth <= sheetWidthInches;
  const rotFits = rotWidth <= sheetWidthInches;

  if (!origFits && !rotFits) {
    // Neither fits, will need scaling - prefer original
    return { shouldRotate: false, reason: 'neither fits, keeping original' };
  }

  if (!origFits) {
    return { shouldRotate: true, reason: 'original too wide, must rotate' };
  }

  if (!rotFits) {
    return { shouldRotate: false, reason: 'rotated too wide, keeping original' };
  }

  // Both orientations fit - pick the one with lower total height
  if (totalHeightRot < totalHeightOrig - 0.01) { // Small tolerance for floating point
    return {
      shouldRotate: true,
      reason: `rotated is shorter (${totalHeightRot.toFixed(1)}" vs ${totalHeightOrig.toFixed(1)}")`
    };
  } else if (totalHeightOrig < totalHeightRot - 0.01) {
    return {
      shouldRotate: false,
      reason: `original is shorter (${totalHeightOrig.toFixed(1)}" vs ${totalHeightRot.toFixed(1)}")`
    };
  } else {
    // Heights are equal - prefer more images per row (better visual layout)
    if (imagesPerRowRot > imagesPerRowOrig) {
      return { shouldRotate: true, reason: 'equal height, more per row when rotated' };
    }
    return { shouldRotate: false, reason: 'equal height, keeping original' };
  }
};

/**
 * Pre-analyze all images and determine optimal orientation for groups of identical images.
 * Returns a map of image ID -> whether it should be rotated
 */
const preAnalyzeOrientations = (
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number
): Map<string, boolean> => {
  const recommendations = new Map<string, boolean>();

  // Group images by dimensions
  const groups = groupImagesByDimensions(images);

  for (const [dimKey, imageIds] of groups) {
    if (imageIds.length < 2) {
      // Single image - let the normal algorithm handle it
      continue;
    }

    // Find the first image in this group to get dimensions
    const firstImage = images.find(img => img.id === imageIds[0])!;

    // Calculate optimal orientation for this group
    const recommendation = calculateOptimalOrientationForGroup(
      imageIds.length,
      firstImage.widthInches,
      firstImage.heightInches,
      sheetWidthInches,
      spacingInches
    );

    // Apply recommendation to all images in the group
    for (const id of imageIds) {
      recommendations.set(id, recommendation.shouldRotate);
    }

    // Log for debugging
    console.log(`[Orientation] Group ${dimKey} (${imageIds.length} images): ${recommendation.shouldRotate ? 'ROTATE' : 'KEEP'} - ${recommendation.reason}`);
  }

  return recommendations;
};

// ============================================================================
// Original Helper Functions (unchanged)
// ============================================================================

// Debug function to visualize layout
export const visualizeLayout = (
  positionedImages: PositionedImage[],
  sheetWidthInches: number,
  totalHeightInches: number
): string => {
  const lines: string[] = [];
  lines.push(`Sheet size: ${sheetWidthInches.toFixed(2)}×${totalHeightInches.toFixed(2)} inches`);
  lines.push(`Total images: ${positionedImages.length}`);

  const sortedImages = [...positionedImages].sort((a, b) => {
    if (a.y === b.y) return a.x - b.x;
    return a.y - b.y;
  });

  sortedImages.forEach((img, index) => {
    lines.push(
      `Image ${index+1} (${img.id}): ` +
      `Position (${img.x.toFixed(2)}, ${img.y.toFixed(2)}) ` +
      `Size ${img.widthInches.toFixed(2)}×${img.heightInches.toFixed(2)} ` +
      `${img.rotated ? '[Rotated]' : ''}`
    );
  });

  let hasOverlaps = false;
  for (let i = 0; i < sortedImages.length; i++) {
    for (let j = i + 1; j < sortedImages.length; j++) {
      if (imagesOverlap(sortedImages[i], sortedImages[j])) {
        lines.push(`⚠️ OVERLAP DETECTED between ${sortedImages[i].id} and ${sortedImages[j].id}`);
        hasOverlaps = true;
      }
    }
  }

  if (!hasOverlaps) {
    lines.push("✅ No overlaps detected");
  }

  return lines.join('\n');
};

const imagesOverlapStrict = (a: PositionedImage, b: PositionedImage): boolean => {
  const aLeft = a.x;
  const aRight = a.x + a.widthInches;
  const aTop = a.y;
  const aBottom = a.y + a.heightInches;

  const bLeft = b.x;
  const bRight = b.x + b.widthInches;
  const bTop = b.y;
  const bBottom = b.y + b.heightInches;

  const horizontalOverlap = aLeft < bRight && aRight > bLeft;
  const verticalOverlap = aTop < bBottom && aBottom > bTop;

  return horizontalOverlap && verticalOverlap;
};

const imagesOverlap = (a: PositionedImage, b: PositionedImage): boolean => {
  const aLeft = a.x;
  const aRight = a.x + a.widthInches;
  const aTop = a.y;
  const aBottom = a.y + a.heightInches;

  const bLeft = b.x;
  const bRight = b.x + b.widthInches;
  const bTop = b.y;
  const bBottom = b.y + b.heightInches;

  if (aRight + SPACING_INCHES <= bLeft || bRight + SPACING_INCHES <= aLeft) {
    return false;
  }
  if (aBottom + SPACING_INCHES <= bTop || bBottom + SPACING_INCHES <= aTop) {
    return false;
  }

  return true;
};

const validateNoOverlaps = (positions: PositionedImage[]): { valid: boolean; overlappingPairs: Array<[string, string]> } => {
  const overlappingPairs: Array<[string, string]> = [];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (imagesOverlapStrict(positions[i], positions[j])) {
        overlappingPairs.push([positions[i].id, positions[j].id]);
      }
    }
  }

  return {
    valid: overlappingPairs.length === 0,
    overlappingPairs
  };
};

const fixOverlaps = (
  positions: PositionedImage[],
  sheetWidthInches: number
): PositionedImage[] => {
  const fixed: PositionedImage[] = [];

  for (const img of positions) {
    let overlaps = false;
    for (const fixedImg of fixed) {
      if (imagesOverlapStrict(img, fixedImg)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      fixed.push(img);
    } else {
      const newPos = findBestPosition(
        img.widthInches,
        img.heightInches,
        fixed,
        sheetWidthInches
      );

      fixed.push({
        ...img,
        x: newPos.x,
        y: newPos.y
      });

      console.warn(`[Layout Fix] Repositioned image ${img.id} from (${img.x.toFixed(2)}, ${img.y.toFixed(2)}) to (${newPos.x.toFixed(2)}, ${newPos.y.toFixed(2)})`);
    }
  }

  return fixed;
};

const canPlaceAt = (
  x: number,
  y: number,
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): boolean => {
  if (x < EDGE_MARGIN || y < EDGE_MARGIN || x + width > sheetWidthInches - EDGE_MARGIN) {
    return false;
  }

  for (const existing of positions) {
    const newRight = x + width;
    const newLeft = x;
    const newBottom = y + height;
    const newTop = y;

    const existingLeft = existing.x;
    const existingRight = existing.x + existing.widthInches;
    const existingTop = existing.y;
    const existingBottom = existing.y + existing.heightInches;

    const horizontallySeparated = (newRight + SPACING_INCHES <= existingLeft) ||
                                   (existingRight + SPACING_INCHES <= newLeft);
    const verticallySeparated = (newBottom + SPACING_INCHES <= existingTop) ||
                                 (existingBottom + SPACING_INCHES <= newTop);

    if (!horizontallySeparated && !verticallySeparated) {
      return false;
    }
  }

  return true;
};

const generateCandidatePositions = (
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): Array<{ x: number; y: number }> => {
  const candidates: Array<{ x: number; y: number }> = [];

  candidates.push({ x: EDGE_MARGIN, y: EDGE_MARGIN });

  if (positions.length === 0) {
    return candidates;
  }

  for (const existing of positions) {
    const rightX = existing.x + existing.widthInches + SPACING_INCHES;
    if (rightX + width <= sheetWidthInches - EDGE_MARGIN) {
      candidates.push({ x: rightX, y: existing.y });
    }

    const belowY = existing.y + existing.heightInches + SPACING_INCHES;
    candidates.push({ x: existing.x, y: belowY });
    candidates.push({ x: EDGE_MARGIN, y: belowY });

    const alignBottomY = existing.y + existing.heightInches - height;
    if (alignBottomY >= EDGE_MARGIN) {
      const rightOfExisting = existing.x + existing.widthInches + SPACING_INCHES;
      if (rightOfExisting + width <= sheetWidthInches - EDGE_MARGIN) {
        candidates.push({ x: rightOfExisting, y: alignBottomY });
      }
    }
  }

  const maxBottom = Math.max(...positions.map(p => p.y + p.heightInches));
  candidates.push({ x: EDGE_MARGIN, y: maxBottom + SPACING_INCHES });

  const yPositions = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);
  for (const y of yPositions) {
    const rowImages = positions.filter(p => Math.abs(p.y - y) < 0.1);
    if (rowImages.length > 0) {
      const sortedByX = [...rowImages].sort((a, b) => a.x - b.x);

      if (sortedByX[0].x > EDGE_MARGIN + width + SPACING_INCHES) {
        candidates.push({ x: EDGE_MARGIN, y });
      }

      for (let i = 0; i < sortedByX.length - 1; i++) {
        const gapStart = sortedByX[i].x + sortedByX[i].widthInches + SPACING_INCHES;
        const gapEnd = sortedByX[i + 1].x - SPACING_INCHES;
        if (gapEnd - gapStart >= width) {
          candidates.push({ x: gapStart, y });
        }
      }

      const lastImg = sortedByX[sortedByX.length - 1];
      const endGapStart = lastImg.x + lastImg.widthInches + SPACING_INCHES;
      if (endGapStart + width <= sheetWidthInches - EDGE_MARGIN) {
        candidates.push({ x: endGapStart, y });
      }
    }
  }

  const uniqueCandidates = candidates.filter((c, i, arr) =>
    arr.findIndex(other => Math.abs(other.x - c.x) < 0.01 && Math.abs(other.y - c.y) < 0.01) === i
  );

  return uniqueCandidates.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.01) return a.x - b.x;
    return a.y - b.y;
  });
};

const findBestPosition = (
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): { x: number; y: number } => {
  const candidates = generateCandidatePositions(width, height, positions, sheetWidthInches);

  let bestPosition: { x: number; y: number } | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (canPlaceAt(candidate.x, candidate.y, width, height, positions, sheetWidthInches)) {
      const yScore = candidate.y * 1000;
      const xScore = candidate.x * 10;

      let adjacencyBonus = 0;
      for (const existing of positions) {
        const hAdjacent = Math.abs((candidate.x + width + SPACING_INCHES) - existing.x) < 0.1 ||
                          Math.abs((existing.x + existing.widthInches + SPACING_INCHES) - candidate.x) < 0.1;
        const vAdjacent = Math.abs((candidate.y + height + SPACING_INCHES) - existing.y) < 0.1 ||
                          Math.abs((existing.y + existing.heightInches + SPACING_INCHES) - candidate.y) < 0.1;

        if (hAdjacent || vAdjacent) {
          adjacencyBonus -= 50;
        }
      }

      const score = yScore + xScore + adjacencyBonus;

      if (score < bestScore) {
        bestScore = score;
        bestPosition = candidate;
      }
    }
  }

  if (!bestPosition) {
    const currentMaxY = positions.length > 0
      ? Math.max(...positions.map(p => p.y + p.heightInches)) + SPACING_INCHES
      : EDGE_MARGIN;

    const maxSearchY = currentMaxY + height + SPACING_INCHES * 2;

    for (let y = EDGE_MARGIN; y <= maxSearchY; y += 0.1) {
      for (let x = EDGE_MARGIN; x <= sheetWidthInches - width - EDGE_MARGIN; x += 0.1) {
        if (canPlaceAt(x, y, width, height, positions, sheetWidthInches)) {
          return { x, y };
        }
      }
    }

    return { x: EDGE_MARGIN, y: currentMaxY };
  }

  return bestPosition;
};

const calculateTotalHeight = (positions: PositionedImage[]): number => {
  if (positions.length === 0) return 0;
  const maxBottom = Math.max(...positions.map(p => p.y + p.heightInches));
  return maxBottom + EDGE_MARGIN;
};

// ============================================================================
// MODIFIED: packWithStrategy now uses pre-analyzed orientation recommendations
// ============================================================================

const packWithStrategy = (
  images: ImageDimension[],
  sheetWidthInches: number,
  sortStrategy: 'area' | 'width' | 'height' | 'perimeter',
  orientationHints: Map<string, boolean>
): PositionedImage[] => {
  const sortedImages = [...images].sort((a, b) => {
    switch (sortStrategy) {
      case 'area':
        return (b.widthInches * b.heightInches) - (a.widthInches * a.heightInches);
      case 'width':
        return b.widthInches - a.widthInches;
      case 'height':
        return b.heightInches - a.heightInches;
      case 'perimeter':
        return (b.widthInches + b.heightInches) - (a.widthInches + a.heightInches);
      default:
        return 0;
    }
  });

  const positions: PositionedImage[] = [];

  for (const image of sortedImages) {
    // Check if we have a pre-analyzed orientation for this image
    const hasHint = orientationHints.has(image.id);
    const shouldRotate = orientationHints.get(image.id) ?? false;

    let orientations: Array<{ width: number; height: number; rotated: boolean }>;

    if (hasHint) {
      // USE THE PRE-ANALYZED ORIENTATION (this is the fix!)
      // Only consider the recommended orientation for grouped identical images
      if (shouldRotate) {
        orientations = [
          { width: image.heightInches, height: image.widthInches, rotated: true }
        ];
      } else {
        orientations = [
          { width: image.widthInches, height: image.heightInches, rotated: false }
        ];
      }
    } else {
      // No hint - evaluate both orientations (original behavior for non-grouped images)
      orientations = [
        { width: image.widthInches, height: image.heightInches, rotated: false },
        { width: image.heightInches, height: image.widthInches, rotated: true }
      ];
    }

    let bestOrientation = null;
    let bestPosition = null;
    let bestScore = Infinity;

    for (const orientation of orientations) {
      if (orientation.width > sheetWidthInches - EDGE_MARGIN * 2) {
        continue;
      }

      const position = findBestPosition(
        orientation.width,
        orientation.height,
        positions,
        sheetWidthInches
      );

      const tempPositions = [...positions, {
        id: image.id,
        x: position.x,
        y: position.y,
        widthInches: orientation.width,
        heightInches: orientation.height,
        rotated: orientation.rotated
      }];

      const totalHeight = calculateTotalHeight(tempPositions);
      const horizontalUtilization = orientation.width / sheetWidthInches;

      const score = totalHeight * 100 + (1 - horizontalUtilization) * 10;

      if (score < bestScore) {
        bestScore = score;
        bestOrientation = orientation;
        bestPosition = position;
      }
    }

    if (!bestOrientation) {
      const scale = (sheetWidthInches - EDGE_MARGIN * 2) / image.widthInches;
      const scaledWidth = sheetWidthInches - EDGE_MARGIN * 2;
      const scaledHeight = image.heightInches * scale;

      bestOrientation = { width: scaledWidth, height: scaledHeight, rotated: false };
      bestPosition = findBestPosition(scaledWidth, scaledHeight, positions, sheetWidthInches);
    }

    positions.push({
      id: image.id,
      x: bestPosition!.x,
      y: bestPosition!.y,
      widthInches: bestOrientation!.width,
      heightInches: bestOrientation!.height,
      rotated: bestOrientation!.rotated,
    });
  }

  return positions;
};

const simpleVerticalStack = (
  images: ImageDimension[],
  sheetWidthInches: number
): PositionedImage[] => {
  const positions: PositionedImage[] = [];
  let currentY = EDGE_MARGIN;

  for (const image of images) {
    let width = image.widthInches;
    let height = image.heightInches;
    let rotated = false;

    if (width > sheetWidthInches - EDGE_MARGIN * 2 && height <= sheetWidthInches - EDGE_MARGIN * 2) {
      width = image.heightInches;
      height = image.widthInches;
      rotated = true;
    }

    if (width > sheetWidthInches - EDGE_MARGIN * 2) {
      const scale = (sheetWidthInches - EDGE_MARGIN * 2) / width;
      width = sheetWidthInches - EDGE_MARGIN * 2;
      height = height * scale;
    }

    positions.push({
      id: image.id,
      x: EDGE_MARGIN,
      y: currentY,
      widthInches: width,
      heightInches: height,
      rotated
    });

    currentY += height + SPACING_INCHES;
  }

  return positions;
};

// ============================================================================
// MODIFIED: Main generateLayout function now uses Maxrects algorithm
// ============================================================================

export const generateLayout = (
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number = 0.3
): { positionedImages: PositionedImage[]; totalHeightInches: number } => {
  SPACING_INCHES = spacingInches;
  EDGE_MARGIN = spacingInches; // Edge margin matches spacing for consistent padding on all sides

  if (images.length === 0) {
    return { positionedImages: [], totalHeightInches: 0 };
  }

  console.log("[Layout] Received", images.length, "images for layout");

  // Filter invalid images
  const validImages = images.filter(img => {
    const isValid = img.widthInches > 0 && img.heightInches > 0 &&
                    isFinite(img.widthInches) && isFinite(img.heightInches);
    if (!isValid) {
      console.warn(`[Layout] Skipping image ${img.id} with invalid dimensions: ${img.widthInches}x${img.heightInches}`);
    }
    return isValid;
  });

  if (validImages.length === 0) {
    console.warn("[Layout] No images with valid dimensions to layout");
    return { positionedImages: [], totalHeightInches: 0 };
  }

  if (validImages.length !== images.length) {
    console.warn(`[Layout] Filtered ${images.length - validImages.length} images with invalid dimensions`);
  }

  // Check if any image is too wide for the sheet (even when rotated)
  const oversizedImages = validImages.filter(img => 
    !canFitInBin(img.widthInches, img.heightInches, sheetWidthInches - EDGE_MARGIN * 2, true)
  );
  
  if (oversizedImages.length > 0) {
    console.warn(`[Layout] ${oversizedImages.length} images are too large for sheet width, will need scaling`);
  }

  // Try Maxrects algorithm first
  const maxrectsResult = tryMaxrectsPacking(validImages, sheetWidthInches, spacingInches);
  
  if (maxrectsResult) {
    console.log(`[Layout] Maxrects succeeded: ${maxrectsResult.totalHeightInches.toFixed(2)}" height`);
    
    // Validate no overlaps
    const validation = validateNoOverlaps(maxrectsResult.positionedImages);
    if (validation.valid) {
      return maxrectsResult;
    } else {
      console.warn("[Layout] Maxrects result has overlaps, falling back to legacy algorithm");
    }
  }

  // Fallback to legacy algorithm
  console.log("[Layout] Using legacy packing algorithm");
  return legacyGenerateLayout(validImages, sheetWidthInches, spacingInches);
};

/**
 * Try packing with Maxrects algorithm
 */
function tryMaxrectsPacking(
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number
): { positionedImages: PositionedImage[]; totalHeightInches: number } | null {
  try {
    // Convert to PackingImage format
    // Subtract edge margin from sheet width for packing area
    const packingWidth = sheetWidthInches - EDGE_MARGIN * 2;
    
    // Create packing images (without spacing - maxrects adds it)
    const packingImages: PackingImage[] = images.map(img => ({
      id: img.id,
      width: img.widthInches,
      height: img.heightInches,
      originalWidth: img.widthInches,
      originalHeight: img.heightInches,
    }));

    // Use a very large max height - we just want the natural packed height
    const maxHeight = 10000; // 10,000 inches should be enough for any layout
    
    const result = packImages(packingImages, packingWidth, maxHeight, spacingInches, true);
    
    if (!result || result.placed.length !== images.length) {
      console.warn("[Layout] Maxrects could not place all images");
      return null;
    }

    // Convert PlacedImage to PositionedImage format
    // Add edge margin offset to all positions
    const positionedImages: PositionedImage[] = result.placed.map(placed => ({
      id: placed.id,
      x: placed.x + EDGE_MARGIN,
      y: placed.y + EDGE_MARGIN,
      widthInches: placed.width,
      heightInches: placed.height,
      rotated: placed.rotated,
    }));

    // Calculate total height including bottom edge margin
    const totalHeightInches = result.usedHeight + EDGE_MARGIN * 2;

    return { positionedImages, totalHeightInches };
  } catch (error) {
    console.error("[Layout] Maxrects packing failed:", error);
    return null;
  }
}

/**
 * Legacy layout algorithm (fallback)
 */
function legacyGenerateLayout(
  validImages: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number
): { positionedImages: PositionedImage[]; totalHeightInches: number } {
  // Pre-analyze orientations for groups of identical images
  const orientationHints = preAnalyzeOrientations(validImages, sheetWidthInches, spacingInches);

  const strategies: Array<'area' | 'width' | 'height' | 'perimeter'> = ['area', 'width', 'height', 'perimeter'];
  let bestLayout: PositionedImage[] = [];
  let bestHeight = Infinity;
  let bestStrategy = '';

  for (const strategy of strategies) {
    // Pass orientation hints to packing strategy
    const positions = packWithStrategy(validImages, sheetWidthInches, strategy, orientationHints);
    const totalHeight = calculateTotalHeight(positions);

    if (totalHeight < bestHeight) {
      bestHeight = totalHeight;
      bestLayout = positions;
      bestStrategy = strategy;
    }
  }

  console.log(`[Layout] Legacy best strategy: ${bestStrategy} with height ${bestHeight.toFixed(2)} inches`);

  const validation = validateNoOverlaps(bestLayout);

  if (!validation.valid) {
    console.error(`[Layout] CRITICAL: Layout has ${validation.overlappingPairs.length} overlapping pairs! Attempting to fix...`);

    bestLayout = fixOverlaps(bestLayout, sheetWidthInches);
    bestHeight = calculateTotalHeight(bestLayout);

    const revalidation = validateNoOverlaps(bestLayout);
    if (!revalidation.valid) {
      console.error('[Layout] Failed to fix overlaps, using simple vertical stacking');
      bestLayout = simpleVerticalStack(validImages, sheetWidthInches);
      bestHeight = calculateTotalHeight(bestLayout);
    }
  }

  return {
    positionedImages: bestLayout,
    totalHeightInches: bestHeight
  };
}

// ============================================================================
// NEW: Multi-Sheet Layout Generation
// ============================================================================

/**
 * Generate layout across multiple sheets when content exceeds max height
 * 
 * This function automatically:
 * - Validates image heights (max 100")
 * - Expands quantities (qty:5 → 5 separate images)
 * - Determines max height based on sheet width (110" for wide, 220" for narrow)
 * - Distributes images across sheets optimally
 * - Never cuts images across sheets
 * 
 * @param images - Array of images with dimensions and optional quantities
 * @param sheetWidthInches - Width of sheet (determines max height limit)
 * @param spacingInches - Spacing between images (default 0.3)
 * @returns MultiSheetResult with packed sheets or error
 */
export const generateMultiSheetLayout = (
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number = 0.3,
  overrides?: { maxHeightInches?: number; maxSheets?: number }
): MultiSheetResult => {
  console.log(`[MultiSheetLayout] Starting with ${images.length} images on ${sheetWidthInches}" wide sheet`);
  
  if (images.length === 0) {
    return {
      success: true,
      sheets: [],
      totalImages: 0,
      totalSheets: 0,
    };
  }

  // Filter invalid images
  const validImages = images.filter(img => {
    const isValid = img.widthInches > 0 && img.heightInches > 0 &&
                    isFinite(img.widthInches) && isFinite(img.heightInches);
    if (!isValid) {
      console.warn(`[MultiSheetLayout] Skipping image ${img.id} with invalid dimensions`);
    }
    return isValid;
  });

  if (validImages.length === 0) {
    return {
      success: false,
      sheets: [],
      totalImages: 0,
      totalSheets: 0,
      error: 'No valid images to layout',
    };
  }

  // Get sheet limits
  const limits = getSheetLimits(sheetWidthInches);
  console.log(`[MultiSheetLayout] Sheet limits: ${limits.widthInches}" x ${limits.maxHeightInches}" max`);

  // Validate images (height limit, fit check)
  const validation = validateImages(
    validImages.map(img => ({
      id: img.id,
      widthInches: img.widthInches,
      heightInches: img.heightInches,
      quantity: img.quantity,
    })),
    sheetWidthInches - spacingInches * 2  // Account for edge margins
  );

  if (!validation.valid) {
    return {
      success: false,
      sheets: [],
      totalImages: 0,
      totalSheets: 0,
      error: validation.errors.join('\n'),
    };
  }

  // Convert to MultiSheetImage format
  const multiSheetImages: MultiSheetImage[] = validImages.map(img => ({
    id: img.id,
    widthInches: img.widthInches,
    heightInches: img.heightInches,
    quantity: img.quantity,
  }));

  // Pack across multiple sheets (pass overrides from builder settings)
  const result = packMultipleSheets(
    multiSheetImages,
    sheetWidthInches,
    spacingInches,
    undefined,  // edgeMargin
    overrides
  );

  if (result.success) {
    console.log(`[MultiSheetLayout] Success: ${result.totalSheets} sheet(s), ${result.totalImages} images`);
    result.sheets.forEach(sheet => {
      console.log(`  Sheet ${sheet.sheetNumber}: ${sheet.heightInches.toFixed(2)}" (${sheet.images.length} images, ${sheet.utilizationPercent.toFixed(1)}%)`);
    });
  } else {
    console.error(`[MultiSheetLayout] Failed: ${result.error}`);
  }

  return result;
};

/**
 * Convert MultiSheetResult to the legacy single-sheet format
 * Only works if result has exactly 1 sheet
 * 
 * Useful for backwards compatibility when you need to use the old format
 */
export const convertToLegacyFormat = (
  result: MultiSheetResult
): { positionedImages: PositionedImage[]; totalHeightInches: number } | null => {
  if (!result.success || result.sheets.length !== 1) {
    return null;
  }

  const sheet = result.sheets[0];
  const positionedImages: PositionedImage[] = sheet.images.map(img => ({
    id: img.id,
    x: img.x,
    y: img.y,
    widthInches: img.widthInches,
    heightInches: img.heightInches,
    rotated: img.rotated,
  }));

  return {
    positionedImages,
    totalHeightInches: sheet.heightInches,
  };
};
