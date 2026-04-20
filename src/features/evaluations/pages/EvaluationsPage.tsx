import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import EvaluationFormModal from "@/features/evaluations/components/EvaluationFormModal";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
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
    key: "metrics",
    header: "Métricas",
    render: (r) => `${r.metrics.length} métrica${r.metrics.length !== 1 ? "s" : ""}`,
  },
];

export default function EvaluationsPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const canWrite = user?.is_staff || user?.role === "administrator";

  const [data, setData] = useState<Evaluation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      evaluationsApi
        .list(p)
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: any) => {
    try {
      if (editing) {
        await evaluationsApi.update(editing.id, values);
        showToast({ title: "Evaluación actualizada", variant: "success" });
      } else {
        await evaluationsApi.create(values);
        showToast({ title: "Evaluación creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (evaluation: Evaluation) => {
    const ok = await confirm({
      title: "Eliminar evaluación",
      description: "¿Estás seguro de eliminar esta evaluación?",
    });
    if (!ok) return;
    try {
      await evaluationsApi.delete(evaluation.id);
      showToast({ title: "Evaluación eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Evaluaciones</h1>
        {canWrite && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} className="mr-2" /> Nueva
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={
              canWrite
                ? (row) => {
                    setEditing(row);
                    setModalOpen(true);
                  }
                : undefined
            }
            onDelete={canWrite ? handleDelete : undefined}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <EvaluationFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        evaluation={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
