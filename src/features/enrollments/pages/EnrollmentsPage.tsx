import { useCallback, useEffect, useState } from "react";
import { ClipboardList, FileText, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
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

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="success">Activo</Badge>;
  if (status === "completed") return <Badge variant="outline">Completado</Badge>;
  if (status === "dropped") return <Badge variant="outline-muted">Retirado</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>;
}

export default function EnrollmentsPage() {
  const { isAdmin, hasRole } = usePermissions();
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdminUser = isAdmin();
  const isParent = hasRole(["parent"]);

  const [data, setData] = useState<Enrollment[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);

  const [athleteMap, setAthleteMap] = useState<Record<number, string>>({});
  const [programMap, setProgramMap] = useState<Record<number, string>>({});

  const fetchData = useCallback((p: number) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyEnrollments = useCallback(() => {
    setLoading(true);
    Promise.all([
      enrollmentsApi.getMyEnrollments(),
      parentAthletesApi.getChildren(),
      programsApi.list(1),
    ])
      .then(([enrollments, children, progRes]) => {
        setData(enrollments);
        setCount(enrollments.length);
        const aMap: Record<number, string> = {};
        children.forEach((c) => (aMap[c.athlete_id] = c.athlete.full_name));
        setAthleteMap(aMap);
        const pMap: Record<number, string> = {};
        progRes.results.forEach((p) => (pMap[p.id] = p.name));
        setProgramMap(pMap);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isParent) fetchMyEnrollments();
    else fetchData(page);
  }, [isParent, page, fetchData, fetchMyEnrollments]);

  const columns: Column<Enrollment>[] = [
    {
      key: "athlete",
      header: "Deportista",
      render: (r) => (
        <span className="font-medium text-text">
          {athleteMap[r.athlete] ?? `#${r.athlete}`}
        </span>
      ),
    },
    {
      key: "program",
      header: "Programa",
      render: (r) => programMap[r.program] ?? `#${r.program}`,
    },
    {
      key: "start_date",
      header: "Inicio",
      hideOnMobile: true,
      render: (r) => formatDateForDisplay(r.start_date),
    },
    {
      key: "end_date",
      header: "Fin",
      hideOnMobile: true,
      render: (r) => formatDateForDisplay(r.end_date) ?? "—",
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "certificado",
      header: "Cert. médico",
      hideOnMobile: true,
      render: (r) =>
        r.certificado_medico_adjunto ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `${config.apiUrl}/media/${r.certificado_medico_adjunto}`,
                "_blank",
              )
            }
          >
            <FileText className="h-3.5 w-3.5" />
            Ver
          </Button>
        ) : (
          <span className="text-faint">—</span>
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
      showToast({ title: "Inscripción eliminada", variant: "success" });
      if (isParent) fetchMyEnrollments();
      else fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<Enrollment>[] = isAdminUser
    ? [
        {
          id: "edit",
          label: "Editar",
          icon: Pencil,
          variant: "ghost",
          onClick: (row) => {
            setEditingEnrollment(row);
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
      ]
    : [];

  return (
    <ListPageTemplate
      title="Inscripciones"
      description={
        isParent
          ? "Inscripciones activas y pasadas de tus deportistas vinculados."
          : "Gestiona las inscripciones de los deportistas a los programas."
      }
      eyebrow={isParent ? "Acudiente" : "Operación"}
      primaryAction={
        isAdminUser ? (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva inscripción
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
            <p className="font-medium text-text">
              {athleteMap[r.athlete] ?? `#${r.athlete}`}
            </p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted">
            {programMap[r.program] ?? `#${r.program}`}
          </p>
          <p className="text-xs text-faint">
            Inicio: {formatDateForDisplay(r.start_date)}
            {r.end_date ? ` · Fin: ${formatDateForDisplay(r.end_date)}` : ""}
          </p>
        </div>
      )}
      empty={{
        icon: ClipboardList,
        title: isParent ? "Sin inscripciones aún" : "Sin inscripciones",
        description: isAdminUser
          ? "Crea la primera inscripción para vincular un deportista a un programa."
          : "Cuando tengas inscripciones activas aparecerán aquí.",
        action: isAdminUser ? (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva inscripción
          </Button>
        ) : undefined,
      }}
      pagination={isParent ? undefined : { count, page, onChange: setPage }}
      formSheet={
        !isParent && (
          <EnrollmentFormSheet
            open={modalOpen}
            onOpenChange={(v) => {
              setModalOpen(v);
              if (!v) setEditingEnrollment(null);
            }}
            editing={editingEnrollment}
            onSuccess={() => fetchData(page)}
          />
        )
      }
    />
  );
}
