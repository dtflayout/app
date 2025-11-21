/**
 * Utility to add DPI metadata (pHYs chunk) to PNG exports
 * Works in the browser without external dependencies
 */

// CRC32 lookup table for PNG chunk validation
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Creates a pHYs chunk with the specified DPI
 * pHYs chunk format:
 * - 4 bytes: length of data (9)
 * - 4 bytes: chunk type "pHYs"
 * - 4 bytes: pixels per unit X
 * - 4 bytes: pixels per unit Y
 * - 1 byte: unit specifier (1 = meter)
 * - 4 bytes: CRC
 */
function createPhysChunk(dpi: number): Uint8Array {
  // Convert DPI to pixels per meter (1 inch = 0.0254 meters)
  const pixelsPerMeter = Math.round(dpi / 0.0254);

  // Create the chunk data (9 bytes)
  const chunkData = new Uint8Array(9);
  const dataView = new DataView(chunkData.buffer);
  dataView.setUint32(0, pixelsPerMeter, false); // X pixels per unit (big-endian)
  dataView.setUint32(4, pixelsPerMeter, false); // Y pixels per unit (big-endian)
  chunkData[8] = 1; // Unit is meters

  // Create chunk type bytes
  const chunkType = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"

  // Calculate CRC over type + data
  const crcInput = new Uint8Array(4 + 9);
  crcInput.set(chunkType, 0);
  crcInput.set(chunkData, 4);
  const crcValue = crc32(crcInput);

  // Build complete chunk: length (4) + type (4) + data (9) + crc (4) = 21 bytes
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9, false); // Length of data
  chunk.set(chunkType, 4);
  chunk.set(chunkData, 8);
  chunkView.setUint32(17, crcValue, false); // CRC

  return chunk;
}

/**
 * Finds the position of the IHDR chunk end in a PNG file
 * The pHYs chunk should be inserted after IHDR and before IDAT
 */
function findIHDREnd(data: Uint8Array): number {
  // PNG signature is 8 bytes
  // IHDR chunk starts at byte 8
  // IHDR length is at bytes 8-11
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const ihdrLength = view.getUint32(8, false);
  // IHDR chunk: 4 (length) + 4 (type) + ihdrLength (data) + 4 (crc)
  return 8 + 4 + 4 + ihdrLength + 4;
}

/**
 * Checks if a PNG already has a pHYs chunk
 */
function hasPhysChunk(data: Uint8Array): boolean {
  // Search for "pHYs" in the data
  const physSignature = [0x70, 0x48, 0x59, 0x73];
  for (let i = 8; i < data.length - 4; i++) {
    if (data[i] === physSignature[0] &&
        data[i + 1] === physSignature[1] &&
        data[i + 2] === physSignature[2] &&
        data[i + 3] === physSignature[3]) {
      return true;
    }
  }
  return false;
}

/**
 * Adds DPI metadata to a PNG data URL
 * @param dataUrl - The PNG as a data URL (data:image/png;base64,...)
 * @param dpi - The DPI to embed (default 150)
 * @returns A Blob containing the PNG with DPI metadata
 */
export async function addDpiToPng(dataUrl: string, dpi: number = 150): Promise<Blob> {
  // Extract base64 data from data URL
  const base64Data = dataUrl.split(',')[1];

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Data);
  const originalData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    originalData[i] = binaryString.charCodeAt(i);
  }

  // Check PNG signature
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (originalData[i] !== pngSignature[i]) {
      throw new Error('Invalid PNG data');
    }
  }

  // Check if pHYs already exists
  if (hasPhysChunk(originalData)) {
    console.log('PNG already has pHYs chunk, returning as-is');
    return new Blob([originalData], { type: 'image/png' });
  }

  // Find where to insert pHYs (after IHDR)
  const insertPosition = findIHDREnd(originalData);

  // Create pHYs chunk
  const physChunk = createPhysChunk(dpi);

  // Create new PNG with pHYs chunk inserted
  const newData = new Uint8Array(originalData.length + physChunk.length);
  newData.set(originalData.slice(0, insertPosition), 0);
  newData.set(physChunk, insertPosition);
  newData.set(originalData.slice(insertPosition), insertPosition + physChunk.length);

  console.log(`Added pHYs chunk with ${dpi} DPI (${Math.round(dpi / 0.0254)} pixels/meter)`);

  return new Blob([newData], { type: 'image/png' });
}

/**
 * Creates a download link for a Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
