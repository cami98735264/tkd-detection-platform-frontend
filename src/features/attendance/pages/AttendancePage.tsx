import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import AttendanceFilters from "@/features/attendance/components/AttendanceFilters";
import { attendanceApi, type AttendanceRecord } from "@/features/attendance/api/attendanceApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

type ViewMode = "weekly" | "monthly" | "yearly";

const columns: Column<AttendanceRecord>[] = [
  {
    key: "training_name",
    header: "Entrenamiento",
    render: (r) => <span className="font-medium">{r.training_name}</span>,
  },
  { key: "athlete_name", header: "Atleta" },
  {
    key: "date",
    header: "Fecha",
    render: (r) => new Date(r.date).toLocaleDateString(),
  },
  { key: "time", header: "Hora" },
  {
    key: "status",
    header: "Estado",
    render: (r) => {
      const labels: Record<string, string> = {
        confirmed: "Confirmado",
        pending: "Pendiente",
        absent: "Ausente",
      };
      const classes: Record<string, string> = {
        confirmed: "bg-green-100 text-green-800 border-green-300",
        pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
        absent: "bg-red-100 text-red-800 border-red-300",
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${classes[r.status] ?? ""}`}>
          {labels[r.status]}
        </span>
      );
    },
  },
  {
    key: "confirmed_at",
    header: "Confirmado el",
    render: (r) => (r.confirmed_at ? new Date(r.confirmed_at).toLocaleString() : "—"),
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
      description: `¿Confirmar la asistencia de ${record.athlete_name} a "${record.training_name}"?`,
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Asistencia</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Asistencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onConfirm={(row) => row.status === "pending" && handleConfirm(row)}
            confirmLabel="Confirmar"
          />

          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}