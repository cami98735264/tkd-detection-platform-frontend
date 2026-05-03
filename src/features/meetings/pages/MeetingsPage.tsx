import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle, Eye, Pencil, Plus, Trash2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import FormModal from "@/components/common/FormModal";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import MeetingFormModal from "@/features/meetings/components/MeetingFormModal";
import { meetingsApi, type Meeting } from "@/features/meetings/api/meetingsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

function ConfirmationBadge({ confirmed }: { confirmed: boolean }) {
  return confirmed ? (
    <Badge variant="success">Confirmado</Badge>
  ) : (
    <Badge variant="outline-muted">Sin confirmar</Badge>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

const baseColumns: Column<Meeting>[] = [
  { key: "title", header: "Título", render: (r) => <span className="font-medium text-text">{r.title}</span> },
  {
    key: "description",
    header: "Descripción",
    hideOnMobile: true,
    render: (r) => <span className="text-muted line-clamp-1">{r.description || "—"}</span>,
  },
  { key: "date", header: "Fecha", render: (r) => formatDate(r.date) },
  { key: "time", header: "Hora", hideOnMobile: true },
];

const guestColumns: Column<Meeting>[] = [
  ...baseColumns,
  {
    key: "is_confirmed",
    header: "Estado",
    render: (r) => <ConfirmationBadge confirmed={r.is_confirmed ?? false} />,
  },
];

export default function MeetingsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const user = useAuthStore((s) => s.user);

  const canWrite = user?.is_staff || user?.role === "administrator";
  const isParent = user?.role === "parent";
  const isSportsman = user?.role === "sportsman";

  const [data, setData] = useState<Meeting[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [confirmationsModal, setConfirmationsModal] = useState<Meeting | null>(null);
  const [confirmations, setConfirmations] = useState<
    { id: number; parent_name: string; parent_email: string; confirmed_at: string }[]
  >([]);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      meetingsApi
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
    title: string;
    description: string;
    date: string;
    time: string;
  }) => {
    try {
      if (editing) {
        await meetingsApi.update(editing.id, values);
        showToast({ title: "Reunión actualizada", variant: "success" });
      } else {
        await meetingsApi.create(values);
        showToast({ title: "Reunión creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (meeting: Meeting) => {
    const ok = await confirm({
      title: "Eliminar reunión",
      description: `¿Eliminar "${meeting.title}"?`,
    });
    if (!ok) return;
    try {
      await meetingsApi.delete(meeting.id);
      showToast({ title: "Reunión eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleToggleConfirmation = async (meeting: Meeting) => {
    const ok = await confirm({
      title: meeting.is_confirmed ? "Cancelar asistencia" : "Confirmar asistencia",
      description: meeting.is_confirmed
        ? `¿Cancelar tu confirmación a "${meeting.title}"?`
        : `¿Confirmar tu asistencia a "${meeting.title}"?`,
    });
    if (!ok) return;
    try {
      if (meeting.is_confirmed) {
        await meetingsApi.cancelConfirmation(meeting.id);
        showToast({ title: "Confirmación cancelada", variant: "success" });
      } else {
        await meetingsApi.confirmAttendance(meeting.id);
        showToast({ title: "Asistencia confirmada", variant: "success" });
      }
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleViewConfirmations = async (meeting: Meeting) => {
    setConfirmationsModal(meeting);
    try {
      const res = await meetingsApi.listConfirmations(meeting.id);
      setConfirmations(res);
    } catch (err) {
      handleError(err);
      setConfirmations([]);
    }
  };

  const actions: RowAction<Meeting>[] = [];
  if (canWrite) {
    actions.push({
      id: "view-confirmations",
      label: "Ver confirmaciones",
      icon: Eye,
      variant: "ghost",
      onClick: handleViewConfirmations,
    });
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
  if ((isParent || isSportsman) && !canWrite) {
    actions.push({
      id: "confirm",
      label: "Confirmar / cancelar",
      icon: CheckCircle,
      variant: "tonal",
      onClick: handleToggleConfirmation,
    });
  }

  return (
    <>
      <ListPageTemplate
        title="Reuniones"
        description="Convocatorias y confirmaciones de asistencia."
        eyebrow="Comunicaciones"
        primaryAction={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nueva reunión
            </Button>
          ) : undefined
        }
        columns={canWrite ? baseColumns : guestColumns}
        data={data}
        loading={loading}
        rowActions={actions}
        rowKey={(r) => r.id}
        mobileCard={(r) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-text">{r.title}</p>
              {!canWrite && <ConfirmationBadge confirmed={r.is_confirmed ?? false} />}
            </div>
            <p className="text-xs text-muted">
              {formatDate(r.date)} · {r.time}
            </p>
            {r.description && (
              <p className="text-xs text-faint line-clamp-2">{r.description}</p>
            )}
          </div>
        )}
        empty={{
          icon: CalendarCheck,
          title: "Sin reuniones agendadas",
          description: canWrite
            ? "Crea la primera reunión para que los acudientes puedan confirmar asistencia."
            : "Cuando la academia agende una reunión aparecerá aquí.",
          action: canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Crear reunión
            </Button>
          ) : undefined,
        }}
        pagination={{ count, page, onChange: setPage }}
        formSheet={
          <MeetingFormModal
            open={modalOpen}
            onOpenChange={(v) => {
              setModalOpen(v);
              if (!v) setEditing(null);
            }}
            meeting={editing}
            onSubmit={handleSubmit}
          />
        }
      />

      <FormModal
        open={!!confirmationsModal}
        onOpenChange={(v) => {
          if (!v) setConfirmationsModal(null);
        }}
        title={`Confirmaciones: ${confirmationsModal?.title ?? ""}`}
      >
        {confirmations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <XCircle className="h-8 w-8 text-faint" />
            <p className="text-sm text-muted">Sin confirmaciones aún.</p>
          </div>
        ) : (
          <ul className="divide-y divide-divider">
            {confirmations.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{c.parent_name}</p>
                  <p className="text-sm text-muted truncate">{c.parent_email}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="success">Confirmado</Badge>
                  <p className="mt-1 text-xs text-faint">
                    {new Date(c.confirmed_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FormModal>
    </>
  );
}
