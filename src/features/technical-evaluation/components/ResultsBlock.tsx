import { RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import EvaluationResultsView from "@/features/technical-evaluation/components/EvaluationResults";
import type { EvaluationSession } from "@/features/technical-evaluation/api/technicalEvaluationApi";

/** Results step: analysing spinner, metrics, or the failure state with retry. */
export interface ResultsBlockProps {
  loading: boolean;
  session: EvaluationSession | null;
  onReset: () => void;
  onRetry: () => void;
}

export default function ResultsBlock({ loading, session, onReset, onRetry }: ResultsBlockProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div>
            <p className="font-display text-base font-semibold tracking-tight text-text">
              Analizando patada…
            </p>
            <p className="mt-1 text-sm text-muted">
              Procesando video para calcular métricas de rendimiento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session?.results) {
    return <EvaluationResultsView results={session.results} />;
  }

  if (session?.status === "failed") {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="No se pudo procesar la evaluación"
          description={
            session.recommendations ||
            "Ocurrió un error al analizar la grabación. Intenta registrar la patada nuevamente."
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={onReset}>
                Nueva evaluación
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  return null;
}
