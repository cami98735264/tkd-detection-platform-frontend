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
  Inbox,
  Package,
  Settings,
  User,
  Users,
} from "lucide-react";

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

interface QuickAction {
  label: string;
  icon: React.ElementType;
  to: string;
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

  const isParent = hasRole(["parent"]);
  const isSportsman = hasRole(["sportsman"]);

  const [stats, setStats] = useState<StatItem[] | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchChildren = useParentChildrenStore((s) => s.fetchChildren);

  useEffect(() => {
    if (isParent || isSportsman) fetchChildren();
  }, [isParent, isSportsman, fetchChildren]);

  // Admin stats — fetch real numbers including monthly attendance rate
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

  const quickActions: QuickAction[] = isAdmin()
    ? [
        { label: "Deportistas", icon: Users, to: "/dashboard/deportistas" },
        { label: "Reportes", icon: BarChart3, to: "/dashboard/reportes" },
        { label: "Usuarios", icon: Settings, to: "/dashboard/usuarios" },
        { label: "Programas", icon: BookOpen, to: "/dashboard/programas" },
        { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones" },
        { label: "Inventario", icon: Package, to: "/dashboard/inventario" },
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

  if (isSportsman) {
    // Sportsman has its own dashboard at /dashboard/deportista
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Bienvenido${user ? `, ${user.full_name.split(" ")[0]}` : ""}`}
          description="Accede a tu panel de seguimiento desde el menú lateral."
          eyebrow="Inicio"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bienvenido${user ? `, ${user.full_name.split(" ")[0]}` : ""}`}
        description={
          isParent
            ? "Resumen de tu actividad como acudiente."
            : "Resumen general de la academia."
        }
        eyebrow={isParent ? "Acudiente" : "Inicio"}
      />

      {stats === null ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <StatsRow items={stats} columns={4} />
      )}

      {quickActions.length > 0 && (
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg font-semibold tracking-tight">
                Acciones rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="group flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-4 transition-interactive hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-interactive group-hover:bg-primary/15">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium text-text text-center">
                        {action.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

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
    </div>
  );
}
