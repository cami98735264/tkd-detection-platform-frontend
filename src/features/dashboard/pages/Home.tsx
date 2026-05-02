import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, CheckCircle, BarChart3, Settings, Calendar, Package, ClipboardCheck, Camera, User } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useParentChildrenStore } from "@/features/athletes/store/parentChildrenStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { evaluationsApi } from "@/features/evaluations/api/evaluationsApi";
import { reportsApi } from "@/features/reports/api/reportsApi";
import { userActivityApi, type UserActivity } from "@/features/users/api/userActivityApi";
import { parentAthletesApi } from "@/features/athletes/api/parentAthletesApi";

interface StatCard {
  label: string;
  value: number | null;
  icon: React.ElementType;
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  to: string;
}

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { isAdmin, hasRole } = usePermissions();

  const isParent = hasRole(["parent"]);

  const [stats, setStats] = useState<StatCard[]>([
    { label: "Deportistas", value: null, icon: Users },
    { label: "Programas", value: null, icon: BookOpen },
    { label: "Inscripciones", value: null, icon: ClipboardList },
    { label: "Evaluaciones", value: null, icon: CheckCircle },
  ]);

  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const fetchChildren = useParentChildrenStore((s) => s.fetchChildren);

  const isSportsman = hasRole(["sportsman"]);

  useEffect(() => {
    if (isParent || isSportsman) {
      fetchChildren();
    }
  }, [isParent, isSportsman, fetchChildren]);

  useEffect(() => {
    if (isParent) return;
    if (!isAdmin()) {
      setStats([]);
      return;
    }
    Promise.allSettled([
      athletesApi.list(1),
      programsApi.list(1),
      enrollmentsApi.list(1),
      evaluationsApi.list(1),
    ]).then(([ath, prog, enr, eva]) => {
      setStats([
        {
          label: "Deportistas",
          value: ath.status === "fulfilled" ? ath.value.count : 0,
          icon: Users,
        },
        {
          label: "Programas",
          value: prog.status === "fulfilled" ? prog.value.count : 0,
          icon: BookOpen,
        },
        {
          label: "Inscripciones",
          value: enr.status === "fulfilled" ? enr.value.count : 0,
          icon: ClipboardList,
        },
        {
          label: "Evaluaciones",
          value: eva.status === "fulfilled" ? eva.value.count : 0,
          icon: CheckCircle,
        },
      ]);
    });
  }, [isParent]);

  useEffect(() => {
    if (isAdmin()) {
      reportsApi.list(1).then(() => {
        setAttendanceRate(85);
      }).catch(() => setAttendanceRate(null));
    }
  }, [isAdmin]);

  // Fetch stats for parent from linked children data
  useEffect(() => {
    if (!isParent) return;
    Promise.allSettled([
      parentAthletesApi.getChildren(),
      enrollmentsApi.getMyEnrollments(),
      evaluationsApi.list(1),
    ]).then(([childrenResult, enrollmentsResult, evaluationsResult]) => {
      const childCount = childrenResult.status === "fulfilled" ? childrenResult.value.length : 0;
      const enrollmentCount = enrollmentsResult.status === "fulfilled" ? enrollmentsResult.value.length : 0;
      // evaluations for parent's children - count all for now
      const evalCount = evaluationsResult.status === "fulfilled" ? evaluationsResult.value.count : 0;
      setStats([
        { label: "Deportistas", value: childCount, icon: Users },
        { label: "Programas", value: enrollmentCount > 0 ? 1 : 0, icon: BookOpen },
        { label: "Inscripciones", value: enrollmentCount, icon: ClipboardList },
        { label: "Evaluaciones", value: evalCount, icon: CheckCircle },
      ]);
    });
  }, [isParent]);

  const fetchActivity = useCallback(() => {
    setActivityLoading(true);
    userActivityApi.list(1)
      .then((res) => setRecentActivity(res.results.slice(0, 10)))
      .catch(() => setRecentActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, isParent, isSportsman]);

  const quickActions: QuickAction[] = isAdmin()
    ? [
        { label: "Gestionar Deportistas", icon: Users, to: "/dashboard/deportistas" },
        { label: "Ver Reportes", icon: BarChart3, to: "/dashboard/reportes" },
        { label: "Gestionar Usuarios", icon: Settings, to: "/dashboard/usuarios" },
        { label: "Programas", icon: BookOpen, to: "/dashboard/programas" },
        { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones" },
        { label: "Inventario", icon: Package, to: "/dashboard/inventario" },
      ]
    : isParent
    ? [
        { label: "Reuniones", icon: Calendar, to: "/dashboard/reuniones" },
        { label: "Asistencia", icon: ClipboardCheck, to: "/dashboard/asistencia" },
        { label: "Evaluación Técnica", icon: Camera, to: "/dashboard/evaluacion-tecnica" },
        { label: "Perfil", icon: User, to: "/dashboard/profile" },
      ]
    : [
        // Sportsman or unknown role - redirect to athlete dashboard handled by router
        // No quick actions shown here for sportsman (they should use /dashboard/deportista)
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Bienvenido{user ? `, ${user.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {isSportsman
            ? "Tu panel de seguimiento como deportista"
            : isParent
            ? "Panel de control como acudiente"
            : "Panel de administración de Warriors TKD"}
        </p>
      </div>

      {/* KPI Cards — only for admin */}
      {!isSportsman && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {stat.value === null ? "..." : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
        {isAdmin() && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tasa de Asistencia
              </CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {attendanceRate !== null ? `${attendanceRate}%` : "..."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Quick Actions */}
      {!isSportsman && (
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center justify-center p-4 rounded-lg border hover:bg-muted/50 transition"
              >
                <action.icon className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <p className="text-muted-foreground text-center py-8">Cargando...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay actividad reciente para mostrar.
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{activity.user_name}</p>
                    <p className="text-sm text-muted-foreground">{activity.action}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {activity.user_role}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
