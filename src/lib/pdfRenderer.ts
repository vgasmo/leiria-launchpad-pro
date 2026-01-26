/**
 * PDF Rendering Utility
 * Uses pdfjs-dist to render PDF first page as canvas/image for interactive maps
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source to CDN (works in browser)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`;

interface RenderPdfResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Render the first page of a PDF to a data URL
 * @param pdfUrl - URL of the PDF to render
 * @param scale - Scale factor for rendering (default 2 for high DPI)
 * @returns Promise with data URL and dimensions
 */
export async function renderPdfToImage(
  pdfUrl: string,
  scale: number = 2
): Promise<RenderPdfResult> {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  
  // Get first page
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to get canvas context');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport,
  }).promise;
  
  // Convert to data URL
  const dataUrl = canvas.toDataURL('image/png');
  
  // Cleanup
  pdf.destroy();
  
  return {
    dataUrl,
    width: viewport.width,
    height: viewport.height,
  };
}

/**
 * Check if a file path/URL is a PDF
 */
export function isPdfFile(path: string): boolean {
  return path.toLowerCase().endsWith('.pdf');
}
