import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck } from "lucide-react";
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

export default function MyEnrollmentPage() {
  const { handleError } = useApiErrorHandler();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentsApi.getMyEnrollments()
      .then(setEnrollments)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mi Inscripción</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-muted-foreground">No tienes inscripciones activas.</p>
          </CardContent>
        </Card>
      ) : (
        enrollments.map((enrollment) => (
          <Card key={enrollment.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{enrollment.program_name ?? `Programa #${enrollment.program}`}</span>
                <Badge
                  variant={
                    enrollment.status === "active"
                      ? "default"
                      : enrollment.status === "completed"
                        ? "outline"
                        : "secondary"
                  }
                >
                  {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de inicio</p>
                  <p className="font-medium">{formatDateForDisplay(enrollment.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de fin</p>
                  <p className="font-medium">
                    {enrollment.end_date ? formatDateForDisplay(enrollment.end_date) : "—"}
                  </p>
                </div>
                {enrollment.blood_type && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de sangre</p>
                    <p className="font-medium">{enrollment.blood_type}</p>
                  </div>
                )}
                {enrollment.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="font-medium">{enrollment.notes}</p>
                  </div>
                )}
                {enrollment.certificado_medico_adjunto && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Certificado médico</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `${config.apiUrl}/media/${enrollment.certificado_medico_adjunto}`,
                          "_blank"
                        )
                      }
                    >
                      Ver certificado
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}