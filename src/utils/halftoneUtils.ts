/**
 * Halftone Utility Functions for DTF Printing
 * Converts images into halftone dot patterns optimized for DTF (Direct-to-Film) printing.
 * Handles standard halftoning, black knockout, and color knockout modes.
 * 
 * Key concepts:
 * - LPI (Lines Per Inch): dot density. Lower = bigger dots (vintage), higher = finer (photo)
 * - Angle: grid rotation to reduce moiré. 45° standard, 22.5° less visible
 * - Dot shape: round (standard), ellipse (smooth gradients), diamond (edgy), line (artistic)
 * - Semi-transparent cleanup: DTF printers can't print semi-transparent ink, so every pixel
 *   must be fully opaque or fully transparent
 */

import { RGBColor, isColorWithinTolerance } from './backgroundRemovalUtils';

// ─── Types ───────────────────────────────────────────────────────────

export type HalftoneMode = 'standard' | 'black-knockout' | 'color-knockout';
export type DotShape = 'round' | 'ellipse' | 'diamond' | 'line';

export interface HalftoneSettings {
  mode: HalftoneMode;
  lpi: number;            // Lines per inch (20-60)
  angle: number;          // Grid rotation in degrees (0-90)
  dotShape: DotShape;
  /** Tone control: defines how luminance maps to dot/solid/transparent.
   *  shadows: below this luminance value → fully solid (0-255)
   *  midtones: center control point for dot density curve (0-255)
   *  highlights: above this luminance value → fully transparent (0-255)
   */
  shadows: number;
  midtones: number;
  highlights: number;
  /** Minimum dot diameter in mm. Dots below this won't transfer in DTF. Default 0.5 */
  minDotSizeMm: number;
  /** Auto-cleanup semi-transparent pixels (snap alpha to 0 or 255) */
  autoCleanup: boolean;
  /** Knockout color (for color-knockout mode) */
  knockoutColor: RGBColor;
  /** Knockout tolerance 0-100 */
  knockoutTolerance: number;
}

export interface HalftonePreset {
  name: string;
  description: string;
  settings: Partial<HalftoneSettings>;
}

export interface HalftoneAnalysis {
  /** Number of dots below minimum size threshold */
  smallDotCount: number;
  /** Estimated ink coverage percentage (0-100) */
  inkCoverage: number;
  /** Total dot count */
  totalDots: number;
}

// ─── Defaults & Presets ──────────────────────────────────────────────

export const defaultHalftoneSettings: HalftoneSettings = {
  mode: 'standard',
  lpi: 35,
  angle: 45,
  dotShape: 'round',
  shadows: 40,
  midtones: 128,
  highlights: 220,
  minDotSizeMm: 0.5,
  autoCleanup: true,
  knockoutColor: { r: 0, g: 0, b: 0 },
  knockoutTolerance: 30,
};

