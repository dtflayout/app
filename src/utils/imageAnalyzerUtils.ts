/**
 * Smart Image Analyzer for DTF Layout
 * Analyzes uploaded images client-side to determine whether they're best suited for
 * AI Enhancement (photos, complex art) or Vectorization (logos, illustrations, line art).
 * 
 * All analysis runs in-browser using canvas pixel inspection — zero API cost.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type ImageRecommendation = 'vectorize' | 'enhance';

export interface ImageAnalysis {
  recommendation: ImageRecommendation;
  /** 0-1, higher = more confident in recommendation */
  confidence: number;
  details: {
    uniqueColors: number;
    flatColorRatio: number;
    hasTransparency: boolean;
    semiTransparentRatio: number;
    edgeSharpness: number;
    noiseLevel: number;
    dimensions: { width: number; height: number };
  };
  vectorScore: number;
  enhanceScore: number;
  /** Human-readable label */
  detectedType: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Sample grid size for performance — don't inspect every pixel on large images */
const SAMPLE_SIZE = 200;

// ─── Core Analysis ───────────────────────────────────────────────────

/**
 * Analyze an image from a blob URL or HTMLImageElement.
 * Returns recommendation + detailed metrics.
 */
export async function analyzeImage(source: string | HTMLImageElement): Promise<ImageAnalysis> {
  const img = typeof source === 'string' ? await loadImage(source) : source;
  const { width, height } = img;

  // Draw to offscreen canvas for pixel access
  const canvas = document.createElement('canvas');
  const sampleW = Math.min(width, SAMPLE_SIZE);
  const sampleH = Math.min(height, SAMPLE_SIZE);
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
  const { data } = imageData;

  // Run all analysis passes
  const uniqueColors = countUniqueColors(data, sampleW, sampleH);
  const flatColorRatio = measureFlatAreas(data, sampleW, sampleH);
  const { hasTransparency, semiTransparentRatio } = checkAlphaChannel(data);
  const edgeSharpness = measureEdgeContrast(data, sampleW, sampleH);
  const noiseLevel = measureNoise(data, sampleW, sampleH);
  const isSmall = width < 500 && height < 500;

  // ── Scoring ──
  let vectorScore = 0;
  let enhanceScore = 0;

  // Unique colors: fewer = likely illustration/logo
  if (uniqueColors < 50) vectorScore += 35;
  else if (uniqueColors < 200) vectorScore += 20;
  else if (uniqueColors < 500) vectorScore += 10;
  else enhanceScore += 25;

  // Flat color areas: more = illustration
  if (flatColorRatio > 0.5) vectorScore += 30;
  else if (flatColorRatio > 0.3) vectorScore += 15;
  else enhanceScore += 15;

  // Transparency: more common in logos/illustrations
  if (hasTransparency) vectorScore += 10;

  // Edge sharpness: hard edges = illustration
  if (edgeSharpness > 0.6) vectorScore += 20;
  else if (edgeSharpness > 0.3) vectorScore += 5;
  else enhanceScore += 15;

  // Noise level: high = photo
  if (noiseLevel > 0.25) enhanceScore += 20;
  else if (noiseLevel < 0.08) vectorScore += 10;

  // Small images: likely logos pulled from web
  if (isSmall) vectorScore += 10;

  const totalScore = vectorScore + enhanceScore;
  const recommendation: ImageRecommendation = vectorScore >= enhanceScore ? 'vectorize' : 'enhance';
  const confidence = totalScore > 0 ? Math.abs(vectorScore - enhanceScore) / totalScore : 0;

  // Determine human-readable type
  let detectedType: string;
  if (vectorScore >= enhanceScore) {
    if (uniqueColors < 50) detectedType = 'Logo / Icon';
    else if (flatColorRatio > 0.4) detectedType = 'Illustration / Cartoon';
    else detectedType = 'Graphic / Line Art';
  } else {
    if (noiseLevel > 0.3) detectedType = 'Photograph';
    else if (uniqueColors > 1000) detectedType = 'Complex Digital Art';
    else detectedType = 'Photo / Mixed Media';
  }

  return {
    recommendation,
    confidence,
    details: {
      uniqueColors,
      flatColorRatio,
      hasTransparency,
      semiTransparentRatio,
      edgeSharpness,
      noiseLevel,
      dimensions: { width, height },
    },
    vectorScore,
    enhanceScore,
    detectedType,
  };
}

// ─── Analysis Sub-Routines ───────────────────────────────────────────

/**
 * Count approximate unique colors by quantizing to 5-bit per channel.
 */
function countUniqueColors(data: Uint8ClampedArray, w: number, h: number): number {
  const colorSet = new Set<number>();
  const totalPixels = w * h;
  // Sample every Nth pixel for performance
  const step = Math.max(1, Math.floor(totalPixels / 5000));

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a < 10) continue; // skip transparent
    // Quantize to reduce noise-caused color variance
    const r = data[idx] >> 3;
    const g = data[idx + 1] >> 3;
    const b = data[idx + 2] >> 3;
    colorSet.add((r << 10) | (g << 5) | b);
  }

  return colorSet.size;
}

