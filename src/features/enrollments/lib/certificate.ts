import type { Enrollment } from "@/types/entities";

/**
 * Fields the backend may use for the authenticated certificate download URL
 * (docs/api-contract-notes.md §4; the backend ships `certificado_medico_url`). The first non-empty one wins, so the UI
 * follows whatever name the API ships without another frontend change.
 */
export const CERTIFICATE_URL_FIELDS = [
  "certificado_medico_url",
  "certificado_medico_download_url",
  "medical_certificate_url",
  "certificate_url",
] as const;

type CertificateFields = Partial<Record<(typeof CERTIFICATE_URL_FIELDS)[number], string | null>>;

/**
 * URL to download an enrollment's medical certificate, or null when there is
 * none. Always fetched with the session cookies (src/lib/download.ts) — never
 * linked directly.
 *
 * Fallback for payloads from before the contract change: a non-URL
 * `certificado_medico_adjunto` is a storage path under /media/.
 */
export function certificateUrl(enrollment: Enrollment & CertificateFields): string | null {
  if (enrollment.has_certificado_medico === false) return null;
  for (const field of CERTIFICATE_URL_FIELDS) {
    const value = enrollment[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const legacy = enrollment.certificado_medico_adjunto?.trim();
  if (!legacy) return null;
  if (/^https?:\/\//i.test(legacy) || legacy.startsWith("/")) return legacy;
  return `/media/${legacy.replace(/^\/+/, "")}`;
}

/** Download filename used when the response has no Content-Disposition. */
export function certificateFilename(enrollment: Pick<Enrollment, "id">): string {
  return `certificado-medico-${enrollment.id}`;
}
