import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import AthleteFormModal from "@/features/athletes/components/AthleteFormModal";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete } from "@/types/entities";

const columns: Column<Athlete>[] = [
  { key: "full_name", header: "Nombre" },
  { key: "date_of_birth", header: "Fecha Nac.", render: (r) => r.date_of_birth ?? "—" },
  { key: "category", header: "Categoría", render: (r) => r.category ?? "—" },
  {
    key: "status",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.status === "active" ? "default" : "secondary"}>
        {r.status === "active" ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export default function AthletesPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdmin = user?.role === "administrator";

  const [data, setData] = useState<Athlete[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      athletesApi
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
    full_name: string;
    date_of_birth: string | null;
    category: string | null;
    status: string;
  }) => {
    try {
      if (editing) {
        await athletesApi.update(editing.id, values);
        showToast({ title: "Deportista actualizado", variant: "success" });
      } else {
        await athletesApi.create(values);
        showToast({ title: "Deportista creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (athlete: Athlete) => {
    const ok = await confirm({
      title: "Eliminar deportista",
      description: `¿Estás seguro de eliminar a ${athlete.full_name}?`,
    });
    if (!ok) return;
    try {
      await athletesApi.delete(athlete.id);
      showToast({ title: "Deportista eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deportistas</h1>
        {isAdmin && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} className="mr-2" /> Nuevo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de deportistas</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={
              isAdmin
                ? (row) => {
                    setEditing(row);
                    setModalOpen(true);
                  }
                : undefined
            }
            onDelete={isAdmin ? handleDelete : undefined}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AthleteFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        athlete={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
