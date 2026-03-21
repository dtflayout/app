// ============ TEXT RENDER UTILS ============
// Canvas-based text rendering engine with warp effects

export type WarpStyle = "none" | "arc-up" | "arc-down" | "wave" | "inflate" | "squeeze";

export const WARP_STYLES: { id: WarpStyle; label: string }[] = [
  { id: "none", label: "None" },
  { id: "arc-up", label: "⌒ Arc Up" },
  { id: "arc-down", label: "⌣ Arc Down" },
  { id: "wave", label: "〰 Wave" },
  { id: "inflate", label: "⬭ Inflate" },
  { id: "squeeze", label: "⬬ Squeeze" },
];

export interface TextRenderConfig {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  fillColor: string;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  vertical: boolean;
  warpStyle: WarpStyle;
  warpBend: number;   // 0-100
  scale: number;
}

export const defaultTextConfig: TextRenderConfig = {
  text: "",
  fontFamily: "Bebas Neue",
  fontSize: 72,
  fontWeight: 400,
  italic: false,
  fillColor: "#000000",
  strokeEnabled: false,
  strokeColor: "#ffffff",
  strokeWidth: 3,
  letterSpacing: 0,
  lineHeight: 1.2,
  textAlign: "center",
  vertical: false,
  warpStyle: "none",
  warpBend: 50,
  scale: 1,
};

// ============ HELPERS ============

function buildFontString(config: TextRenderConfig): string {
  const style = config.italic ? "italic" : "normal";
  return `${style} ${config.fontWeight} ${config.fontSize * config.scale}px "${config.fontFamily}"`;
}

function measureLineWidth(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number): number {
  if (text.length === 0) return 0;
  if (letterSpacing === 0) return ctx.measureText(text).width;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += ctx.measureText(text[i]).width;
    if (i < text.length - 1) width += letterSpacing;
  }
  return width;
}

/**
 * Measure actual bounding box of text including ascenders/descenders.
 * This prevents clipping on script fonts like Pacifico.
 */
function measureTextBounds(ctx: CanvasRenderingContext2D, text: string): {
  ascent: number;
  descent: number;
} {
  const metrics = ctx.measureText(text);
  // Use actual bounding box metrics (available in modern browsers)
  const ascent = metrics.actualBoundingBoxAscent || ctx.measureText("M").actualBoundingBoxAscent || 0;
  const descent = metrics.actualBoundingBoxDescent || ctx.measureText("g").actualBoundingBoxDescent || 0;
  return { ascent, descent };
}

function drawLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, letterSpacing: number, config: TextRenderConfig) {
  const drawChar = (t: string, tx: number, ty: number) => {
    if (config.strokeEnabled && config.strokeWidth > 0) {
      ctx.strokeStyle = config.strokeColor;
      ctx.lineWidth = config.strokeWidth * config.scale;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(t, tx, ty);
    }
    ctx.fillStyle = config.fillColor;
    ctx.fillText(t, tx, ty);
  };

  if (letterSpacing === 0) {
    drawChar(text, x, y);
  } else {
    let cx = x;
    for (let i = 0; i < text.length; i++) {
      drawChar(text[i], cx, y);
      cx += ctx.measureText(text[i]).width + letterSpacing;
    }
  }
}

// ============ NORMAL TEXT ============

function renderNormalText(config: TextRenderConfig): HTMLCanvasElement {
  const scale = config.scale;
  const fontSize = config.fontSize * scale;
  const letterSpacing = config.letterSpacing * scale;
  const strokeExtra = config.strokeEnabled ? config.strokeWidth * scale * 2 : 0;

  // Measurement pass
  const mc = document.createElement("canvas");
  mc.width = 1; mc.height = 1;
  const mCtx = mc.getContext("2d")!;
  mCtx.font = buildFontString(config);

  const lines = config.text.split("\n");
  const lineWidths = lines.map(l => measureLineWidth(mCtx, l, letterSpacing));
  const maxWidth = Math.max(...lineWidths, 1);

  // Measure actual font bounds to prevent clipping
  const allText = lines.join("");
  const bounds = measureTextBounds(mCtx, allText || "Mg");
  const actualLineHeight = Math.max(fontSize * config.lineHeight, bounds.ascent + bounds.descent + 4 * scale);
  const lineHeightPx = fontSize * config.lineHeight;

  // Extra padding: use actual ascent/descent to ensure no clipping
  // Some script fonts (Pacifico, etc.) have glyphs extending far beyond em-square
  const topPadding = Math.max(strokeExtra + 8 * scale, bounds.ascent - fontSize * 0.8 + strokeExtra + 8 * scale);
  const bottomPadding = Math.max(strokeExtra + 8 * scale, bounds.descent - fontSize * 0.2 + strokeExtra + 8 * scale);
  const sidePadding = strokeExtra + 8 * scale;

  const totalHeight = lineHeightPx * (lines.length - 1) + bounds.ascent + bounds.descent;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(maxWidth + sidePadding * 2);
  canvas.height = Math.ceil(totalHeight + topPadding + bottomPadding);

  const ctx = canvas.getContext("2d")!;
  ctx.font = buildFontString(config);
  ctx.textBaseline = "alphabetic"; // Use alphabetic for accurate positioning

  for (let i = 0; i < lines.length; i++) {
    const lw = lineWidths[i];
    // Position baseline using actual ascent
    const y = topPadding + bounds.ascent + i * lineHeightPx;
    let x: number;
    if (config.textAlign === "center") x = sidePadding + (maxWidth - lw) / 2;
    else if (config.textAlign === "right") x = sidePadding + (maxWidth - lw);
    else x = sidePadding;
    drawLine(ctx, lines[i], x, y, letterSpacing, config);
  }
  return canvas;
}

