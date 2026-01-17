/**
 * Secure Excel Parser using JSZip
 * Replaces vulnerable xlsx package with a safe JSZip-based implementation
 */
import JSZip from 'jszip';

interface CellData {
  ref: string;
  value: string | number;
}

/**
 * Parse an Excel file (.xlsx, .xls) to JSON array
 * Uses JSZip to safely extract data from Excel's XML structure
 */
export async function parseExcelToJson(arrayBuffer: ArrayBuffer): Promise<Record<string, unknown>[]> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(arrayBuffer);
  
  // Extract shared strings (text values are stored here)
  const sharedStrings: string[] = [];
  const sharedStringsFile = contents.file('xl/sharedStrings.xml');
  if (sharedStringsFile) {
    const ssXml = await sharedStringsFile.async('string');
    for (const si of ssXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)) {
      sharedStrings.push(extractTexts(si[1]));
    }
  }
  
  // Find the first worksheet
  const sheetFiles = Object.keys(contents.files).filter(
    (name) => name.startsWith('xl/worksheets/') && name.endsWith('.xml')
  ).sort();
  
  if (sheetFiles.length === 0) {
    throw new Error('No worksheets found in Excel file');
  }
  
  const sheetFile = contents.file(sheetFiles[0]);
  if (!sheetFile) {
    throw new Error('Could not read worksheet');
  }
  
  const sheetXml = await sheetFile.async('string');
  const cells = extractCells(sheetXml, sharedStrings);
  
  return cellsToRows(cells);
}

/**
 * Extract text content from XML, handling rich text <t> tags
 */
function extractTexts(xml: string): string {
  const out: string[] = [];
  for (const m of xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) {
    out.push(decodeXmlEntities(m[1]));
  }
  return out.join('');
}

/**
 * Decode common XML entities
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Parse cell reference (e.g., "A1") to row/col indices
 */
function parseCellRef(ref: string): { col: number; row: number } {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { col: 0, row: 0 };
  
  const colStr = match[1];
  const rowNum = parseInt(match[2], 10);
  
  let col = 0;
  for (const ch of colStr) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  
  return { col: col - 1, row: rowNum - 1 }; // 0-indexed
}

/**
 * Extract cells from worksheet XML
 */
function extractCells(xml: string, sharedStrings: string[]): CellData[] {
  const cells: CellData[] = [];
  
  // Match all <c> cell elements
  for (const cellMatch of xml.matchAll(/<c\s+([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cellMatch[1];
    const content = cellMatch[2] || '';
    
    // Get cell reference
    const refMatch = attrs.match(/r="([^"]+)"/);
    if (!refMatch) continue;
    const ref = refMatch[1];
    
    // Get cell type
    const typeMatch = attrs.match(/t="([^"]+)"/);
    const cellType = typeMatch ? typeMatch[1] : '';
    
    // Extract value
    const valueMatch = content.match(/<v>([^<]*)<\/v>/);
    if (!valueMatch) continue;
    
    let value: string | number = valueMatch[1];
    
    if (cellType === 's') {
      // Shared string reference
      const idx = parseInt(value, 10);
      value = sharedStrings[idx] ?? '';
    } else if (cellType === 'str' || cellType === 'inlineStr') {
      // Inline string
      const inlineMatch = content.match(/<is>[\s\S]*?<t>([^<]*)<\/t>[\s\S]*?<\/is>/);
      value = inlineMatch ? decodeXmlEntities(inlineMatch[1]) : decodeXmlEntities(value);
    } else {
      // Numeric value
      const num = parseFloat(value);
      if (!isNaN(num)) {
        value = num;
      }
    }
    
    cells.push({ ref, value });
  }
  
  return cells;
}

/**
 * Convert cells to array of row objects
 * First row is assumed to be headers
 */
function cellsToRows(cells: CellData[]): Record<string, unknown>[] {
  if (cells.length === 0) return [];
  
  // Group cells by row
  const rowMap = new Map<number, Map<number, string | number>>();
  let maxCol = 0;
  
  for (const cell of cells) {
    const { col, row } = parseCellRef(cell.ref);
    if (!rowMap.has(row)) {
      rowMap.set(row, new Map());
    }
    rowMap.get(row)!.set(col, cell.value);
    maxCol = Math.max(maxCol, col);
  }
  
  // Get sorted row indices
  const rowIndices = Array.from(rowMap.keys()).sort((a, b) => a - b);
  if (rowIndices.length === 0) return [];
  
  // First row is headers
  const headerRow = rowMap.get(rowIndices[0])!;
  const headers: string[] = [];
  for (let col = 0; col <= maxCol; col++) {
    const val = headerRow.get(col);
    headers[col] = val !== undefined ? String(val).trim() : `Column_${col + 1}`;
  }
  
  // Convert remaining rows to objects
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < rowIndices.length; i++) {
    const rowIdx = rowIndices[i];
    const rowData = rowMap.get(rowIdx)!;
    
    const obj: Record<string, unknown> = {};
    let hasData = false;
    
    for (let col = 0; col <= maxCol; col++) {
      const header = headers[col];
      const value = rowData.get(col);
      obj[header] = value !== undefined ? value : '';
      if (value !== undefined && value !== '') hasData = true;
    }
    
    // Only include rows with actual data
    if (hasData) {
      rows.push(obj);
    }
  }
  
  return rows;
}
