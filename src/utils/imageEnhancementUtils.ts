/**
 * Image Enhancement Utility Functions
 * Provides functions for adjusting brightness, contrast, saturation, hue, vibrance, and adding strokes
 */

export interface EnhancementSettings {
  brightness: number;  // -100 to +100
  contrast: number;    // -100 to +100
  vibrance: number;    // -100 to +100
  hue: number;         // -180 to +180
  saturation: number;  // -100 to +100
  stroke: {
    enabled: boolean;
    color: string;     // Hex color
    width: number;     // 1-20px
  };
}

export const defaultEnhancementSettings: EnhancementSettings = {
  brightness: 0,
  contrast: 0,
  vibrance: 0,
  hue: 0,
  saturation: 0,
  stroke: {
    enabled: false,
    color: '#000000',
    width: 2,
  },
};

/**
 * Convert RGB to HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
};

/**
 * Convert HSL to RGB
 */
export const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

/**
 * Parse hex color to RGB
 */
export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
  return [0, 0, 0];
};

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Adjust brightness of image data
 * @param data ImageData.data array
 * @param value Brightness adjustment (-100 to +100)
 */
export const adjustBrightness = (data: Uint8ClampedArray, value: number): void => {
  const adjustment = (value / 100) * 255;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only adjust non-transparent pixels
      data[i] = clamp(data[i] + adjustment, 0, 255);
      data[i + 1] = clamp(data[i + 1] + adjustment, 0, 255);
      data[i + 2] = clamp(data[i + 2] + adjustment, 0, 255);
    }
  }
};

/**
 * Adjust contrast of image data
 * @param data ImageData.data array
 * @param value Contrast adjustment (-100 to +100)
 */
export const adjustContrast = (data: Uint8ClampedArray, value: number): void => {
  const factor = (259 * (value + 255)) / (255 * (259 - value));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only adjust non-transparent pixels
      data[i] = clamp(factor * (data[i] - 128) + 128, 0, 255);
      data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128, 0, 255);
      data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128, 0, 255);
    }
  }
};

/**
 * Adjust vibrance of image data (boosts muted colors more than saturated ones)
 * @param data ImageData.data array
 * @param value Vibrance adjustment (-100 to +100)
 */
export const adjustVibrance = (data: Uint8ClampedArray, value: number): void => {
  const adjustment = value / 100;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only adjust non-transparent pixels
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      // Less saturated colors get more boost
      const boost = adjustment * (1 - saturation);

      const avg = (r + g + b) / 3;
      data[i] = clamp(r + (r - avg) * boost, 0, 255);
      data[i + 1] = clamp(g + (g - avg) * boost, 0, 255);
      data[i + 2] = clamp(b + (b - avg) * boost, 0, 255);
    }
  }
};

/**
 * Adjust hue of image data
 * @param data ImageData.data array
 * @param value Hue shift in degrees (-180 to +180)
 */
export const adjustHue = (data: Uint8ClampedArray, value: number): void => {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only adjust non-transparent pixels
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      let newHue = h + value;
      // Wrap hue around
      if (newHue > 360) newHue -= 360;
      if (newHue < 0) newHue += 360;
      const [r, g, b] = hslToRgb(newHue, s, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
};

/**
 * Adjust saturation of image data
 * @param data ImageData.data array
 * @param value Saturation adjustment (-100 to +100)
 */
export const adjustSaturation = (data: Uint8ClampedArray, value: number): void => {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only adjust non-transparent pixels
      const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      const newSaturation = clamp(s + value, 0, 100);
      const [r, g, b] = hslToRgb(h, newSaturation, l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
};

/**
 * Add stroke/outline around non-transparent areas using a fast canvas-based approach.
 * Draws the image at multiple angle offsets, colors them with composite, then draws original on top.
 * @param sourceCanvas Canvas element with the image
 * @param color Stroke color (hex)
 * @param strokeWidth Stroke width in pixels
 */
export const addStroke = (
  sourceCanvas: HTMLCanvasElement,
  color: string,
  strokeWidth: number
): HTMLCanvasElement => {
  const originalWidth = sourceCanvas.width;
  const originalHeight = sourceCanvas.height;

  // Create result canvas with padding for the stroke
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = originalWidth + (strokeWidth * 2);
  resultCanvas.height = originalHeight + (strokeWidth * 2);
  const ctx = resultCanvas.getContext('2d');

  if (!ctx) {
    return sourceCanvas;
  }

  // Step 1: Draw the source image at multiple offset positions around a circle
  // This creates the "spread" for the stroke
  const angleStep = 15; // degrees between each draw (24 draws total)

  for (let angle = 0; angle < 360; angle += angleStep) {
    const radians = angle * Math.PI / 180;
    const x = strokeWidth + Math.cos(radians) * strokeWidth;
    const y = strokeWidth + Math.sin(radians) * strokeWidth;
    ctx.drawImage(sourceCanvas, x, y);
  }

  // Step 2: Use 'source-in' composite to color all the drawn pixels with the stroke color
  // This keeps only the non-transparent pixels and fills them with the stroke color
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);

  // Step 3: Reset composite mode and draw original image on top (centered)
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sourceCanvas, strokeWidth, strokeWidth);

  return resultCanvas;
};

