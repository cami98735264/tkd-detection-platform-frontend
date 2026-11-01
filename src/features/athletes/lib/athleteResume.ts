// "Hoja de vida" fields of the athlete record (contract Addendum B.3): option
// lists, form state, conversion from the API record and the write payload.
import type {
  Athlete,
  AthleteGender,
  BloodGroup,
  IdDocumentType,
  RhFactor,
} from "@/types/entities";

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

export const GENDER_OPTIONS: Option<Exclude<AthleteGender, "">>[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
];

export const ID_DOCUMENT_TYPE_OPTIONS: Option<Exclude<IdDocumentType, "">>[] = [
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "RC", label: "Registro Civil" },
  { value: "CE", label: "Cédula de Extranjería" },
];

export const BLOOD_GROUP_OPTIONS: Option<Exclude<BloodGroup, "">>[] = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
];

export const RH_FACTOR_OPTIONS: Option<Exclude<RhFactor, "">>[] = [
  { value: "+", label: "Positivo (+)" },
  { value: "-", label: "Negativo (−)" },
];

/** Spanish weekday names as the backend stores them, Monday first. */
export const WEEKDAYS = [
  { value: "lunes", label: "Lunes", short: "Lun" },
  { value: "martes", label: "Martes", short: "Mar" },
  { value: "miércoles", label: "Miércoles", short: "Mié" },
  { value: "jueves", label: "Jueves", short: "Jue" },
  { value: "viernes", label: "Viernes", short: "Vie" },
  { value: "sábado", label: "Sábado", short: "Sáb" },
  { value: "domingo", label: "Domingo", short: "Dom" },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]["value"];

