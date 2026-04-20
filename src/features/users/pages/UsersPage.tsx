import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import UserFormModal from "@/features/users/components/UserFormModal";
import { usersApi, type User } from "@/features/users/api/usersApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const ROLE_LABELS: Record<string, string> = {
  sportsman: "Deportista",
  parent: "Acudiente",
  administrator: "Administrador",
};

const columns: Column<User>[] = [
  { key: "full_name", header: "Nombre" },
  { key: "email", header: "Email" },
  {
    key: "role",
    header: "Rol",
    render: (r) => (
      <Badge variant="outline">{ROLE_LABELS[r.role] ?? r.role}</Badge>
    ),
  },
  {
    key: "is_active",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.is_active ? "default" : "secondary"}>
        {r.is_active ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export default function UsersPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<User[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      usersApi
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
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }) => {
    try {
      if (editing) {
        await usersApi.update(editing.id, values);
        showToast({ title: "Usuario actualizado", variant: "success" });
      } else {
        await usersApi.create(values);
        showToast({ title: "Usuario creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (user: User) => {
    const ok = await confirm({
      title: "Eliminar usuario",
      description: `¿Estás seguro de eliminar a ${user.full_name}?`,
    });
    if (!ok) return;
    try {
      await usersApi.delete(user.id);
      showToast({ title: "Usuario eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Usuarios</h1>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} className="mr-2" /> Nuevo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={(row) => {
              setEditing(row);
              setModalOpen(true);
            }}
            onDelete={handleDelete}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <UserFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        user={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