// ============ VERTICAL TEXT ============

function renderVerticalText(config: TextRenderConfig): HTMLCanvasElement {
  const scale = config.scale;
  const fontSize = config.fontSize * scale;
  const letterSpacing = config.letterSpacing * scale;
  const strokeExtra = config.strokeEnabled ? config.strokeWidth * scale * 2 : 0;

  const mc = document.createElement("canvas");
  mc.width = 1; mc.height = 1;
  const mCtx = mc.getContext("2d")!;
  mCtx.font = buildFontString(config);

  const lines = config.text.split("\n");
  const charHeight = fontSize * config.lineHeight;

  const columns: { chars: string[]; maxW: number }[] = [];
  for (const line of lines) {
    const chars = Array.from(line);
    let maxW = 0;
    for (const ch of chars) maxW = Math.max(maxW, mCtx.measureText(ch).width);
    columns.push({ chars, maxW });
  }

  const gap = fontSize * 0.3;
  const totalW = columns.reduce((s, c) => s + c.maxW, 0) + gap * (columns.length - 1);
  const maxChars = Math.max(...columns.map(c => c.chars.length));
  const totalH = maxChars * (charHeight + letterSpacing) - letterSpacing;

  const padding = strokeExtra + 8 * scale;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(totalW + padding * 2);
  canvas.height = Math.ceil(totalH + padding * 2);

  const ctx = canvas.getContext("2d")!;
  ctx.font = buildFontString(config);
  ctx.textBaseline = "top";

  let colX = padding;
  for (const col of columns) {
    for (let i = 0; i < col.chars.length; i++) {
      const ch = col.chars[i];
      const cw = ctx.measureText(ch).width;
      const x = colX + (col.maxW - cw) / 2;
      const y = padding + i * (charHeight + letterSpacing);
      if (config.strokeEnabled && config.strokeWidth > 0) {
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = config.strokeWidth * scale;
        ctx.lineJoin = "round";
        ctx.strokeText(ch, x, y);
      }
      ctx.fillStyle = config.fillColor;
      ctx.fillText(ch, x, y);
    }
    colX += col.maxW + gap;
  }
  return canvas;
}

// ============ ARC TEXT ============

