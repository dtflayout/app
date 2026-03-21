/**
 * Multi-Sheet Export Utilities
 * 
 * Handles exporting multiple sheets as individual PNGs or as a ZIP file.
 */

import JSZip from 'jszip';
import { generateExport } from './exportUtils';
import { addDpiToPng, downloadBlob } from './pngDpiHelper';
import { PackedSheet } from './layoutAlgorithm';
import { ImageObject } from '@/components/CollageCreator';

export type ExportProgressCallback = (
  sheetNumber: number, 
  status: 'rendering' | 'complete' | 'error',
  error?: string
) => void;

interface ExportSheetParams {
  sheet: PackedSheet;
  images: ImageObject[];
  sheetWidthInches: number;
  dpi: number;
  sheetIndex: number;
  totalSheets: number;
}

/**
 * Generate a single sheet's PNG blob
 */
export async function renderSheetToBlob(params: ExportSheetParams): Promise<Blob> {
  const { sheet, images, sheetWidthInches, dpi } = params;

  console.log(`[RenderSheet] Rendering sheet ${sheet.sheetNumber} with ${sheet.images.length} images`);

  // Convert PackedSheet images to PositionedImage format
  const layout = sheet.images.map(img => ({
    id: img.id,
    x: img.x,
    y: img.y,
    widthInches: img.widthInches,
    heightInches: img.heightInches,
    rotated: img.rotated,
  }));

  console.log(`[RenderSheet] Layout has ${layout.length} items, canvas: ${sheetWidthInches}" x ${sheet.heightInches}"`);

  // Generate the export (returns data URL string)
  const dataUrl = await generateExport({
    images,
    layout,
    canvasWidthInches: sheetWidthInches,
    canvasHeightInches: sheet.heightInches,
    dpi,
  });

  console.log(`[RenderSheet] Generated data URL, length: ${dataUrl.length}`);

  // Add DPI metadata (converts data URL to Blob)
  const blobWithDpi = await addDpiToPng(dataUrl, dpi);
  
  console.log(`[RenderSheet] Final blob size: ${blobWithDpi.size} bytes`);
  
  return blobWithDpi;
}

/**
 * Generate filename for a sheet
 */
export function generateSheetFilename(
  sheetNumber: number, 
  totalSheets: number, 
  dpi: number,
  widthInches?: number,
  heightInches?: number
): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const dims = widthInches && heightInches 
    ? `_${Math.round(widthInches)}x${Math.round(heightInches)}in` 
    : '';
  
  if (totalSheets === 1) {
    return `gangsheet${dims}_${dpi}dpi_${date}.png`;
  }
  
  return `gangsheet_${sheetNumber}of${totalSheets}${dims}_${dpi}dpi_${date}.png`;
}

/**
 * Download all sheets as individual PNG files
 */
export async function downloadAllAsPngs(
  sheets: PackedSheet[],
  images: ImageObject[],
  sheetWidthInches: number,
  dpi: number,
  onProgress: ExportProgressCallback
): Promise<{ success: boolean; error?: string }> {
  const totalSheets = sheets.length;
  
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetNumber = i + 1;
    
    try {
      onProgress(sheetNumber, 'rendering');
      
      const blob = await renderSheetToBlob({
        sheet,
        images,
        sheetWidthInches,
        dpi,
        sheetIndex: i,
        totalSheets,
      });
      
      const filename = generateSheetFilename(sheetNumber, totalSheets, dpi, sheetWidthInches, sheet.heightInches);
      downloadBlob(blob, filename);
      
      onProgress(sheetNumber, 'complete');
      
      // Small delay between downloads to avoid browser issues
      if (i < sheets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Failed to export sheet ${sheetNumber}:`, error);
      onProgress(sheetNumber, 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: `Failed to export sheet ${sheetNumber}` };
    }
  }
  
  return { success: true };
}

/**
 * Download all sheets as a single ZIP file
 */
export async function downloadAllAsZip(
  sheets: PackedSheet[],
  images: ImageObject[],
  sheetWidthInches: number,
  dpi: number,
  onProgress: ExportProgressCallback
): Promise<{ success: boolean; error?: string }> {
  console.log('[ZIP Export] Starting ZIP export with', sheets.length, 'sheets');
  const zip = new JSZip();
  const totalSheets = sheets.length;
  
  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const sheetNumber = i + 1;
    
    try {
      console.log(`[ZIP Export] Rendering sheet ${sheetNumber}/${totalSheets}...`);
      onProgress(sheetNumber, 'rendering');
      
      const blob = await renderSheetToBlob({
        sheet,
        images,
        sheetWidthInches,
        dpi,
        sheetIndex: i,
        totalSheets,
      });
      
      console.log(`[ZIP Export] Sheet ${sheetNumber} rendered, blob size:`, blob.size);
      
      const filename = generateSheetFilename(sheetNumber, totalSheets, dpi, sheetWidthInches, sheet.heightInches);
      zip.file(filename, blob);
      console.log(`[ZIP Export] Added ${filename} to ZIP`);
      
      onProgress(sheetNumber, 'complete');
    } catch (error) {
      console.error(`[ZIP Export] Failed to export sheet ${sheetNumber}:`, error);
      onProgress(sheetNumber, 'error', error instanceof Error ? error.message : 'Unknown error');
      return { success: false, error: `Failed to export sheet ${sheetNumber}` };
    }
  }
  
  // Generate and download ZIP
  try {
    console.log('[ZIP Export] Generating ZIP file (no compression - PNGs already compressed)...');
    const startTime = Date.now();
    
    // Use STORE (no compression) since PNGs are already compressed
    // This is MUCH faster for large files
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'STORE'  // No compression - much faster for pre-compressed files
    }, (metadata) => {
      // Progress callback
      if (metadata.percent && metadata.percent % 20 === 0) {
        console.log(`[ZIP Export] ZIP progress: ${metadata.percent.toFixed(0)}%`);
      }
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[ZIP Export] ZIP generated in ${elapsed}s, size: ${(zipBlob.size / 1024 / 1024).toFixed(1)} MB`);
    
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
    
    const zipFilename = `gangsheets_${totalSheets}sheets_${dpi}dpi_${timestamp}.zip`;
    console.log('[ZIP Export] Triggering download:', zipFilename);
    downloadBlob(zipBlob, zipFilename);
    
    console.log('[ZIP Export] Download triggered successfully');
    return { success: true };
  } catch (error) {
    console.error('[ZIP Export] Failed to create ZIP:', error);
    return { success: false, error: 'Failed to create ZIP file' };
  }
}

/**
 * Download a single sheet
 */
export async function downloadSingleSheet(
  sheet: PackedSheet,
  images: ImageObject[],
  sheetWidthInches: number,
  dpi: number,
  sheetNumber: number,
  totalSheets: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const blob = await renderSheetToBlob({
      sheet,
      images,
      sheetWidthInches,
      dpi,
      sheetIndex: sheetNumber - 1,
      totalSheets,
    });
    
    const filename = generateSheetFilename(sheetNumber, totalSheets, dpi, sheetWidthInches, sheet.heightInches);
    downloadBlob(blob, filename);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to export sheet ${sheetNumber}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
