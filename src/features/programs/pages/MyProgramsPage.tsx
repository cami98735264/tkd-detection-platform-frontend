import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Enrollment } from "@/types/entities";

export default function MyProgramsPage() {
  const { handleError } = useApiErrorHandler();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    enrollmentsApi.getMyEnrollments()
      .then(setEnrollments)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mis Programas</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : activeEnrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-muted-foreground">No estás inscrito en ningún programa.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeEnrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{enrollment.program_name ?? `Programa #${enrollment.program}`}</span>
                  <Badge variant="default">Activo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Inscrito desde: {formatDateForDisplay(enrollment.start_date)}
                </p>
                {enrollment.end_date && (
                  <p className="text-sm text-muted-foreground">
                    Hasta: {formatDateForDisplay(enrollment.end_date)}
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