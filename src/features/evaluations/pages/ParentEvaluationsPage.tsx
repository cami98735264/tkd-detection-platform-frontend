import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useAuthReady } from "@/features/auth/components/RoleRoute";
import type { Evaluation } from "@/types/entities";

const columns: Column<Evaluation>[] = [
  { key: "athlete_name", header: "Deportista" },
  { key: "evaluator_name", header: "Evaluador" },
  {
    key: "evaluated_at",
    header: "Fecha",
    render: (r) => new Date(r.evaluated_at).toLocaleDateString(),
  },
  { key: "result_summary", header: "Resumen" },
  {
    key: "puntuacion_final",
    header: "Puntaje",
    render: (r) =>
      r.puntuacion_final != null ? `${r.puntuacion_final}%` : "—",
  },
  {
    key: "metrics",
    header: "Métricas",
    render: (r) => `${r.metrics.length} métrica${r.metrics.length !== 1 ? "s" : ""}`,
  },
];

export default function ParentEvaluationsPage() {
  const { handleError } = useApiErrorHandler();
  const authReady = useAuthReady();
  const [data, setData] = useState<Evaluation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!authReady) return;
    mountedRef.current = true;
    setLoading(true);
    evaluationsApi
      .list(page)
      .then((res) => {
        if (!mountedRef.current) return;
        setData(res.results);
        setCount(res.count);
      })
      .catch((err) => {
        if (mountedRef.current) handleError(err);
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, authReady]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Evaluaciones de mis hijos</h1>

      <Card>
        <CardHeader>
          <CardTitle>Historial de evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} loading={loading} />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}