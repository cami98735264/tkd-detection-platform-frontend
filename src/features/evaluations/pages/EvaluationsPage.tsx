import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import EvaluationFormModal from "@/features/evaluations/components/EvaluationFormModal";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
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

export default function EvaluationsPage() {
  const { isAdmin, hasRole } = usePermissions();
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdminUser = isAdmin();
  const isParent = hasRole(["parent"]);

  const [data, setData] = useState<Evaluation[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);

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

  const actions: RowAction<Evaluation>[] = isAdminUser
    ? [
        {
          id: "edit",
          label: "Editar",
          icon: Pencil,
          variant: "ghost",
          onClick: (row) => {
            setEditing(row);
            setModalOpen(true);
          },
        },
        {
          id: "delete",
          label: "Eliminar",
          icon: Trash2,
          variant: "destructive",
          onClick: handleDelete,
        },
      ]
    : [];

  return (
    <ListPageTemplate
      title="Evaluaciones"
      description="Registro de evaluaciones técnicas y de desempeño de los deportistas."
      eyebrow="Operación"
      primaryAction={
        isAdminUser ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva evaluación
          </Button>
        ) : undefined
      }
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
        description: isAdminUser
          ? "Crea la primera evaluación para registrar el desempeño de un deportista."
          : "Las evaluaciones que recibas aparecerán aquí.",
        action: isAdminUser ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear evaluación
          </Button>
        ) : undefined,
      }}
      pagination={isParent ? undefined : { count, page, onChange: setPage }}
      formSheet={
        isAdminUser && (
          <EvaluationFormModal
            open={modalOpen}
            onOpenChange={(v) => {
              setModalOpen(v);
              if (!v) setEditing(null);
            }}
            evaluation={editing}
            onSubmit={handleSubmit}
          />
        )
      }
    />
  );
}
