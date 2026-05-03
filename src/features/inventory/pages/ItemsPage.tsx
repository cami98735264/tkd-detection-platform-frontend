import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import ItemTypeFormModal from "@/features/inventory/components/ItemTypeFormModal";
import { itemTypesApi, type ItemType } from "@/features/inventory/api/itemTypesApi";

const columns: Column<ItemType>[] = [
  { key: "name", header: "Nombre" },
  { key: "created_at", header: "Fecha Creación", render: (r) => new Date(r.created_at).toLocaleDateString() },
];

export default function ItemsPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdmin = user?.role === "administrator";

  const [data, setData] = useState<ItemType[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ItemType | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      itemTypesApi
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

  const handleSubmit = async (values: { name: string }) => {
    try {
      if (editing) {
        await itemTypesApi.update(editing.id, values);
        showToast({ title: "Tipo actualizado", variant: "success" });
      } else {
        await itemTypesApi.create(values);
        showToast({ title: "Tipo creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (item: ItemType) => {
    const ok = await confirm({ title: "Eliminar tipo", description: `¿Eliminar "${item.name}"?` });
    if (!ok) return;
    try {
      await itemTypesApi.delete(item.id);
      showToast({ title: "Tipo eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">No tienes acceso a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Tipos de ítem"
        description="Configura los tipos de material que se usan para clasificar el inventario."
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Nuevo Tipo
          </Button>
        }
      />
      <Card>
        <CardContent className="p-2 sm:p-4">
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
      <ItemTypeFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        item={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}