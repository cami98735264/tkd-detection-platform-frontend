import type {
  AthleteDocument,
  ChecklistItem,
  ChecklistStatus,
  DocumentStatus,
  DocumentType,
  DocumentUploadPayload,
} from "../api/athleteDocumentsApi";

/** Upload limits — mirror the backend validator (PDF/JPG/PNG, ≤ 5 MB). */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"] as const;
export const DOCUMENT_ACCEPT = [...ALLOWED_DOCUMENT_TYPES, ...ALLOWED_DOCUMENT_EXTENSIONS].join(
  ",",
);

export const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "medical_certificate", label: "Certificado médico" },
  { value: "sports_insurance", label: "Seguro deportivo (afiliación / comprobante)" },
  { value: "liability_waiver", label: "Carta de exoneración de responsabilidad (firmada)" },
  { value: "identity_document", label: "Documento de identidad (foto legible)" },
  { value: "eps_certificate", label: "Certificado de afiliación EPS (ADRES)" },
  { value: "other", label: "Otro documento" },
];

export function docTypeLabel(value: string | null | undefined): string {
  return DOC_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? "Documento";
}

export const STATUS_LABELS: Record<ChecklistStatus, string> = {
  missing: "Falta",
  pending: "Pendiente de revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export type StatusTone = "success" | "warning" | "destructive" | "outline-muted";

export function statusTone(status: ChecklistStatus | DocumentStatus): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "destructive";
    default:
      return "outline-muted";
  }
}

/** "1.2 MB" / "320 KB". */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Client-side file check before uploading; null when the file is acceptable. */
export function validateDocumentFile(file: File | null | undefined): string | null {
  if (!file) return "Selecciona un archivo.";
  const name = file.name.toLowerCase();
  const typeOk = (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(file.type);
  const extOk = ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => name.endsWith(ext));
  // Browsers sometimes report an empty MIME type: fall back to the extension.
  if (!(typeOk || (!file.type && extOk))) {
    return "Formato no permitido. Sube un PDF, JPG o PNG.";
  }
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_DOCUMENT_BYTES) return "El archivo supera el tamaño máximo de 5 MB.";
  return null;
}

export interface UploadFormValues {
  doc_type: DocumentType | "";
  file: File | null;
  title: string;
  insurer: string;
  policy_number: string;
  valid_from: string;
  valid_until: string;
}

export const emptyUploadForm = (docType: DocumentType | "" = ""): UploadFormValues => ({
  doc_type: docType,
  file: null,
  title: "",
  insurer: "",
  policy_number: "",
  valid_from: "",
  valid_until: "",
});

export type UploadFormErrors = Partial<Record<keyof UploadFormValues, string>>;

/** Validate the upload form; returns an empty object when it can be sent. */
export function validateUploadForm(values: UploadFormValues): UploadFormErrors {
  const errors: UploadFormErrors = {};
  if (!values.doc_type) errors.doc_type = "Selecciona el tipo de documento.";
  const fileError = validateDocumentFile(values.file);
  if (fileError) errors.file = fileError;
  if (values.title.length > 200) errors.title = "Máximo 200 caracteres.";
  if (
    values.doc_type === "sports_insurance" &&
    values.valid_from &&
    values.valid_until &&
    values.valid_until < values.valid_from
  ) {
    errors.valid_until = "La vigencia final no puede ser anterior a la inicial.";
  }
  return errors;
}

/** Build the API payload (insurance fields only for sports insurance). */
export function buildUploadPayload(values: UploadFormValues): DocumentUploadPayload {
  if (!values.doc_type || !values.file) throw new Error("Formulario incompleto");
  const payload: DocumentUploadPayload = { doc_type: values.doc_type, file: values.file };
  if (values.title.trim()) payload.title = values.title.trim();
  if (values.doc_type === "sports_insurance") {
    if (values.insurer.trim()) payload.insurer = values.insurer.trim();
    if (values.policy_number.trim()) payload.policy_number = values.policy_number.trim();
    if (values.valid_from) payload.valid_from = values.valid_from;
    if (values.valid_until) payload.valid_until = values.valid_until;
  }
  return payload;
}

/** Fallback checklist when the endpoint has no items yet (required docs, all missing). */
export const REQUIRED_DOC_TYPES: DocumentType[] = [
  "medical_certificate",
  "sports_insurance",
  "liability_waiver",
  "identity_document",
  "eps_certificate",
];

/**
 * Checklist computed from the document list — used when the checklist
 * endpoint returns no items. Same rule as the backend: a type counts with its
 * most recent non-rejected document (enrollment certificates count as
 * approved); only rejected ones → "rejected"; none → "missing".
 */
export function deriveChecklist(docs: AthleteDocument[]): ChecklistItem[] {
  return REQUIRED_DOC_TYPES.map((docType) => {
    const ofType = docs
      .filter((d) => d.doc_type === docType)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    const current = ofType.find((d) => d.status !== "rejected") ?? ofType[0];
    const status: ChecklistStatus = !current
      ? "missing"
      : current.source === "enrollment"
        ? "approved"
        : current.status;
    return {
      doc_type: docType,
      label: docTypeLabel(docType),
      required: true,
      status,
      document_id: current?.id ?? null,
    };
  });
}

/** Whether the uploaded document may be reviewed (not a legacy enrollment file). */
export function isReviewable(doc: AthleteDocument): boolean {
  return doc.source !== "enrollment" && typeof doc.id === "number";
}