export const halftonePresets: HalftonePreset[] = [
  {
    name: 'Soft hand',
    description: 'Breathable, comfy',
    settings: { mode: 'standard', lpi: 35, angle: 45, dotShape: 'round', shadows: 35, midtones: 120, highlights: 210 },
  },
  {
    name: 'Vintage fade',
    description: 'Retro, visible dots',
    settings: { mode: 'standard', lpi: 25, angle: 22.5, dotShape: 'round', shadows: 30, midtones: 110, highlights: 200 },
  },
  {
    name: 'Photo realistic',
    description: 'Fine detail, smooth',
    settings: { mode: 'standard', lpi: 50, angle: 45, dotShape: 'ellipse', shadows: 45, midtones: 135, highlights: 230 },
  },
  {
    name: 'Bold graphic',
    description: 'Strong, chunky dots',
    settings: { mode: 'standard', lpi: 28, angle: 45, dotShape: 'round', shadows: 50, midtones: 140, highlights: 215 },
  },
  {
    name: 'Black knockout',
    description: 'Shirt shows through',
    settings: { mode: 'black-knockout', lpi: 30, angle: 45, dotShape: 'round', shadows: 35, midtones: 120, highlights: 210, knockoutColor: { r: 0, g: 0, b: 0 }, knockoutTolerance: 30 },
  },
  {
    name: 'Light ink saver',
    description: 'Max breathability',
    settings: { mode: 'standard', lpi: 25, angle: 45, dotShape: 'round', shadows: 25, midtones: 100, highlights: 190 },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Get luminance of a pixel (0 = black, 255 = white)
 * Uses perceptual weighting (ITU-R BT.601)
 */
const getLuminance = (r: number, g: number, b: number): number =>
  0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Apply levels adjustment to a luminance value.
 * Maps the input luminance through the shadow/midtone/highlight curve.
 * Returns 0-1 where 0 = fully solid, 1 = fully transparent.
 */
const applyLevels = (
  luminance: number,
  shadows: number,
  midtones: number,
  highlights: number
): number => {
  // Below shadows threshold → fully solid (return 0)
  if (luminance <= shadows) return 0;
  // Above highlights threshold → fully transparent (return 1)
  if (luminance >= highlights) return 1;

  // In between → apply gamma curve through midtones
  const normalized = (luminance - shadows) / (highlights - shadows);
  // Midtone gamma: midtones value controls the curve shape
  // Low midtones = more area becomes dots, high midtones = more stays solid
  const gamma = 1 + ((midtones - 128) / 128) * 0.8;
  return Math.pow(normalized, gamma);
};

/**
 * Convert minimum dot size from mm to pixels given DPI.
 * Standard DTF output is 300 DPI.
 */
const mmToPixels = (mm: number, dpi: number = 300): number =>
  (mm / 25.4) * dpi;

// ─── Dot Drawing Functions ───────────────────────────────────────────

const drawRoundDot = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
): void => {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();
};

const drawEllipseDot = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
): void => {
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.2, radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();
};

const drawDiamondDot = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius, cy);
  ctx.lineTo(cx, cy + radius);
  ctx.lineTo(cx - radius, cy);
  ctx.closePath();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();
};

const drawLineDot = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  gridSize: number,
): void => {
  const lineWidth = radius * 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - gridSize * 0.5, cy);
  ctx.lineTo(cx + gridSize * 0.5, cy);
  ctx.strokeStyle = `rgb(${r},${g},${b})`;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.stroke();
};

const drawDot = (
  ctx: CanvasRenderingContext2D,
  shape: DotShape,
  cx: number,
  cy: number,
  radius: number,
  r: number,
  g: number,
  b: number,
  gridSize: number,
): void => {
  switch (shape) {
    case 'round':
      drawRoundDot(ctx, cx, cy, radius, r, g, b);
      break;
    case 'ellipse':
      drawEllipseDot(ctx, cx, cy, radius, r, g, b);
      break;
    case 'diamond':
      drawDiamondDot(ctx, cx, cy, radius, r, g, b);
      break;
    case 'line':
      drawLineDot(ctx, cx, cy, radius, r, g, b, gridSize);
      break;
  }
};

// ─── Core Halftone Engine ────────────────────────────────────────────

/**
 * Generate a halftone preview canvas from an image URL.
 * This is the main function — matches the pattern of applyColorAdjustments().
 * 
 * @param imageUrl URL of the source image
 * @param settings Halftone settings
 * @returns Canvas with halftone applied, plus analysis data
 */
