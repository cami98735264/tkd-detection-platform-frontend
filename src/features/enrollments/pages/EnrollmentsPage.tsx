import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import EnrollmentFormSheet from "@/features/enrollments/components/EnrollmentFormSheet";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { parentAthletesApi } from "@/features/athletes/api/parentAthletesApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { formatDateForDisplay } from "@/lib/dateUtils";
import { config } from "@/config/env";
import type { Enrollment } from "@/types/entities";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  dropped: "Retirado",
};

export default function EnrollmentsPage() {
  const { isAdmin, hasRole } = usePermissions();
  const { handleError } = useApiErrorHandler();
  const { confirm } = useFeedback();
  const isAdminUser = isAdmin();
  const isParent = hasRole(["parent"]);

  const [data, setData] = useState<Enrollment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);

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

  // Fetch my enrollments for parent
  const fetchMyEnrollments = useCallback(() => {
    setLoading(true);
    Promise.all([
      enrollmentsApi.getMyEnrollments(),
      parentAthletesApi.getChildren(),
      programsApi.list(1),
    ])
      .then(([enrollments, children, progRes]) => {
        setData(enrollments);
        const aMap: Record<number, string> = {};
        children.forEach((c) => (aMap[c.athlete_id] = c.athlete.full_name));
        setAthleteMap(aMap);
        const pMap: Record<number, string> = {};
        progRes.results.forEach((p) => (pMap[p.id] = p.name));
        setProgramMap(pMap);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isParent) {
      fetchMyEnrollments();
    } else {
      fetchData(page);
    }
  }, [isParent, page, fetchData, fetchMyEnrollments]);

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
    { key: "start_date", header: "Inicio", render: (r) => formatDateForDisplay(r.start_date) },
    { key: "end_date", header: "Fin", render: (r) => formatDateForDisplay(r.end_date) ?? "—" },
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
    {
      key: "certificado",
      header: "Cert. Médico",
      render: (r) =>
        r.certificado_medico_adjunto ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`${config.apiUrl}/media/${r.certificado_medico_adjunto}`, "_blank")}
          >
            Ver
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  const handleDelete = async (enrollment: Enrollment) => {
    const ok = await confirm({
      title: "Eliminar inscripción",
      description: "¿Estás seguro de eliminar esta inscripción?",
    });
    if (!ok) return;
    try {
      await enrollmentsApi.delete(enrollment.id);
      if (isParent) {
        fetchMyEnrollments();
      } else {
        fetchData(page);
      }
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inscripciones</h1>
        {isAdminUser && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setModalOpen(true)}
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
          {isParent ? (
            <DataTable
              columns={columns}
              data={data}
              loading={loading}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                data={data}
                loading={loading}
                onEdit={isAdminUser ? (row) => { setEditingEnrollment(row); setModalOpen(true); } : undefined}
                onDelete={isAdminUser ? handleDelete : undefined}
              />
              <Pagination count={count} page={page} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {!isParent && (
        <EnrollmentFormSheet
          open={modalOpen}
          onOpenChange={(v) => { setModalOpen(v); if (!v) setEditingEnrollment(null); }}
          editing={editingEnrollment}
          onSuccess={() => fetchData(page)}
        />
      )}
    </div>
  );
}
