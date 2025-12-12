import { ImageObject } from "@/components/CollageCreator";
import { PositionedImage } from "./layoutAlgorithm";

// Target DPI for print-quality exports (optimized for DTF printing)
const DPI_PRINT = 150;

// Padding in inches - layout algorithm now handles edge margins
const PADDING_INCHES = 0;

interface ExportOptions {
  images: ImageObject[];
  layout: PositionedImage[];
  canvasWidthInches: number;
  canvasHeightInches: number;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Generates a high-resolution PNG export from layout data without requiring
 * a Fabric.js canvas to be rendered in the DOM.
 *
 * This is a standalone export function that:
 * 1. Creates a temporary canvas at print resolution (150 DPI)
 * 2. Loads full-resolution images from File objects
 * 3. Renders images according to layout positions
 * 4. Returns a data URL of the final PNG
 * 5. Cleans up all temporary resources
 */
export async function generateExport(options: ExportOptions): Promise<string> {
  const { images, layout, canvasWidthInches, canvasHeightInches, onProgress } = options;

  if (layout.length === 0 || images.length === 0) {
    throw new Error("No layout or images to export");
  }

  onProgress?.(0, "Preparing export...");

  // Calculate canvas dimensions at print resolution
  const canvasWidthPx = Math.round(canvasWidthInches * DPI_PRINT);
  const canvasHeightPx = Math.round(canvasHeightInches * DPI_PRINT);
  const paddingPx = PADDING_INCHES * DPI_PRINT;

  console.log(`[Export] Creating ${canvasWidthPx}x${canvasHeightPx}px canvas at ${DPI_PRINT} DPI`);

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidthPx;
  canvas.height = canvasHeightPx;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Transparent background
  ctx.clearRect(0, 0, canvasWidthPx, canvasHeightPx);

  // Create image map for quick lookup
  const imageMap = new Map<string, ImageObject>();
  images.forEach((img) => imageMap.set(img.id, img));

  // Track temporary blob URLs for cleanup
  const tempUrls: string[] = [];

  try {
    // Load and draw each image
    let completed = 0;
    const total = layout.length;

    for (const item of layout) {
      const img = imageMap.get(item.id);
      if (!img) {
        console.warn(`[Export] Image not found: ${item.id}`);
        completed++;
        continue;
      }

      onProgress?.(Math.round((completed / total) * 80), `Loading image ${completed + 1} of ${total}...`);

      // Create full-resolution blob URL from File object
      const imageUrl = URL.createObjectURL(img.file);
      tempUrls.push(imageUrl);

      try {
        await new Promise<void>((resolve, reject) => {
          const imgEl = new Image();

          imgEl.onload = () => {
            // Calculate position and size in pixels at print resolution
            const x = (item.x + PADDING_INCHES) * DPI_PRINT;
            const y = item.y * DPI_PRINT;
            const width = item.widthInches * DPI_PRINT;
            const height = item.heightInches * DPI_PRINT;

            ctx.save();

            if (item.rotated) {
              // For rotated images: translate to position, rotate 90 degrees
              ctx.translate(x + width, y);
              ctx.rotate(Math.PI / 2);
              // When rotated, we need to swap the draw dimensions
              ctx.drawImage(imgEl, 0, 0, height, width);
            } else {
              ctx.drawImage(imgEl, x, y, width, height);
            }

            ctx.restore();
            resolve();
          };

          imgEl.onerror = () => {
            console.error(`[Export] Failed to load image: ${item.id}`);
            resolve(); // Continue with other images
          };

          imgEl.src = imageUrl;
        });
      } catch (error) {
        console.error(`[Export] Error processing image ${item.id}:`, error);
      }

      completed++;
    }

    onProgress?.(90, "Generating PNG...");

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL("image/png", 1.0);

    onProgress?.(100, "Export complete!");

    console.log(`[Export] Successfully exported ${completed} images`);

    return dataUrl;
  } finally {
    // CRITICAL: Clean up all temporary blob URLs
    console.log(`[Export] Cleaning up ${tempUrls.length} temporary URLs`);
    tempUrls.forEach((url) => URL.revokeObjectURL(url));
  }
}
