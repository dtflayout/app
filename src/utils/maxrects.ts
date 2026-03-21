/**
 * Maxrects Bin Packing Algorithm
 * 
 * A 2D bin packing algorithm that maintains a list of "free rectangles"
 * where images can be placed. Uses Best Short Side Fit (BSSF) scoring
 * for optimal placement decisions.
 * 
 * Features:
 * - Rotation support (90° rotation for better fits)
 * - BSSF scoring for placement optimization
 * - Efficient free rectangle management
 * - Support for spacing between images
 */

// ============================================================================
// Types
// ============================================================================

export interface PackingImage {
  id: string;
  width: number;   // Width in inches (already includes spacing)
  height: number;  // Height in inches (already includes spacing)
  originalWidth: number;   // Original width without spacing
  originalHeight: number;  // Original height without spacing
}

export interface PlacedImage {
  id: string;
  x: number;
  y: number;
  width: number;   // Final width (may be swapped if rotated)
  height: number;  // Final height (may be swapped if rotated)
  rotated: boolean;
}

interface FreeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlacementOption {
  freeRectIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  score: number;  // Lower is better
}

// ============================================================================
// Maxrects Packer Class
// ============================================================================

export class MaxrectsPacker {
  private binWidth: number;
  private binHeight: number;
  private freeRects: FreeRect[];
  private placedImages: PlacedImage[];
  private allowRotation: boolean;

  /**
   * Create a new Maxrects packer
   * @param binWidth - Width of the bin in inches
   * @param binHeight - Maximum height of the bin in inches
   * @param allowRotation - Whether to allow 90° rotation of images
   */
  constructor(binWidth: number, binHeight: number, allowRotation: boolean = true) {
    this.binWidth = binWidth;
    this.binHeight = binHeight;
    this.allowRotation = allowRotation;
    this.freeRects = [{ x: 0, y: 0, width: binWidth, height: binHeight }];
    this.placedImages = [];
  }

  /**
   * Pack a single image into the bin
   * @returns true if image was placed, false if it doesn't fit
   */
  public insert(image: PackingImage): boolean {
    const placement = this.findBestPlacement(image);
    
    if (!placement) {
      return false;
    }

    // Place the image
    this.placedImages.push({
      id: image.id,
      x: placement.x,
      y: placement.y,
      width: placement.rotated ? image.originalHeight : image.originalWidth,
      height: placement.rotated ? image.originalWidth : image.originalHeight,
      rotated: placement.rotated,
    });

    // Split free rectangles around the placed image
    this.splitFreeRects(placement);

    // Remove any free rectangles that are fully contained within others
    this.pruneFreeRects();

    return true;
  }

  /**
   * Get all placed images
   */
  public getPlacedImages(): PlacedImage[] {
    return [...this.placedImages];
  }

  /**
   * Get the actual used height (bounding box of all placed images)
   */
  public getUsedHeight(): number {
    if (this.placedImages.length === 0) return 0;
    return Math.max(...this.placedImages.map(img => img.y + img.height));
  }

  /**
   * Get utilization percentage
   */
  public getUtilization(): number {
    if (this.placedImages.length === 0) return 0;
    const usedArea = this.placedImages.reduce(
      (sum, img) => sum + img.width * img.height, 
      0
    );
    const totalArea = this.binWidth * this.getUsedHeight();
    return totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  }

  /**
   * Find the best placement for an image using BSSF (Best Short Side Fit)
   */
  private findBestPlacement(image: PackingImage): PlacementOption | null {
    let bestOption: PlacementOption | null = null;

    for (let i = 0; i < this.freeRects.length; i++) {
      const rect = this.freeRects[i];

      // Try normal orientation
      if (image.width <= rect.width && image.height <= rect.height) {
        const score = this.scorePlacement(rect, image.width, image.height);
        if (!bestOption || score < bestOption.score) {
          bestOption = {
            freeRectIndex: i,
            x: rect.x,
            y: rect.y,
            width: image.width,
            height: image.height,
            rotated: false,
            score,
          };
        }
      }

      // Try rotated orientation (if allowed and dimensions differ)
      if (this.allowRotation && image.width !== image.height) {
        if (image.height <= rect.width && image.width <= rect.height) {
          const score = this.scorePlacement(rect, image.height, image.width);
          if (!bestOption || score < bestOption.score) {
            bestOption = {
              freeRectIndex: i,
              x: rect.x,
              y: rect.y,
              width: image.height,  // Swapped
              height: image.width,  // Swapped
              rotated: true,
              score,
            };
          }
        }
      }
    }

    return bestOption;
  }

