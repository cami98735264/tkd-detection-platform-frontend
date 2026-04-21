import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import FormModal from "@/components/common/FormModal";
import MeetingFormModal from "@/features/meetings/components/MeetingFormModal";
import { meetingsApi, type Meeting } from "@/features/meetings/api/meetingsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useAuthStore } from "@/features/auth/store/authStore";

const getColumns = (isAdmin: boolean): Column<Meeting>[] => [
  { key: "title", header: "Título" },
  { key: "description", header: "Descripción" },
  { key: "date", header: "Fecha", render: (r) => new Date(r.date).toLocaleDateString() },
  { key: "time", header: "Hora" },
  ...(isAdmin ? [] : [{
    key: "is_confirmed",
    header: "Estado",
    render: (r: Meeting) =>
      r.is_confirmed ? (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">Confirmado</span>
      ) : (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-300">Sin confirmar</span>
      ),
  }]),
];

export default function MeetingsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const user = useAuthStore((s) => s.user);

  const canWrite = user?.is_staff || user?.role === "administrator";
  const isParent = user?.role === "parent";

  const [data, setData] = useState<Meeting[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [confirmationsModal, setConfirmationsModal] = useState<Meeting | null>(null);
  const [confirmations, setConfirmations] = useState<{ id: number; parent_name: string; parent_email: string; confirmed_at: string }[]>([]);

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
    [page],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: { title: string; description: string; date: string; time: string }) => {
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
    const ok = await confirm({ title: "Eliminar reunión", description: `¿Eliminar "${meeting.title}"?` });
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
    const action = meeting.is_confirmed ? "cancelar la confirmación de" : "confirmar asistencia a";
    const ok = await confirm({ title: meeting.is_confirmed ? "Cancelar asistencia" : "Confirmar asistencia", description: `¿${meeting.is_confirmed ? "Cancelar" : "Confirmar"} ${action} "${meeting.title}"?` });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reuniones</h1>
        {canWrite && (
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Nueva
          </Button>
        )}
      </div>
      <Card>
        <CardHeader><CardTitle>Reuniones Programadas</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={getColumns(!isParent)}
            data={data}
            loading={loading}
            onEdit={canWrite ? (row) => { setEditing(row); setModalOpen(true); } : undefined}
            onDelete={canWrite ? handleDelete : undefined}
            onConfirm={isParent ? handleToggleConfirmation : undefined}
            onViewConfirmations={canWrite ? handleViewConfirmations : undefined}
            confirmLabel={(row: Meeting) => row.is_confirmed ? "Cancelar" : "Confirmar"}
            viewConfirmationsLabel="Confirmaciones"
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>
      <MeetingFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        meeting={editing}
        onSubmit={handleSubmit}
      />
      <FormModal
        open={!!confirmationsModal}
        onOpenChange={(v) => { if (!v) setConfirmationsModal(null); }}
        title={`Confirmaciones: ${confirmationsModal?.title ?? ""}`}
      >
        {confirmations.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Sin confirmaciones aún.</p>
        ) : (
          <div className="space-y-3">
            {confirmations.map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">{c.parent_name}</p>
                  <p className="text-sm text-muted-foreground">{c.parent_email}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">Confirmado</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(c.confirmed_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormModal>
    </div>
  );
}
