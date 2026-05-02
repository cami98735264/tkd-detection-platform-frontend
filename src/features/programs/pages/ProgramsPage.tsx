import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import ProgramFormModal from "@/features/programs/components/ProgramFormModal";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useNavigate } from "react-router-dom";
import type { Program } from "@/types/entities";

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

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      programsApi
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

  const loadParentPrograms = useCallback(() => {
    setLoading(true);
    enrollmentsApi.getMyEnrollments()
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
  }, []);

  useEffect(() => {
    if (isParent) {
      loadParentPrograms();
    } else {
      fetchData(page);
    }
  }, [isParent, page, fetchData, loadParentPrograms]);

  const columns: Column<Program>[] = [
    { key: "name", header: "Nombre" },
    { key: "capacity", header: "Capacidad", render: (r) => r.capacity ?? "—" },
    {
      key: "active",
      header: "Estado",
      render: (r) => (
        <Badge variant={r.active ? "default" : "secondary"}>
          {r.active ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    ...(isAdminUser ? [{
      key: "editions",
      header: "Ediciones",
      render: (r: Program) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/dashboard/programas/${r.id}/ediciones`)}
        >
          <Calendar size={14} className="mr-1" /> Ver
        </Button>
      ),
    }] : []),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Programas</h1>
        {isAdminUser && (
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
          <CardTitle>Lista de programas</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={
              isAdminUser
                ? (row) => {
                    setEditing(row);
                    setModalOpen(true);
                  }
                : undefined
            }
            onDelete={isAdminUser ? handleDelete : undefined}
          />
          {!isParent && <Pagination count={count} page={page} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <ProgramFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        program={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
