/**
 * Utility functions for auto-trimming whitespace/transparency from images
 */

export interface CropBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TrimDetectionResult {
  bounds: CropBounds;
  originalWidth: number;
  originalHeight: number;
  hasSignificantPadding: boolean;
  paddingPercentage: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Load an image from URL and return an HTMLImageElement
 */
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

/**
 * Check if a pixel should be considered "background"
 * @param r Red component (0-255)
 * @param g Green component (0-255)
 * @param b Blue component (0-255)
 * @param a Alpha component (0-255)
 * @param tolerance Tolerance for near-white detection (0-50)
 * @param detectTransparent Whether to treat transparent pixels as background
 * @param backgroundColor Optional specific background color to detect
 */
const isBackgroundPixel = (
  r: number,
  g: number,
  b: number,
  a: number,
  tolerance: number,
  detectTransparent: boolean,
  backgroundColor?: { r: number; g: number; b: number }
): boolean => {
  // Check for transparency first
  if (detectTransparent && a < 10) {
    return true;
  }

  // If a specific background color is provided, check against it
  if (backgroundColor) {
    const colorTolerance = tolerance * 2.55; // Convert 0-50 to 0-127.5 range
    return (
      Math.abs(r - backgroundColor.r) <= colorTolerance &&
      Math.abs(g - backgroundColor.g) <= colorTolerance &&
      Math.abs(b - backgroundColor.b) <= colorTolerance
    );
  }

  // Default: check for near-white pixels
  const threshold = 255 - tolerance * 2.55; // Convert 0-50 to 255-127.5 range
  return r >= threshold && g >= threshold && b >= threshold;
};

/**
 * Detect the content bounds of an image by scanning from all 4 edges
 * @param imageUrl URL of the image to analyze
 * @param tolerance Tolerance for background detection (0-50)
 * @param detectTransparent Whether to treat transparent pixels as background
 * @param backgroundColor Optional specific background color to detect
 */
export const detectContentBounds = async (
  imageUrl: string,
  tolerance: number = 10,
  detectTransparent: boolean = true,
  backgroundColor?: { r: number; g: number; b: number }
): Promise<TrimDetectionResult> => {
  const img = await loadImage(imageUrl);
  const { width, height } = img;

  // Create canvas and get pixel data
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Helper to get pixel at position
  const getPixel = (x: number, y: number) => {
    const idx = (y * width + x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3],
    };
  };

  // Helper to check if pixel is background
  const isBg = (x: number, y: number) => {
    const { r, g, b, a } = getPixel(x, y);
    return isBackgroundPixel(r, g, b, a, tolerance, detectTransparent, backgroundColor);
  };

  // Scan from top
  let top = 0;
  topScan: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBg(x, y)) {
        top = y;
        break topScan;
      }
    }
    top = y + 1;
  }

  // Scan from bottom
  let bottom = height - 1;
  bottomScan: for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if (!isBg(x, y)) {
        bottom = y;
        break bottomScan;
      }
    }
    bottom = y - 1;
  }

  // Scan from left
  let left = 0;
  leftScan: for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (!isBg(x, y)) {
        left = x;
        break leftScan;
      }
    }
    left = x + 1;
  }

  // Scan from right
  let right = width - 1;
  rightScan: for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y++) {
      if (!isBg(x, y)) {
        right = x;
        break rightScan;
      }
    }
    right = x - 1;
  }

  // Ensure valid bounds (handle case where entire image is background)
  if (top > bottom || left > right) {
    // No content found, return full image bounds
    return {
      bounds: {
        top: 0,
        right: width - 1,
        bottom: height - 1,
        left: 0,
        width,
        height,
      },
      originalWidth: width,
      originalHeight: height,
      hasSignificantPadding: false,
      paddingPercentage: { top: 0, right: 0, bottom: 0, left: 0 },
    };
  }

  const contentWidth = right - left + 1;
  const contentHeight = bottom - top + 1;

  // Calculate padding percentages
  const paddingPercentage = {
    top: (top / height) * 100,
    right: ((width - 1 - right) / width) * 100,
    bottom: ((height - 1 - bottom) / height) * 100,
    left: (left / width) * 100,
  };

  // Check if any edge has significant padding (>5%)
  const SIGNIFICANT_THRESHOLD = 5;
  const hasSignificantPadding =
    paddingPercentage.top > SIGNIFICANT_THRESHOLD ||
    paddingPercentage.right > SIGNIFICANT_THRESHOLD ||
    paddingPercentage.bottom > SIGNIFICANT_THRESHOLD ||
    paddingPercentage.left > SIGNIFICANT_THRESHOLD;

  return {
    bounds: {
      top,
      right,
      bottom,
      left,
      width: contentWidth,
      height: contentHeight,
    },
    originalWidth: width,
    originalHeight: height,
    hasSignificantPadding,
    paddingPercentage,
  };
};

/**
 * Check if an image has significant padding that would benefit from trimming
 * @param bounds The detected content bounds
 * @param threshold Percentage threshold for "significant" padding (default 5%)
 */
export const hasSignificantPadding = (
  paddingPercentage: { top: number; right: number; bottom: number; left: number },
  threshold: number = 5
): boolean => {
  return (
    paddingPercentage.top > threshold ||
    paddingPercentage.right > threshold ||
    paddingPercentage.bottom > threshold ||
    paddingPercentage.left > threshold
  );
};

/**
 * Crop an image to the specified bounds and return a new blob URL and File
 * @param imageUrl URL of the source image
 * @param bounds The crop bounds to apply
 * @param originalFileName Original filename for the new File object
 */
export const cropImage = async (
  imageUrl: string,
  bounds: CropBounds,
  originalFileName: string
): Promise<{ url: string; file: File }> => {
  const img = await loadImage(imageUrl);

  // Create canvas with cropped dimensions
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Draw the cropped portion
  ctx.drawImage(
    img,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }

        // Create new File with original filename (add _trimmed suffix)
        const nameParts = originalFileName.split('.');
        const extension = nameParts.pop() || 'png';
        const baseName = nameParts.join('.');
        const newFileName = `${baseName}_trimmed.${extension}`;

        const file = new File([blob], newFileName, { type: 'image/png' });
        const newUrl = URL.createObjectURL(blob);

        resolve({ url: newUrl, file });
      },
      'image/png',
      1.0
    );
  });
};

/**
 * Quick check if an image has significant padding that would benefit from trimming.
 * Uses the actual content bounds detection to determine if there's meaningful padding.
 *
 * @param imageUrl URL of the image to check
 * @param threshold Percentage threshold for significant padding (default 5%)
 * @returns true if any edge has padding greater than the threshold
 */
export const quickPaddingCheck = async (
  imageUrl: string,
  threshold: number = 5
): Promise<boolean> => {
  try {
    // Use the actual content bounds detection for accurate results
    const result = await detectContentBounds(imageUrl);

    // Check if any edge has significant padding (greater than threshold %)
    // This is much more accurate than just checking corners
    return (
      result.paddingPercentage.top > threshold ||
      result.paddingPercentage.right > threshold ||
      result.paddingPercentage.bottom > threshold ||
      result.paddingPercentage.left > threshold
    );
  } catch {
    return false;
  }
};

/**
 * Parse a hex color string to RGB values
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};