function renderArcText(config: TextRenderConfig, direction: "up" | "down"): HTMLCanvasElement {
  const scale = config.scale;
  const fontSize = config.fontSize * scale;
  const letterSpacing = config.letterSpacing * scale;
  const strokeExtra = config.strokeEnabled ? config.strokeWidth * scale * 2 : 0;
  // Map warpBend: high bend = tight curve (small radius), low bend = gentle curve (large radius)
  const radius = Math.max(fontSize * 1.5, (110 - config.warpBend) * 4 * scale);

  const mc = document.createElement("canvas");
  mc.width = 1; mc.height = 1;
  const mCtx = mc.getContext("2d")!;
  mCtx.font = buildFontString(config);

  const text = config.text.split("\n")[0] || "";
  const chars = Array.from(text);
  const charWidths = chars.map(ch => mCtx.measureText(ch).width);
  const totalW = charWidths.reduce((s, w) => s + w, 0) + letterSpacing * (chars.length - 1);
  const totalAngle = totalW / radius;

  const size = (radius + fontSize * 1.5 + strokeExtra + 20 * scale) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(size);
  canvas.height = Math.ceil(size);
  const ctx = canvas.getContext("2d")!;
  ctx.font = buildFontString(config);
  ctx.textBaseline = "middle";

  const cx = size / 2, cy = size / 2;

  if (direction === "up") {
    // Arc up: text along top of circle, reading left to right
    // Characters sit OUTSIDE the circle (above it)
    // Start from left side, traverse counter-clockwise (increasing angle)
    let currentAngle = -Math.PI / 2 - totalAngle / 2;

    for (let i = 0; i < chars.length; i++) {
      const cw = charWidths[i];
      const charArc = cw / radius;
      const midAngle = currentAngle + charArc / 2;

      const x = cx + radius * Math.cos(midAngle);
      const y = cy + radius * Math.sin(midAngle);

      ctx.save();
      ctx.translate(x, y);
      // Rotate so character top points away from center (outward)
      ctx.rotate(midAngle + Math.PI / 2);

      if (config.strokeEnabled && config.strokeWidth > 0) {
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = config.strokeWidth * scale;
        ctx.lineJoin = "round";
        ctx.strokeText(chars[i], -cw / 2, 0);
      }
      ctx.fillStyle = config.fillColor;
      ctx.fillText(chars[i], -cw / 2, 0);
      ctx.restore();

      currentAngle += charArc + letterSpacing / radius;
    }
  } else {
    // Arc down: text along bottom of circle, reading left to right
    // Characters sit OUTSIDE the circle (below it)
    // Start from LEFT side of bottom arc, traverse by DECREASING angle (clockwise)
    let currentAngle = Math.PI / 2 + totalAngle / 2;

    for (let i = 0; i < chars.length; i++) {
      const cw = charWidths[i];
      const charArc = cw / radius;
      const midAngle = currentAngle - charArc / 2;

      const x = cx + radius * Math.cos(midAngle);
      const y = cy + radius * Math.sin(midAngle);

      ctx.save();
      ctx.translate(x, y);
      // Rotate so character top points TOWARD center (inward = upward at bottom)
      // This makes text readable from outside the circle
      ctx.rotate(midAngle - Math.PI / 2);

      if (config.strokeEnabled && config.strokeWidth > 0) {
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = config.strokeWidth * scale;
        ctx.lineJoin = "round";
        ctx.strokeText(chars[i], -cw / 2, 0);
      }
      ctx.fillStyle = config.fillColor;
      ctx.fillText(chars[i], -cw / 2, 0);
      ctx.restore();

      currentAngle -= charArc + letterSpacing / radius;
    }
  }

  return trimCanvas(canvas);
}

// ============ PIXEL WARP ENGINE ============

/**
 * Bilinear interpolation for smooth pixel sampling.
 */
function sampleBilinear(d: Uint8ClampedArray, w: number, h: number, sx: number, sy: number): [number, number, number, number] {
  // Out of bounds → transparent
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return [0, 0, 0, 0];

  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = sx - x0;
  const fy = sy - y0;

  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;

  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  return [
    w00 * d[i00] + w10 * d[i10] + w01 * d[i01] + w11 * d[i11],
    w00 * d[i00 + 1] + w10 * d[i10 + 1] + w01 * d[i01 + 1] + w11 * d[i11 + 1],
    w00 * d[i00 + 2] + w10 * d[i10 + 2] + w01 * d[i01 + 2] + w11 * d[i11 + 2],
    w00 * d[i00 + 3] + w10 * d[i10 + 3] + w01 * d[i01 + 3] + w11 * d[i11 + 3],
  ];
}

/**
 * Apply pixel displacement warp.
 * 
 * mapFn(nx, ny) → [snx, sny]: 
 *   - Input (nx, ny) are in SOURCE-centered coordinates where (0,0) is top-left 
 *     of source and (1,1) is bottom-right of source.
 *   - The output canvas is LARGER (padded) to show displaced content.
 *   - Return the source coordinate to sample from.
 * 
 * padX, padY: extra padding as fraction of source size (e.g. 0.4 = 40% extra on each side)
 */
function applyWarp(
  source: HTMLCanvasElement,
  mapFn: (nx: number, ny: number) => [number, number],
  padX = 0,
  padY = 0
): HTMLCanvasElement {
  const sw = source.width, sh = source.height;
  const srcData = source.getContext("2d")!.getImageData(0, 0, sw, sh).data;

  // Output canvas: source + padding on each side
  const outW = Math.ceil(sw * (1 + padX * 2));
  const outH = Math.ceil(sh * (1 + padY * 2));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d")!;
  const outImg = outCtx.createImageData(outW, outH);
  const od = outImg.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // Convert output pixel to source-centered normalized coords
      // (0,0) = source top-left, (1,1) = source bottom-right
      // Values < 0 or > 1 are in the padding area
      const nx = (x / outW) * (1 + padX * 2) - padX;
      const ny = (y / outH) * (1 + padY * 2) - padY;

      // Ask the warp function where this output pixel samples from
      const [snx, sny] = mapFn(nx, ny);

      // Convert to source pixel coordinates
      const sx = snx * (sw - 1);
      const sy = sny * (sh - 1);

      const [r, g, b, a] = sampleBilinear(srcData, sw, sh, sx, sy);
      const i = (y * outW + x) * 4;
      od[i] = r;
      od[i + 1] = g;
      od[i + 2] = b;
      od[i + 3] = a;
    }
  }

  outCtx.putImageData(outImg, 0, 0);
  return trimCanvas(out);
}