/**
 * Load image from URL
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
 * Apply only color adjustments (no stroke) - fast for real-time preview
 */
export const applyColorAdjustments = async (
  imageUrl: string,
  settings: EnhancementSettings
): Promise<HTMLCanvasElement> => {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, 0, 0);

  // Apply color adjustments
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply adjustments in order
  if (settings.brightness !== 0) {
    adjustBrightness(data, settings.brightness);
  }
  if (settings.contrast !== 0) {
    adjustContrast(data, settings.contrast);
  }
  if (settings.vibrance !== 0) {
    adjustVibrance(data, settings.vibrance);
  }
  if (settings.hue !== 0) {
    adjustHue(data, settings.hue);
  }
  if (settings.saturation !== 0) {
    adjustSaturation(data, settings.saturation);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

/**
 * Apply stroke to an already processed canvas
 */
export const applyStrokeToCanvas = (
  sourceCanvas: HTMLCanvasElement,
  color: string,
  width: number
): HTMLCanvasElement => {
  return addStroke(sourceCanvas, color, width);
};

/**
 * Apply color adjustments to an existing canvas (for stacking effects)
 */
export const applyColorAdjustmentsToCanvas = (
  sourceCanvas: HTMLCanvasElement,
  settings: EnhancementSettings
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(sourceCanvas, 0, 0);

  // Apply color adjustments
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply adjustments in order
  if (settings.brightness !== 0) {
    adjustBrightness(data, settings.brightness);
  }
  if (settings.contrast !== 0) {
    adjustContrast(data, settings.contrast);
  }
  if (settings.vibrance !== 0) {
    adjustVibrance(data, settings.vibrance);
  }
  if (settings.hue !== 0) {
    adjustHue(data, settings.hue);
  }
  if (settings.saturation !== 0) {
    adjustSaturation(data, settings.saturation);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

/**
 * Apply all enhancements and return a new canvas
 */
export const applyAllEnhancements = async (
  imageUrl: string,
  settings: EnhancementSettings
): Promise<HTMLCanvasElement> => {
  // First apply color adjustments
  let canvas = await applyColorAdjustments(imageUrl, settings);

  // Apply stroke if enabled (must be done after other adjustments)
  if (settings.stroke.enabled && settings.stroke.width > 0) {
    canvas = addStroke(canvas, settings.stroke.color, settings.stroke.width);
  }

  return canvas;
};

/**
 * Apply all enhancements and return blob URL
 */
export const applyEnhancementsToBlob = async (
  imageUrl: string,
  settings: EnhancementSettings,
  fileName: string
): Promise<{ url: string; file: File }> => {
  const canvas = await applyAllEnhancements(imageUrl, settings);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }

        const nameParts = fileName.split('.');
        nameParts.pop();
        const baseName = nameParts.join('.');
        const newFileName = `${baseName}_enhanced.png`;

        const file = new File([blob], newFileName, { type: 'image/png' });
        const url = URL.createObjectURL(blob);

        resolve({ url, file });
      },
      'image/png',
      1.0
    );
  });
};

/**
 * Check if any settings differ from default
 */
export const hasChanges = (settings: EnhancementSettings): boolean => {
  return (
    settings.brightness !== 0 ||
    settings.contrast !== 0 ||
    settings.vibrance !== 0 ||
    settings.hue !== 0 ||
    settings.saturation !== 0 ||
    settings.stroke.enabled
  );
};