/** Accent/case-insensitive key ("Sabado" ≡ "sábado"). */
function dayKey(day: string): string {
  return day
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Canonical weekday list: known names only (accent/case tolerant), no
 * duplicates, Monday-first order. Anything else is dropped.
 */
export function normalizeTrainingDays(days: unknown): Weekday[] {
  if (!Array.isArray(days)) return [];
  const wanted = new Set(days.filter((d): d is string => typeof d === "string").map(dayKey));
  return WEEKDAYS.filter((d) => wanted.has(dayKey(d.value))).map((d) => d.value);
}

/** Add/remove one weekday keeping the canonical order. */
export function toggleTrainingDay(days: readonly string[], day: string, on: boolean): Weekday[] {
  const rest = days.filter((d) => dayKey(d) !== dayKey(day));
  return normalizeTrainingDays(on ? [...rest, day] : rest);
}

/** "martes, jueves y sábado" (empty string for no days). */
export function formatTrainingDays(days: readonly string[] | null | undefined): string {
  const list = normalizeTrainingDays(days ?? []);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} y ${list[list.length - 1]}`;
}

export function optionLabel(options: readonly Option[], value: string | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? "";
}

/** Form state of the "Hoja de vida" section — everything as strings except the days. */
export interface AthleteResumeState {
  gender: AthleteGender;
  document_type: IdDocumentType;
  document_number: string;
  birth_place: string;
  civil_status: string;
  eps: string;
  blood_group: BloodGroup;
  rh_factor: RhFactor;
  allergies: string;
  address: string;
  phone: string;
  mother_name: string;
  mother_occupation: string;
  mother_phone: string;
  father_name: string;
  father_occupation: string;
  father_phone: string;
  join_date: string;
  training_days: Weekday[];
  session_hours: string;
}

export type AthleteResumeTextField = Exclude<
  keyof AthleteResumeState,
  "training_days" | "join_date" | "session_hours"
>;

const TEXT_FIELDS: AthleteResumeTextField[] = [
  "gender",
  "document_type",
  "document_number",
  "birth_place",
  "civil_status",
  "eps",
  "blood_group",
  "rh_factor",
  "allergies",
  "address",
  "phone",
  "mother_name",
  "mother_occupation",
  "mother_phone",
  "father_name",
  "father_occupation",
  "father_phone",
];

export const RESUME_FIELDS: (keyof AthleteResumeState)[] = [
  ...TEXT_FIELDS,
  "join_date",
  "training_days",
  "session_hours",
];

export const emptyAthleteResume = (): AthleteResumeState => ({
  gender: "",
  document_type: "",
  document_number: "",
  birth_place: "",
  civil_status: "",
  eps: "",
  blood_group: "",
  rh_factor: "",
  allergies: "",
  address: "",
  phone: "",
  mother_name: "",
  mother_occupation: "",
  mother_phone: "",
  father_name: "",
  father_occupation: "",
  father_phone: "",
  join_date: "",
  training_days: [],
  session_hours: "",
});

function pick<V extends string>(options: readonly Option<V>[], value: unknown): V | "" {
  return options.some((o) => o.value === value) ? (value as V) : "";
}

/** Form state from an athlete record (only the stored values, never the `effective_*` ones). */
export function resumeFromAthlete(
  athlete: Partial<Athlete> | null | undefined,
): AthleteResumeState {
  const base = emptyAthleteResume();
  if (!athlete) return base;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...base,
    gender: pick(GENDER_OPTIONS, athlete.gender),
    document_type: pick(ID_DOCUMENT_TYPE_OPTIONS, athlete.document_type),
    document_number: text(athlete.document_number),
    birth_place: text(athlete.birth_place),
    civil_status: text(athlete.civil_status),
    eps: text(athlete.eps),
    blood_group: pick(BLOOD_GROUP_OPTIONS, athlete.blood_group),
    rh_factor: pick(RH_FACTOR_OPTIONS, athlete.rh_factor),
    allergies: text(athlete.allergies),
    address: text(athlete.address),
    phone: text(athlete.phone),
    mother_name: text(athlete.mother_name),
    mother_occupation: text(athlete.mother_occupation),
    mother_phone: text(athlete.mother_phone),
    father_name: text(athlete.father_name),
    father_occupation: text(athlete.father_occupation),
    father_phone: text(athlete.father_phone),
    join_date: text(athlete.join_date).slice(0, 10),
    training_days: normalizeTrainingDays(athlete.training_days),
    session_hours:
      athlete.session_hours === null || athlete.session_hours === undefined
        ? ""
        : String(athlete.session_hours),
  };
}

/** Write shape of the B.3 fields (all optional). */
export interface AthleteResumePayload {
  gender?: AthleteGender;
  document_type?: IdDocumentType;
  document_number?: string;
  birth_place?: string;
  civil_status?: string;
  eps?: string;
  blood_group?: BloodGroup;
  rh_factor?: RhFactor;
  allergies?: string;
  address?: string;
  phone?: string;
  mother_name?: string;
  mother_occupation?: string;
  mother_phone?: string;
  father_name?: string;
  father_occupation?: string;
  father_phone?: string;
  join_date?: string | null;
  training_days?: string[];
  /** Decimal hours (the API may echo it back as a string). */
  session_hours?: number | string | null;
}

/** Session hours as a number (0.5 ≤ h ≤ 24, one decimal), or null when blank/invalid. */
export function parseSessionHours(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0.5 || n > 24) return null;
  return Math.round(n * 10) / 10;
}

export type AthleteResumeErrors = Partial<Record<keyof AthleteResumeState, string>>;

/** Client-side checks; empty object when the section can be sent. */
export function validateAthleteResume(state: AthleteResumeState): AthleteResumeErrors {
  const errors: AthleteResumeErrors = {};
  if (state.session_hours.trim() && parseSessionHours(state.session_hours) === null) {
    errors.session_hours = "Ingresa un número de horas entre 0,5 y 24.";
  }
  if (state.join_date && !/^\d{4}-\d{2}-\d{2}$/.test(state.join_date)) {
    errors.join_date = "Fecha no válida.";
  }
  return errors;
}

function normalizedValue(state: AthleteResumeState, field: keyof AthleteResumeState) {
  switch (field) {
    case "join_date":
      return state.join_date || null;
    case "training_days":
      return normalizeTrainingDays(state.training_days);
    case "session_hours":
      return parseSessionHours(state.session_hours);
    default:
      return state[field].trim();
  }
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

/**
 * Payload of the B.3 fields, safe for backends that do not know them yet:
 * empty values are omitted, so a create never sends blank fields. When
 * `previous` (the stored record) is given — edit mode — a field that had a
 * value and is now cleared IS sent blank ("" / null / []) so it gets erased.
 */
export function buildResumePayload(
  state: AthleteResumeState,
  previous?: AthleteResumeState | null,
): AthleteResumePayload {
  const payload: Record<string, unknown> = {};
  for (const field of RESUME_FIELDS) {
    const value = normalizedValue(state, field);
    const hadValue = previous ? !isEmptyValue(normalizedValue(previous, field)) : false;
    if (!isEmptyValue(value) || hadValue) payload[field] = value;
  }
  return payload as AthleteResumePayload;
}

/** Whether any B.3 field holds a value (used to open the section by default). */
export function hasResumeData(state: AthleteResumeState): boolean {
  return RESUME_FIELDS.some((f) => !isEmptyValue(normalizedValue(state, f)));
}

/** Map backend field errors (`{field: [msg]}`) onto the B.3 fields. */
export function extractResumeErrors(
  fields: Record<string, string[]> | null | undefined,
): AthleteResumeErrors {
  const errors: AthleteResumeErrors = {};
  if (!fields) return errors;
  for (const field of RESUME_FIELDS) {
    const message = fields[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}
