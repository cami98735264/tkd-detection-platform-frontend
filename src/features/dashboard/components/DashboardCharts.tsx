import { useCallback, useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  Users,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Clipboard,
  UserCheck,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import {
  dashboardApi,
  type DashboardStats,
  type DashboardCharts,
} from "@/features/dashboard/api/dashboardApi";

const STAT_ICONS = {
  total_deportistas: Users,
  total_programas: BookOpen,
  total_inscripciones: ClipboardList,
  asistencia_mes: CalendarCheck,
  total_evaluaciones: Clipboard,
  total_usuarios: UserCheck,
};

const STAT_LABELS: Record<string, string> = {
  total_deportistas: "Deportistas",
  total_programas: "Programas",
  total_inscripciones: "Inscripciones",
  asistencia_mes: "Asistencia del mes",
  total_evaluaciones: "Evaluaciones",
  total_usuarios: "Usuarios",
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card className="bg-surface hover:border-primary/50 transition-colors">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-text">{value.toLocaleString()}</p>
          <p className="text-sm text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChart({
  data,
  title,
}: {
  data: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text">{title}</p>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-24 truncate text-xs text-muted">{item.label}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs text-muted">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({
  data,
  title,
}: {
  data: { label: string; value: number; color?: string }[];
  title: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let cumulative = 0;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text">{title}</p>
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
            {data.map((item, i) => {
              const pct = total > 0 ? item.value / total : 0;
              const dash = pct * 100;
              const gap = 0.5;
              return (
                <circle
                  key={item.label}
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-purple-500"][i]}
                  strokeWidth="4"
                  strokeDasharray={`${dash} ${100 - dash - gap}`}
                  strokeDashoffset={-(cumulative / 100) * 94.2}
                  className="transition-all duration-300"
                />
              );
            })}
            <circle cx="18" cy="18" r="11" fill="none" className="fill-surface" />
          </svg>
          <span className="absolute text-xs font-bold text-text">{total}</span>
        </div>
        <div className="flex flex-col gap-1">
          {data.map((item, i) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2 w-2 rounded-full ${["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-purple-500"][i]}`}
              />
              <span className="text-xs text-muted">
                {item.label} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardCharts() {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes] = await Promise.all([
        dashboardApi.stats(),
        dashboardApi.charts(),
      ]);
      setStats(statsRes);
      setCharts(chartsRes);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExportPdf = async () => {
    try {
      const res = await dashboardApi.exportPdf();
      const data = res;
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text("Reporte General - TKD Warriors", 14, 20);
      doc.setFontSize(12);
      doc.text(`Periodo: ${data.period.month} ${data.period.year}`, 14, 28);
      doc.text(`Generado: ${new Date(data.generated_at).toLocaleString()}`, 14, 35);

      doc.setFontSize(14);
      doc.text("Estadísticas Resumen", 14, 48);
      doc.setFontSize(11);
      const summaryData = [
        ["Deportistas", data.summary.total_deportistas],
        ["Programas", data.summary.total_programas],
        ["Inscripciones", data.summary.total_inscripciones],
        ["Asistencia del mes", data.summary.asistencia_mes],
        ["Evaluaciones", data.summary.total_evaluaciones],
        ["Usuarios", data.summary.total_usuarios],
      ];
      // @ts-expect-error jspdf-autotable types
      autoTable(doc, { startY: 52, head: [["Métrica", "Valor"]], body: summaryData });

      if (data.distributions.cinturones.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Distribución por Cinturón", 14, 20);
        const beltData = data.distributions.cinturones.map((c) => [c.nombre, c.cantidad]);
        // @ts-expect-error jspdf-autotable types
        autoTable(doc, { startY: 28, head: [["Cinturón", "Cantidad"]], body: beltData });
      }

      if (data.distributions.categorias.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Distribución por Categoría", 14, 20);
        const catData = data.distributions.categorias.map((c) => [c.nombre, c.cantidad]);
        // @ts-expect-error jspdf-autotable types
        autoTable(doc, { startY: 28, head: [["Categoría", "Cantidad"]], body: catData });
      }

      if (data.asistencia_detalle.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text("Detalle de Asistencia del Mes", 14, 20);
        const attData = data.asistencia_detalle.map((a) => [
          a.estado === "present" ? "Presente" : a.estado === "absent" ? "Ausente" : "Tarde",
          a.cantidad,
        ]);
        // @ts-expect-error jspdf-autotable types
        autoTable(doc, { startY: 28, head: [["Estado", "Cantidad"]], body: attData });
      }

      doc.save(`reporte-tkd-${data.period.month}-${data.period.year}.pdf`);
      showToast({ title: "PDF descargado", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  if (loading || !stats || !charts) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const statEntries = Object.entries(stats).map(([key, value]) => ({
    key,
    value,
    label: STAT_LABELS[key] ?? key,
    icon: STAT_ICONS[key as keyof typeof STAT_ICONS] ?? Users,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Estadísticas generales</h2>
          <p className="text-sm text-muted">Datos actualizados en tiempo real</p>
        </div>
        <Button onClick={handleExportPdf} variant="outline" size="sm">
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statEntries.map(({ key, value, label, icon }) => (
          <StatCard key={key} label={label} value={value} icon={icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por cinturón</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.belt_distribution.length > 0 ? (
              <BarChart
                title="Atletas por cinturón"
                data={charts.belt_distribution.map((d) => ({
                  label: d.belt,
                  value: d.count,
                }))}
              />
            ) : (
              <p className="text-sm text-muted">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.category_distribution.length > 0 ? (
              <BarChart
                title="Atletas por categoría"
                data={charts.category_distribution.map((d) => ({
                  label: d.category,
                  value: d.count,
                }))}
              />
            ) : (
              <p className="text-sm text-muted">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de asistencia del mes</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.attendance_by_status.length > 0 ? (
              <DonutChart
                title="Presente / Ausente / Tarde"
                data={charts.attendance_by_status.map((d) => ({
                  label:
                    d.status === "present"
                      ? "Presente"
                      : d.status === "absent"
                        ? "Ausente"
                        : d.status === "late"
                          ? "Tarde"
                          : d.status,
                  value: d.count,
                }))}
              />
            ) : (
              <p className="text-sm text-muted">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia de inscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            {charts.enrollment_trend.length > 0 ? (
              <BarChart
                title="Inscripciones por mes (últimos 12)"
                data={charts.enrollment_trend.map((d) => ({
                  label: d.month,
                  value: d.count,
                }))}
              />
            ) : (
              <p className="text-sm text-muted">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