// ============ WARP EFFECTS ============

/**
 * WAVE: Uniform vertical sine wave — baseline undulates up/down evenly.
 */
function warpWave(src: HTMLCanvasElement, bend: number): HTMLCanvasElement {
  const amplitude = (bend / 100) * 0.35;
  const padY = amplitude * 0.6;

  return applyWarp(src, (nx, ny) => {
    const displacement = amplitude * Math.sin(nx * Math.PI * 3);
    return [nx, ny - displacement];
  }, 0, padY);
}

/**
 * INFLATE: Vertical bulge — center rows push outward (top goes up, bottom goes down).
 * Like text wrapped around a sphere.
 */
function warpInflate(src: HTMLCanvasElement, bend: number): HTMLCanvasElement {
  const strength = (bend / 100) * 0.5;
  const padY = strength * 0.5;

  return applyWarp(src, (nx, ny) => {
    // Horizontal position determines bulge amount (max at center)
    const hFactor = 1 - Math.pow((nx - 0.5) * 2, 2); // 1 at center, 0 at edges
    // Vertical displacement: top half pushes up, bottom half pushes down
    const vertDir = (ny - 0.5) * 2; // -1 at top, +1 at bottom
    const displacement = strength * hFactor * vertDir * 0.5;
    return [nx, ny - displacement];
  }, 0, padY);
}

/**
 * SQUEEZE: Horizontal pinch at vertical center, width is maintained at top/bottom.
 * Like an hourglass/bowtie shape.
 */
function warpSqueeze(src: HTMLCanvasElement, bend: number): HTMLCanvasElement {
  const strength = (bend / 100) * 0.5;
  const padX = strength * 0.3;

  return applyWarp(src, (nx, ny) => {
    // Vertical center gets narrower, top/bottom stay wide
    const vFactor = 1 - Math.pow((ny - 0.5) * 2, 2); // 1 at v-center, 0 at v-edges
    const hDisplacement = strength * vFactor;
    // Pull horizontal coords toward center
    const cx = nx - 0.5;
    const sourceX = 0.5 + cx * (1 + hDisplacement);
    return [sourceX, ny];
  }, padX, 0);
}

// ============ TRIM CANVAS ============

function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width, h = canvas.height;
  if (w === 0 || h === 0) return canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  let top = h, bottom = 0, left = w, right = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
  if (top > bottom || left > right) return canvas;
  const p = 4;
  const tl = Math.max(0, left - p), tt = Math.max(0, top - p);
  const tw = Math.min(w - tl, right - left + 1 + p * 2);
  const th = Math.min(h - tt, bottom - top + 1 + p * 2);
  const trimmed = document.createElement("canvas");
  trimmed.width = tw; trimmed.height = th;
  trimmed.getContext("2d")!.drawImage(canvas, tl, tt, tw, th, 0, 0, tw, th);
  return trimmed;
}

// ============ MAIN ============

export function renderTextToCanvas(config: TextRenderConfig): HTMLCanvasElement {
  if (!config.text.trim()) {
    const e = document.createElement("canvas"); e.width = 1; e.height = 1; return e;
  }
  if (config.vertical) return renderVerticalText(config);
  if (config.warpStyle === "arc-up") return renderArcText(config, "up");
  if (config.warpStyle === "arc-down") return renderArcText(config, "down");

  const base = renderNormalText(config);
  if (config.warpStyle === "none") return base;

  switch (config.warpStyle) {
    case "wave": return warpWave(base, config.warpBend);
    case "inflate": return warpInflate(base, config.warpBend);
    case "squeeze": return warpSqueeze(base, config.warpBend);
    default: return base;
  }
}

export async function renderTextToBlob(config: TextRenderConfig): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const canvas = renderTextToCanvas(config);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error("Failed to create text blob")); return; }
      const url = URL.createObjectURL(blob);
      resolve({ blob, url, width: canvas.width, height: canvas.height });
    }, "image/png");
  });
}