export const generateHalftonePreview = async (
  imageUrl: string,
  settings: HalftoneSettings
): Promise<{ canvas: HTMLCanvasElement; analysis: HalftoneAnalysis }> => {
  const img = await loadImage(imageUrl);
  const width = img.width;
  const height = img.height;

  // Source canvas: read pixel data from original image
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (!srcCtx) throw new Error('Could not get source canvas context');
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, width, height);
  const pixels = srcData.data;

  // Output canvas: draw halftone dots here
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Could not get output canvas context');

  // Calculate grid spacing from LPI
  // Assuming 300 DPI source (standard for DTF)
  // gridSize = DPI / LPI (pixels per halftone cell)
  const assumedDpi = 300;
  const gridSize = Math.max(2, Math.round(assumedDpi / settings.lpi));
  const maxRadius = gridSize * 0.5;
  const minDotPx = mmToPixels(settings.minDotSizeMm, assumedDpi) * 0.5; // radius

  // Angle in radians
  const angleRad = (settings.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // Analysis counters
  let smallDotCount = 0;
  let totalDotArea = 0;
  let totalDots = 0;

  // We iterate over a rotated grid that covers the entire image.
  // The grid extends far enough in rotated space to cover all corners.
  const diagonal = Math.sqrt(width * width + height * height);
  const gridSteps = Math.ceil(diagonal / gridSize) + 2;
  const offsetX = width / 2;
  const offsetY = height / 2;

  for (let gi = -gridSteps; gi <= gridSteps; gi++) {
    for (let gj = -gridSteps; gj <= gridSteps; gj++) {
      // Grid center in rotated space
      const gx = gi * gridSize;
      const gy = gj * gridSize;

      // Rotate back to image space
      const imgX = gx * cosA - gy * sinA + offsetX;
      const imgY = gx * sinA + gy * cosA + offsetY;

      // Check if center is within image bounds (with some padding)
      if (imgX < -gridSize || imgX >= width + gridSize ||
          imgY < -gridSize || imgY >= height + gridSize) {
        continue;
      }

      // Sample the grid cell: average color and luminance
      // Sample a small area around the grid center
      const sampleRadius = Math.floor(gridSize * 0.4);
      let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
      let totalLum = 0;
      let sampleCount = 0;

      for (let sy = -sampleRadius; sy <= sampleRadius; sy++) {
        for (let sx = -sampleRadius; sx <= sampleRadius; sx++) {
          const px = Math.round(imgX + sx);
          const py = Math.round(imgY + sy);

          if (px < 0 || px >= width || py < 0 || py >= height) continue;

          const idx = (py * width + px) * 4;
          const pr = pixels[idx];
          const pg = pixels[idx + 1];
          const pb = pixels[idx + 2];
          const pa = pixels[idx + 3];

          totalR += pr;
          totalG += pg;
          totalB += pb;
          totalA += pa;
          totalLum += getLuminance(pr, pg, pb);
          sampleCount++;
        }
      }

      if (sampleCount === 0) continue;

      const avgR = Math.round(totalR / sampleCount);
      const avgG = Math.round(totalG / sampleCount);
      const avgB = Math.round(totalB / sampleCount);
      const avgA = totalA / sampleCount;
      const avgLum = totalLum / sampleCount;

      // Skip fully transparent areas
      if (avgA < 10) continue;

      // Handle knockout modes
      const avgColor: RGBColor = { r: avgR, g: avgG, b: avgB };

      if (settings.mode === 'black-knockout' || settings.mode === 'color-knockout') {
        const knockoutTarget = settings.mode === 'black-knockout'
          ? { r: 0, g: 0, b: 0 }
          : settings.knockoutColor;

        if (isColorWithinTolerance(avgColor, knockoutTarget, settings.knockoutTolerance)) {
          // This area matches knockout color — make transparent (skip drawing)
          continue;
        }
      }

      // Apply levels to determine dot intensity
      // Invert luminance: dark areas (low luminance) should produce big dots
      const levelValue = applyLevels(avgLum, settings.shadows, settings.midtones, settings.highlights);
      // levelValue: 0 = fully solid, 1 = fully transparent

      if (levelValue >= 0.98) {
        // Nearly or fully transparent at this point — no dot
        continue;
      }

      if (levelValue <= 0.02) {
        // Fully solid — draw a full grid-sized square in original color
        const halfGrid = Math.ceil(gridSize * 0.5);
        const startX = Math.max(0, Math.round(imgX - halfGrid));
        const startY = Math.max(0, Math.round(imgY - halfGrid));
        const endX = Math.min(width, Math.round(imgX + halfGrid));
        const endY = Math.min(height, Math.round(imgY + halfGrid));

        // Copy original pixels for solid areas
        for (let py = startY; py < endY; py++) {
          for (let px = startX; px < endX; px++) {
            const idx = (py * width + px) * 4;
            if (pixels[idx + 3] > 0) {
              outCtx.fillStyle = `rgba(${pixels[idx]},${pixels[idx + 1]},${pixels[idx + 2]},1)`;
              outCtx.fillRect(px, py, 1, 1);
            }
          }
        }
        continue;
      }

      // Halftone zone: calculate dot radius
      // radius = maxRadius * sqrt(1 - levelValue)
      // sqrt produces more natural perceptual scaling
      const intensity = 1 - levelValue;
      const radius = maxRadius * Math.sqrt(intensity);

      // Check minimum dot size
      if (radius < minDotPx) {
        smallDotCount++;
        // Still draw the dot but track it for the warning
      }

      // Skip truly tiny dots that wouldn't render
      if (radius < 0.5) continue;

      // Draw the dot
      drawDot(outCtx, settings.dotShape, imgX, imgY, radius, avgR, avgG, avgB, gridSize);

      totalDots++;
      // Approximate dot area for ink coverage calculation
      totalDotArea += Math.PI * radius * radius;
    }
  }

  // Semi-transparent pixel cleanup
  if (settings.autoCleanup) {
    cleanupSemiTransparent(outCtx, width, height);
  }

  // Calculate ink coverage
  const totalPixels = width * height;
  const inkCoverage = Math.round((totalDotArea / totalPixels) * 100);

  return {
    canvas: outCanvas,
    analysis: {
      smallDotCount,
      inkCoverage: clamp(inkCoverage, 0, 100),
      totalDots,
    },
  };
};

