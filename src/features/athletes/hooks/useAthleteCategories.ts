import { useEffect, useState } from "react";

import { athletesApi } from "@/features/athletes/api/athletesApi";
import {
  ATHLETE_CATEGORIES,
  type AthleteCategoryOption,
} from "@/features/athletes/lib/athleteCategories";

// Module-level cache: the catalogue is static, fetch it once per session.
let cache: AthleteCategoryOption[] | null = null;
let inflight: Promise<AthleteCategoryOption[]> | null = null;

/** Test hook: forget the cached catalogue. */
export function resetAthleteCategoriesCache(): void {
  cache = null;
  inflight = null;
}

/**
 * The 5 athlete categories from GET /athlete-categories/, starting with (and
 * falling back to) the static contract table so selects never render empty.
 */
export function useAthleteCategories(): AthleteCategoryOption[] {
  const [categories, setCategories] = useState<AthleteCategoryOption[]>(
    () => cache ?? [...ATHLETE_CATEGORIES],
  );

  useEffect(() => {
    if (cache) return;
    let alive = true;
    inflight ??= athletesApi.categories().then((list) => {
      cache = list;
      return list;
    });
    inflight
      .then((list) => {
        if (alive) setCategories(list);
      })
      .catch(() => {
        inflight = null; // keep the static fallback; retry on next mount
      });
    return () => {
      alive = false;
    };
  }, []);

  return categories;
}
