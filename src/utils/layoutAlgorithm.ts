
// Types for the layout algorithm
export interface ImageDimension {
  id: string;
  widthInches: number;
  heightInches: number;
  rotated?: boolean;
}

export interface PositionedImage extends ImageDimension {
  x: number;
  y: number;
  rotated: boolean;
}

// Spacing between images (set by generateLayout)
let SPACING_INCHES = 0.3;
// Edge margin from sheet edges (fixed small margin)
const EDGE_MARGIN = 0;

// Debug function to visualize layout
export const visualizeLayout = (
  positionedImages: PositionedImage[],
  sheetWidthInches: number,
  totalHeightInches: number
): string => {
  const lines: string[] = [];
  lines.push(`Sheet size: ${sheetWidthInches.toFixed(2)}×${totalHeightInches.toFixed(2)} inches`);
  lines.push(`Total images: ${positionedImages.length}`);

  // Sort by Y position then X position for readable output
  const sortedImages = [...positionedImages].sort((a, b) => {
    if (a.y === b.y) return a.x - b.x;
    return a.y - b.y;
  });

  // Add image details
  sortedImages.forEach((img, index) => {
    lines.push(
      `Image ${index+1} (${img.id}): ` +
      `Position (${img.x.toFixed(2)}, ${img.y.toFixed(2)}) ` +
      `Size ${img.widthInches.toFixed(2)}×${img.heightInches.toFixed(2)} ` +
      `${img.rotated ? '[Rotated]' : ''}`
    );
  });

  // Check for overlaps
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

// Helper function to check if two images overlap (strict check - no spacing tolerance)
const imagesOverlapStrict = (a: PositionedImage, b: PositionedImage): boolean => {
  const aLeft = a.x;
  const aRight = a.x + a.widthInches;
  const aTop = a.y;
  const aBottom = a.y + a.heightInches;

  const bLeft = b.x;
  const bRight = b.x + b.widthInches;
  const bTop = b.y;
  const bBottom = b.y + b.heightInches;

  // Strict overlap check - images actually share space (not just close)
  const horizontalOverlap = aLeft < bRight && aRight > bLeft;
  const verticalOverlap = aTop < bBottom && aBottom > bTop;

  return horizontalOverlap && verticalOverlap;
};

// Helper function to check if two images overlap (with spacing consideration)
const imagesOverlap = (a: PositionedImage, b: PositionedImage): boolean => {
  // For positioned images, use their actual final dimensions (already accounts for rotation)
  const aLeft = a.x;
  const aRight = a.x + a.widthInches;
  const aTop = a.y;
  const aBottom = a.y + a.heightInches;

  const bLeft = b.x;
  const bRight = b.x + b.widthInches;
  const bTop = b.y;
  const bBottom = b.y + b.heightInches;

  // Check if rectangles are separated by at least SPACING_INCHES
  if (aRight + SPACING_INCHES <= bLeft || bRight + SPACING_INCHES <= aLeft) {
    return false; // No horizontal overlap
  }
  if (aBottom + SPACING_INCHES <= bTop || bBottom + SPACING_INCHES <= aTop) {
    return false; // No vertical overlap
  }

  // If we get here, they overlap or violate spacing
  return true;
};

// CRITICAL: Validate that NO images in the layout overlap
// Returns { valid: true } if no overlaps, or { valid: false, overlappingPairs: [...] } if overlaps exist
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

// Fix overlapping images by repositioning them one at a time
// This is a fallback mechanism that should rarely be needed
const fixOverlaps = (
  positions: PositionedImage[],
  sheetWidthInches: number
): PositionedImage[] => {
  const fixed: PositionedImage[] = [];

  for (const img of positions) {
    // Check if this image overlaps with any already-fixed images
    let overlaps = false;
    for (const fixedImg of fixed) {
      if (imagesOverlapStrict(img, fixedImg)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      // No overlap, keep original position
      fixed.push(img);
    } else {
      // Find a new position for this image
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

// Helper function to check if a rectangle fits at a position without overlapping
const canPlaceAt = (
  x: number,
  y: number,
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): boolean => {
  // Check if it fits within sheet bounds
  if (x < EDGE_MARGIN || y < EDGE_MARGIN || x + width > sheetWidthInches - EDGE_MARGIN) {
    return false;
  }

  // Check for overlaps with existing images (with proper spacing)
  for (const existing of positions) {
    const newRight = x + width;
    const newLeft = x;
    const newBottom = y + height;
    const newTop = y;

    const existingLeft = existing.x;
    const existingRight = existing.x + existing.widthInches;
    const existingTop = existing.y;
    const existingBottom = existing.y + existing.heightInches;

    // Check if rectangles are separated by at least SPACING_INCHES in either direction
    const horizontallySeparated = (newRight + SPACING_INCHES <= existingLeft) ||
                                   (existingRight + SPACING_INCHES <= newLeft);
    const verticallySeparated = (newBottom + SPACING_INCHES <= existingTop) ||
                                 (existingBottom + SPACING_INCHES <= newTop);

    // If neither horizontally nor vertically separated, they overlap/violate spacing
    if (!horizontallySeparated && !verticallySeparated) {
      return false;
    }
  }

  return true;
};

// Generate candidate positions based on existing image corners
// This creates a smarter set of positions to try instead of grid search
const generateCandidatePositions = (
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): Array<{ x: number; y: number }> => {
  const candidates: Array<{ x: number; y: number }> = [];

  // Always try top-left corner (for first image or if it fits)
  candidates.push({ x: EDGE_MARGIN, y: EDGE_MARGIN });

  if (positions.length === 0) {
    return candidates;
  }

  // For each existing image, generate candidate positions:
  // - Right of the image (same Y)
  // - Below the image (same X)
  // - Below the image (X = 0, new row)
  for (const existing of positions) {
    // Right of existing image
    const rightX = existing.x + existing.widthInches + SPACING_INCHES;
    if (rightX + width <= sheetWidthInches - EDGE_MARGIN) {
      candidates.push({ x: rightX, y: existing.y });
      // Also try aligning to top of existing
      candidates.push({ x: rightX, y: existing.y });
    }

    // Below existing image, same X
    const belowY = existing.y + existing.heightInches + SPACING_INCHES;
    candidates.push({ x: existing.x, y: belowY });

    // Below existing image, starting from left edge
    candidates.push({ x: EDGE_MARGIN, y: belowY });

    // Try aligning with bottom of existing (for filling gaps)
    const alignBottomY = existing.y + existing.heightInches - height;
    if (alignBottomY >= EDGE_MARGIN) {
      const rightOfExisting = existing.x + existing.widthInches + SPACING_INCHES;
      if (rightOfExisting + width <= sheetWidthInches - EDGE_MARGIN) {
        candidates.push({ x: rightOfExisting, y: alignBottomY });
      }
    }
  }

  // Also try positions at the bottom of the current layout
  const maxBottom = Math.max(...positions.map(p => p.y + p.heightInches));
  candidates.push({ x: EDGE_MARGIN, y: maxBottom + SPACING_INCHES });

  // Try to fill horizontal gaps by checking each "row"
  // Group images by their Y position (with tolerance)
  const yPositions = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);
  for (const y of yPositions) {
    // Find images in this row
    const rowImages = positions.filter(p => Math.abs(p.y - y) < 0.1);
    if (rowImages.length > 0) {
      // Find gaps in this row
      const sortedByX = [...rowImages].sort((a, b) => a.x - b.x);

      // Check gap at the start
      if (sortedByX[0].x > EDGE_MARGIN + width + SPACING_INCHES) {
        candidates.push({ x: EDGE_MARGIN, y });
      }

      // Check gaps between images
      for (let i = 0; i < sortedByX.length - 1; i++) {
        const gapStart = sortedByX[i].x + sortedByX[i].widthInches + SPACING_INCHES;
        const gapEnd = sortedByX[i + 1].x - SPACING_INCHES;
        if (gapEnd - gapStart >= width) {
          candidates.push({ x: gapStart, y });
        }
      }

      // Check gap at the end
      const lastImg = sortedByX[sortedByX.length - 1];
      const endGapStart = lastImg.x + lastImg.widthInches + SPACING_INCHES;
      if (endGapStart + width <= sheetWidthInches - EDGE_MARGIN) {
        candidates.push({ x: endGapStart, y });
      }
    }
  }

  // Remove duplicates and sort by Y then X (prefer top-left positions)
  const uniqueCandidates = candidates.filter((c, i, arr) =>
    arr.findIndex(other => Math.abs(other.x - c.x) < 0.01 && Math.abs(other.y - c.y) < 0.01) === i
  );

  return uniqueCandidates.sort((a, b) => {
    if (Math.abs(a.y - b.y) < 0.01) return a.x - b.x;
    return a.y - b.y;
  });
};

// Find the best position for an image that minimizes wasted space
// Uses candidate positions instead of grid search for better gap filling
const findBestPosition = (
  width: number,
  height: number,
  positions: PositionedImage[],
  sheetWidthInches: number
): { x: number; y: number } => {
  // Generate smart candidate positions based on existing layout
  const candidates = generateCandidatePositions(width, height, positions, sheetWidthInches);

  let bestPosition: { x: number; y: number } | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (canPlaceAt(candidate.x, candidate.y, width, height, positions, sheetWidthInches)) {
      // Score: prioritize lowest Y (keeps sheet short), then lowest X (fills from left)
      // Also give bonus for positions that are adjacent to existing images (fills gaps)
      const yScore = candidate.y * 1000; // Primary: minimize Y
      const xScore = candidate.x * 10;   // Secondary: minimize X

      // Bonus for being adjacent to existing images (encourages gap filling)
      let adjacencyBonus = 0;
      for (const existing of positions) {
        // Check if horizontally adjacent
        const hAdjacent = Math.abs((candidate.x + width + SPACING_INCHES) - existing.x) < 0.1 ||
                          Math.abs((existing.x + existing.widthInches + SPACING_INCHES) - candidate.x) < 0.1;
        // Check if vertically adjacent
        const vAdjacent = Math.abs((candidate.y + height + SPACING_INCHES) - existing.y) < 0.1 ||
                          Math.abs((existing.y + existing.heightInches + SPACING_INCHES) - candidate.y) < 0.1;

        if (hAdjacent || vAdjacent) {
          adjacencyBonus -= 50; // Negative = better score
        }
      }

      const score = yScore + xScore + adjacencyBonus;

      if (score < bestScore) {
        bestScore = score;
        bestPosition = candidate;
      }
    }
  }

  // If no candidate worked, fall back to grid search
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

    // Ultimate fallback: place at bottom
    return { x: EDGE_MARGIN, y: currentMaxY };
  }

  return bestPosition;
};

// Helper function to calculate total height of a layout
const calculateTotalHeight = (positions: PositionedImage[]): number => {
  if (positions.length === 0) return 0;
  const maxBottom = Math.max(...positions.map(p => p.y + p.heightInches));
  return maxBottom + EDGE_MARGIN;
};

// Pack images using a specific strategy
const packWithStrategy = (
  images: ImageDimension[],
  sheetWidthInches: number,
  sortStrategy: 'area' | 'width' | 'height' | 'perimeter'
): PositionedImage[] => {
  // Sort images based on strategy (largest first for better packing)
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
    const orientations = [
      { width: image.widthInches, height: image.heightInches, rotated: false },
      { width: image.heightInches, height: image.widthInches, rotated: true }
    ];

    let bestOrientation = null;
    let bestPosition = null;
    let bestScore = Infinity;

    // Evaluate both orientations
    for (const orientation of orientations) {
      // Skip if this orientation doesn't fit the sheet width
      if (orientation.width > sheetWidthInches - EDGE_MARGIN * 2) {
        continue;
      }

      const position = findBestPosition(
        orientation.width,
        orientation.height,
        positions,
        sheetWidthInches
      );

      // Score based on: Y position (primary) and how well it uses horizontal space (secondary)
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

      // Prioritize lower height, but also consider horizontal space usage
      const score = totalHeight * 100 + (1 - horizontalUtilization) * 10;

      if (score < bestScore) {
        bestScore = score;
        bestOrientation = orientation;
        bestPosition = position;
      }
    }

    // If no orientation fits, scale down (shouldn't happen with proper input validation)
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

// Simple vertical stacking - guaranteed no overlaps (last resort fallback)
// Places each image in a new row, one after another
const simpleVerticalStack = (
  images: ImageDimension[],
  sheetWidthInches: number
): PositionedImage[] => {
  const positions: PositionedImage[] = [];
  let currentY = EDGE_MARGIN;

  for (const image of images) {
    // Determine if image needs to be scaled or rotated to fit width
    let width = image.widthInches;
    let height = image.heightInches;
    let rotated = false;

    // Try rotation first if it fits better
    if (width > sheetWidthInches - EDGE_MARGIN * 2 && height <= sheetWidthInches - EDGE_MARGIN * 2) {
      width = image.heightInches;
      height = image.widthInches;
      rotated = true;
    }

    // Scale down if still too wide
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

// Best-Fit with Rotation algorithm - tries multiple strategies
export const generateLayout = (
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number = 0.3
): { positionedImages: PositionedImage[]; totalHeightInches: number } => {
  SPACING_INCHES = spacingInches;

  if (images.length === 0) {
    return { positionedImages: [], totalHeightInches: 0 };
  }

  console.log("Layout algorithm received images:", images);

  // SAFEGUARD: Filter out images with invalid or zero dimensions
  // This prevents layout issues when dimensions haven't been calculated yet
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

  // Try multiple packing strategies
  const strategies: Array<'area' | 'width' | 'height' | 'perimeter'> = ['area', 'width', 'height', 'perimeter'];
  let bestLayout: PositionedImage[] = [];
  let bestHeight = Infinity;
  let bestStrategy = '';

  for (const strategy of strategies) {
    const positions = packWithStrategy(validImages, sheetWidthInches, strategy);
    const totalHeight = calculateTotalHeight(positions);

    if (totalHeight < bestHeight) {
      bestHeight = totalHeight;
      bestLayout = positions;
      bestStrategy = strategy;
    }
  }

  console.log(`Best strategy: ${bestStrategy} with height ${bestHeight.toFixed(2)} inches`);
  console.log("Generated positions:", bestLayout);

  // CRITICAL: Validate no overlaps exist in the layout
  const validation = validateNoOverlaps(bestLayout);

  if (!validation.valid) {
    console.error(`CRITICAL: Layout has ${validation.overlappingPairs.length} overlapping pairs! Attempting to fix...`);
    console.error('Overlapping pairs:', validation.overlappingPairs);

    // Attempt to fix overlaps by repositioning images
    bestLayout = fixOverlaps(bestLayout, sheetWidthInches);
    bestHeight = calculateTotalHeight(bestLayout);

    // Validate again after fix attempt
    const revalidation = validateNoOverlaps(bestLayout);
    if (!revalidation.valid) {
      // This should never happen - throw an error to catch it in development
      console.error('CRITICAL: Failed to fix overlaps after repositioning!', revalidation.overlappingPairs);
      // As a last resort, repack from scratch with a simple vertical stacking
      console.warn('Falling back to simple vertical stacking...');
      bestLayout = simpleVerticalStack(validImages, sheetWidthInches);
      bestHeight = calculateTotalHeight(bestLayout);
    } else {
      console.log('Successfully fixed all overlaps');
    }
  }

  // Run overlap detection for logging
  const layoutVisualization = visualizeLayout(bestLayout, sheetWidthInches, bestHeight);
  console.log("Layout validation:\n" + layoutVisualization);

  // Final safety check - if we still have overlaps, something is very wrong
  const finalCheck = validateNoOverlaps(bestLayout);
  if (!finalCheck.valid) {
    console.error('FINAL CHECK FAILED: Layout still has overlaps!', finalCheck.overlappingPairs);
  }

  return {
    positionedImages: bestLayout,
    totalHeightInches: bestHeight
  };
};
