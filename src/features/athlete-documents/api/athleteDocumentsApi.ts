// Athlete documents (medical certificate, sports insurance, liability waiver),
// enrollment certificates and the athlete CV. Contract:
// docs/listado-1-requirements-contract.md — "Req 4 + 5", "Req 2", "Req 5 — Athlete CV".
// Every file goes through authenticated endpoints (src/lib/download.ts).
import { axiosInstance, http } from "@/lib/http";
import { downloadFile } from "@/lib/download";

export type DocumentType =
  | "medical_certificate"
  | "sports_insurance"
  | "liability_waiver"
  // Annexes of the official hoja de vida (contract Addendum B.6).
  | "identity_document"
  | "eps_certificate"
  | "other";

export type DocumentStatus = "pending" | "approved" | "rejected";

export type ChecklistStatus = "missing" | DocumentStatus;

export interface AthleteDocument {
  /** Numeric for uploaded documents; "enrollment-<id>" for legacy certificates. */
  id: number | string;
  athlete: number;
  athlete_name?: string;
  doc_type: DocumentType;
  doc_type_display?: string;
  title?: string;
  original_filename?: string;
  content_type?: string;
  size?: number | null;
  status: DocumentStatus;
  status_display?: string;
  review_notes?: string;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  uploaded_by?: number | null;
  uploaded_by_name?: string | null;
  insurer?: string;
  policy_number?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  source?: "document" | "enrollment";
  download_url?: string | null;
  can_delete?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistItem {
  doc_type: DocumentType;
  label: string;
  required: boolean;
  status: ChecklistStatus;
  document_id: number | string | null;
}

export interface DocumentsChecklist {
  athlete: number;
  items: ChecklistItem[];
  complete: boolean;
}

export interface DocumentUploadPayload {
  doc_type: DocumentType;
  file: File;
  title?: string;
  insurer?: string;
  policy_number?: string;
  valid_from?: string;
  valid_until?: string;
}

export interface DocumentReviewPayload {
  status: "approved" | "rejected";
  review_notes: string;
}

/** An enrollment that can be certified (GET /athletes/{id}/certificates/). */
export interface CertifiableEnrollment {
  enrollment_id: number;
  program_name: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | string;
  download_url: string;
  last_issued_at: string | null;
  last_code: string | null;
}

/** Unpaginated endpoints may still answer with a page object: accept both. */
function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

/** Filesystem-safe slug for download names ("Ana Gómez" → "ana-gomez"). */
export function fileSlug(text: string | null | undefined): string {
  const slug = (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "deportista";
}

export function documentDownloadPath(doc: Pick<AthleteDocument, "id" | "download_url">): string {
  return doc.download_url || `athlete-documents/${doc.id}/download/`;
}

export const athleteDocumentsApi = {
  list: (athleteId: number, docType?: DocumentType) =>
    http
      .get<unknown>(
        `/athletes/${athleteId}/documents/${docType ? `?doc_type=${encodeURIComponent(docType)}` : ""}`,
      )
      .then((data) => asList<AthleteDocument>(data)),

  checklist: (athleteId: number) =>
    http.get<DocumentsChecklist>(`/athletes/${athleteId}/documents/checklist/`).then((data) => ({
      athlete: data?.athlete ?? athleteId,
      items: Array.isArray(data?.items) ? data.items : [],
      complete: Boolean(data?.complete),
    })),

  upload: (athleteId: number, payload: DocumentUploadPayload) => {
    const form = new FormData();
    form.append("doc_type", payload.doc_type);
    form.append("file", payload.file);
    const optional = ["title", "insurer", "policy_number", "valid_from", "valid_until"] as const;
    for (const key of optional) {
      const value = payload[key]?.trim();
      if (value) form.append(key, value);
    }
    return axiosInstance
      .post<AthleteDocument>(`/athletes/${athleteId}/documents/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  get: (id: number | string) => http.get<AthleteDocument>(`/athlete-documents/${id}/`),

  remove: (id: number | string) => http.delete(`/athlete-documents/${id}/`),

  review: (id: number | string, payload: DocumentReviewPayload) =>
    http.post<AthleteDocument>(`/athlete-documents/${id}/review/`, payload),

  download: (doc: AthleteDocument) =>
    downloadFile(documentDownloadPath(doc), doc.original_filename || `documento-${String(doc.id)}`),

  /** Blank liability-waiver letter (optionally pre-filled for one athlete). */
  downloadWaiverTemplate: (athleteId?: number) =>
    downloadFile(
      `athlete-documents/waiver-template/${athleteId ? `?athlete_id=${athleteId}` : ""}`,
      "carta-exoneracion-responsabilidad.pdf",
    ),

  /** Athlete CV ("hoja de vida deportiva") PDF. */
  downloadResume: (athleteId: number, athleteName?: string) =>
    downloadFile(`athletes/${athleteId}/resume/`, `hoja-de-vida-${fileSlug(athleteName)}.pdf`),

  /**
   * Athlete-level "Constancia" PDF (official club model, Addendum B.4). Works
   * even without enrollments.
   */
  downloadConstancia: (athleteId: number, athleteName?: string) =>
    downloadFile(`athletes/${athleteId}/constancia/`, `constancia-${fileSlug(athleteName)}.pdf`),

  certificates: (athleteId: number) =>
    http
      .get<unknown>(`/athletes/${athleteId}/certificates/`)
      .then((data) => asList<CertifiableEnrollment>(data)),

  /** "Constancia de inscripción" PDF for one enrollment. */
  downloadCertificate: (cert: Pick<CertifiableEnrollment, "enrollment_id" | "download_url">) =>
    downloadFile(
      cert.download_url || `enrollments/${cert.enrollment_id}/enrollment-certificate/`,
      `constancia-inscripcion-${cert.enrollment_id}.pdf`,
    ),
};
