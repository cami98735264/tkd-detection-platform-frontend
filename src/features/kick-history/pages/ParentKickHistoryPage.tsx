import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EvaluationHistory from "@/features/technical-evaluation/components/EvaluationHistory";
import { technicalEvaluationApi } from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { Link } from "react-router-dom";

interface AthleteConsent {
  athlete_id: number;
  athlete_name: string;
  consent_granted: boolean;
}

export default function ParentKickHistoryPage() {
  const { handleError } = useApiErrorHandler();
  const [linkedMinors, setLinkedMinors] = useState<AthleteConsent[]>([]);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [selectedChild, setSelectedChild] = useState<AthleteConsent | null>(null);

  useEffect(() => {
    technicalEvaluationApi
      .getConsent()
      .then((data: any) => {
        if (Array.isArray(data)) {
          setLinkedMinors(data);
          if (data.length === 1) {
            setSelectedChild(data[0]);
          }
        }
      })
      .catch(handleError)
      .finally(() => setLoadingConsent(false));
  }, [handleError]);

  const authorizedMinors = linkedMinors.filter((m) => m.consent_granted);

  const handleSelectChild = useCallback((minor: AthleteConsent) => {
    setSelectedChild((prev) =>
      prev?.athlete_id === minor.athlete_id ? null : minor,
    );
  }, []);

  if (loadingConsent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Historial de patadas"
          description="Consulta el historial de patadas registradas de tus deportistas vinculados."
          eyebrow="Acudiente"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
        </div>
      </div>
    );
  }

  if (linkedMinors.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Historial de patadas"
          description="Consulta el historial de patadas registradas de tus deportistas vinculados."
          eyebrow="Acudiente"
        />
        <Card>
          <EmptyState
            icon={Users}
            title="Sin deportistas vinculados"
            description="Cuando un administrador vincule un deportista a tu cuenta, podrás ver su historial de patadas aquí."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de patadas"
        description="Consulta el historial de patadas registradas de tus deportistas vinculados."
        eyebrow="Acudiente"
        actions={
          authorizedMinors.length > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/evaluacion-tecnica">
                <Camera className="h-4 w-4" />
                Nueva evaluación
              </Link>
            </Button>
          )
        }
      />

      {authorizedMinors.length > 1 && !selectedChild && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-sm text-muted">Selecciona un deportista:</p>
            <div className="flex flex-wrap gap-2">
              {authorizedMinors.map((minor) => (
                <button
                  key={minor.athlete_id}
                  type="button"
                  onClick={() => handleSelectChild(minor)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm transition-interactive hover:border-primary/40 hover:bg-primary/5"
                >
                  <span>{minor.athlete_name}</span>
                  <Badge variant="success" className="text-xs">Autorizado</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {authorizedMinors.length > 1 && selectedChild && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">Mostrando:</span>
          <Badge variant="default">{selectedChild.athlete_name}</Badge>
          <button
            type="button"
            onClick={() => setSelectedChild(null)}
            className="text-xs text-muted underline hover:text-text"
          >
            Cambiar
          </button>
        </div>
      )}

      {(authorizedMinors.length === 1 || selectedChild) && (
        <EvaluationHistory
          athleteId={
            selectedChild
              ? selectedChild.athlete_id
              : authorizedMinors[0].athlete_id
          }
          childName={
            selectedChild
              ? selectedChild.athlete_name
              : authorizedMinors[0].athlete_name
          }
          eyebrow="Acudiente"
        />
      )}

      {authorizedMinors.length === 0 && (
        <Card>
          <EmptyState
            icon={ClipboardCheck}
            title="Sin autorización"
            description="No tienes deportistas autorizados para ver su historial de patadas. Autoriza a un deportista desde la sección de Evaluación técnica."
          />
        </Card>
      )}
    </div>
  );
}
