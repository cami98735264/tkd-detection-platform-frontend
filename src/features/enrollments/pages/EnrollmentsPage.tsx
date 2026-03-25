import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import EnrollmentFormModal from "@/features/enrollments/components/EnrollmentFormModal";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Enrollment } from "@/types/entities";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  dropped: "Retirado",
};

export default function EnrollmentsPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdmin = user?.role === "administrator";

  const [data, setData] = useState<Enrollment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);

  // Lookup maps for display names
  const [athleteMap, setAthleteMap] = useState<Record<number, string>>({});
  const [programMap, setProgramMap] = useState<Record<number, string>>({});

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      Promise.all([
        enrollmentsApi.list(p),
        athletesApi.list(1),
        programsApi.list(1),
      ])
        .then(([enrollRes, athRes, progRes]) => {
          setData(enrollRes.results);
          setCount(enrollRes.count);
          const aMap: Record<number, string> = {};
          athRes.results.forEach((a) => (aMap[a.id] = a.full_name));
          setAthleteMap(aMap);
          const pMap: Record<number, string> = {};
          progRes.results.forEach((p) => (pMap[p.id] = p.name));
          setProgramMap(pMap);
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

  const columns: Column<Enrollment>[] = [
    {
      key: "athlete",
      header: "Deportista",
      render: (r) => athleteMap[r.athlete] ?? `#${r.athlete}`,
    },
    {
      key: "program",
      header: "Programa",
      render: (r) => programMap[r.program] ?? `#${r.program}`,
    },
    { key: "start_date", header: "Inicio" },
    { key: "end_date", header: "Fin", render: (r) => r.end_date ?? "—" },
    {
      key: "status",
      header: "Estado",
      render: (r) => (
        <Badge
          variant={
            r.status === "active"
              ? "default"
              : r.status === "completed"
                ? "outline"
                : "secondary"
          }
        >
          {STATUS_LABELS[r.status] ?? r.status}
        </Badge>
      ),
    },
  ];

  const handleSubmit = async (values: {
    athlete: number;
    program: number;
    start_date: string;
    end_date: string | null;
    status: string;
    notes: string | null;
  }) => {
    try {
      if (editing) {
        await enrollmentsApi.update(editing.id, values);
        showToast({ title: "Inscripción actualizada", variant: "success" });
      } else {
        await enrollmentsApi.create(values);
        showToast({ title: "Inscripción creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (enrollment: Enrollment) => {
    const ok = await confirm({
      title: "Eliminar inscripción",
      description: "¿Estás seguro de eliminar esta inscripción?",
    });
    if (!ok) return;
    try {
      await enrollmentsApi.delete(enrollment.id);
      showToast({ title: "Inscripción eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inscripciones</h1>
        {isAdmin && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} className="mr-2" /> Nueva
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de inscripciones</CardTitle>
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

      <EnrollmentFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        enrollment={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
