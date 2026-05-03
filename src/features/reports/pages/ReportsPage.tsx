import { useCallback, useEffect, useState } from "react";
import { BarChart3, FileSpreadsheet, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import GenerateReportModal from "@/features/reports/components/GenerateReportModal";
import { reportsApi } from "@/features/reports/api/reportsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Report } from "@/types/entities";

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

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge variant="success">Completado</Badge>;
  if (status === "pending") return <Badge variant="warning">Pendiente</Badge>;
  if (status === "failed") return <Badge variant="destructive">Fallido</Badge>;
  return <Badge variant="secondary">{STATUS_LABELS[status] ?? status}</Badge>;
}

const columns: Column<Report>[] = [
  {
    key: "title",
    header: "Título",
    render: (r) => <span className="font-medium text-text">{r.title}</span>,
  },
  {
    key: "report_type",
    header: "Tipo",
    render: (r) => TYPE_LABELS[r.report_type] ?? r.report_type,
  },
  { key: "created_by_name", header: "Creado por", hideOnMobile: true },
  {
    key: "status",
    header: "Estado",
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: "created_at",
    header: "Fecha",
    hideOnMobile: true,
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

  const fetchData = useCallback((p: number) => {
    setLoading(true);
    reportsApi
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

  const actions: RowAction<Report>[] = [
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
      title="Reportes"
      description="Solicita y descarga reportes de inscripciones, asistencia y rendimiento."
      eyebrow="Administración"
      primaryAction={
        <Button onClick={() => setModalOpen(true)}>
          <FileSpreadsheet className="h-4 w-4" />
          Generar reporte
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
            <p className="font-medium text-text">{r.title}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted">
            {TYPE_LABELS[r.report_type] ?? r.report_type} · {r.created_by_name}
          </p>
          <p className="text-xs text-faint">
            {new Date(r.created_at).toLocaleDateString()}
          </p>
        </div>
      )}
      empty={{
        icon: BarChart3,
        title: "Sin reportes generados",
        description:
          "Genera tu primer reporte de inscripciones, asistencia o rendimiento.",
        action: (
          <Button onClick={() => setModalOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Generar reporte
          </Button>
        ),
      }}
      pagination={{ count, page, onChange: setPage }}
      formSheet={
        <GenerateReportModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSubmit={handleGenerate}
        />
      }
    />
  );
}
