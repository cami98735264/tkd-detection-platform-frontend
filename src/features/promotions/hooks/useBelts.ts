import { useEffect, useState } from "react";

import { promotionsApi } from "../api/promotionsApi";
import type { BeltOption } from "../types";

/** Belt catalogue for the promotion selects (loaded once per mount). */
export function useBelts() {
  const [belts, setBelts] = useState<BeltOption[]>([]);
  useEffect(() => {
    let alive = true;
    promotionsApi
      .belts()
      .then((b) => {
        if (alive) setBelts(b);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return belts;
}
