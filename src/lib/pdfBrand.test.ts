import { describe, expect, it, vi } from "vitest";

import {
  BRAND_PDF,
  brandTableStyles,
  drawBrandFooter,
  drawBrandHeader,
  type PdfLike,
} from "./pdfBrand";

function fakeDoc() {
  return {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    rect: vi.fn(),
    text: vi.fn(),
  } satisfies PdfLike;
}

describe("pdfBrand", () => {
  it("draws a green band with a yellow stripe and the title", () => {
    const doc = fakeDoc();
    const y = drawBrandHeader(doc, "Reporte", "Periodo: octubre");
    expect(doc.setFillColor).toHaveBeenNthCalledWith(1, ...BRAND_PDF.green);
    expect(doc.setFillColor).toHaveBeenNthCalledWith(2, ...BRAND_PDF.yellow);
    expect(doc.rect).toHaveBeenCalledWith(0, 0, 210, 24, "F");
    expect(doc.text).toHaveBeenCalledWith("Reporte", 14, 12);
    expect(doc.text).toHaveBeenCalledWith("Periodo: octubre", 14, 19);
    // Ends with dark ink so body text stays readable.
    expect(doc.setTextColor).toHaveBeenLastCalledWith(...BRAND_PDF.ink);
    expect(y).toBeGreaterThan(24);
  });

  it("draws the footer caption at the page bottom", () => {
    const doc = fakeDoc();
    drawBrandFooter(doc, "TKD Warriors");
    expect(doc.text).toHaveBeenCalledWith("TKD Warriors", 14, 293);
  });

  it("uses white on green table headers", () => {
    expect(brandTableStyles.headStyles.fillColor).toEqual(BRAND_PDF.green);
    expect(brandTableStyles.headStyles.textColor).toEqual(BRAND_PDF.white);
  });
});
