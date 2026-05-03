import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import EditionFormModal from "@/features/programs/components/EditionFormModal";
import { editionsApi } from "@/features/programs/api/editionsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Edition } from "@/types/entities";

function safeScheduleCount(value: string | null | undefined): number | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}

const columns: Column<Edition>[] = [
  {
    key: "start_date",
    header: "Fecha inicio",
    render: (r) => (
      <span className="font-medium text-text">{formatDateForDisplay(r.start_date)}</span>
    ),
  },
  {
    key: "end_date",
    header: "Fecha fin",
    render: (r) => (
      <span className="text-muted">
        {r.end_date ? formatDateForDisplay(r.end_date) : "—"}
      </span>
    ),
    hideOnMobile: true,
  },
  {
    key: "schedule",
    header: "Horarios",
    render: (r) => {
      const n = safeScheduleCount(r.schedule);
      if (n === null) return <span className="text-faint">—</span>;
      return (
        <span className="text-muted tabular-nums">
          {n} {n === 1 ? "horario" : "horarios"}
        </span>
      );
    },
  },
  {
    key: "active",
    header: "Estado",
    render: (r) =>
      r.active ? (
        <Badge variant="success">Activa</Badge>
      ) : (
        <Badge variant="outline-muted">Inactiva</Badge>
      ),
  },
];

export default function EditionsPage() {
  const { programId } = useParams<{ programId: string }>();
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdmin = user?.role === "administrator";

  const [data, setData] = useState<Edition[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Edition | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      if (!programId) return;
      setLoading(true);
      editionsApi
        .list(p, Number(programId))
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programId],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: {
    start_date: string;
    end_date: string | null;
    schedule: string | null;
    active: boolean;
  }) => {
    try {
      if (editing) {
        await editionsApi.update(editing.id, values);
        showToast({ title: "Edición actualizada", variant: "success" });
      } else {
        await editionsApi.create({ ...values, program: Number(programId) });
        showToast({ title: "Edición creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (edition: Edition) => {
    const ok = await confirm({
      title: "Eliminar edición",
      description: `¿Eliminar la edición que comienza el ${formatDateForDisplay(edition.start_date)}?`,
    });
    if (!ok) return;
    try {
      await editionsApi.delete(edition.id);
      showToast({ title: "Edición eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<Edition>[] = [];
  if (isAdmin) {
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
    <div className="space-y-4">
      <Link
        to="/dashboard/programas"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a Programas
      </Link>

      <ListPageTemplate
        title="Ediciones del programa"
        description="Periodos activos del programa con su horario semanal."
        eyebrow="Programación"
        primaryAction={
          isAdmin ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva edición
            </Button>
          ) : undefined
        }
        columns={columns}
        data={data}
        loading={loading}
        rowActions={actions}
        rowKey={(r) => r.id}
        mobileCard={(r) => {
          const n = safeScheduleCount(r.schedule);
          return (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-text">
                  {formatDateForDisplay(r.start_date)}
                  {r.end_date ? ` — ${formatDateForDisplay(r.end_date)}` : ""}
                </p>
                {r.active ? (
                  <Badge variant="success">Activa</Badge>
                ) : (
                  <Badge variant="outline-muted">Inactiva</Badge>
                )}
              </div>
              <p className="text-xs text-muted tabular-nums">
                {n === null
                  ? "Sin horario estructurado"
                  : `${n} ${n === 1 ? "horario" : "horarios"}`}
              </p>
            </div>
          );
        }}
        empty={{
          icon: CalendarRange,
          title: "Sin ediciones registradas",
          description: isAdmin
            ? "Crea la primera edición para definir fechas y horarios del programa."
            : "Cuando se programen ediciones aparecerán aquí.",
          action: isAdmin ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Crear edición
            </Button>
          ) : undefined,
        }}
        pagination={{ count, page, onChange: setPage }}
        formSheet={
          <EditionFormModal
            open={modalOpen}
            onOpenChange={(v) => {
              setModalOpen(v);
              if (!v) setEditing(null);
            }}
            edition={editing}
            onSubmit={handleSubmit}
          />
        }
      />
    </div>
  );
}
