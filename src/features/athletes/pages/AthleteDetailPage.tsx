import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { athleteCategoryText } from "@/features/athletes/lib/athleteCategories";
import AthleteRecordsView from "@/features/athlete-documents/components/AthleteRecordsView";
import ConstanciaDownloadButton from "@/features/athlete-documents/components/ConstanciaDownloadButton";
import ResumeDownloadButton from "@/features/athlete-documents/components/ResumeDownloadButton";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Athlete } from "@/types/entities";

/** Admin athlete record: summary, documents (with review) and certificates. */
export default function AthleteDetailPage() {
  const { athleteId } = useParams();
  const id = Number(athleteId);
  const { handleError } = useApiErrorHandler();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    athletesApi
      .get(id)
      .then(setAthlete)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [id, handleError]);

  const back = (
    <Button asChild variant="outline">
      <Link to="/dashboard/deportistas">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
    </Button>
  );

  if (loading) return <Skeleton className="h-64 w-full" />;

  if (!athlete || !athlete.id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Deportista" eyebrow="Deportistas" actions={back} />
        <Card>
          <EmptyState icon={UserX} title="Deportista no encontrado" />
        </Card>
      </div>
    );
  }

  const facts = [
    { label: "Categoría", value: athleteCategoryText(athlete) ?? "Sin categoría" },
    { label: "Cinturón", value: athlete.belt_actual_name ?? "—" },
    { label: "Fecha de nacimiento", value: formatDateForDisplay(athlete.date_of_birth) },
    {
      label: "Ingreso",
      value: formatDateForDisplay(
        athlete.effective_join_date ?? athlete.join_date ?? athlete.created_at,
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={athlete.full_name}
        eyebrow="Ficha del deportista"
        description="Documentos, constancias de inscripción y hoja de vida deportiva."
        actions={
          <>
            {back}
            <ConstanciaDownloadButton athleteId={athlete.id} athleteName={athlete.full_name} />
            <ResumeDownloadButton athleteId={athlete.id} athleteName={athlete.full_name} />
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          {facts.map((f) => (
            <div key={f.label}>
              <p className="text-xs uppercase tracking-wider text-faint">{f.label}</p>
              <p className="mt-0.5 font-medium text-text">{f.value}</p>
            </div>
          ))}
          <div>
            <p className="text-xs uppercase tracking-wider text-faint">Estado</p>
            <Badge
              className="mt-1"
              variant={athlete.status === "active" ? "success" : "outline-muted"}
            >
              {athlete.status === "active" ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardContent>
      </Card>
      <AthleteRecordsView athleteId={athlete.id} athleteName={athlete.full_name} canReview />
    </div>
  );
}
