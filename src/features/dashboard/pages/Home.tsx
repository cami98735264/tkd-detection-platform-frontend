import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  FileText,
  Inbox,
  Package,
  Settings,
  Trophy,
  User,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { StatsRow, type StatItem } from "@/components/common/StatsRow";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useParentChildrenStore } from "@/features/athletes/store/parentChildrenStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import {
  userActivityApi,
  type UserActivity,
} from "@/features/users/api/userActivityApi";
import { parentAthletesApi } from "@/features/athletes/api/parentAthletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useAuthReady } from "@/features/auth/components/RoleRoute";
import { cn } from "@/lib/utils";
import type { Athlete } from "@/types/entities";
import type { LucideIcon } from "lucide-react";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  to: string;
  description?: string;
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function endOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { isAdmin, hasRole } = usePermissions();
  const authReady = useAuthReady();
  const { handleError } = useApiErrorHandler();

  const isParent = hasRole(["parent"]);
  const isSportsman = hasRole(["sportsman"]);

  const [stats, setStats] = useState<StatItem[] | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Athlete-specific state
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(true);

  const fetchChildren = useParentChildrenStore((s) => s.fetchChildren);

  useEffect(() => {
    if (isParent) fetchChildren();
  }, [isParent, fetchChildren]);

  // Sportsman attendance summary
  const [summary, setSummary] = useState<{
    total_sessions: number;
    present_sessions: number;
    late_sessions: number;
    absent_sessions: number;
    attendance_rate: number;
  } | null>(null);

  // Sportsman: load athlete profile and attendance summary in parallel.
  // The backend resolves the athlete from request.user for the sportsman role,
  // so the summary call doesn't need to wait for the athlete record.
  useEffect(() => {
    if (!authReady || !isSportsman) return;
    setAthleteLoading(true);
    Promise.allSettled([athletesApi.getMe(), attendanceApi.summary({})])
      .then(([athleteRes, summaryRes]) => {
        if (athleteRes.status === "fulfilled") setAthlete(athleteRes.value);
        else handleError(athleteRes.reason);
        if (summaryRes.status === "fulfilled") setSummary(summaryRes.value);
        else handleError(summaryRes.reason);
      })
      .finally(() => setAthleteLoading(false));
  }, [authReady, isSportsman, handleError]);

  const attendanceRate = summary?.attendance_rate ?? 0;
  const rateTone =
    attendanceRate >= 80 ? "success" : attendanceRate >= 60 ? "warning" : "error";
  const rateBarClass =
    attendanceRate >= 80
      ? "bg-success"
      : attendanceRate >= 60
        ? "bg-warning"
        : "bg-error";

  // Admin stats
  useEffect(() => {
    if (!isAdmin()) return;
    Promise.allSettled([
      athletesApi.list(1),
      programsApi.list(1),
      enrollmentsApi.list(1),
      evaluationsApi.list(1),
      attendanceApi.list({
        start_date: startOfMonthIso(),
        end_date: endOfMonthIso(),
        page: 1,
      }),
    ]).then(([ath, prog, enr, eva, att]) => {
      const attRecords = att.status === "fulfilled" ? att.value.results : [];
      const attTotal = attRecords.length;
      const attPresent = attRecords.filter((r) => r.status === "present").length;
      const attendanceRate =
        attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;

      setStats([
        {
          label: "Deportistas",
          value: ath.status === "fulfilled" ? ath.value.count : 0,
          icon: Users,
          tone: "default",
        },
        {
          label: "Programas",
          value: prog.status === "fulfilled" ? prog.value.count : 0,
          icon: BookOpen,
          tone: "default",
        },
        {
          label: "Inscripciones",
          value: enr.status === "fulfilled" ? enr.value.count : 0,
          icon: ClipboardList,
          tone: "default",
        },
        {
          label: "Asistencia mes",
          value: attendanceRate !== null ? `${attendanceRate}%` : "—",
          icon: CheckCircle,
          tone: "success",
          helper: attendanceRate !== null ? `${attTotal} registros` : "Sin datos del mes",
        },
        {
          label: "Evaluaciones",
          value: eva.status === "fulfilled" ? eva.value.count : 0,
          icon: BarChart3,
          tone: "default",
        },
      ]);
    });
  }, [isAdmin]);

  // Sportsman stats
  useEffect(() => {
    if (!isSportsman) return;
    Promise.allSettled([
      enrollmentsApi.getMyEnrollments(),
      evaluationsApi.list(1),
      attendanceApi.list({ start_date: startOfMonthIso(), end_date: endOfMonthIso(), page: 1 }),
    ]).then(([enrRes, evalRes, attRes]) => {
      const enrollCount = enrRes.status === "fulfilled" ? enrRes.value.length : 0;
      const evalCount = evalRes.status === "fulfilled" ? evalRes.value.count : 0;
      const attRecords = attRes.status === "fulfilled" ? attRes.value.results : [];
      const attTotal = attRecords.length;
      const attPresent = attRecords.filter((r) => r.status === "present").length;
      const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : null;
      setStats([
        { label: "Programas", value: enrollCount, icon: BookOpen },
        { label: "Evaluaciones", value: evalCount, icon: CheckCircle },
        {
          label: "Asistencia mes",
          value: attRate !== null ? `${attRate}%` : "—",
          icon: ClipboardCheck,
          tone: attRate !== null ? "success" : "default",
          helper: attRate !== null ? `${attPresent}/${attTotal} sesiones` : "Sin datos del mes",
        },
      ]);
    });
  }, [isSportsman]);

  // Parent stats
  useEffect(() => {
    if (!isParent) return;
    Promise.allSettled([
      parentAthletesApi.getChildren(),
      enrollmentsApi.getMyEnrollments(),
      evaluationsApi.list(1),
    ]).then(([childrenRes, enrollRes, evalRes]) => {
      const childCount =
        childrenRes.status === "fulfilled" ? childrenRes.value.length : 0;
      const enrollmentCount =
        enrollRes.status === "fulfilled" ? enrollRes.value.length : 0;
      const evalCount =
        evalRes.status === "fulfilled" ? evalRes.value.count : 0;
      setStats([
        { label: "Deportistas", value: childCount, icon: Users },
        {
          label: "Programas",
          value: enrollmentCount > 0 ? 1 : 0,
          icon: BookOpen,
        },
        {
          label: "Inscripciones",
          value: enrollmentCount,
          icon: ClipboardList,
        },
        { label: "Evaluaciones", value: evalCount, icon: CheckCircle },
      ]);
    });
  }, [isParent]);

  const fetchActivity = useCallback(() => {
    setActivityLoading(true);
    userActivityApi
      .list(1)
      .then((res) => setRecentActivity(res.results.slice(0, 8)))
      .catch(() => setRecentActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    if (isSportsman) return;
    fetchActivity();
  }, [fetchActivity, isSportsman]);

  const firstName = user?.full_name?.split(" ")[0] ?? "";

  const quickActions: QuickAction[] = isAdmin()
    ? [
        { label: "Deportistas", icon: Users, to: "/dashboard/deportistas" },
        { label: "Reportes", icon: BarChart3, to: "/dashboard/reportes" },
        { label: "Usuarios", icon: Settings, to: "/dashboard/usuarios" },
        { label: "Programas", icon: BookOpen, to: "/dashboard/programas" },
        { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones" },
        { label: "Inventario", icon: Package, to: "/dashboard/inventario" },
      ]
    : isSportsman
      ? [
          { label: "Asistencia", icon: ClipboardCheck, to: "/dashboard/asistencia", description: "Mi asistencia" },
          { label: "Entrenamientos", icon: Dumbbell, to: "/dashboard/deportista/entrenamientos", description: "Próximas sesiones" },
          { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones", description: "Confirmar asistencia" },
          { label: "Evaluación técnica", icon: Camera, to: "/dashboard/evaluacion-tecnica", description: "Registrar patadas" },
        ]
    : isParent
      ? [
          { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones" },
          { label: "Asistencia", icon: ClipboardCheck, to: "/dashboard/asistencia" },
          {
            label: "Evaluación técnica",
            icon: Camera,
            to: "/dashboard/evaluacion-tecnica",
          },
          { label: "Mi perfil", icon: User, to: "/dashboard/profile" },
        ]
      : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={isSportsman ? `Hola, ${firstName}` : `Bienvenido${user ? `, ${firstName}` : ""}`}
        description={
          isParent
            ? "Resumen de tu actividad como acudiente."
            : isSportsman
            ? "Tu panel de seguimiento como deportista."
            : "Resumen general de la academia."
        }
        eyebrow={isParent ? "Acudiente" : isSportsman ? "Mi entrenamiento" : "Inicio"}
      />

      {/* Sportsman hero band */}
      {isSportsman && (
        athleteLoading ? (
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
        )
      )}

      {stats === null ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <StatsRow items={stats} columns={isSportsman ? 4 : 4} />
      )}

      {/* Sportsman attendance breakdown */}
      {isSportsman && summary && (
        <ScrollReveal>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-lg font-semibold tracking-tight">
                Asistencia
              </CardTitle>
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
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-display font-semibold">{summary.present_sessions}</p>
                  <p className="text-xs text-muted">Presente</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold">{summary.late_sessions}</p>
                  <p className="text-xs text-muted">Tarde</p>
                </div>
                <div>
                  <p className="text-2xl font-display font-semibold">{summary.absent_sessions}</p>
                  <p className="text-xs text-muted">Ausente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {quickActions.length > 0 && (
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg font-semibold tracking-tight">
                {isSportsman ? "Acciones rápidas" : "Acciones rápidas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={isSportsman
                ? "grid grid-cols-2 md:grid-cols-4 gap-3"
                : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              }>
                {quickActions.map((action) => {
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
                        {action.description && (
                          <p className="text-xs text-muted">{action.description}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Sportsman help link */}
      {isSportsman && (
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
      )}

      {/* Recent activity — not shown for sportsman */}
      {!isSportsman && (
        <ScrollReveal>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-lg font-semibold tracking-tight">
                Actividad reciente
              </CardTitle>
              <Activity className="h-4 w-4 text-muted" />
            </CardHeader>
            <CardContent>
            {activityLoading ? (
              <div className="space-y-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Sin actividad reciente"
                description="A medida que el equipo opere el sistema, los eventos aparecerán aquí."
              />
            ) : (
              <ul className="divide-y divide-divider">
                {recentActivity.map((activity) => (
                  <li
                    key={activity.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">
                        {activity.user_name}
                      </p>
                      <p className="text-sm text-muted truncate">
                        {activity.action}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted">
                        {activity.user_role}
                      </span>
                      <p className="mt-1 text-xs text-faint">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}
