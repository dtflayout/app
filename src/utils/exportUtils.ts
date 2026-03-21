import { ImageObject } from "@/components/CollageCreator";
import { PositionedImage } from "./layoutAlgorithm";

// Target DPI for print-quality exports (optimized for DTF printing)
// 300 DPI is industry standard for professional print quality
const DEFAULT_DPI = 300;

// Padding in inches - layout algorithm now handles edge margins
const PADDING_INCHES = 0;

// Batch size for processing images (yield to browser every N images)
const BATCH_SIZE = 5;

interface ExportOptions {
  images: ImageObject[];
  layout: PositionedImage[];
  canvasWidthInches: number;
  canvasHeightInches: number;
  /** DPI for export resolution. Default: 300 for professional print quality */
  dpi?: number;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Yields control back to the browser to prevent freezing
 * This allows the UI to update and garbage collection to run
 */
function yieldToBrowser(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Loads an image and draws it to canvas, with immediate cleanup
 * Uses createImageBitmap when available for better memory efficiency
 */
async function loadAndDrawImage(
  file: File,
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotated: boolean
): Promise<void> {
  // Create blob URL
  const imageUrl = URL.createObjectURL(file);
  
  try {
    // Try using createImageBitmap (more memory efficient)
    if (typeof createImageBitmap !== 'undefined') {
      const bitmap = await createImageBitmap(file);
      
      ctx.save();
      if (rotated) {
        ctx.translate(x + width, y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(bitmap, 0, 0, height, width);
      } else {
        ctx.drawImage(bitmap, x, y, width, height);
      }
      ctx.restore();
      
      // Immediately close bitmap to free memory
      bitmap.close();
    } else {
      // Fallback to Image element
      await new Promise<void>((resolve, reject) => {
        const imgEl = new Image();
        
        imgEl.onload = () => {
          ctx.save();
          if (rotated) {
            ctx.translate(x + width, y);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(imgEl, 0, 0, height, width);
          } else {
            ctx.drawImage(imgEl, x, y, width, height);
          }
          ctx.restore();
          
          // Clear image reference to help GC
          imgEl.src = '';
          resolve();
        };
        
        imgEl.onerror = () => {
          console.error(`[Export] Failed to load image`);
          resolve(); // Continue with other images
        };
        
        imgEl.src = imageUrl;
      });
    }
  } finally {
    // CRITICAL: Immediately revoke URL after use
    URL.revokeObjectURL(imageUrl);
  }
}

/**
 * Generates a high-resolution PNG export from layout data without requiring
 * a Fabric.js canvas to be rendered in the DOM.
 *
 * This is a standalone export function that:
 * 1. Creates a temporary canvas at print resolution (300 DPI by default)
 * 2. Loads full-resolution images from File objects
 * 3. Renders images according to layout positions
 * 4. Returns a data URL of the final PNG
 * 5. Cleans up all temporary resources
 * 
 * FREEZE PREVENTION:
 * - Processes images in batches with yields between batches
 * - Immediately cleans up each image after drawing
 * - Uses createImageBitmap when available (more memory efficient)
 * - Yields to browser during PNG encoding
 * 
 * At 300 DPI:
 * - 23" width = 6,900 pixels
 * - 110" height = 33,000 pixels
 * - This produces true print-quality output where Photoshop shows correct dimensions
 */
export async function generateExport(options: ExportOptions): Promise<string> {
  const { images, layout, canvasWidthInches, canvasHeightInches, dpi = DEFAULT_DPI, onProgress } = options;

  if (layout.length === 0 || images.length === 0) {
    throw new Error("No layout or images to export");
  }

  onProgress?.(0, "Preparing export...");

  // Calculate canvas dimensions at print resolution
  const canvasWidthPx = Math.round(canvasWidthInches * dpi);
  const canvasHeightPx = Math.round(canvasHeightInches * dpi);

  console.log(`[Export] Creating ${canvasWidthPx}x${canvasHeightPx}px canvas at ${dpi} DPI`);
  console.log(`[Export] Physical size: ${canvasWidthInches}" x ${canvasHeightInches}"`);
  console.log(`[Export] Processing ${layout.length} images in batches of ${BATCH_SIZE}`);

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

  // Process images in batches to prevent freezing
  let completed = 0;
  const total = layout.length;

  for (let i = 0; i < layout.length; i++) {
    const item = layout[i];
    const img = imageMap.get(item.id);
    
    if (!img) {
      console.warn(`[Export] Image not found: ${item.id}`);
      completed++;
      continue;
    }

    onProgress?.(Math.round((completed / total) * 80), `Processing image ${completed + 1} of ${total}...`);

    // Calculate position and size in pixels at print resolution
    const x = (item.x + PADDING_INCHES) * dpi;
    const y = item.y * dpi;
    const width = item.widthInches * dpi;
    const height = item.heightInches * dpi;

    try {
      await loadAndDrawImage(img.file, ctx, x, y, width, height, item.rotated);
    } catch (error) {
      console.error(`[Export] Error processing image ${item.id}:`, error);
    }

    completed++;

    // Yield to browser every BATCH_SIZE images to prevent freezing
    if (completed % BATCH_SIZE === 0) {
      await yieldToBrowser(10); // Small delay to let browser breathe
    }
  }

  onProgress?.(85, "Generating PNG (this may take a moment)...");
  
  // Yield before heavy PNG encoding
  await yieldToBrowser(50);

  // Convert canvas to data URL
  // Using toBlob + FileReader is more memory efficient but toDataURL is simpler
  // For very large canvases, we yield periodically during encoding
  const dataUrl = await new Promise<string>((resolve, reject) => {
    // Use toBlob for better memory efficiency, then convert to data URL
    canvas.toBlob(async (blob) => {
      if (!blob) {
        // Fallback to toDataURL if toBlob fails
        resolve(canvas.toDataURL("image/png", 1.0));
        return;
      }
      
      onProgress?.(95, "Finalizing export...");
      await yieldToBrowser(10);
      
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        // Fallback to toDataURL
        resolve(canvas.toDataURL("image/png", 1.0));
      };
      reader.readAsDataURL(blob);
    }, "image/png", 1.0);
  });

  onProgress?.(100, "Export complete!");

  console.log(`[Export] Successfully exported ${completed} images`);

  // Clear canvas to free memory
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}
