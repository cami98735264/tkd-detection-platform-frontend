// Club branding for PDFs generated client-side (jsPDF + jspdf-autotable).
// Institutional colours: green (primary) and yellow (accent), inspired by the
// flag of El Espinal — the same palette as the design tokens in index.css.

export type RGB = [number, number, number];

export const BRAND_PDF = {
  green: [11, 122, 59] as RGB, // #0B7A3B
  greenDark: [7, 90, 43] as RGB, // #075A2B
  yellow: [245, 196, 0] as RGB, // #F5C400
  ink: [28, 28, 22] as RGB,
  white: [255, 255, 255] as RGB,
  greenTint: [236, 246, 240] as RGB,
};

/** Minimal slice of the jsPDF API used here (keeps the helper testable). */
export interface PdfLike {
  internal: { pageSize: { getWidth(): number; getHeight(): number } };
  setFillColor(r: number, g: number, b: number): unknown;
  setTextColor(r: number, g: number, b: number): unknown;
  setDrawColor(r: number, g: number, b: number): unknown;
  setFontSize(size: number): unknown;
  rect(x: number, y: number, w: number, h: number, style?: string): unknown;
  text(text: string, x: number, y: number, options?: Record<string, unknown>): unknown;
}

/** Header height in mm reserved by drawBrandHeader (content starts below). */
export const BRAND_HEADER_HEIGHT = 30;

/**
 * Green title band with a yellow stripe underneath. Title in white on the
 * green; subtitle lines in light text. Resets the text colour to dark ink.
 */
export function drawBrandHeader(doc: PdfLike, title: string, subtitle?: string): number {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND_PDF.green);
  doc.rect(0, 0, width, 24, "F");
  doc.setFillColor(...BRAND_PDF.yellow);
  doc.rect(0, 24, width, 3, "F");
  doc.setTextColor(...BRAND_PDF.white);
  doc.setFontSize(16);
  doc.text(title, 14, 12);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 19);
  }
  doc.setTextColor(...BRAND_PDF.ink);
  return BRAND_HEADER_HEIGHT + 6;
}

/** Thin yellow/green footer band + caption on the current page. */
export function drawBrandFooter(doc: PdfLike, caption: string): void {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setFillColor(...BRAND_PDF.yellow);
  doc.rect(0, height - 10, width / 2, 2, "F");
  doc.setFillColor(...BRAND_PDF.green);
  doc.rect(width / 2, height - 10, width / 2, 2, "F");
  doc.setTextColor(...BRAND_PDF.ink);
  doc.setFontSize(8);
  doc.text(caption, 14, height - 4);
}

/** jspdf-autotable styles in club colours (white on green header). */
export const brandTableStyles = {
  headStyles: { fillColor: BRAND_PDF.green, textColor: BRAND_PDF.white, fontStyle: "bold" },
  alternateRowStyles: { fillColor: BRAND_PDF.greenTint },
  styles: { textColor: BRAND_PDF.ink, lineColor: [220, 220, 210] as RGB },
} as const;
