import { useCallback, useEffect, useState } from "react";
import { Dumbbell, Pencil, Plus, Trash2, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import TrainingFormModal from "@/features/trainings/components/TrainingFormModal";
import { trainingsApi, type Training } from "@/features/trainings/api/trainingsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useAuthStore } from "@/features/auth/store/authStore";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

const columns: Column<Training>[] = [
  {
    key: "program_name",
    header: "Programa",
    render: (r) => <span className="font-medium text-text">{r.program_name}</span>,
  },
  {
    key: "nombre",
    header: "Tipo",
    render: (r) => <Badge variant="outline-muted">{r.nombre}</Badge>,
  },
  {
    key: "descripcion",
    header: "Descripción",
    hideOnMobile: true,
    render: (r) => (
      <span className="text-muted line-clamp-1">{r.descripcion || "—"}</span>
    ),
  },
  { key: "fecha", header: "Fecha", render: (r) => formatDate(r.fecha) },
  { key: "time", header: "Hora", hideOnMobile: true },
  {
    key: "numero_atletas",
    header: "Atletas",
    render: (r) => (
      <span className="inline-flex items-center gap-1 tabular-nums text-muted">
        <Users className="h-3.5 w-3.5" />
        {r.numero_atletas}
      </span>
    ),
  },
];

export default function TrainingsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.is_staff || user?.role === "administrator";

  const [data, setData] = useState<Training[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      trainingsApi
        .list(p)
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: {
    program: number;
    nombre: string;
    descripcion: string;
    fecha: string;
    time: string;
    numero_atletas: number;
  }) => {
    try {
      if (editing) {
        await trainingsApi.update(editing.id, values);
        showToast({ title: "Entrenamiento actualizado", variant: "success" });
      } else {
        await trainingsApi.create(values);
        showToast({ title: "Entrenamiento creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (training: Training) => {
    const ok = await confirm({
      title: "Eliminar entrenamiento",
      description: `¿Eliminar "${training.nombre}"?`,
    });
    if (!ok) return;
    try {
      await trainingsApi.delete(training.id);
      showToast({ title: "Entrenamiento eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<Training>[] = [];
  if (canWrite) {
    actions.push({
      id: "edit",
      label: "Editar",
      icon: Pencil,
      variant: "ghost",
      onClick: (row) => {
        setEditing(row);
        setModalOpen(true);
      },
    });
    actions.push({
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive",
      onClick: handleDelete,
    });
  }

  return (
    <ListPageTemplate
      title="Entrenamientos"
      description="Sesiones programadas por programa y disciplina."
      eyebrow="Programación"
      primaryAction={
        canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo entrenamiento
          </Button>
        ) : undefined
      }
      columns={columns}
      data={data}
      loading={loading}
      rowActions={actions}
      rowKey={(r) => r.id}
      mobileCard={(r) => (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text truncate">{r.program_name}</p>
            <Badge variant="outline-muted">{r.nombre}</Badge>
          </div>
          <p className="text-xs text-muted">
            {formatDate(r.fecha)} · {r.time}
          </p>
          {r.descripcion && (
            <p className="text-xs text-faint line-clamp-2">{r.descripcion}</p>
          )}
          <p className="inline-flex items-center gap-1 text-xs text-faint tabular-nums">
            <Users className="h-3 w-3" />
            {r.numero_atletas} atletas
          </p>
        </div>
      )}
      empty={{
        icon: Dumbbell,
        title: "Sin sesiones programadas",
        description: canWrite
          ? "Crea la primera sesión para que aparezca en el calendario de los deportistas."
          : "Cuando se programen entrenamientos aparecerán aquí.",
        action: canWrite ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear entrenamiento
          </Button>
        ) : undefined,
      }}
      pagination={{ count, page, onChange: setPage }}
      formSheet={
        <TrainingFormModal
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) setEditing(null);
          }}
          training={editing}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}
