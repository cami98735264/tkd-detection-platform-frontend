import { useEffect, useState } from "react";
import { ClipboardCheck, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { config } from "@/config/env";
import type { Enrollment } from "@/types/entities";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  dropped: "Retirado",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Activo</Badge>;
  if (status === "completed") return <Badge variant="outline">Completado</Badge>;
  if (status === "dropped") return <Badge variant="outline-muted">Retirado</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>;
}

export default function MyEnrollmentPage() {
  const { handleError } = useApiErrorHandler();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentsApi
      .getMyEnrollments()
      .then(setEnrollments)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi inscripción"
        description="Detalles de tus inscripciones a los programas de la academia."
        eyebrow="Mi entrenamiento"
      />

      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : enrollments.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Sin inscripciones activas"
            description="Cuando seas inscrito en un programa la información aparecerá aquí."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {enrollment.program_name ?? `Programa #${enrollment.program}`}
                  </span>
                  <StatusBadge status={enrollment.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-faint">
                      Fecha de inicio
                    </dt>
                    <dd className="mt-0.5 font-medium text-text">
                      {formatDateForDisplay(enrollment.start_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-faint">
                      Fecha de fin
                    </dt>
                    <dd className="mt-0.5 font-medium text-text">
                      {enrollment.end_date
                        ? formatDateForDisplay(enrollment.end_date)
                        : "—"}
                    </dd>
                  </div>
                  {enrollment.blood_type && (
                    <div>
                      <dt className="text-xs uppercase tracking-wider text-faint">
                        Tipo de sangre
                      </dt>
                      <dd className="mt-0.5 font-medium text-text">
                        {enrollment.blood_type}
                      </dd>
                    </div>
                  )}
                  {enrollment.notes && (
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wider text-faint">
                        Notas
                      </dt>
                      <dd className="mt-0.5 text-text">{enrollment.notes}</dd>
                    </div>
                  )}
                  {enrollment.certificado_medico_adjunto && (
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wider text-faint">
                        Certificado médico
                      </dt>
                      <dd className="mt-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `${config.apiUrl}/media/${enrollment.certificado_medico_adjunto}`,
                              "_blank",
                            )
                          }
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Ver certificado
                        </Button>
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
