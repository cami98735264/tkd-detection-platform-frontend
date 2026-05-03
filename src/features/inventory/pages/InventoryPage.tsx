import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import InventoryFormModal from "@/features/inventory/components/InventoryFormModal";
import { inventoryApi, type InventoryItem } from "@/features/inventory/api/inventoryApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const columns: Column<InventoryItem>[] = [
  { key: "name", header: "Nombre" },
  { key: "quantity", header: "Cantidad" },
  { key: "description", header: "Descripción" },
  { key: "created_at", header: "Fecha Sistema", render: (r) => new Date(r.created_at).toLocaleDateString() },
];

export default function InventoryPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<InventoryItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      inventoryApi
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

  const handleSubmit = async (values: { name: string; quantity: number; description: string }) => {
    try {
      if (editing) {
        await inventoryApi.update(editing.id, values);
        showToast({ title: "Ítem actualizado", variant: "success" });
      } else {
        await inventoryApi.create(values);
        showToast({ title: "Ítem creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const ok = await confirm({ title: "Eliminar ítem", description: `¿Eliminar "${item.name}"?` });
    if (!ok) return;
    try {
      await inventoryApi.delete(item.id);
      showToast({ title: "Ítem eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventario"
        title="Inventario"
        description="Gestiona el equipo y materiales disponibles para la academia."
        actions={
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Nuevo Ítem
          </Button>
        }
      />
      <Card>
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
      <InventoryFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        item={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