/**
 * Measure ratio of pixels whose neighbors are the same color (flat areas).
 * High ratio = illustration/logo. Low ratio = photo.
 */
function measureFlatAreas(data: Uint8ClampedArray, w: number, h: number): number {
  let flatCount = 0;
  let totalChecked = 0;
  const threshold = 8; // max channel difference to be "same"
  const step = Math.max(1, Math.floor(Math.min(w, h) / 100));

  for (let y = 0; y < h - 1; y += step) {
    for (let x = 0; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      const idxRight = idx + 4;
      const idxBelow = ((y + 1) * w + x) * 4;

      // Skip transparent pixels
      if (data[idx + 3] < 10) continue;
      totalChecked++;

      const diffRight =
        Math.abs(data[idx] - data[idxRight]) +
        Math.abs(data[idx + 1] - data[idxRight + 1]) +
        Math.abs(data[idx + 2] - data[idxRight + 2]);

      const diffBelow =
        Math.abs(data[idx] - data[idxBelow]) +
        Math.abs(data[idx + 1] - data[idxBelow + 1]) +
        Math.abs(data[idx + 2] - data[idxBelow + 2]);

      if (diffRight < threshold && diffBelow < threshold) {
        flatCount++;
      }
    }
  }

  return totalChecked > 0 ? flatCount / totalChecked : 0;
}

/**
 * Check alpha channel usage.
 */
function checkAlphaChannel(data: Uint8ClampedArray): {
  hasTransparency: boolean;
  semiTransparentRatio: number;
} {
  let transparentCount = 0;
  let semiTransparentCount = 0;
  const totalPixels = data.length / 4;
  const step = Math.max(1, Math.floor(totalPixels / 5000));

  for (let i = 0; i < totalPixels; i += step) {
    const a = data[i * 4 + 3];
    if (a === 0) transparentCount++;
    else if (a < 250) semiTransparentCount++;
  }

  const sampledCount = Math.ceil(totalPixels / step);
  return {
    hasTransparency: transparentCount > sampledCount * 0.01,
    semiTransparentRatio: semiTransparentCount / sampledCount,
  };
}

/**
 * Measure edge sharpness by looking at adjacent pixel contrast.
 * High = hard edges (illustration). Low = soft gradients (photo).
 */
function measureEdgeContrast(data: Uint8ClampedArray, w: number, h: number): number {
  let sharpEdges = 0;
  let totalEdges = 0;
  const sharpThreshold = 40; // min channel diff for a "sharp" edge
  const step = Math.max(1, Math.floor(Math.min(w, h) / 80));

  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const idx = (y * w + x) * 4;
      const idxRight = idx + 4;
      const idxBelow = ((y + 1) * w + x) * 4;

      if (data[idx + 3] < 10) continue;

      const gradX =
        Math.abs(data[idx] - data[idxRight]) +
        Math.abs(data[idx + 1] - data[idxRight + 1]) +
        Math.abs(data[idx + 2] - data[idxRight + 2]);

      const gradY =
        Math.abs(data[idx] - data[idxBelow]) +
        Math.abs(data[idx + 1] - data[idxBelow + 1]) +
        Math.abs(data[idx + 2] - data[idxBelow + 2]);

      const grad = Math.max(gradX, gradY);
      if (grad > 5) {
        totalEdges++;
        if (grad > sharpThreshold) sharpEdges++;
      }
    }
  }

  return totalEdges > 0 ? sharpEdges / totalEdges : 0;
}

/**
 * Measure noise/grain level using local variance.
 * Photos have higher noise than clean illustrations.
 */
function measureNoise(data: Uint8ClampedArray, w: number, h: number): number {
  let totalVariance = 0;
  let blocks = 0;
  const blockSize = 4;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 50));

  for (let by = 0; by < h - blockSize; by += step * blockSize) {
    for (let bx = 0; bx < w - blockSize; bx += step * blockSize) {
      let sumR = 0, sumG = 0, sumB = 0;
      let sumR2 = 0, sumG2 = 0, sumB2 = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const idx = ((by + dy) * w + (bx + dx)) * 4;
          if (data[idx + 3] < 10) continue;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          sumR += r; sumG += g; sumB += b;
          sumR2 += r * r; sumG2 += g * g; sumB2 += b * b;
          count++;
        }
      }

      if (count < 4) continue;
      const varR = (sumR2 / count) - (sumR / count) ** 2;
      const varG = (sumG2 / count) - (sumG / count) ** 2;
      const varB = (sumB2 / count) - (sumB / count) ** 2;
      totalVariance += (varR + varG + varB) / 3;
      blocks++;
    }
  }

  if (blocks === 0) return 0;
  // Normalize: typical photo noise variance is ~200-800, logo is <50
  const avgVariance = totalVariance / blocks;
  return Math.min(1, avgVariance / 500);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// ─── Credit Costs ────────────────────────────────────────────────────

export const AI_TOOL_CREDITS = {
  ENHANCE_2X: 500,
  ENHANCE_4X: 500,
  VECTORIZE: 2000,
  HALFTONE: 200,
  COLOR_SEPARATION: 2500,
} as const;

/** Max file size for AI tools (30MB) */
export const AI_TOOLS_MAX_FILE_SIZE = 30 * 1024 * 1024;
