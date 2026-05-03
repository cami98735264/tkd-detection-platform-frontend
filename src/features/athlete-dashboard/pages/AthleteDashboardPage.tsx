import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Camera,
  ClipboardCheck,
  Dumbbell,
  FileText,
  type LucideIcon,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { StatsRow } from "@/components/common/StatsRow";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useAuthReady } from "@/features/auth/components/RoleRoute";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import type { Athlete } from "@/types/entities";

type ViewMode = "weekly" | "monthly" | "yearly";

interface AttendanceSummary {
  total_sessions: number;
  present_sessions: number;
  late_sessions: number;
  absent_sessions: number;
  attendance_rate: number;
}

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
];

const ACTIONS: { to: string; icon: LucideIcon; label: string; description: string }[] = [
  {
    to: "/dashboard/asistencia",
    icon: ClipboardCheck,
    label: "Asistencia",
    description: "Mi asistencia",
  },
  {
    to: "/dashboard/deportista/entrenamientos",
    icon: Dumbbell,
    label: "Entrenamientos",
    description: "Próximas sesiones",
  },
  {
    to: "/dashboard/reuniones",
    icon: Calendar,
    label: "Reuniones",
    description: "Confirmar asistencia",
  },
  {
    to: "/dashboard/evaluacion-tecnica",
    icon: Camera,
    label: "Evaluación técnica",
    description: "Registrar patadas",
  },
];

export default function AthleteDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const authReady = useAuthReady();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    athletesApi
      .getMe()
      .then(setAthlete)
      .catch(handleError)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady]);

  const loadSummary = useCallback(() => {
    if (!athlete) return;
    attendanceApi
      .summary({ athlete_id: athlete.id })
      .then(setSummary)
      .catch(handleError);
  }, [athlete, handleError]);

  useEffect(() => {
    if (athlete) loadSummary();
  }, [athlete, loadSummary]);

  const attendanceRate = summary?.attendance_rate ?? 0;
  const rateTone =
    attendanceRate >= 80 ? "success" : attendanceRate >= 60 ? "warning" : "error";
  const rateBarClass =
    attendanceRate >= 80
      ? "bg-success"
      : attendanceRate >= 60
        ? "bg-warning"
        : "bg-error";

  const firstName = user?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Tu panel de seguimiento como deportista."
        eyebrow="Mi entrenamiento"
      />

      {/* Hero band */}
      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : athlete ? (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/8 via-surface to-surface-2">
          <CardContent className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <p className="font-display text-3xl font-semibold tracking-tight text-text">
                {athlete.full_name}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {athlete.belt_actual_name && (
                  <Badge variant="tonal">{athlete.belt_actual_name}</Badge>
                )}
                {athlete.categoria_competencia_name && (
                  <Badge variant="outline">{athlete.categoria_competencia_name}</Badge>
                )}
                {athlete.date_of_birth && (
                  <span className="text-muted">
                    Nacido el {new Date(athlete.date_of_birth).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
              <Trophy className="h-9 w-9" strokeWidth={1.75} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Trophy}
            title="Sin perfil deportivo vinculado"
            description="Aún no tienes un perfil de atleta vinculado a tu cuenta. Contacta al administrador para completar tu inscripción."
          />
        </Card>
      )}

      {/* Stats */}
      {summary && (
        <StatsRow
          columns={4}
          items={[
            {
              label: "Asistencia",
              value: `${attendanceRate}%`,
              icon: BarChart3,
              tone: rateTone,
              helper: `${summary.total_sessions} sesiones`,
            },
            {
              label: "Presente",
              value: summary.present_sessions,
              icon: ClipboardCheck,
              tone: "success",
            },
            {
              label: "Tarde",
              value: summary.late_sessions,
              icon: Calendar,
              tone: "warning",
            },
            {
              label: "Ausente",
              value: summary.absent_sessions,
              icon: Calendar,
              tone: "error",
            },
          ]}
        />
      )}

      {/* Quick actions */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-interactive hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-interactive group-hover:bg-primary/15">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-text">{action.label}</p>
                  <p className="text-xs text-muted">{action.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Attendance breakdown */}
      <ScrollReveal>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-lg font-semibold tracking-tight">
            Asistencia
          </CardTitle>
          <div className="flex gap-1 rounded-md bg-surface-2 p-1">
            {VIEW_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setViewMode(m.value)}
                aria-pressed={viewMode === m.value}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                  viewMode === m.value
                    ? "bg-surface text-text shadow-subtle"
                    : "text-muted hover:text-text",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tasa de asistencia</span>
              <span
                className={cn(
                  "font-display font-semibold tabular-nums",
                  rateTone === "success" && "text-success",
                  rateTone === "warning" && "text-warning",
                  rateTone === "error" && "text-error",
                )}
              >
                {attendanceRate}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full transition-all duration-300", rateBarClass)}
                style={{ width: `${attendanceRate}%` }}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={attendanceRate}
                role="progressbar"
                aria-label="Tasa de asistencia"
              />
            </div>
          </div>
          {!summary && <Skeleton className="h-12 w-full" />}
        </CardContent>
      </Card>
      </ScrollReveal>

      {/* Help link */}
      <ScrollReveal>
        <Link
          to="/dashboard/ayuda"
          className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-interactive hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-interactive group-hover:bg-primary/15">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-text">Manual de usuario</p>
            <p className="text-sm text-muted">Guías rápidas y tutoriales</p>
          </div>
        </Link>
      </ScrollReveal>
    </div>
  );
}
