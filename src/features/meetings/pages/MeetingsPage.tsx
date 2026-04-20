import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import MeetingFormModal from "@/features/meetings/components/MeetingFormModal";
import { meetingsApi, type Meeting } from "@/features/meetings/api/meetingsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const columns: Column<Meeting>[] = [
  { key: "title", header: "Título" },
  { key: "description", header: "Descripción" },
  { key: "date", header: "Fecha", render: (r) => new Date(r.date).toLocaleDateString() },
  { key: "time", header: "Hora" },
];

export default function MeetingsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<Meeting[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reuniones</h1>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={18} className="mr-2" /> Nueva
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Reuniones Programadas</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={(row) => { setEditing(row); setModalOpen(true); }}
            onDelete={handleDelete}
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
    </div>
  );
}
