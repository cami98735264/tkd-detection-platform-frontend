import { useCallback, useEffect, useState } from "react";
import { CalendarRange, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import type { Column, RowAction } from "@/components/common/DataTable";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import { attendanceApi, type AttendanceRecord } from "@/features/attendance/api/attendanceApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

type ViewMode = "weekly" | "monthly" | "yearly";

function StatusBadge({ status }: { status: AttendanceRecord["status"] }) {
  if (status === "present") return <Badge variant="success">Presente</Badge>;
  if (status === "absent") return <Badge variant="destructive">Ausente</Badge>;
  if (status === "late") return <Badge variant="warning">Tarde</Badge>;
  return <Badge variant="outline-muted">{status}</Badge>;
}

const columns: Column<AttendanceRecord>[] = [
  {
    key: "program_name",
    header: "Entrenamiento",
    render: (r) => <span className="font-medium text-text">{r.program_name}</span>,
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
        .list({ athlete_id: athleteId ?? undefined, start_date: startDate, end_date: endDate, page: p })
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, athleteId, startDate, endDate],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleConfirm = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: "Confirmar asistencia",
      description: `¿Confirmar la asistencia de ${record.athlete_name} a "${record.program_name}"?`,
    });
    if (!ok) return;
    try {
      await attendanceApi.confirm(record.id);
      showToast({ title: "Asistencia confirmada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const rowActions: RowAction<AttendanceRecord>[] = [
    {
      id: "confirm",
      label: "Confirmar asistencia",
      icon: CheckCircle,
      variant: "tonal",
      show: (row) => row.status === "present",
      onClick: handleConfirm,
    },
  ];

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
            <p className="font-medium text-text">{r.program_name}</p>
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
        description:
          "Ajusta el rango de fechas o vuelve después del próximo entrenamiento.",
      }}
      pagination={{ count, page, onChange: setPage }}
    />
  );
}