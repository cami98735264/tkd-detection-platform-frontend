import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/lib/http";
import { attendanceApi, type AttendanceStatus } from "@/features/attendance/api/attendanceApi";
import type { Program } from "@/types/entities";

interface AthleteOption {
  athlete_id: number;
  athlete_name: string;
}

interface StudentAttendance {
  athlete_id: number;
  athlete_name: string;
  status: AttendanceStatus;
  observaciones: string;
}

export default function AttendanceRegisterPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View mode: "register" or "results"
  const [viewMode, setViewMode] = useState<"register" | "results">("register");
  const [submitResult, setSubmitResult] = useState<{ created: number; fecha: string; hora: string } | null>(null);

  // Load active programs - runs once on mount
  useEffect(() => {
    axiosInstance.get('/programs/?page=1')
      .then((res) => {
        const programsData = res.data as { count?: number; results?: Program[] };
        setPrograms((programsData.results || []).filter((p: Program) => p.active));
      })
      .catch((err) => {
        console.error('[Attendance] Error loading programs:', err);
        window.alert("Error cargando programas");
      });
  }, []);

  // Load enrolled athletes when program is selected
  useEffect(() => {
    if (!selectedProgramId) {
      setAthletes([]);
      setAttendance([]);
      return;
    }

    setLoadingAthletes(true);
    axiosInstance.get(`/enrollments/?program_id=${selectedProgramId}&page=1`)
      .then((res) => {
        const data = res.data as { count?: number; results?: { athlete: number; athlete_name?: string }[] };
        const athleteOptions: AthleteOption[] = (data.results || []).map((enrollment) => ({
          athlete_id: enrollment.athlete,
          athlete_name: enrollment.athlete_name || `Athlete #${enrollment.athlete}`,
        }));
        setAthletes(athleteOptions);
        setAttendance(athleteOptions.map((a) => ({
          athlete_id: a.athlete_id,
          athlete_name: a.athlete_name,
          status: "absent" as AttendanceStatus,
          observaciones: "",
        })));
      })
      .catch((err) => {
        console.error('[Attendance] Load error:', err);
        window.alert(`Error cargando deportistas: ${err.message}`);
      })
      .finally(() => setLoadingAthletes(false));
  }, [selectedProgramId]);

  const handleStatusChange = (athleteId: number, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) => (a.athlete_id === athleteId ? { ...a, status } : a))
    );
  };

  const handleObservacionesChange = (athleteId: number, observaciones: string) => {
    setAttendance((prev) =>
      prev.map((a) => (a.athlete_id === athleteId ? { ...a, observaciones } : a))
    );
  };

  const handleSelectAll = (status: AttendanceStatus) => {
    setAttendance((prev) => prev.map((a) => ({ ...a, status })));
  };

  const handleSubmit = async () => {
    if (!selectedProgramId) {
      window.alert("Selecciona un programa");
      return;
    }
    if (attendance.length === 0) {
      window.alert("No hay estudiantes para registrar");
      return;
    }

    const ok = window.confirm(`¿Registrar asistencia para ${attendance.length} estudiantes?`);
    if (!ok) return;

    setSubmitting(true);
    try {
      const result = await attendanceApi.bulkCreate({
        program_id: selectedProgramId,
        records: attendance.map((a) => ({
          athlete_id: a.athlete_id,
          status: a.status,
          observaciones: a.observaciones,
        })),
      });

      if (result.errors && result.errors.length > 0) {
        window.alert(`Errores: ${result.errors.map((e) => `Atleta ${e.athlete_id}: ${e.error}`).join(", ")}`);
      } else {
        setSubmitResult({ created: result.created, fecha: result.fecha || "", hora: result.hora || "" });
        setViewMode("results");
        setSelectedProgramId(null);
        setAthletes([]);
        setAttendance([]);
      }
    } catch (err) {
      window.alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Registrar Asistencia</h1>
      </div>

      {/* Registration Form - only show when in register mode */}
      {viewMode === "register" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program-select">Programa</Label>
                <select
                  id="program-select"
                  className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
                  value={selectedProgramId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedProgramId(val ? Number(val) : null);
                  }}
                >
                  <option value="">Seleccionar programa</option>
                  {programs.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                La fecha y hora se registran automáticamente al guardar.
              </p>
            </CardContent>
          </Card>

          {selectedProgramId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Estudiantes Inscritos ({athletes.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleSelectAll("present")}>
                      Todos Presentes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSelectAll("absent")}>
                      Todos Ausentes
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleSelectAll("late")}>
                      Todos Tardes
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAthletes ? (
                  <p>Cargando estudiantes...</p>
                ) : athletes.length === 0 ? (
                  <p className="text-muted-foreground">
                    No hay deportistas inscritos en este programa.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {athletes.map((athlete) => {
                      const existing = attendance.find((a) => a.athlete_id === athlete.athlete_id);
                      const currentStatus = existing?.status || "absent";

                      return (
                        <div
                          key={athlete.athlete_id}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{athlete.athlete_name}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={currentStatus === "present" ? "default" : "outline"}
                              className={currentStatus === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                              onClick={() => handleStatusChange(athlete.athlete_id, "present")}
                            >
                              Presente
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus === "late" ? "default" : "outline"}
                              className={currentStatus === "late" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                              onClick={() => handleStatusChange(athlete.athlete_id, "late")}
                            >
                              Tarde
                            </Button>
                            <Button
                              size="sm"
                              variant={currentStatus === "absent" ? "default" : "outline"}
                              className={currentStatus === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
                              onClick={() => handleStatusChange(athlete.athlete_id, "absent")}
                            >
                              Ausente
                            </Button>
                          </div>

                          <Input
                            placeholder="Observaciones..."
                            className="w-48"
                            value={existing?.observaciones || ""}
                            onChange={(e) => handleObservacionesChange(athlete.athlete_id, e.target.value)}
                          />
                        </div>
                      );
                    })}

                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || attendance.length === 0}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {submitting ? "Registrando..." : `Registrar Asistencia (${attendance.length})`}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Results View - show after successful registration */}
      {viewMode === "results" && submitResult && (
        <Card>
          <CardHeader>
            <CardTitle>Asistencia Registrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-medium text-green-800">
                {submitResult.created} registros creados exitosamente
              </p>
              <p className="text-sm text-green-600 mt-1">
                Fecha: {submitResult.fecha} — Hora: {submitResult.hora}
              </p>
            </div>
            <Button
              onClick={() => setViewMode("register")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Registrar Nueva Asistencia
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}