// ClubProfile (contract Addendum B.2): normalisation of the API body, the
// admin form model and the signature-file check.
import type { ClubProfile } from "@/types/entities";

import {
  normalizeTrainingDays,
  parseSessionHours,
  type Weekday,
} from "@/features/athletes/lib/athleteResume";

/** Signature upload limits — mirror the backend (PNG/JPG, ≤ 2 MB). */
export const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;
export const SIGNATURE_MIME_TYPES = ["image/png", "image/jpeg"] as const;
export const SIGNATURE_EXTENSIONS = [".png", ".jpg", ".jpeg"] as const;
export const SIGNATURE_ACCEPT = [...SIGNATURE_MIME_TYPES, ...SIGNATURE_EXTENSIONS].join(",");
export const SIGNATURE_ENDPOINT = "club-profile/signature/";

const TEXT_KEYS = [
  "name",
  "short_name",
  "recognition",
  "resolution",
  "league",
  "city",
  "legal_rep_name",
  "legal_rep_title_prefix",
  "legal_rep_role",
  "phone",
  "email",
] as const;

export type ClubProfileTextKey = (typeof TEXT_KEYS)[number];

/** Turn any API body into a ClubProfile (missing keys → blank defaults). */
export function normalizeClubProfile(data: unknown): ClubProfile {
  const src = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const text = (key: string) => (typeof src[key] === "string" ? (src[key] as string) : "");
  const hours = src.default_session_hours;
  const profile = {} as Record<ClubProfileTextKey, string>;
  for (const key of TEXT_KEYS) profile[key] = text(key);
  return {
    ...profile,
    include_signature: src.include_signature !== false,
    default_training_days: normalizeTrainingDays(src.default_training_days),
    default_session_hours: typeof hours === "number" || typeof hours === "string" ? hours : null,
    has_signature: src.has_signature === true,
    signature_url: typeof src.signature_url === "string" ? src.signature_url : null,
    updated_at: typeof src.updated_at === "string" ? src.updated_at : null,
  };
}

export interface ClubProfileFormValues extends Record<ClubProfileTextKey, string> {
  include_signature: boolean;
  default_training_days: Weekday[];
  default_session_hours: string;
}

export function toClubProfileForm(profile: ClubProfile): ClubProfileFormValues {
  const values = {} as Record<ClubProfileTextKey, string>;
  for (const key of TEXT_KEYS) values[key] = profile[key] ?? "";
  return {
    ...values,
    include_signature: profile.include_signature,
    default_training_days: normalizeTrainingDays(profile.default_training_days),
    default_session_hours:
      profile.default_session_hours === null ? "" : String(profile.default_session_hours),
  };
}

export type ClubProfileFormErrors = Partial<Record<keyof ClubProfileFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateClubProfileForm(values: ClubProfileFormValues): ClubProfileFormErrors {
  const errors: ClubProfileFormErrors = {};
  if (!values.name.trim()) errors.name = "El nombre del club es obligatorio.";
  if (!values.legal_rep_name.trim()) {
    errors.legal_rep_name = "El nombre del representante legal es obligatorio.";
  }
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) {
    errors.email = "Correo electrónico no válido.";
  }
  if (
    values.default_session_hours.trim() &&
    parseSessionHours(values.default_session_hours) === null
  ) {
    errors.default_session_hours = "Ingresa un número de horas entre 0,5 y 24.";
  }
  return errors;
}

export interface ClubProfileUpdatePayload extends Partial<Record<ClubProfileTextKey, string>> {
  include_signature?: boolean;
  default_training_days?: string[];
  default_session_hours?: number | null;
  remove_signature?: boolean;
}

/** JSON PATCH body with every editable field (trimmed). */
export function buildClubProfilePayload(values: ClubProfileFormValues): ClubProfileUpdatePayload {
  const payload: ClubProfileUpdatePayload = {};
  for (const key of TEXT_KEYS) payload[key] = values[key].trim();
  payload.include_signature = values.include_signature;
  payload.default_training_days = normalizeTrainingDays(values.default_training_days);
  payload.default_session_hours = parseSessionHours(values.default_session_hours);
  return payload;
}

/** Whether the form differs from the stored profile. */
export function isClubProfileDirty(values: ClubProfileFormValues, profile: ClubProfile): boolean {
  return (
    JSON.stringify(buildClubProfilePayload(values)) !==
    JSON.stringify(buildClubProfilePayload(toClubProfileForm(profile)))
  );
}

/** Client-side signature check; null when acceptable. */
export function validateSignatureFile(file: File | null | undefined): string | null {
  if (!file) return "Selecciona una imagen.";
  const name = file.name.toLowerCase();
  const typeOk = (SIGNATURE_MIME_TYPES as readonly string[]).includes(file.type);
  const extOk = SIGNATURE_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!(typeOk || (!file.type && extOk))) return "Formato no permitido. Sube una imagen PNG o JPG.";
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_SIGNATURE_BYTES) return "La imagen supera el tamaño máximo de 2 MB.";
  return null;
}
