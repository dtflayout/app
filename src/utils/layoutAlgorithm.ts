
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

// Default padding constant (can be overridden)
let PADDING_INCHES = 0.3; // Default padding between images

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

// Helper function to check if two images overlap (strict check - no padding tolerance)
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

// Helper function to check if two images overlap (with padding consideration)
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

  // Check if rectangles are separated by at least PADDING_INCHES
  if (aRight + PADDING_INCHES <= bLeft || bRight + PADDING_INCHES <= aLeft) {
    return false; // No horizontal overlap
  }
  if (aBottom + PADDING_INCHES <= bTop || bBottom + PADDING_INCHES <= aTop) {
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
  availableWidthInches: number
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
        availableWidthInches
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
  availableWidthInches: number
): boolean => {
  // Check if it fits within sheet bounds (including padding)
  if (x < 0 || y < 0 || x + width > availableWidthInches) {
    return false;
  }

  // Check for overlaps with existing images (with proper padding)
  for (const existing of positions) {
    // Calculate the right edge of the new image and left edge of existing (with padding)
    const newRight = x + width;
    const existingLeft = existing.x;

    // Calculate the left edge of new and right edge of existing (with padding)
    const newLeft = x;
    const existingRight = existing.x + existing.widthInches;

    // Calculate vertical boundaries similarly
    const newBottom = y + height;
    const existingTop = existing.y;
    const newTop = y;
    const existingBottom = existing.y + existing.heightInches;

    // Check if rectangles are separated by at least PADDING_INCHES in either direction
    // If newRight + padding <= existingLeft, they don't overlap horizontally
    // If existingRight + padding <= newLeft, they don't overlap horizontally
    const horizontallySeparated = (newRight + PADDING_INCHES <= existingLeft) ||
                                   (existingRight + PADDING_INCHES <= newLeft);
    const verticallySeparated = (newBottom + PADDING_INCHES <= existingTop) ||
                                 (existingBottom + PADDING_INCHES <= newTop);

    // If neither horizontally nor vertically separated, they overlap
    if (!horizontallySeparated && !verticallySeparated) {
      return false;
    }
  }

  return true;
};

// Find the best (lowest) position for an image using Bottom-Left Fill
// CRITICAL: This function MUST always return a non-overlapping position
const findBestPosition = (
  width: number,
  height: number,
  positions: PositionedImage[],
  availableWidthInches: number
): { x: number; y: number } => {
  // Calculate the current maximum Y position from existing images
  const currentMaxY = positions.length > 0
    ? Math.max(...positions.map(p => p.y + p.heightInches)) + PADDING_INCHES
    : PADDING_INCHES;

  // Try to place at the lowest possible Y position with fine granularity
  // Limit search to current layout height + reasonable buffer for this image
  const maxSearchY = currentMaxY + height + PADDING_INCHES * 2;

  for (let y = PADDING_INCHES; y <= maxSearchY; y += 0.05) {
    for (let x = PADDING_INCHES; x <= availableWidthInches - width - PADDING_INCHES; x += 0.05) {
      if (canPlaceAt(x, y, width, height, positions, availableWidthInches)) {
        return { x, y };
      }
    }
  }

  // SAFE FALLBACK: If no position found in existing layout space,
  // place at the bottom of the current layout (guaranteed no overlap)
  // This creates a new row at the bottom where there are no other images
  const safeY = currentMaxY;
  const safeX = PADDING_INCHES;

  // Verify the safe position doesn't overlap (it shouldn't, but be certain)
  if (canPlaceAt(safeX, safeY, width, height, positions, availableWidthInches)) {
    return { x: safeX, y: safeY };
  }

  // Ultimate fallback: extend further down (this should never be reached)
  // Keep trying lower positions until we find one that works
  for (let y = safeY; y <= safeY + 1000; y += 0.1) {
    if (canPlaceAt(PADDING_INCHES, y, width, height, positions, availableWidthInches)) {
      return { x: PADDING_INCHES, y };
    }
  }

  // This should truly never happen, but if it does, throw an error
  // instead of returning an invalid position that could cause overlap
  console.error('CRITICAL: Could not find any valid position for image', { width, height, positions: positions.length });
  return { x: PADDING_INCHES, y: currentMaxY + 100 }; // Extreme fallback - far below any existing images
};

