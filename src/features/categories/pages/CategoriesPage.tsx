import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import CategoryFormModal from "@/features/categories/components/CategoryFormModal";
import { categoriesApi } from "@/features/categories/api/categoriesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { CompetitionCategory } from "@/types/entities";

const columns: Column<CompetitionCategory>[] = [
  { key: "nombre", header: "Nombre" },
  { key: "edad_min", header: "Edad Min" },
  { key: "edad_max", header: "Edad Max" },
  { key: "belt_from_name", header: "Cinturón Desde" },
  { key: "belt_to_name", header: "Cinturón Hasta" },
  { key: "peso_min", header: "Peso Min" },
  { key: "peso_max", header: "Peso Max" },
];

export default function CategoriesPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<CompetitionCategory[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompetitionCategory | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      categoriesApi
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

  const handleSubmit = async (values: {
    nombre: string;
    edad_min: number;
    edad_max: number;
    belt_from: number;
    belt_to: number;
    peso_min: number;
    peso_max: number;
  }) => {
    try {
      if (editing) {
        await categoriesApi.update(editing.id, values);
        showToast({ title: "Categoría actualizada", variant: "success" });
      } else {
        await categoriesApi.create(values);
        showToast({ title: "Categoría creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (category: CompetitionCategory) => {
    const ok = await confirm({ title: "Eliminar categoría", description: `¿Eliminar "${category.nombre}"?` });
    if (!ok) return;
    try {
      await categoriesApi.delete(category.id);
      showToast({ title: "Categoría eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Categorías de Competencia</h1>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={18} className="mr-2" /> Nueva
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Categorías</CardTitle></CardHeader>
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
      <CategoryFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        category={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
