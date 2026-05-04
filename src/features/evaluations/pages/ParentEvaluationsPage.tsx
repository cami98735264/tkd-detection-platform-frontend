import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { BarChart2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import MetricsModal from "@/features/evaluations/components/MetricsModal";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { useAuthReady } from "@/features/auth/components/RoleRoute";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import type { Evaluation } from "@/types/entities";

const columns: Column<Evaluation>[] = [
  {
    key: "athlete_name",
    header: "Deportista",
    render: (r) => <span className="font-medium text-text">{r.athlete_name}</span>,
  },
  {
    key: "evaluator_name",
    header: "Evaluador",
    hideOnMobile: true,
  },
  {
    key: "evaluated_at",
    header: "Fecha",
    render: (r) => new Date(r.evaluated_at).toLocaleDateString(),
  },
  {
    key: "result_summary",
    header: "Resumen",
    hideOnMobile: true,
    render: (r) => (
      <span className="text-muted line-clamp-1">{r.result_summary || "—"}</span>
    ),
  },
  {
    key: "metrics",
    header: "Métricas",
    render: (r) => (
      <Badge variant="outline">
        {r.metrics.length} métrica{r.metrics.length !== 1 ? "s" : ""}
      </Badge>
    ),
  },
];

export default function ParentEvaluationsPage() {
  const { handleError } = useApiErrorHandler();
  const authReady = useAuthReady();

  const [data, setData] = useState<Evaluation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewingMetrics, setViewingMetrics] = useState<Evaluation | null>(null);

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    evaluationsApi
      .list(p)
      .then((res) => {
        setData(res.results);
        setCount(res.count);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authReady) return;
    fetchData(page);
  }, [page, fetchData, authReady]);

  const actions: RowAction<Evaluation>[] = [
    {
      id: "viewMetrics",
      label: "Ver métricas",
      icon: BarChart2,
      variant: "outline",
      onClick: (row) => setViewingMetrics(row),
    },
  ];

  return (
    <ListPageTemplate
      title="Evaluaciones de mis hijos"
      description="Historial de evaluaciones técnicas y de desempeño de tus hijos."
      eyebrow="Acudiente"
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(r) => r.id}
      rowActions={actions}
      mobileCard={(r) => (
        <div className="space-y-1">
          <p className="font-medium text-text">{r.athlete_name}</p>
          <p className="text-xs text-muted">
            {r.evaluator_name} · {new Date(r.evaluated_at).toLocaleDateString()}
          </p>
          {r.result_summary && (
            <p className="text-xs text-faint line-clamp-2">{r.result_summary}</p>
          )}
        </div>
      )}
      empty={{
        icon: ClipboardCheck,
        title: "Sin evaluaciones",
        description: "Las evaluaciones de tus hijos aparecerán aquí.",
      }}
      pagination={{ count, page, onChange: setPage }}
      formSheet={
        <MetricsModal
          open={!!viewingMetrics}
          onOpenChange={(v) => { if (!v) setViewingMetrics(null); }}
          evaluation={viewingMetrics}
        />
      }
    />
  );
}
