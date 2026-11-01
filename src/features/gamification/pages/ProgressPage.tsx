import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Medal, Users } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { gamificationApi } from "../api/gamificationApi";
import PracticeLogForm from "../components/PracticeLogForm";
import ProgressOverview from "../components/ProgressOverview";
import type { GamificationProfile } from "../types";

/** "Mi progreso" (sportsman) / per-child progress (parent) / any athlete (admin). */
export default function ProgressPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSportsman = role === "sportsman";
  const { handleError } = useApiErrorHandler();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!isSportsman && athleteId == null) {
      setProfile(null);
      return;
    }
    setLoading(true);
    gamificationApi
      .profile(isSportsman ? undefined : athleteId)
      .then(setProfile)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [isSportsman, athleteId, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={role === "parent" ? "Acudiente" : "Gamificación"}
        title={isSportsman ? "Mi progreso" : "Progreso del deportista"}
        description="Experiencia (XP), nivel, racha de entrenamiento, insignias y retos."
        actions={
          <Button asChild variant="outline">
            <Link to="/dashboard/clasificacion">
              <Medal className="h-4 w-4" />
              Clasificación
            </Link>
          </Button>
        }
      />

      {!isSportsman && (
        <AthletePicker className="sm:w-80" value={athleteId} onChange={setAthleteId} />
      )}

      {!isSportsman && athleteId == null ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Selecciona un deportista"
            description="Elige un deportista para ver su progreso."
          />
        </Card>
      ) : loading && !profile ? (
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : profile ? (
        <>
          <PracticeLogForm athleteId={isSportsman ? undefined : athleteId} onLogged={load} />
          <ProgressOverview profile={profile} />
        </>
      ) : null}
    </div>
  );
}
