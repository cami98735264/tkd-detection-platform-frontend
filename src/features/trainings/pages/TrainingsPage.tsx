import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import TrainingFormModal from "@/features/trainings/components/TrainingFormModal";
import { trainingsApi, type Training } from "@/features/trainings/api/trainingsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const columns: Column<Training>[] = [
  { key: "program_name", header: "Programa" },
  { key: "nombre", header: "Tipo" },
  { key: "descripcion", header: "Descripción" },
  { key: "fecha", header: "Fecha", render: (r) => new Date(r.fecha).toLocaleDateString() },
  { key: "time", header: "Hora" },
  { key: "numero_atletas", header: "Atletas" },
];

export default function TrainingsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

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
    [page],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: { program: number; nombre: string; descripcion: string; fecha: string; time: string; numero_atletas: number }) => {
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
    const ok = await confirm({ title: "Eliminar entrenamiento", description: `¿Eliminar "${training.nombre}"?` });
    if (!ok) return;
    try {
      await trainingsApi.delete(training.id);
      showToast({ title: "Entrenamiento eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Entrenamientos</h1>
        <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={18} className="mr-2" /> Nuevo
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Sesiones de Entrenamiento</CardTitle></CardHeader>
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
      <TrainingFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        training={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
