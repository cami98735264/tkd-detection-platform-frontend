import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell } from "lucide-react";
import { trainingsApi, type Training } from "@/features/trainings/api/trainingsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";

export default function MyTrainingsPage() {
  const { handleError } = useApiErrorHandler();
  const [enrollments, setEnrollments] = useState<{ program: number }[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      enrollmentsApi.getMyEnrollments(),
      trainingsApi.list(1),
    ])
      .then(([enrollRes, trainRes]) => {
        setEnrollments(enrollRes);
        const enrolledProgramIds = new Set(enrollRes.map((e) => e.program));
        setTrainings(trainRes.results.filter((t) => enrolledProgramIds.has(t.program)));
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entrenamientos</h1>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : trainings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-muted-foreground">
              No hay entrenamientos disponibles para tus programas inscritos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trainings.map((training) => (
            <Card key={training.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{training.nombre}</span>
                  <Badge variant="outline">{training.program_name}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{training.descripcion}</p>
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Fecha: </span>
                    <span className="font-medium">{formatDateForDisplay(training.fecha)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hora: </span>
                    <span className="font-medium">{training.time}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Atletas: </span>
                    <span className="font-medium">{training.numero_atletas}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}