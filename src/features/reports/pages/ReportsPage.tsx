import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, Download, FileSpreadsheet, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import GenerateReportModal from "@/features/reports/components/GenerateReportModal";
import {
  isReportInProgress,
  reportsApi,
  type GenerateReportPayload,
} from "@/features/reports/api/reportsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useRealtime, useRealtimeEvent } from "@/features/realtime";
import type { Report, ReportStatus } from "@/types/entities";

/** Poll interval while a report on screen is still pending/processing. */
export const REPORT_POLL_MS = 4000;

const TYPE_LABELS: Record<string, string> = {
  enrollment: "Inscripciones",
  performance: "Rendimiento",
  attendance: "Asistencia",
  custom: "Personalizado",
};

function StatusBadge({ status }: { status: ReportStatus | string }) {
  if (status === "completed") return <Badge variant="success">Completado</Badge>;
  if (status === "processing") return <Badge variant="warning">Procesando</Badge>;
  if (status === "pending") return <Badge variant="warning">Pendiente</Badge>;
  if (status === "failed") return <Badge variant="destructive">Fallido</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchData = useCallback(
    (p: number, { quiet = false }: { quiet?: boolean } = {}) => {
      if (!quiet) setLoading(true);
      return reportsApi
        .list(p)
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => {
          if (!quiet) setLoading(false);
        });
    },
    [handleError],
  );

  useEffect(() => {
    void fetchData(page);
  }, [page, fetchData]);

  const { status: realtimeStatus, reconnectNonce } = useRealtime();

  // Live page sync: patch the changed report row in place (status/title from
  // the trimmed event payload). Ephemeral — does NOT touch the bell.
  useRealtimeEvent("report.updated", (env) => {
    const id = Number(env.id);
    const patch = env.data as Partial<Pick<Report, "status" | "title" | "download_url">>;
    setData((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  });

  // Recover rows whose updates were missed while offline.
  const pageRef = useRef(page);
  pageRef.current = page;
  useEffect(() => {
    if (reconnectNonce > 0) void fetchData(pageRef.current, { quiet: true });
  }, [reconnectNonce, fetchData]);

  // Status polling fallback: while any visible report is pending/processing
  // and the realtime socket is not open, re-read the list periodically.
  const hasInProgress = data.some(isReportInProgress);
  useEffect(() => {
    if (!hasInProgress || realtimeStatus === "open") return;
    const timer = setInterval(() => {
      void fetchData(pageRef.current, { quiet: true });
    }, REPORT_POLL_MS);
    return () => clearInterval(timer);
  }, [hasInProgress, realtimeStatus, fetchData]);

  const handleGenerate = async (values: GenerateReportPayload) => {
    try {
      await reportsApi.generate(values);
      showToast({
        title: "Reporte solicitado",
        description: "Se está generando; podrás descargarlo cuando esté completado.",
        variant: "success",
      });
      setModalOpen(false);
      void fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    try {
      await reportsApi.download(report);
    } catch (err) {
      handleError(err);
    } finally {
      setDownloadingId(null);
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
      void fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<Report>[] = [
    {
      id: "download",
      label: "Descargar CSV",
      icon: Download,
      variant: "tonal",
      show: (r) => r.status === "completed" && downloadingId !== r.id,
      onClick: (r) => void handleDownload(r),
    },
    {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "destructive",
      onClick: (r) => void handleDelete(r),
    },
  ];

  return (
    <ListPageTemplate
      title="Reportes"
      description="Solicita y descarga reportes (CSV) de inscripciones, asistencia y rendimiento."
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
          <p className="text-xs text-faint">{new Date(r.created_at).toLocaleDateString()}</p>
        </div>
      )}
      empty={{
        icon: BarChart3,
        title: "Sin reportes generados",
        description: "Genera tu primer reporte de inscripciones, asistencia o rendimiento.",
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
