import { Badge } from "@/components/ui/badge";
import FormModal from "@/components/common/FormModal";
import type { Evaluation } from "@/types/entities";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation: Evaluation | null;
}

export default function MetricsModal({ open, onOpenChange, evaluation }: Props) {
  if (!evaluation) return null;

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title="Métricas de la Evaluación">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Deportista: <span className="font-medium text-foreground">{evaluation.athlete_name}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Fecha: <span className="font-medium text-foreground">{new Date(evaluation.evaluated_at).toLocaleDateString()}</span>
          </p>
        </div>

        {evaluation.puntuacion_final != null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Puntaje final:</span>
            <Badge variant="default" className="text-lg px-3 py-1 bg-green-600">
              {evaluation.puntuacion_final}%
            </Badge>
          </div>
        )}

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Nombre</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Puntaje</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {evaluation.metrics.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-medium">{m.metric_name}</td>
                  <td className="px-4 py-2 text-center">
                    <Badge
                      variant="outline"
                      className={
                        m.score >= 80
                          ? "text-green-600 border-green-300"
                          : m.score >= 60
                          ? "text-yellow-600 border-yellow-300"
                          : "text-red-600 border-red-300"
                      }
                    >
                      {m.score}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{m.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <Badge variant="secondary">
            {evaluation.metrics.length} métrica{evaluation.metrics.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>
    </FormModal>
  );
}