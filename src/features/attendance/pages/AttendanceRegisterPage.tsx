import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { editionsApi } from "@/features/programs/api/editionsApi";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { attendanceApi, type AttendanceStatus, type AttendanceBulkRecord } from "@/features/attendance/api/attendanceApi";
import type { Edition } from "@/types/entities";
import type { Athlete } from "@/types/entities";

interface StudentAttendance {
  athlete_id: number;
  athlete_name: string;
  status: AttendanceStatus;
  observaciones: string;
}

export default function AttendanceRegisterPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<number | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [hora, setHora] = useState(() => new Date().toTimeString().slice(0, 5));
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load active editions
  useEffect(() => {
    setLoadingEditions(true);
    editionsApi.list(1, undefined, "")
      .then((res) => setEditions(res.results.filter((e: Edition) => e.active)))
      .catch(handleError)
      .finally(() => setLoadingEditions(false));
  }, [handleError]);

  // Load athletes when edition is selected
  const loadAthletes = useCallback((editionId: number) => {
    setLoadingAthletes(true);
    // Get athletes enrolled in this edition's program
    athletesApi.list(1, "", "active")
      .then((res) => setAthletes(res.results))
      .catch(handleError)
      .finally(() => setLoadingAthletes(false));
  }, [handleError]);

  // Reset athletes when edition changes
  useEffect(() => {
    if (selectedEditionId) {
      loadAthletes(selectedEditionId);
      setAttendance([]);
    }
  }, [selectedEditionId, loadAthletes]);

  const handleStatusChange = (athleteId: number, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) =>
        a.athlete_id === athleteId ? { ...a, status } : a
      )
    );
  };

  const handleObservacionesChange = (athleteId: number, observaciones: string) => {
    setAttendance((prev) =>
      prev.map((a) =>
        a.athlete_id === athleteId ? { ...a, observaciones } : a
      )
    );
  };

  const handleSelectAll = (status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) => ({ ...a, status }))
    );
  };

  const handleSubmit = async () => {
    if (!selectedEditionId) {
      showToast({ title: "Selecciona una edición", variant: "error" });
      return;
    }
    if (attendance.length === 0) {
      showToast({ title: "No hay estudiantes para registrar", variant: "error" });
      return;
    }

    const ok = await confirm({
      title: "Registrar Asistencia",
      description: `¿Registrar asistencia para ${attendance.length} estudiantes?`,
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      const records: AttendanceBulkRecord[] = attendance.map((a) => ({
        athlete_id: a.athlete_id,
        status: a.status,
        observaciones: a.observaciones,
      }));

      const result = await attendanceApi.bulkCreate({
        edition_id: selectedEditionId,
        fecha,
        hora: hora || undefined,
        records,
      });

      if (result.errors.length > 0) {
        showToast({
          title: `Errores: ${result.errors.length}`,
          description: result.errors.map((e) => `Atleta ${e.athlete_id}: ${e.error}`).join(", "),
          variant: "warning",
        });
      } else {
        showToast({ title: `Asistencia registrada: ${result.created} registros`, variant: "success" });
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Registrar Asistencia</h1>
      </div>

      {/* Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Edición del Programa</Label>
              <Select
                value={selectedEditionId ? String(selectedEditionId) : ""}
                onValueChange={(v) => setSelectedEditionId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar edición" />
                </SelectTrigger>
                <SelectContent>
                  {editions.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.program_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hora (opcional)</Label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Card */}
      {selectedEditionId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Estudiantes</CardTitle>
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
              <p className="text-muted-foreground">No hay estudiantes registrados en esta edición.</p>
            ) : (
              <div className="space-y-3">
                {athletes.map((athlete) => {
                  const existing = attendance.find((a) => a.athlete_id === athlete.id);
                  const currentStatus = existing?.status || "absent";

                  return (
                    <div
                      key={athlete.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{athlete.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {athlete.belt_actual_name || "Sin grado"} - {athlete.categoria_competencia_name || "Sin categoría"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={currentStatus === "present" ? "default" : "outline"}
                          className={currentStatus === "present" ? "bg-green-600 hover:bg-green-700" : ""}
                          onClick={() => {
                            if (!attendance.find((a) => a.athlete_id === athlete.id)) {
                              setAttendance((prev) => [
                                ...prev,
                                { athlete_id: athlete.id, athlete_name: athlete.full_name, status: "present", observaciones: "" },
                              ]);
                            } else {
                              handleStatusChange(athlete.id, "present");
                            }
                          }}
                        >
                          Presente
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === "late" ? "default" : "outline"}
                          className={currentStatus === "late" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                          onClick={() => {
                            if (!attendance.find((a) => a.athlete_id === athlete.id)) {
                              setAttendance((prev) => [
                                ...prev,
                                { athlete_id: athlete.id, athlete_name: athlete.full_name, status: "late", observaciones: "" },
                              ]);
                            } else {
                              handleStatusChange(athlete.id, "late");
                            }
                          }}
                        >
                          Tarde
                        </Button>
                        <Button
                          size="sm"
                          variant={currentStatus === "absent" ? "default" : "outline"}
                          className={currentStatus === "absent" ? "bg-red-600 hover:bg-red-700" : ""}
                          onClick={() => {
                            if (!attendance.find((a) => a.athlete_id === athlete.id)) {
                              setAttendance((prev) => [
                                ...prev,
                                { athlete_id: athlete.id, athlete_name: athlete.full_name, status: "absent", observaciones: "" },
                              ]);
                            } else {
                              handleStatusChange(athlete.id, "absent");
                            }
                          }}
                        >
                          Ausente
                        </Button>
                      </div>

                      <Input
                        placeholder="Observaciones..."
                        className="w-48"
                        value={existing?.observaciones || ""}
                        onChange={(e) => handleObservacionesChange(athlete.id, e.target.value)}
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
    </div>
  );
}
