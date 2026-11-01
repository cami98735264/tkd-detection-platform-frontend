import { useEffect, useState } from "react";
import { UserX } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import type { Athlete } from "@/types/entities";

import AthleteRecordsView from "../components/AthleteRecordsView";
import ResumeDownloadButton from "../components/ResumeDownloadButton";

/** Sportsman: own documents, enrollment certificates and CV. */
export default function MyDocumentsPage() {
  const { handleError } = useApiErrorHandler();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    athletesApi
      .getMe()
      .then(setAthlete)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis documentos"
        eyebrow="Mi entrenamiento"
        description="Carga tu certificado médico, seguro deportivo y carta de exoneración; descarga tus constancias y tu hoja de vida deportiva."
        actions={
          athlete?.id ? (
            <ResumeDownloadButton athleteId={athlete.id} athleteName={athlete.full_name} />
          ) : undefined
        }
      />
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : athlete?.id ? (
        <AthleteRecordsView athleteId={athlete.id} athleteName={athlete.full_name} />
      ) : (
        <Card>
          <EmptyState
            icon={UserX}
            title="Tu cuenta no tiene un deportista asociado"
            description="Contacta a la administración del club."
          />
        </Card>
      )}
    </div>
  );
}
