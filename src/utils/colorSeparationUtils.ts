/**
 * Color Separation Utilities for DTF Layout
 * 
 * Parses vectorized SVG output to extract color regions, creates pixel masks
 * from SVG paths, and applies per-region halftone with auto-assigned angles
 * to prevent moiré patterns.
 * 
 * This is the core of the "professional screen printing" workflow:
 * separate each color → halftone independently → composite.
 */

import { DotShape, HalftoneSettings, defaultHalftoneSettings, strengthToLevels } from './halftoneUtils';

// ─── Types ───────────────────────────────────────────────────────────

export interface ColorGroup {
  /** Hex color string (e.g. "#FF5500") */
  color: string;
  /** Display-friendly RGB */
  rgb: { r: number; g: number; b: number };
  /** Raw SVG markup for this color's paths */
  pathMarkup: string;
  /** Number of SVG elements with this fill */
  elementCount: number;
  /** Estimated area coverage (0-1) — computed lazily from mask */
  areaCoverage?: number;
  /** Halftone settings for this region, null = solid (no halftone) */
  halftoneSettings: RegionHalftoneSettings | null;
}

export interface RegionHalftoneSettings {
  enabled: boolean;
  lpi: number;
  angle: number;
  dotShape: DotShape;
  /** Beginner-friendly strength slider 0-100 */
  strength: number;
}

export interface ColorSeparationResult {
  /** Final composited canvas */
  canvas: HTMLCanvasElement;
  /** Per-region debug info */
  regions: Array<{ color: string; dotCount: number; inkCoverage: number }>;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Standard screen printing angles to prevent moiré */
const SCREEN_ANGLES = [45, 15, 75, 0, 30, 60, 105, 135];

/** Default halftone settings for a new region */
export const defaultRegionHalftone: RegionHalftoneSettings = {
  enabled: true,
  lpi: 35,
  angle: 45,
  dotShape: 'round',
  strength: 50,
};

// ─── SVG Parsing ─────────────────────────────────────────────────────

/**
 * Parse an SVG string and extract color groups — paths grouped by fill color.
 * Returns sorted by area (largest first) with auto-assigned halftone angles.
 */
export function extractColorGroups(svgString: string): ColorGroup[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.error('[ColorSep] SVG parse error:', parseError.textContent);
    throw new Error('Invalid SVG data');
  }

  // Query all shape elements
  const elements = doc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline');
  const colorMap = new Map<string, { markup: string[]; count: number }>();

  elements.forEach((el) => {
    // Get fill color — check element and computed style
    let fill = el.getAttribute('fill');
    
    // Check style attribute for inline fill
    const style = el.getAttribute('style');
    if (style) {
      const fillMatch = style.match(/fill\s*:\s*([^;]+)/i);
      if (fillMatch) fill = fillMatch[1].trim();
    }

    // Skip "none" fills
    if (!fill || fill === 'none') return;

    // Normalize color to hex
    const hex = normalizeColor(fill);
    if (!hex) return;

    if (!colorMap.has(hex)) {
      colorMap.set(hex, { markup: [], count: 0 });
    }

    const group = colorMap.get(hex)!;
    group.markup.push(el.outerHTML);
    group.count++;
  });

  // Convert to ColorGroup array, sorted by element count (largest groups first)
  const groups: ColorGroup[] = Array.from(colorMap.entries())
    .map(([color, data], index) => ({
      color,
      rgb: hexToRgb(color),
      pathMarkup: data.markup.join('\n'),
      elementCount: data.count,
      halftoneSettings: null, // Start as solid (no halftone)
    }))
    .sort((a, b) => b.elementCount - a.elementCount);

  return groups;
}

/**
 * Auto-assign moiré-preventing angles to color groups.
 * Uses standard screen printing angles spaced apart.
 */
export function autoAssignAngles(groups: ColorGroup[]): ColorGroup[] {
  return groups.map((group, i) => {
    if (!group.halftoneSettings) return group;
    return {
      ...group,
      halftoneSettings: {
        ...group.halftoneSettings,
        angle: SCREEN_ANGLES[i % SCREEN_ANGLES.length],
      },
    };
  });
}

// ─── Mask Creation ───────────────────────────────────────────────────

/**
 * Create a binary mask canvas from SVG path markup.
 * White pixels = inside the region, black = outside.
 */
