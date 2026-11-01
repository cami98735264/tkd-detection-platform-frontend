import { useCallback, useEffect, useState } from "react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { technicalEvaluationApi } from "@/features/technical-evaluation/api/technicalEvaluationApi";

/**
 * Video-recording consent, same rules as the kick module (the backend reuses
 * TechEvalConsent for Poomsae attempts):
 * - sportsman: own consent; minors need it granted by a parent;
 * - parent: per-child consent, grantable from here;
 * - administrator: enforced server side only.
 */
export type ConsentState =
  | "loading"
  | "granted"
  | "needs_self" // adult sportsman must accept (ConsentStep)
  | "needs_parent" // minor sportsman: a parent must grant it
  | "needs_parent_grant"; // parent viewing a child without consent

export function useRecordingConsent(athleteId: number | null) {
  const role = useAuthStore((s) => s.user?.role);
  const [state, setState] = useState<ConsentState>("loading");

  const refresh = useCallback(async () => {
    if (role === "administrator") {
      setState("granted");
      return;
    }
    try {
      if (role === "parent") {
        if (athleteId == null) {
          setState("loading");
          return;
        }
        const data = await technicalEvaluationApi.getConsent();
        const row = Array.isArray(data) ? data.find((c) => c.athlete_id === athleteId) : null;
        setState(row?.consent_granted ? "granted" : "needs_parent_grant");
        return;
      }
      const data = await technicalEvaluationApi.getConsent();
      const status = Array.isArray(data) ? null : data;
      if (status?.consent_granted) setState("granted");
      else if (status?.requires_parent_consent) setState("needs_parent");
      else setState("needs_self");
    } catch {
      setState(role === "parent" ? "needs_parent_grant" : "needs_self");
    }
  }, [role, athleteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Parent grants consent for the selected child. */
  const grantForChild = useCallback(async () => {
    if (athleteId == null) return;
    await technicalEvaluationApi.setConsent(true, athleteId);
    setState("granted");
  }, [athleteId]);

  return { state, refresh, grantForChild, markGranted: () => setState("granted") };
}
