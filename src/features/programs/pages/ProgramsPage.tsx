import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import ProgramFormModal from "@/features/programs/components/ProgramFormModal";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Program } from "@/types/entities";

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="outline-muted">Inactivo</Badge>
  );
}

export default function ProgramsPage() {
  const navigate = useNavigate();
  const { isAdmin, hasRole } = usePermissions();
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdminUser = isAdmin();
  const isParent = hasRole(["parent"]);

  const [data, setData] = useState<Program[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    programsApi
      .list(p)
      .then((res) => {
        setData(res.results);
        setCount(res.count);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadParentPrograms = useCallback(() => {
    setLoading(true);
    enrollmentsApi
      .getMyEnrollments()
      .then((enrollments) => {
        const programIds = new Set(enrollments.map((e) => e.program));
        return programsApi.list(1).then((res) => ({
          programs: res.results.filter((p) => programIds.has(p.id)),
          count: enrollments.length,
        }));
      })
      .then(({ programs, count: c }) => {
        setData(programs);
        setCount(c);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isParent) loadParentPrograms();
    else fetchData(page);
  }, [isParent, page, fetchData, loadParentPrograms]);

  const columns: Column<Program>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (r) => <span className="font-medium text-text">{r.name}</span>,
    },
    {
      key: "capacity",
      header: "Capacidad",
      hideOnMobile: true,
      render: (r) => (r.capacity != null ? r.capacity : <span className="text-faint">Sin límite</span>),
    },
    {
      key: "active",
      header: "Estado",
      render: (r) => <StatusBadge active={r.active} />,
    },
  ];

  const handleSubmit = async (values: {
    name: string;
    description: string | null;
    schedule: string | null;
    capacity: number | null;
    active: boolean;
  }) => {
    try {
      if (editing) {
        await programsApi.update(editing.id, values);
        showToast({ title: "Programa actualizado", variant: "success" });
      } else {
        await programsApi.create(values);
        showToast({ title: "Programa creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (program: Program) => {
    const ok = await confirm({
      title: "Eliminar programa",
      description: `¿Estás seguro de eliminar "${program.name}"?`,
    });
    if (!ok) return;
    try {
      await programsApi.delete(program.id);
      showToast({ title: "Programa eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<Program>[] = [];
  if (isAdminUser) {
    actions.push({
      id: "editions",
      label: "Ver ediciones",
      icon: CalendarDays,
      variant: "ghost",
      onClick: (row) => navigate(`/dashboard/programas/${row.id}/ediciones`),
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

  return (
    <ListPageTemplate
      title="Programas"
      description={
        isParent
          ? "Programas a los que están vinculados tus deportistas."
          : "Catálogo de programas y modalidades de entrenamiento."
      }
      eyebrow={isParent ? "Acudiente" : "Operación"}
      primaryAction={
        isAdminUser ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo programa
          </Button>
        ) : undefined
      }
      columns={columns}
      data={data}
      loading={loading}
      rowKey={(r) => r.id}
      rowActions={actions}
      mobileCard={(r) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text">{r.name}</p>
            <StatusBadge active={r.active} />
          </div>
          <p className="text-xs text-muted">
            Capacidad: {r.capacity != null ? r.capacity : "Sin límite"}
          </p>
        </div>
      )}
      empty={{
        icon: BookOpen,
        title: "Sin programas",
        description: isAdminUser
          ? "Crea el primer programa para empezar a recibir inscripciones."
          : "Cuando estés inscrito en programas activos aparecerán aquí.",
        action: isAdminUser ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear programa
          </Button>
        ) : undefined,
      }}
      pagination={isParent ? undefined : { count, page, onChange: setPage }}
      formSheet={
        isAdminUser && (
          <ProgramFormModal
            open={modalOpen}
            onOpenChange={(v) => {
              setModalOpen(v);
              if (!v) setEditing(null);
            }}
            program={editing}
            onSubmit={handleSubmit}
          />
        )
      }
    />
  );
}
