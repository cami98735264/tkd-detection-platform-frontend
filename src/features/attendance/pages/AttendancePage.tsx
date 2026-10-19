import { useCallback, useEffect, useState } from "react";
import { CalendarRange, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import type { Column, RowAction } from "@/components/common/DataTable";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import {
  ATTENDANCE_CONFIRM_ROLES,
  attendanceApi,
  needsConfirmation,
  type AttendanceRecord,
} from "@/features/attendance/api/attendanceApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { ApiError } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

type ViewMode = "weekly" | "monthly" | "yearly";

function StatusBadge({ status }: { status: AttendanceRecord["status"] }) {
  if (status === "present") return <Badge variant="success">Presente</Badge>;
  if (status === "absent") return <Badge variant="destructive">Ausente</Badge>;
  if (status === "late") return <Badge variant="warning">Tarde</Badge>;
  return <Badge variant="outline-muted">{status}</Badge>;
}

function trainingName(record: AttendanceRecord): string {
  return (
    record.program_name ||
    record.training_name ||
    record.entrenamiento_name ||
    record.entrenamiento ||
    "—"
  );
}

const columns: Column<AttendanceRecord>[] = [
  {
    key: "program_name",
    header: "Entrenamiento",
    render: (r) => <span className="font-medium text-text">{trainingName(r)}</span>,
  },
  { key: "athlete_name", header: "Atleta", hideOnMobile: true },
  {
    key: "fecha",
    header: "Fecha",
    render: (r) => new Date(r.fecha).toLocaleDateString(),
  },
  { key: "hora", header: "Hora", hideOnMobile: true },
  {
    key: "status",
    header: "Estado",
    render: (r) => <StatusBadge status={r.status} />,
  },
];

export default function AttendancePage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const { hasRole } = usePermissions();
  // Only the owning athlete or a linked parent may confirm (backend enforces it too).
  const canConfirm = hasRole(ATTENDANCE_CONFIRM_ROLES);
  /** Records the backend refused (403) — hide their confirm action. */
  const [forbiddenIds, setForbiddenIds] = useState<ReadonlySet<number>>(() => new Set());

  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return end.toISOString().split("T")[0];
  });

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      attendanceApi
        .list({
          athlete_id: athleteId ?? undefined,
          start_date: startDate,
          end_date: endDate,
          page: p,
        })
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    [athleteId, startDate, endDate, handleError],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleConfirm = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: "Confirmar asistencia",
      description: `¿Confirmar la asistencia de ${record.athlete_name} a "${trainingName(record)}"?`,
    });
    if (!ok) return;
    try {
      const updated = await attendanceApi.confirm(record.id);
      setData((rows) =>
        rows.map((r) =>
          r.id === record.id ? { ...r, ...updated, status: updated?.status ?? "present" } : r,
        ),
      );
      showToast({ title: "Asistencia confirmada", variant: "success" });
    } catch (err) {
      if (err instanceof ApiError && err.isForbidden) {
        setForbiddenIds((prev) => new Set(prev).add(record.id));
        // The global handler already showed the backend's reason; add context
        // only if it did not (e.g. no FeedbackProvider subscription).
        if (!err.notified) {
          showToast({
            title: "No podés confirmar esta asistencia",
            description: err.userMessage,
            variant: "warning",
          });
        }
        return;
      }
      handleError(err);
    }
  };

  const rowActions: RowAction<AttendanceRecord>[] = canConfirm
    ? [
        {
          id: "confirm",
          label: "Confirmar asistencia",
          icon: CheckCircle,
          variant: "tonal",
          show: (row) => needsConfirmation(row) && !forbiddenIds.has(row.id),
          onClick: (row) => void handleConfirm(row),
        },
      ]
    : [];

  return (
    <ListPageTemplate
      title="Asistencia"
      description="Historial de registros de asistencia con filtros por deportista y rango de fechas."
      eyebrow="Seguimiento"
      filters={
        <AttendanceFilters
          athleteId={athleteId}
          viewMode={viewMode}
          startDate={startDate}
          endDate={endDate}
          onAthleteChange={setAthleteId}
          onViewModeChange={setViewMode}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      }
      columns={columns}
      data={data}
      loading={loading}
      rowActions={rowActions}
      rowKey={(r) => r.id}
      mobileCard={(r) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text">{trainingName(r)}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted">{r.athlete_name}</p>
          <p className="text-xs text-faint">
            {new Date(r.fecha).toLocaleDateString()} · {r.hora}
          </p>
        </div>
      )}
      empty={{
        icon: CalendarRange,
        title: "Sin registros de asistencia",
        description: "Ajusta el rango de fechas o vuelve después del próximo entrenamiento.",
      }}
      pagination={{ count, page, onChange: setPage }}
    />
  );
}
