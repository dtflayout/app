
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

// Helper function to check if two images overlap
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
    // Calculate boundaries with padding buffer
    const existingLeft = existing.x - PADDING_INCHES;
    const existingRight = existing.x + existing.widthInches + PADDING_INCHES;
    const existingTop = existing.y - PADDING_INCHES;
    const existingBottom = existing.y + existing.heightInches + PADDING_INCHES;
    
    const newLeft = x - PADDING_INCHES;
    const newRight = x + width + PADDING_INCHES;
    const newTop = y - PADDING_INCHES;
    const newBottom = y + height + PADDING_INCHES;
    
    // Check if rectangles overlap (including padding zones)
    const horizontalOverlap = !(newRight <= existing.x || existingRight <= x);
    const verticalOverlap = !(newBottom <= existing.y || existingBottom <= y);
    
    if (horizontalOverlap && verticalOverlap) {
      return false;
    }
  }
  
  return true;
};

// Find the best (lowest) position for an image using Bottom-Left Fill
const findBestPosition = (
  width: number,
  height: number,
  positions: PositionedImage[],
  availableWidthInches: number
): { x: number; y: number } => {
  // Start with minimum padding from edges
  let bestY = PADDING_INCHES;
  
  // Try to place at the lowest possible Y position with fine granularity
  for (let y = PADDING_INCHES; y <= 1000; y += 0.05) { // Finer granularity for better packing
    for (let x = PADDING_INCHES; x <= availableWidthInches - width - PADDING_INCHES; x += 0.05) {
      if (canPlaceAt(x, y, width, height, positions, availableWidthInches)) {
        return { x, y };
      }
    }
  }
  
  // Fallback - this should rarely happen
  return { x: PADDING_INCHES, y: bestY };
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
  
  // Run overlap detection
  const layoutVisualization = visualizeLayout(bestLayout, sheetWidthInches, bestHeight);
  console.log("Layout validation:\n" + layoutVisualization);
  
  return {
    positionedImages: bestLayout,
    totalHeightInches: bestHeight
  };
};