// Helper function to calculate total height of a layout
const calculateTotalHeight = (positions: PositionedImage[]): number => {
  if (positions.length === 0) return PADDING_INCHES * 2;
  const maxBottom = Math.max(...positions.map(p => p.y + p.heightInches));
  return maxBottom + PADDING_INCHES;
};

// Pack images using a specific strategy
const packWithStrategy = (
  images: ImageDimension[],
  availableWidthInches: number,
  sortStrategy: 'area' | 'width' | 'height' | 'perimeter'
): PositionedImage[] => {
  // Sort images based on strategy
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
      if (orientation.width > availableWidthInches) {
        continue;
      }
      
      const position = findBestPosition(
        orientation.width, 
        orientation.height, 
        positions, 
        availableWidthInches
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
      const horizontalUtilization = orientation.width / availableWidthInches;
      
      // Prioritize lower height, but also consider horizontal space usage
      const score = totalHeight * 100 + (1 - horizontalUtilization) * 10;
      
      if (score < bestScore) {
        bestScore = score;
        bestOrientation = orientation;
        bestPosition = position;
      }
    }
    
    // If no orientation fits, scale down
    if (!bestOrientation) {
      const scale = availableWidthInches / image.widthInches;
      const scaledWidth = availableWidthInches;
      const scaledHeight = image.heightInches * scale;
      
      bestOrientation = { width: scaledWidth, height: scaledHeight, rotated: false };
      bestPosition = findBestPosition(scaledWidth, scaledHeight, positions, availableWidthInches);
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
  availableWidthInches: number
): PositionedImage[] => {
  const positions: PositionedImage[] = [];
  let currentY = PADDING_INCHES;

  for (const image of images) {
    // Determine if image needs to be scaled or rotated to fit width
    let width = image.widthInches;
    let height = image.heightInches;
    let rotated = false;

    // Try rotation first if it fits better
    if (width > availableWidthInches && height <= availableWidthInches) {
      width = image.heightInches;
      height = image.widthInches;
      rotated = true;
    }

    // Scale down if still too wide
    if (width > availableWidthInches) {
      const scale = availableWidthInches / width;
      width = availableWidthInches;
      height = height * scale;
    }

    positions.push({
      id: image.id,
      x: PADDING_INCHES,
      y: currentY,
      widthInches: width,
      heightInches: height,
      rotated
    });

    currentY += height + PADDING_INCHES;
  }

  return positions;
};

// Best-Fit with Rotation algorithm - now tries multiple strategies
export const generateLayout = (
  images: ImageDimension[],
  sheetWidthInches: number,
  spacingInches: number = 0.3
): { positionedImages: PositionedImage[]; totalHeightInches: number } => {
  PADDING_INCHES = spacingInches;

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

  const availableWidthInches = sheetWidthInches - (PADDING_INCHES * 2);

  // Try multiple packing strategies
  const strategies: Array<'area' | 'width' | 'height' | 'perimeter'> = ['area', 'width', 'height', 'perimeter'];
  let bestLayout: PositionedImage[] = [];
  let bestHeight = Infinity;
  let bestStrategy = '';

  for (const strategy of strategies) {
    const positions = packWithStrategy(validImages, availableWidthInches, strategy);
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
    bestLayout = fixOverlaps(bestLayout, availableWidthInches);
    bestHeight = calculateTotalHeight(bestLayout);

    // Validate again after fix attempt
    const revalidation = validateNoOverlaps(bestLayout);
    if (!revalidation.valid) {
      // This should never happen - throw an error to catch it in development
      console.error('CRITICAL: Failed to fix overlaps after repositioning!', revalidation.overlappingPairs);
      // As a last resort, repack from scratch with a simple vertical stacking
      console.warn('Falling back to simple vertical stacking...');
      bestLayout = simpleVerticalStack(validImages, availableWidthInches);
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
