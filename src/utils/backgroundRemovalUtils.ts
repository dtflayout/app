/**
 * Utility functions for removing background colors from images
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface RemovalResult {
  url: string;
  file: File;
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
 * Check if a pixel color is within tolerance of target color
 * @param pixel The pixel color to check
 * @param target The target color to compare against
 * @param tolerance Tolerance value (0-100)
 * @returns true if the pixel is within tolerance of the target
 */
export const isColorWithinTolerance = (
  pixel: RGBColor,
  target: RGBColor,
  tolerance: number
): boolean => {
  // Convert tolerance from 0-100 to 0-255 range
  const toleranceValue = (tolerance / 100) * 255;

  return (
    Math.abs(pixel.r - target.r) <= toleranceValue &&
    Math.abs(pixel.g - target.g) <= toleranceValue &&
    Math.abs(pixel.b - target.b) <= toleranceValue
  );
};

/**
 * Check if a pixel color matches ANY of the target colors within tolerance
 * @param pixel The pixel color to check
 * @param targets Array of target colors to compare against
 * @param tolerance Tolerance value (0-100)
 * @returns true if the pixel matches any of the target colors
 */
export const isColorWithinToleranceMultiple = (
  pixel: RGBColor,
  targets: RGBColor[],
  tolerance: number
): boolean => {
  return targets.some(target => isColorWithinTolerance(pixel, target, tolerance));
};

/**
 * Sample color from an image at specific coordinates
 * @param imageUrl URL of the image
 * @param x X coordinate
 * @param y Y coordinate
 * @returns RGB color at the specified position
 */
export const sampleColorFromImage = async (
  imageUrl: string,
  x: number,
  y: number
): Promise<RGBColor> => {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(img, 0, 0);

  // Clamp coordinates to valid range
  const clampedX = Math.max(0, Math.min(Math.floor(x), img.width - 1));
  const clampedY = Math.max(0, Math.min(Math.floor(y), img.height - 1));

  const imageData = ctx.getImageData(clampedX, clampedY, 1, 1);

  return {
    r: imageData.data[0],
    g: imageData.data[1],
    b: imageData.data[2],
  };
};

/**
 * Sample color from canvas at specific coordinates (for real-time use)
 * @param canvas The canvas element
 * @param x X coordinate in canvas space
 * @param y Y coordinate in canvas space
 * @param originalWidth Original image width
 * @param originalHeight Original image height
 * @returns RGB color at the specified position
 */
export const sampleColorFromCanvas = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  originalWidth: number,
  originalHeight: number
): RGBColor | null => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Scale coordinates from canvas space to original image space
  const scaleX = originalWidth / canvas.width;
  const scaleY = originalHeight / canvas.height;

  const imgX = Math.max(0, Math.min(Math.floor(x * scaleX), originalWidth - 1));
  const imgY = Math.max(0, Math.min(Math.floor(y * scaleY), originalHeight - 1));

  // We need to sample from original image data, not the displayed canvas
  // Since canvas may have preview effects, we'll re-sample from original
  return null; // This will be handled in the modal with a separate image data reference
};

/**
 * Remove a specific color from an image, making matching pixels transparent
 * @param imageUrl URL of the source image
 * @param targetColor The color to remove
 * @param tolerance Tolerance value (0-100)
 * @param originalFileName Original filename for the new File object
 * @returns New image URL and File with the color removed
 */
export const removeColorFromImage = async (
  imageUrl: string,
  targetColor: RGBColor,
  tolerance: number,
  originalFileName: string
): Promise<RemovalResult> => {
  return removeColorsFromImage(imageUrl, [targetColor], tolerance, originalFileName);
};

/**
 * Remove multiple colors from an image, making matching pixels transparent
 * @param imageUrl URL of the source image
 * @param targetColors Array of colors to remove
 * @param tolerance Tolerance value (0-100)
 * @param originalFileName Original filename for the new File object
 * @returns New image URL and File with the colors removed
 */
export const removeColorsFromImage = async (
  imageUrl: string,
  targetColors: RGBColor[],
  tolerance: number,
  originalFileName: string
): Promise<RemovalResult> => {
  if (targetColors.length === 0) {
    throw new Error('No colors specified for removal');
  }

  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const pixel: RGBColor = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    };

    if (isColorWithinToleranceMultiple(pixel, targetColors, tolerance)) {
      // Make pixel transparent
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'));
          return;
        }

        // Create new File with original filename (add _nobg suffix)
        const nameParts = originalFileName.split('.');
        const extension = nameParts.pop() || 'png';
        const baseName = nameParts.join('.');
        const newFileName = `${baseName}_nobg.${extension}`;

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
 * Generate a preview of color removal without creating a new file (single color)
 * @param imageUrl URL of the source image
 * @param targetColor The color to remove
 * @param tolerance Tolerance value (0-100)
 * @returns Canvas with the preview
 */
export const generateRemovalPreview = async (
  imageUrl: string,
  targetColor: RGBColor,
  tolerance: number
): Promise<HTMLCanvasElement> => {
  return generateRemovalPreviewMultiple(imageUrl, [targetColor], tolerance);
};

/**
 * Generate a preview of multiple color removal without creating a new file
 * @param imageUrl URL of the source image
 * @param targetColors Array of colors to remove
 * @param tolerance Tolerance value (0-100)
 * @returns Canvas with the preview
 */
export const generateRemovalPreviewMultiple = async (
  imageUrl: string,
  targetColors: RGBColor[],
  tolerance: number
): Promise<HTMLCanvasElement> => {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(img, 0, 0);

  if (targetColors.length === 0) {
    // No colors to remove, return original
    return canvas;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    const pixel: RGBColor = {
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    };

    if (isColorWithinToleranceMultiple(pixel, targetColors, tolerance)) {
      // Make pixel transparent
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (color: RGBColor): string => {
  return '#' + [color.r, color.g, color.b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Parse hex color to RGB
 */
export const hexToRgb = (hex: string): RGBColor | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};