  /**
   * Score a placement using Best Short Side Fit (BSSF)
   * Lower score = better fit
   * 
   * BSSF minimizes the shorter leftover side, which tends to leave
   * more usable rectangular spaces for future placements.
   */
  private scorePlacement(rect: FreeRect, width: number, height: number): number {
    const leftoverWidth = rect.width - width;
    const leftoverHeight = rect.height - height;
    
    // Primary score: minimum of the two leftovers (shorter side fit)
    const shortSideFit = Math.min(leftoverWidth, leftoverHeight);
    
    // Secondary score: prefer placements higher up (lower Y)
    // This helps create a more compact layout
    const yPenalty = rect.y * 0.001;
    
    return shortSideFit + yPenalty;
  }

  /**
   * Split free rectangles after placing an image
   * Uses the Guillotine split method
   */
  private splitFreeRects(placement: PlacementOption): void {
    const placedRect = {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    };

    const newFreeRects: FreeRect[] = [];

    for (let i = 0; i < this.freeRects.length; i++) {
      const freeRect = this.freeRects[i];

      // Check if this free rect intersects with the placed rect
      if (!this.rectsIntersect(freeRect, placedRect)) {
        newFreeRects.push(freeRect);
        continue;
      }

      // Generate new free rectangles from the non-overlapping parts
      
      // Left part
      if (placedRect.x > freeRect.x) {
        newFreeRects.push({
          x: freeRect.x,
          y: freeRect.y,
          width: placedRect.x - freeRect.x,
          height: freeRect.height,
        });
      }

      // Right part
      if (placedRect.x + placedRect.width < freeRect.x + freeRect.width) {
        newFreeRects.push({
          x: placedRect.x + placedRect.width,
          y: freeRect.y,
          width: (freeRect.x + freeRect.width) - (placedRect.x + placedRect.width),
          height: freeRect.height,
        });
      }

      // Top part
      if (placedRect.y > freeRect.y) {
        newFreeRects.push({
          x: freeRect.x,
          y: freeRect.y,
          width: freeRect.width,
          height: placedRect.y - freeRect.y,
        });
      }

      // Bottom part
      if (placedRect.y + placedRect.height < freeRect.y + freeRect.height) {
        newFreeRects.push({
          x: freeRect.x,
          y: placedRect.y + placedRect.height,
          width: freeRect.width,
          height: (freeRect.y + freeRect.height) - (placedRect.y + placedRect.height),
        });
      }
    }

    this.freeRects = newFreeRects;
  }

  /**
   * Check if two rectangles intersect
   */
  private rectsIntersect(a: FreeRect, b: FreeRect): boolean {
    return !(
      a.x >= b.x + b.width ||
      a.x + a.width <= b.x ||
      a.y >= b.y + b.height ||
      a.y + a.height <= b.y
    );
  }

  /**
   * Check if rectangle A is fully contained within rectangle B
   */
  private isContainedIn(a: FreeRect, b: FreeRect): boolean {
    return (
      a.x >= b.x &&
      a.y >= b.y &&
      a.x + a.width <= b.x + b.width &&
      a.y + a.height <= b.y + b.height
    );
  }

