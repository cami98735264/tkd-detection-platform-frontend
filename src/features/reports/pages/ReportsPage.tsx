import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import GenerateReportModal from "@/features/reports/components/GenerateReportModal";
import { reportsApi } from "@/features/reports/api/reportsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Report } from "@/types/entities";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  completed: "default",
  failed: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  failed: "Fallido",
};

const TYPE_LABELS: Record<string, string> = {
  enrollment: "Inscripciones",
  performance: "Rendimiento",
  attendance: "Asistencia",
  custom: "Personalizado",
};

const columns: Column<Report>[] = [
  { key: "title", header: "Título" },
  {
    key: "report_type",
    header: "Tipo",
    render: (r) => TYPE_LABELS[r.report_type] ?? r.report_type,
  },
  { key: "created_by_name", header: "Creado por" },
  {
    key: "status",
    header: "Estado",
    render: (r) => (
      <Badge variant={STATUS_VARIANTS[r.status] ?? "secondary"}>
        {STATUS_LABELS[r.status] ?? r.status}
      </Badge>
    ),
  },
  {
    key: "created_at",
    header: "Fecha",
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export default function ReportsPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<Report[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      reportsApi
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

  const handleGenerate = async (values: {
    title: string;
    report_type: string;
    filters_applied?: Record<string, unknown>;
  }) => {
    try {
      await reportsApi.generate(values);
      showToast({
        title: "Reporte solicitado",
        description: "La generación está en progreso.",
        variant: "success",
      });
      setModalOpen(false);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (report: Report) => {
    const ok = await confirm({
      title: "Eliminar reporte",
      description: `¿Estás seguro de eliminar "${report.title}"?`,
    });
    if (!ok) return;
    try {
      await reportsApi.delete(report.id);
      showToast({ title: "Reporte eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={18} className="mr-2" /> Generar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes generados</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onDelete={handleDelete}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <GenerateReportModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleGenerate}
      />
    </div>
  );
}
