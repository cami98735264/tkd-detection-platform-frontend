/**
 * Normalise a list response: unpaginated endpoints answer with a bare array,
 * paginated ones with `{count, next, previous, results}`. Anything else (an
 * unexpected shape, an empty body) becomes an empty list instead of crashing
 * the page.
 */
export function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const results = (data as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }
  return [];
}

/** Build a query string from defined, non-empty params (leading "?" or ""). */
export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}
