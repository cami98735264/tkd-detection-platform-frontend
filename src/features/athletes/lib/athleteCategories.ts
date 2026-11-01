// Athlete categories (age/sport classification — NO weight). Contract:
// docs/listado-1-requirements-contract.md "Req 3". The club decides each
// athlete's category; the age table below is only a suggestion.

export type AthleteCategoryValue = "preinfantil" | "infantil" | "cadete" | "juvenil" | "mayores";

export interface AthleteCategoryOption {
  value: AthleteCategoryValue;
  label: string;
  /** Inclusive bounds on the age the athlete turns by Dec 31 (null = open). */
  min_age: number | null;
  max_age: number | null;
}

/** Static fallback used until (or if) GET /athlete-categories/ answers. */
export const ATHLETE_CATEGORIES: readonly AthleteCategoryOption[] = [
  { value: "preinfantil", label: "Preinfantiles", min_age: null, max_age: 7 },
  { value: "infantil", label: "Infantiles", min_age: 8, max_age: 11 },
  { value: "cadete", label: "Cadetes", min_age: 12, max_age: 14 },
  { value: "juvenil", label: "Juveniles", min_age: 15, max_age: 17 },
  { value: "mayores", label: "Mayores (sénior)", min_age: 18, max_age: null },
];

/** Parse a YYYY-MM-DD date (or ISO datetime) without timezone shifts. */
function birthYear(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) && year > 1900 ? year : null;
}

/** Age the athlete turns on Dec 31 of the reference year (sport-age rule). */
export function sportAge(dob: string | null | undefined, today: Date = new Date()): number | null {
  const year = birthYear(dob);
  if (year === null) return null;
  const age = today.getFullYear() - year;
  return age >= 0 ? age : null;
}

/** Suggested category for a birth date (null when the date is missing/invalid). */
export function suggestCategory(
  dob: string | null | undefined,
  today: Date = new Date(),
  categories: readonly AthleteCategoryOption[] = ATHLETE_CATEGORIES,
): AthleteCategoryValue | null {
  const age = sportAge(dob, today);
  if (age === null) return null;
  const match = categories.find(
    (c) => (c.min_age === null || age >= c.min_age) && (c.max_age === null || age <= c.max_age),
  );
  return match?.value ?? null;
}

/** Display label for a category value (falls back to the raw value). */
export function categoryLabel(
  value: string | null | undefined,
  categories: readonly AthleteCategoryOption[] = ATHLETE_CATEGORIES,
): string | null {
  if (!value) return null;
  return categories.find((c) => c.value === value)?.label ?? value;
}

/** Human description of a category's age range, e.g. "12 – 14 años". */
export function categoryAgeRange(c: Pick<AthleteCategoryOption, "min_age" | "max_age">): string {
  if (c.min_age === null && c.max_age !== null) return `hasta ${c.max_age} años`;
  if (c.max_age === null && c.min_age !== null) return `${c.min_age} años o más`;
  if (c.min_age !== null && c.max_age !== null) return `${c.min_age} – ${c.max_age} años`;
  return "todas las edades";
}

/** Keep only well-formed options from the API; empty → static fallback. */
export function normalizeCategories(raw: unknown): AthleteCategoryOption[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { results?: unknown }).results)
      ? (raw as { results: unknown[] }).results
      : [];
  const valid = list.filter(
    (c): c is AthleteCategoryOption =>
      !!c &&
      typeof c === "object" &&
      typeof (c as AthleteCategoryOption).value === "string" &&
      typeof (c as AthleteCategoryOption).label === "string",
  );
  return valid.length > 0
    ? valid.map((c) => ({
        value: c.value,
        label: c.label,
        min_age: c.min_age ?? null,
        max_age: c.max_age ?? null,
      }))
    : [...ATHLETE_CATEGORIES];
}

/** Category text of an athlete payload (label from the API, else from the table). */
export function athleteCategoryText(athlete: {
  category?: string | null;
  category_display?: string | null;
}): string | null {
  return athlete.category_display || categoryLabel(athlete.category);
}
