/**
 * Thumbnail and preview image generation utilities.
 *
 * This module provides three levels of image quality:
 *
 * 1. thumbnailUrl (300px max) - ONLY for gallery display in ImageManager
 *    - Smallest size for minimal memory usage when browsing many images
 *    - Uses JPEG compression at 0.7 quality
 *
 * 2. previewUrl (800px max) - ONLY for Fabric.js canvas display during layout preview
 *    - Medium size for decent on-screen quality without full memory cost
 *    - Uses PNG to preserve transparency for accurate preview
 *
 * 3. url (full resolution) - For ALL processing and final export
 *    - Image trimming
 *    - Background removal
 *    - Layout generation calculations
 *    - Final PNG/PDF export at print quality
 *
 * IMPORTANT: The final exported PNG must ALWAYS use full-resolution original images.
 * Preview optimizations are ONLY for on-screen display to reduce memory usage.
 */

/**
 * Generates a thumbnail from an image file.
 * Uses canvas to resize the image to a maximum dimension while preserving aspect ratio.
 *
 * @param file - The original image File object
 * @param maxDimension - Maximum width or height in pixels (default: 300)
 * @returns Promise<string> - A blob URL for the generated thumbnail
 */
export async function generateThumbnail(
  file: File,
  maxDimension: number = 300
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Calculate new dimensions while preserving aspect ratio
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality image smoothing for better thumbnails
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with JPEG compression for smaller file size
        // PNG files with transparency will lose transparency but that's acceptable
        // for gallery thumbnails where we just need a quick preview
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }

            const thumbnailUrl = URL.createObjectURL(blob);
            resolve(thumbnailUrl);
          },
          'image/jpeg',
          0.7 // Quality 0.7 for good balance of size and quality
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for thumbnail generation'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates thumbnails for multiple files in parallel.
 *
 * @param files - Array of File objects
 * @param maxDimension - Maximum width or height in pixels (default: 300)
 * @returns Promise<Map<File, string>> - Map of File to thumbnail blob URL
 */
export async function generateThumbnails(
  files: File[],
  maxDimension: number = 300
): Promise<Map<File, string>> {
  const results = new Map<File, string>();

  // Process in parallel for better performance
  const thumbnailPromises = files.map(async (file) => {
    try {
      const thumbnailUrl = await generateThumbnail(file, maxDimension);
      results.set(file, thumbnailUrl);
    } catch (error) {
      console.error(`Failed to generate thumbnail for ${file.name}:`, error);
      // On error, we'll use the original URL as fallback (handled by caller)
    }
  });

  await Promise.all(thumbnailPromises);
  return results;
}

/**
 * Generates a preview image for canvas display.
 * Larger than thumbnails (800px vs 300px) for decent canvas visibility,
 * but much smaller than originals to reduce memory usage during layout preview.
 *
 * IMPORTANT: This is ONLY for on-screen Fabric.js canvas display.
 * The final export MUST use the original full-resolution images.
 *
 * @param file - The original image File object
 * @param maxDimension - Maximum width or height in pixels (default: 800)
 * @returns Promise<string> - A blob URL for the generated preview
 */
export async function generatePreviewImage(
  file: File,
  maxDimension: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;

        // Calculate target dimensions:
        // Use max 800px on longest side OR 50% of original, whichever is smaller
        const halfWidth = Math.round(originalWidth / 2);
        const halfHeight = Math.round(originalHeight / 2);

        let targetWidth: number;
        let targetHeight: number;

        if (originalWidth > originalHeight) {
          // Landscape: scale by width
          const maxBasedWidth = Math.min(maxDimension, originalWidth);
          targetWidth = Math.min(maxBasedWidth, halfWidth);
          targetHeight = Math.round((targetWidth / originalWidth) * originalHeight);
        } else {
          // Portrait or square: scale by height
          const maxBasedHeight = Math.min(maxDimension, originalHeight);
          targetHeight = Math.min(maxBasedHeight, halfHeight);
          targetWidth = Math.round((targetHeight / originalHeight) * originalWidth);
        }

        // Ensure minimum dimensions (at least 100px)
        targetWidth = Math.max(targetWidth, Math.min(100, originalWidth));
        targetHeight = Math.max(targetHeight, Math.min(100, originalHeight));

        // If the image is already small enough, use original dimensions
        if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
          // Image is small, just use the original URL
          URL.revokeObjectURL(objectUrl);
          resolve(URL.createObjectURL(file));
          return;
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Use PNG to preserve transparency (important for DTF printing preview)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              reject(new Error('Failed to create preview blob'));
              return;
            }

            const previewUrl = URL.createObjectURL(blob);
            resolve(previewUrl);
          },
          'image/png'
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for preview generation'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates preview images for multiple files in parallel.
 *
 * @param files - Array of File objects
 * @param maxDimension - Maximum width or height in pixels (default: 800)
 * @returns Promise<Map<File, string>> - Map of File to preview blob URL
 */
export async function generatePreviewImages(
  files: File[],
  maxDimension: number = 800
): Promise<Map<File, string>> {
  const results = new Map<File, string>();

  const previewPromises = files.map(async (file) => {
    try {
      const previewUrl = await generatePreviewImage(file, maxDimension);
      results.set(file, previewUrl);
    } catch (error) {
      console.error(`Failed to generate preview for ${file.name}:`, error);
    }
  });

  await Promise.all(previewPromises);
  return results;
}
