import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import type { EvaluationResults } from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface EvaluationResultsProps {
  results: EvaluationResults;
}

export default function EvaluationResultsView({ results }: EvaluationResultsProps) {
  const scoreColor =
    results.overall_score >= 80
      ? "text-green-600"
      : results.overall_score >= 60
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="text-green-600" size={24} />
          Resultados de la Evaluación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center py-6 border-b">
          <p className="text-sm text-muted-foreground mb-2">Puntuación General</p>
          <div className={`text-7xl font-bold ${scoreColor}`}>
            {results.overall_score}
            <span className="text-3xl text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Ángulo" value={results.angle} unit="°" />
          <MetricCard label="Altura" value={results.height} unit="cm" />
          <MetricCard label="Velocidad" value={results.speed} unit="m/s" />
          <MetricCard label="Estabilidad" value={results.stability} unit="%" />
        </div>

        {/* Recommendations */}
        {results.recommendations && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-semibold mb-2">Recomendaciones</p>
            <p className="text-sm text-muted-foreground">{results.recommendations}</p>
          </div>
        )}

        <div className="flex gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
            Evaluación completada
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="p-4 border rounded-lg text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-sm text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  );
}