export function createMaskFromPaths(
  pathMarkup: string,
  svgString: string,
  width: number,
  height: number,
): HTMLCanvasElement {
  // Extract viewBox from original SVG for coordinate mapping
  const viewBox = extractViewBox(svgString);

  // Build a minimal SVG that draws only these paths in white on black
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" 
    viewBox="${viewBox}" 
    width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="black"/>
    <g fill="white" stroke="none">
      ${pathMarkup.replace(/fill="[^"]*"/g, 'fill="white"')
                   .replace(/fill\s*:\s*[^;"]+/g, 'fill: white')
                   .replace(/stroke="[^"]*"/g, 'stroke="none"')}
    </g>
  </svg>`;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Render SVG to canvas via Image
  return canvas; // Will be rendered async — see renderMask()
}

/**
 * Async mask rendering — loads SVG as image and draws to canvas.
 */
export async function renderMask(
  pathMarkup: string,
  svgString: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const viewBox = extractViewBox(svgString);

  // Build mask SVG: all selected paths in white, everything else black
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" 
    viewBox="${viewBox}" 
    width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="black"/>
    <g fill="white" stroke="none">
      ${recolorPaths(pathMarkup)}
    </g>
  </svg>`;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const img = await loadSvgAsImage(maskSvg, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

/**
 * Render the full SVG at given dimensions for preview.
 */
export async function renderSvgToCanvas(
  svgString: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const img = await loadSvgAsImage(svgString, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

// ─── Per-Region Halftone ─────────────────────────────────────────────

/**
 * Apply halftone to a specific color region using its SVG path mask.
 * Returns a canvas with halftone dots only where the mask is white.
 */
export async function applyRegionHalftone(
  color: { r: number; g: number; b: number },
  regionSettings: RegionHalftoneSettings,
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number,
): Promise<{ canvas: HTMLCanvasElement; dotCount: number; inkCoverage: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Get mask data
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true })!;
  const maskData = maskCtx.getImageData(0, 0, width, height).data;

  // Convert strength to levels
  const levels = strengthToLevels(regionSettings.strength);

  // Halftone parameters
  const assumedDpi = 300;
  const gridSize = Math.max(2, Math.round(assumedDpi / regionSettings.lpi));
  const maxRadius = gridSize * 0.5;

  const angleRad = (regionSettings.angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  let dotCount = 0;
  let totalDotArea = 0;

  const diagonal = Math.sqrt(width * width + height * height);
  const gridSteps = Math.ceil(diagonal / gridSize) + 2;
  const offsetX = width / 2;
  const offsetY = height / 2;

  for (let gi = -gridSteps; gi <= gridSteps; gi++) {
    for (let gj = -gridSteps; gj <= gridSteps; gj++) {
      const gx = gi * gridSize;
      const gy = gj * gridSize;

      // Rotate to image space
      const imgX = gx * cosA - gy * sinA + offsetX;
      const imgY = gx * sinA + gy * cosA + offsetY;

      if (imgX < -gridSize || imgX >= width + gridSize ||
          imgY < -gridSize || imgY >= height + gridSize) {
        continue;
      }

      // Check mask at this grid cell — sample center
      const px = Math.round(imgX);
      const py = Math.round(imgY);
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const maskIdx = (py * width + px) * 4;
      const maskValue = maskData[maskIdx]; // R channel of mask (white = 255)

      if (maskValue < 128) continue; // Outside the region

      // For color separation, we use the region's solid color
      // The "luminance" is determined by the strength slider
      const luminance = 128; // Mid-tone — strength slider controls the actual dot size
      
      // Apply levels from strength
      const normalized = (luminance - levels.shadows) / (levels.highlights - levels.shadows);
      const clamped = Math.max(0, Math.min(1, normalized));
      const levelValue = Math.pow(clamped, 1.2);

      if (levelValue >= 0.98) continue;

      if (levelValue <= 0.02) {
        // Fully solid — fill the grid cell
        const halfGrid = Math.ceil(gridSize * 0.5);
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillRect(
          Math.max(0, Math.round(imgX - halfGrid)),
          Math.max(0, Math.round(imgY - halfGrid)),
          gridSize,
          gridSize
        );
        continue;
      }

      // Halftone dot
      const intensity = 1 - levelValue;
      const radius = maxRadius * Math.sqrt(intensity);
      if (radius < 0.5) continue;

      ctx.beginPath();
      switch (regionSettings.dotShape) {
        case 'ellipse':
          ctx.ellipse(imgX, imgY, radius * 1.2, radius * 0.8, 0, 0, Math.PI * 2);
          break;
        case 'diamond':
          ctx.moveTo(imgX, imgY - radius);
          ctx.lineTo(imgX + radius, imgY);
          ctx.lineTo(imgX, imgY + radius);
          ctx.lineTo(imgX - radius, imgY);
          ctx.closePath();
          break;
        case 'line':
          ctx.rect(imgX - radius * 0.3, imgY - radius, radius * 0.6, radius * 2);
          break;
        default: // round
          ctx.arc(imgX, imgY, radius, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fill();

      dotCount++;
      totalDotArea += Math.PI * radius * radius;
    }
  }

  const inkCoverage = Math.round((totalDotArea / (width * height)) * 100);

  return { canvas, dotCount, inkCoverage };
}

// ─── Compositing ─────────────────────────────────────────────────────

/**
 * Composite all color regions into a final output.
 * Regions with halftone settings get halftoned; others stay solid.
 */
export async function compositeColorSeparation(
  groups: ColorGroup[],
  svgString: string,
  width: number,
  height: number,
  onProgress?: (current: number, total: number) => void,
): Promise<ColorSeparationResult> {
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext('2d')!;

  const regionResults: Array<{ color: string; dotCount: number; inkCoverage: number }> = [];
  const total = groups.length;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    onProgress?.(i + 1, total);

    if (group.halftoneSettings && group.halftoneSettings.enabled) {
      // Halftoned region
      const mask = await renderMask(group.pathMarkup, svgString, width, height);
      const { canvas, dotCount, inkCoverage } = await applyRegionHalftone(
        group.rgb,
        group.halftoneSettings,
        mask,
        width,
        height,
      );

      finalCtx.drawImage(canvas, 0, 0);
      regionResults.push({ color: group.color, dotCount, inkCoverage });
    } else {
      // Solid region — render paths as-is
      const regionCanvas = await renderColorRegion(group, svgString, width, height);
      finalCtx.drawImage(regionCanvas, 0, 0);
      regionResults.push({ color: group.color, dotCount: 0, inkCoverage: 0 });
    }
  }

  // Cleanup semi-transparent pixels (critical for DTF)
  cleanupAlpha(finalCtx, width, height);

  return { canvas: finalCanvas, regions: regionResults };
}

/**
 * Render a single color region as solid (no halftone).
 */
async function renderColorRegion(
  group: ColorGroup,
  svgString: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const viewBox = extractViewBox(svgString);

  const regionSvg = `<svg xmlns="http://www.w3.org/2000/svg" 
    viewBox="${viewBox}" width="${width}" height="${height}">
    ${group.pathMarkup}
  </svg>`;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const img = await loadSvgAsImage(regionSvg, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas;
}

// ─── Highlight Preview ───────────────────────────────────────────────

/**
 * Create a preview canvas showing the SVG with one color group highlighted.
 * Non-highlighted regions are dimmed.
 */
export async function createHighlightPreview(
  svgString: string,
  highlightColor: string | null,
  groups: ColorGroup[],
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  if (!highlightColor) {
    // No highlight — render full SVG
    const img = await loadSvgAsImage(svgString, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  }

  // Render full SVG dimmed
  const fullImg = await loadSvgAsImage(svgString, width, height);
  ctx.globalAlpha = 0.25;
  ctx.drawImage(fullImg, 0, 0, width, height);
  ctx.globalAlpha = 1.0;

  // Render highlighted region at full opacity
  const highlightGroup = groups.find(g => g.color === highlightColor);
  if (highlightGroup) {
    const regionCanvas = await renderColorRegion(highlightGroup, svgString, width, height);
    ctx.drawImage(regionCanvas, 0, 0);
  }

  return canvas;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function extractViewBox(svgString: string): string {
  const match = svgString.match(/viewBox="([^"]+)"/);
  if (match) return match[1];

  // Fallback: try to extract width/height
  const wMatch = svgString.match(/width="([^"]+)"/);
  const hMatch = svgString.match(/height="([^"]+)"/);
  const w = wMatch ? parseFloat(wMatch[1]) : 100;
  const h = hMatch ? parseFloat(hMatch[1]) : 100;
  return `0 0 ${w} ${h}`;
}

function normalizeColor(color: string): string | null {
  color = color.trim().toLowerCase();
  
  // Already hex
  if (color.startsWith('#')) {
    if (color.length === 4) {
      // Short hex #RGB → #RRGGBB
      return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color.length >= 7 ? color.substring(0, 7) : null;
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Named colors (common ones)
  const namedColors: Record<string, string> = {
    black: '#000000', white: '#ffffff', red: '#ff0000',
    green: '#008000', blue: '#0000ff', yellow: '#ffff00',
    cyan: '#00ffff', magenta: '#ff00ff', gray: '#808080',
    grey: '#808080', orange: '#ffa500', purple: '#800080',
  };
  return namedColors[color] || null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = hex.replace('#', '').match(/.{2}/g);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[0], 16),
    g: parseInt(match[1], 16),
    b: parseInt(match[2], 16),
  };
}

function recolorPaths(pathMarkup: string): string {
  return pathMarkup
    .replace(/fill="[^"]*"/g, 'fill="white"')
    .replace(/fill\s*:\s*[^;"]+/g, 'fill: white')
    .replace(/stroke="[^"]*"/g, 'stroke="none"');
}

function loadSvgAsImage(svgString: string, width: number, height: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.width = width;
    img.height = height;
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

function cleanupAlpha(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0 && data[i] < 255) {
      data[i] = data[i] >= 128 ? 255 : 0;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
