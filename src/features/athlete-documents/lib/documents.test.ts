import { describe, expect, it } from "vitest";

import {
  MAX_DOCUMENT_BYTES,
  buildUploadPayload,
  deriveChecklist,
  isReviewable,
  docTypeLabel,
  emptyUploadForm,
  formatFileSize,
  statusTone,
  validateDocumentFile,
  validateUploadForm,
} from "./documents";

function fileOf(name: string, type: string, size = 10): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("document validation", () => {
  it("accepts PDF, JPG and PNG up to 5 MB", () => {
    expect(validateDocumentFile(fileOf("a.pdf", "application/pdf"))).toBeNull();
    expect(validateDocumentFile(fileOf("a.JPG", "image/jpeg"))).toBeNull();
    expect(validateDocumentFile(fileOf("a.png", "image/png", MAX_DOCUMENT_BYTES))).toBeNull();
    // Unknown MIME type but a valid extension (some browsers/OSes).
    expect(validateDocumentFile(fileOf("scan.pdf", ""))).toBeNull();
  });

  it("rejects other formats, empty and oversized files", () => {
    expect(validateDocumentFile(null)).toMatch(/Selecciona/);
    expect(validateDocumentFile(fileOf("a.docx", "application/msword"))).toMatch(/Formato/);
    expect(validateDocumentFile(fileOf("a.gif", ""))).toMatch(/Formato/);
    expect(validateDocumentFile(fileOf("a.pdf", "application/pdf", 0))).toMatch(/vacío/);
    expect(
      validateDocumentFile(fileOf("a.pdf", "application/pdf", MAX_DOCUMENT_BYTES + 1)),
    ).toMatch(/5 MB/);
  });

  it("validates the upload form", () => {
    expect(validateUploadForm(emptyUploadForm())).toEqual({
      doc_type: "Selecciona el tipo de documento.",
      file: "Selecciona un archivo.",
    });
    const values = {
      ...emptyUploadForm("sports_insurance"),
      file: fileOf("p.pdf", "application/pdf"),
      valid_from: "2026-06-01",
      valid_until: "2026-01-01",
    };
    expect(validateUploadForm(values)).toEqual({
      valid_until: "La vigencia final no puede ser anterior a la inicial.",
    });
    expect(validateUploadForm({ ...values, valid_until: "2026-12-31" })).toEqual({});
    expect(validateUploadForm({ ...values, title: "x".repeat(201), valid_until: "" })).toEqual({
      title: "Máximo 200 caracteres.",
    });
  });

  it("builds the payload, keeping insurance fields only for insurance", () => {
    const file = fileOf("p.pdf", "application/pdf");
    const insurance = buildUploadPayload({
      ...emptyUploadForm("sports_insurance"),
      file,
      title: " Póliza ",
      insurer: "SURA",
      policy_number: "123",
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
    });
    expect(insurance).toEqual({
      doc_type: "sports_insurance",
      file,
      title: "Póliza",
      insurer: "SURA",
      policy_number: "123",
      valid_from: "2026-01-01",
      valid_until: "2026-12-31",
    });
    const medical = buildUploadPayload({
      ...emptyUploadForm("medical_certificate"),
      file,
      insurer: "SURA",
    });
    expect(medical).toEqual({ doc_type: "medical_certificate", file });
    expect(() => buildUploadPayload(emptyUploadForm())).toThrow();
  });

  it("formats labels, tones and sizes", () => {
    expect(docTypeLabel("liability_waiver")).toMatch(/exoneración/);
    expect(docTypeLabel("zzz")).toBe("zzz");
    expect(docTypeLabel(null)).toBe("Documento");
    expect(statusTone("approved")).toBe("success");
    expect(statusTone("pending")).toBe("warning");
    expect(statusTone("rejected")).toBe("destructive");
    expect(statusTone("missing")).toBe("outline-muted");
    expect(formatFileSize(120334)).toBe("118 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(null)).toBe("—");
  });
});

describe("deriveChecklist", () => {
  const base = { athlete: 1, source: "document" as const };
  it("marks missing, pending, approved and rejected per required type", () => {
    const items = deriveChecklist([
      {
        ...base,
        id: 1,
        doc_type: "medical_certificate",
        status: "rejected",
        created_at: "2026-01-02",
      },
      {
        ...base,
        id: 2,
        doc_type: "medical_certificate",
        status: "pending",
        created_at: "2026-01-01",
      },
      {
        ...base,
        id: 3,
        doc_type: "liability_waiver",
        status: "rejected",
        created_at: "2026-01-01",
      },
      { ...base, id: 4, doc_type: "other", status: "approved" },
    ]);
    expect(items.map((i) => [i.doc_type, i.status, i.document_id])).toEqual([
      ["medical_certificate", "pending", 2],
      ["sports_insurance", "missing", null],
      ["liability_waiver", "rejected", 3],
    ]);
  });

  it("counts legacy enrollment certificates as approved and not reviewable", () => {
    const legacy = {
      athlete: 1,
      id: "enrollment-5",
      doc_type: "medical_certificate" as const,
      status: "pending" as const,
      source: "enrollment" as const,
    };
    expect(deriveChecklist([legacy])[0].status).toBe("approved");
    expect(isReviewable(legacy)).toBe(false);
    expect(isReviewable({ ...legacy, id: 7, source: "document" })).toBe(true);
  });
});
