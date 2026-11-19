// Helpers for date-only API values ("YYYY-MM-DD", e.g. attendance `fecha`,
// birth dates). `new Date("2026-10-31")` parses them as UTC midnight, which in
// America/Bogota (UTC-5) is the previous day, and `toLocaleDateString()`
// follows the browser locale. These helpers never convert timezones.

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse "YYYY-MM-DD" as a local calendar date (midnight local time). */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  // Reject impossible dates such as 2026-02-31 (Date would roll them over).
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Format a date-only value exactly as received, as dd/mm/aaaa
 * ("2026-10-31" → "31/10/2026"), independent of timezone and locale.
 * Returns `fallback` for empty or malformed values.
 */
export function formatDateOnly(value: string | null | undefined, fallback = "—"): string {
  const date = parseDateOnly(value);
  if (!date) return fallback;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** Full years elapsed between a "YYYY-MM-DD" birth date and `today`. */
export function ageFromDateOnly(
  value: string | null | undefined,
  today: Date = new Date(),
): number | null {
  const birth = parseDateOnly(value);
  if (!birth) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}
