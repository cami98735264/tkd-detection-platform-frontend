import { useEffect, useState } from "react";
import { Dumbbell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { trainingsApi, type Training } from "@/features/trainings/api/trainingsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";

export default function MyTrainingsPage() {
  const { handleError } = useApiErrorHandler();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([enrollmentsApi.getMyEnrollments(), trainingsApi.list(1)])
      .then(([enrollRes, trainRes]) => {
        const enrolledProgramIds = new Set(enrollRes.map((e) => e.program));
        setTrainings(
          trainRes.results.filter((t) => enrolledProgramIds.has(t.program)),
        );
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrenamientos"
        description="Sesiones programadas en los programas a los que estás inscrito."
        eyebrow="Mi entrenamiento"
      />

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Dumbbell}
            title="Sin entrenamientos disponibles"
            description="Cuando se programen sesiones para tus programas inscritos aparecerán aquí."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainings.map((training) => (
            <Card key={training.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {training.nombre}
                  </span>
                  <Badge variant="outline">{training.program_name}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {training.descripcion && (
                  <p className="text-sm text-muted">{training.descripcion}</p>
                )}
                <dl className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <dt className="text-faint">Fecha</dt>
                    <dd className="font-medium text-text">
                      {formatDateForDisplay(training.fecha)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-faint">Hora</dt>
                    <dd className="font-medium text-text">{training.time}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Atletas</dt>
                    <dd className="font-medium text-text">{training.numero_atletas}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