  /**
   * Remove free rectangles that are fully contained within other free rectangles
   */
  private pruneFreeRects(): void {
    const toRemove = new Set<number>();

    for (let i = 0; i < this.freeRects.length; i++) {
      for (let j = i + 1; j < this.freeRects.length; j++) {
        if (toRemove.has(i) || toRemove.has(j)) continue;

        if (this.isContainedIn(this.freeRects[i], this.freeRects[j])) {
          toRemove.add(i);
        } else if (this.isContainedIn(this.freeRects[j], this.freeRects[i])) {
          toRemove.add(j);
        }
      }
    }

    this.freeRects = this.freeRects.filter((_, index) => !toRemove.has(index));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort images by area (largest first) - best for Maxrects
 */
export function sortByArea(images: PackingImage[]): PackingImage[] {
  return [...images].sort((a, b) => (b.width * b.height) - (a.width * a.height));
}

/**
 * Sort images by height (tallest first)
 */
export function sortByHeight(images: PackingImage[]): PackingImage[] {
  return [...images].sort((a, b) => b.height - a.height);
}

/**
 * Sort images by width (widest first)
 */
export function sortByWidth(images: PackingImage[]): PackingImage[] {
  return [...images].sort((a, b) => b.width - a.width);
}

/**
 * Sort images by perimeter (largest first)
 */
export function sortByPerimeter(images: PackingImage[]): PackingImage[] {
  return [...images].sort((a, b) => (2 * b.width + 2 * b.height) - (2 * a.width + 2 * a.height));
}

/**
 * Pack images using Maxrects algorithm
 * Tries multiple sorting strategies and returns the best result
 * 
 * @param images - Array of images to pack (dimensions should NOT include spacing yet)
 * @param binWidth - Width of the bin in inches
 * @param maxBinHeight - Maximum height of the bin in inches
 * @param spacing - Spacing between images in inches
 * @param allowRotation - Whether to allow 90° rotation
 * @returns Object with placed images and used height, or null if packing failed
 */
export function packImages(
  images: PackingImage[],
  binWidth: number,
  maxBinHeight: number,
  spacing: number = 0.3,
  allowRotation: boolean = true
): { placed: PlacedImage[]; usedHeight: number; utilization: number } | null {
  if (images.length === 0) {
    return { placed: [], usedHeight: 0, utilization: 0 };
  }

  // Add spacing to image dimensions for packing
  const imagesWithSpacing: PackingImage[] = images.map(img => ({
    ...img,
    width: img.width + spacing,
    height: img.height + spacing,
    originalWidth: img.width,
    originalHeight: img.height,
  }));

  // Try different sorting strategies
  const strategies = [
    { name: 'area', sort: sortByArea },
    { name: 'height', sort: sortByHeight },
    { name: 'width', sort: sortByWidth },
    { name: 'perimeter', sort: sortByPerimeter },
  ];

  let bestResult: { placed: PlacedImage[]; usedHeight: number; utilization: number } | null = null;
  let bestHeight = Infinity;

  for (const strategy of strategies) {
    const sortedImages = strategy.sort(imagesWithSpacing);
    const packer = new MaxrectsPacker(binWidth, maxBinHeight, allowRotation);

    let allPlaced = true;
    for (const image of sortedImages) {
      if (!packer.insert(image)) {
        allPlaced = false;
        break;
      }
    }

    if (allPlaced) {
      const usedHeight = packer.getUsedHeight();
      if (usedHeight < bestHeight) {
        bestHeight = usedHeight;
        bestResult = {
          placed: packer.getPlacedImages(),
          usedHeight,
          utilization: packer.getUtilization(),
        };
      }
    }
  }

  if (!bestResult) {
    console.warn('[Maxrects] Could not pack all images within bin constraints');
    return null;
  }

  console.log(`[Maxrects] Best result: ${bestResult.usedHeight.toFixed(2)}" height, ${bestResult.utilization.toFixed(1)}% utilization`);
  
  return bestResult;
}

/**
 * Check if an image can fit in the bin (considering rotation)
 */
export function canFitInBin(
  imageWidth: number,
  imageHeight: number,
  binWidth: number,
  allowRotation: boolean = true
): boolean {
  // Normal orientation
  if (imageWidth <= binWidth) {
    return true;
  }
  
  // Rotated orientation
  if (allowRotation && imageHeight <= binWidth) {
    return true;
  }
  
  return false;
}
