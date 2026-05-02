import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  BarChart3, Calendar, Dumbbell,
  FileText, User, Camera, ClipboardCheck
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { attendanceApi } from "@/features/attendance/api/attendanceApi";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import type { Athlete } from "@/types/entities";

type ViewMode = "weekly" | "monthly" | "yearly";

export default function AthleteDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();

  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);

  // Attendance summary
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [summary, setSummary] = useState<{
    total_sessions: number;
    present_sessions: number;
    late_sessions: number;
    absent_sessions: number;
    attendance_rate: number;
  } | null>(null);

  // Load athlete data
  useEffect(() => {
    setLoading(true);
    athletesApi.getMe()
      .then((data) => {
        console.log("athlete data:", data);
        setAthlete(data);
      })
      .catch((err) => {
        console.error("athlete error:", err);
        handleError(err);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load attendance summary when athlete or date range changes
  const loadSummary = useCallback(() => {
    if (!athlete) return;
    attendanceApi.summary({ athlete_id: athlete.id })
      .then(setSummary)
      .catch((err) => handleError(err));
  }, [athlete, handleError]);

  useEffect(() => {
    if (athlete) loadSummary();
  }, [athlete, loadSummary]);

  const updateRange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const attendanceRate = summary?.attendance_rate ?? 0;
  const rateColor = attendanceRate >= 80 ? "text-green-600" : attendanceRate >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">Bienvenido, {user?.full_name?.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Tu panel de seguimiento como deportista</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User size={18} /> Mi Perfil Deportivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando...</p>
          ) : athlete ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre</p>
                <p className="font-medium">{athlete.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{athlete.categoria_competencia_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cinturón</p>
                <p className="font-medium">{athlete.belt_actual_name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha Nac.</p>
                <p className="font-medium">
                  {athlete.date_of_birth ? new Date(athlete.date_of_birth).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">
              No tienes un perfil de atleta vinculado. Contacta al administrador.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/dashboard/asistencia"
          className="flex flex-col items-center p-4 bg-white rounded-lg border hover:shadow-md transition"
        >
          <ClipboardCheck className="text-green-600 mb-2" size={32} />
          <span className="text-sm font-medium">Asistencia</span>
          <span className="text-xs text-muted-foreground">Ver mi asistencia</span>
        </Link>

        <Link
          to="/dashboard/entrenamientos"
          className="flex flex-col items-center p-4 bg-white rounded-lg border hover:shadow-md transition"
        >
          <Dumbbell className="text-blue-600 mb-2" size={32} />
          <span className="text-sm font-medium">Entrenamientos</span>
          <span className="text-xs text-muted-foreground">Ver sesiones</span>
        </Link>

        <Link
          to="/dashboard/reuniones"
          className="flex flex-col items-center p-4 bg-white rounded-lg border hover:shadow-md transition"
        >
          <Calendar className="text-purple-600 mb-2" size={32} />
          <span className="text-sm font-medium">Reuniones</span>
          <span className="text-xs text-muted-foreground">Confirmar asistencia</span>
        </Link>

        <Link
          to="/dashboard/evaluacion-tecnica"
          className="flex flex-col items-center p-4 bg-white rounded-lg border hover:shadow-md transition"
        >
          <Camera className="text-orange-600 mb-2" size={32} />
          <span className="text-sm font-medium">Evaluación Técnica</span>
          <span className="text-xs text-muted-foreground">Registrar patadas</span>
        </Link>
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={18} /> Resumen de Asistencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View mode toggle */}
          <div className="flex gap-2">
            {(["weekly", "monthly", "yearly"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => updateRange(mode)}
                className={`px-3 py-1 rounded text-sm ${
                  viewMode === mode
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {mode === "weekly" ? "Semanal" : mode === "monthly" ? "Mensual" : "Anual"}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tasa de Asistencia</span>
              <span className={`font-bold ${rateColor}`}>{attendanceRate}%</span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  attendanceRate >= 80 ? "bg-green-500" : attendanceRate >= 60 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          {summary && (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{summary.present_sessions}</p>
                <p className="text-xs text-green-700">Presente</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{summary.late_sessions}</p>
                <p className="text-xs text-yellow-700">Tarde</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{summary.absent_sessions}</p>
                <p className="text-xs text-red-700">Ausente</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{summary.total_sessions}</p>
                <p className="text-xs text-gray-700">Total Sesiones</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Link */}
      <Link
        to="/dashboard/ayuda"
        className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100 transition"
      >
        <FileText className="text-blue-600" size={20} />
        <div>
          <p className="font-medium text-blue-900">Manual de Usuario</p>
          <p className="text-sm text-blue-700">Consulta guías y tutoriales</p>
        </div>
      </Link>
    </div>
  );
}
