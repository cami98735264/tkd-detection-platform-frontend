import { ApiError } from "@/types/api";
import type { AthleteRegistrationPayload } from "@/features/athletes/api/athletesApi";

/**
 * Two reusable subforms — `AthletePersonalDataSection` and `ParentAccountSection` —
 * are shared between the standalone deportista registration sheet and the
 * inscripción wizard. The state shape, validators, and payload builder live
 * here so both consumers share a single source of truth.
 */

export type AccountMode = "link" | "create";

export interface AthletePersonalDataState {
  full_name: string;
  date_of_birth: string;
  belt_actual: string;
  categoria_competencia: string;
  height_cm: string;
  status: string;
  sportsman_mode: AccountMode;
  sportsman_user_id: number | null;
  sportsman_email: string;
  sportsman_password: string;
}

export interface ParentAccountState {
  parent_relationship: string;
  parent_mode: AccountMode;
  parent_user_id: number | null;
  parent_email: string;
  parent_password: string;
  parent_full_name: string;
}

export const emptyAthletePersonalData = (): AthletePersonalDataState => ({
  full_name: "",
  date_of_birth: "",
  belt_actual: "",
  categoria_competencia: "",
  height_cm: "",
  status: "active",
  sportsman_mode: "link",
  sportsman_user_id: null,
  sportsman_email: "",
  sportsman_password: "",
});

export const emptyParentAccount = (): ParentAccountState => ({
  parent_relationship: "",
  parent_mode: "link",
  parent_user_id: null,
  parent_email: "",
  parent_password: "",
  parent_full_name: "",
});

export function isAthletePersonalDataValid(
  data: AthletePersonalDataState,
  options: { requireAccount?: boolean } = {},
): boolean {
  if (!data.full_name.trim()) return false;
  if (!data.date_of_birth) return false;
  if (!options.requireAccount) return true;
  if (data.sportsman_mode === "link") return data.sportsman_user_id !== null;
  return data.sportsman_email.trim() !== "" && data.sportsman_password !== "";
}

export function isParentAccountValid(data: ParentAccountState): boolean {
  if (!data.parent_relationship) return false;
  if (data.parent_mode === "link") return data.parent_user_id !== null;
  return (
    data.parent_full_name.trim() !== "" &&
    data.parent_email.trim() !== "" &&
    data.parent_password !== ""
  );
}

export function buildRegistrationPayload(
  athlete: AthletePersonalDataState,
  parent: ParentAccountState | null,
): AthleteRegistrationPayload {
  const payload: AthleteRegistrationPayload = {
    full_name: athlete.full_name.trim(),
    date_of_birth: athlete.date_of_birth || null,
    categoria_competencia: athlete.categoria_competencia
      ? Number(athlete.categoria_competencia)
      : null,
    belt_actual: athlete.belt_actual ? Number(athlete.belt_actual) : null,
    height_cm: athlete.height_cm.trim() ? athlete.height_cm.trim() : null,
    status: athlete.status,
  };

  if (athlete.sportsman_mode === "link") {
    payload.sportsman_user_id = athlete.sportsman_user_id;
  } else {
    payload.sportsman_email = athlete.sportsman_email.trim();
    payload.sportsman_password = athlete.sportsman_password;
  }

  if (parent) {
    payload.parent_relationship = parent.parent_relationship as
      | "mother"
      | "father"
      | "guardian";
    if (parent.parent_mode === "link") {
      payload.parent_user_id = parent.parent_user_id;
    } else {
      payload.parent_full_name = parent.parent_full_name.trim();
      payload.parent_email = parent.parent_email.trim();
      payload.parent_password = parent.parent_password;
    }
  }

  return payload;
}

export function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export const RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Madre" },
  { value: "father", label: "Padre" },
  { value: "guardian", label: "Acudiente" },
];

export const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

/* -------------------------------------------------------------------------- */
/*                          API error extraction                              */
/* -------------------------------------------------------------------------- */

export type AthleteFieldErrors = Partial<{
  full_name: string;
  date_of_birth: string;
  sportsman_email: string;
  sportsman_password: string;
  sportsman_user_id: string;
}>;

export type ParentFieldErrors = Partial<{
  parent_relationship: string;
  parent_email: string;
  parent_password: string;
  parent_full_name: string;
  parent_user_id: string;
}>;

interface Extracted<E> {
  errors: E;
  /** True when the email field carries the `user_exists` programmatic code. */
  emailExists: boolean;
}

function firstMessage(fields: Record<string, string[]> | null, key: string): string | undefined {
  return fields?.[key]?.[0];
}

export function extractAthleteErrors(err: unknown): Extracted<AthleteFieldErrors> {
  if (!(err instanceof ApiError)) return { errors: {}, emailExists: false };
  const f = err.fields;
  return {
    errors: {
      full_name: firstMessage(f, "full_name"),
      date_of_birth: firstMessage(f, "date_of_birth"),
      sportsman_email: firstMessage(f, "sportsman_email"),
      sportsman_password: firstMessage(f, "sportsman_password"),
      sportsman_user_id: firstMessage(f, "sportsman_user_id"),
    },
    emailExists: err.hasFieldCode("sportsman_email", "user_exists"),
  };
}

export function extractParentErrors(err: unknown): Extracted<ParentFieldErrors> {
  if (!(err instanceof ApiError)) return { errors: {}, emailExists: false };
  const f = err.fields;
  return {
    errors: {
      parent_relationship: firstMessage(f, "parent_relationship"),
      parent_email: firstMessage(f, "parent_email"),
      parent_password: firstMessage(f, "parent_password"),
      parent_full_name: firstMessage(f, "parent_full_name"),
      parent_user_id: firstMessage(f, "parent_user_id"),
    },
    emailExists: err.hasFieldCode("parent_email", "user_exists"),
  };
}
