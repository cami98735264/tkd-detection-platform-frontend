import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UserCog, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import UserFormModal from "@/features/users/components/UserFormModal";
import { usersApi, type User } from "@/features/users/api/usersApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const ROLE_LABELS: Record<string, string> = {
  sportsman: "Deportista",
  parent: "Acudiente",
  administrator: "Administrador",
};

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="outline-muted">Inactivo</Badge>
  );
}

const columns: Column<User>[] = [
  {
    key: "full_name",
    header: "Nombre",
    render: (r) => <span className="font-medium text-text">{r.full_name}</span>,
  },
  {
    key: "email",
    header: "Correo",
    hideOnMobile: true,
    render: (r) => <span className="text-muted">{r.email}</span>,
  },
  {
    key: "role",
    header: "Rol",
    render: (r) => <Badge variant="outline">{ROLE_LABELS[r.role] ?? r.role}</Badge>,
  },
  {
    key: "is_active",
    header: "Estado",
    render: (r) => <StatusBadge active={r.is_active} />,
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

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    usersApi
      .list(p)
      .then((res) => {
        setData(res.results);
        setCount(res.count);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const actions: RowAction<User>[] = [
    {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      variant: "ghost",
      onClick: (row) => {
        setEditing(row);
        setModalOpen(true);
      },
    },
    {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive",
      onClick: handleDelete,
    },
  ];

  return (
    <ListPageTemplate
      title="Usuarios"
      description="Gestiona las cuentas y los roles del sistema."
      eyebrow="Administración"
      primaryAction={
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      }
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(r) => r.id}
      rowActions={actions}
      mobileCard={(r) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text">{r.full_name}</p>
            <StatusBadge active={r.is_active} />
          </div>
          <p className="text-xs text-muted">{r.email}</p>
          <p className="text-xs text-faint">{ROLE_LABELS[r.role] ?? r.role}</p>
        </div>
      )}
      empty={{
        icon: UserCog,
        title: "Sin usuarios registrados",
        description: "Crea el primer usuario para comenzar a operar el sistema.",
        action: (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear usuario
          </Button>
        ),
      }}
      pagination={{ count, page, onChange: setPage }}
      formSheet={
        <UserFormModal
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) setEditing(null);
          }}
          user={editing}
          onSubmit={handleSubmit}
        />
      }
    />
  );
}
