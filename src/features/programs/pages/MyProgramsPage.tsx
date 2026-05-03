import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Enrollment } from "@/types/entities";

export default function MyProgramsPage() {
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

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis programas"
        description="Programas en los que estás inscrito actualmente."
        eyebrow="Mi entrenamiento"
      />

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : activeEnrollments.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Sin programas activos"
            description="Cuando seas inscrito en un programa aparecerá aquí."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeEnrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold tracking-tight">
                    {enrollment.program_name ?? `Programa #${enrollment.program}`}
                  </span>
                  <Badge variant="success">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted">
                  Inscrito desde:{" "}
                  <span className="font-medium text-text">
                    {formatDateForDisplay(enrollment.start_date)}
                  </span>
                </p>
                {enrollment.end_date && (
                  <p className="text-muted">
                    Hasta:{" "}
                    <span className="font-medium text-text">
                      {formatDateForDisplay(enrollment.end_date)}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