/**
 * Snap all semi-transparent pixels to fully opaque or fully transparent.
 * DTF printers can't print semi-transparent ink — adhesive powder clings
 * to faint pixels and causes white haze.
 */
const cleanupSemiTransparent = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number = 128
): void => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0 && data[i] < 255) {
      data[i] = data[i] >= threshold ? 255 : 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

// ─── Beginner Mode Helper ────────────────────────────────────────────

/**
 * Apply a preset by name, overriding only the preset's defined settings.
 */
export const applyPreset = (
  presetName: string,
  current: HalftoneSettings
): HalftoneSettings => {
  const preset = halftonePresets.find(p => p.name === presetName);
  if (!preset) return current;
  return { ...current, ...preset.settings };
};

/**
 * Map the beginner "strength" slider (0-100) to shadow/midtone/highlight values.
 * 0 = more solid (less halftoning), 100 = more dots (aggressive halftoning)
 */
export const strengthToLevels = (
  strength: number
): { shadows: number; midtones: number; highlights: number } => {
  // At strength 0: shadows=60, midtones=160, highlights=240 → mostly solid
  // At strength 100: shadows=10, midtones=80, highlights=170 → lots of dots
  const t = strength / 100;
  return {
    shadows: Math.round(60 - t * 50),
    midtones: Math.round(160 - t * 80),
    highlights: Math.round(240 - t * 70),
  };
};

// ─── Convenience wrapper matching enhance pattern ────────────────────

/**
 * Simple wrapper that returns just the canvas (for EditImageModal compatibility).
 * Matches the signature pattern of applyColorAdjustments().
 */
export const applyHalftone = async (
  imageUrl: string,
  settings: HalftoneSettings
): Promise<HTMLCanvasElement> => {
  const { canvas } = await generateHalftonePreview(imageUrl, settings);
  return canvas;
};

/**
 * Check if halftone settings differ from defaults (for unsaved changes tracking)
 */
export const hasHalftoneChanges = (settings: HalftoneSettings): boolean => {
  const d = defaultHalftoneSettings;
  return (
    settings.mode !== d.mode ||
    settings.lpi !== d.lpi ||
    settings.angle !== d.angle ||
    settings.dotShape !== d.dotShape ||
    settings.shadows !== d.shadows ||
    settings.midtones !== d.midtones ||
    settings.highlights !== d.highlights
  );
};
