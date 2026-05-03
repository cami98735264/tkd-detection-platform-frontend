import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/lib/http";
import { formatApiErrorValue } from "@/types/api";
import {
  attendanceApi,
  type AttendanceStatus,
} from "@/features/attendance/api/attendanceApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
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

const STATUS_BUTTONS: {
  status: AttendanceStatus;
  label: string;
  icon: typeof CheckCircle2;
}[] = [
  { status: "present", label: "Presente", icon: CheckCircle2 },
  { status: "late", label: "Tarde", icon: Clock },
  { status: "absent", label: "Ausente", icon: XCircle },
];

function rowToneFor(status: AttendanceStatus): string {
  if (status === "present") return "border-success/40 bg-success/8";
  if (status === "late") return "border-warning/40 bg-warning/12";
  if (status === "absent") return "border-error/30 bg-error/5";
  return "border-border bg-surface";
}

export default function AttendanceRegisterPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState<"register" | "results">("register");
  const [submitResult, setSubmitResult] = useState<{
    created: number;
    fecha: string;
    hora: string;
  } | null>(null);

  useEffect(() => {
    axiosInstance
      .get("/programs/?page=1")
      .then((res) => {
        const data = res.data as { count?: number; results?: Program[] };
        setPrograms((data.results || []).filter((p: Program) => p.active));
      })
      .catch((err) => {
        handleError(err);
      });
  }, [handleError]);

  useEffect(() => {
    if (!selectedProgramId) {
      setAthletes([]);
      setAttendance([]);
      return;
    }
    setLoadingAthletes(true);
    axiosInstance
      .get(`/enrollments/?program_id=${selectedProgramId}&page=1`)
      .then((res) => {
        const data = res.data as {
          count?: number;
          results?: { athlete: number; athlete_name?: string }[];
        };
        const opts: AthleteOption[] = (data.results || []).map((e) => ({
          athlete_id: e.athlete,
          athlete_name: e.athlete_name || `Athlete #${e.athlete}`,
        }));
        setAthletes(opts);
        setAttendance(
          opts.map((a) => ({
            athlete_id: a.athlete_id,
            athlete_name: a.athlete_name,
            status: "absent" as AttendanceStatus,
            observaciones: "",
          })),
        );
      })
      .catch(handleError)
      .finally(() => setLoadingAthletes(false));
  }, [selectedProgramId, handleError]);

  const handleStatusChange = (athleteId: number, status: AttendanceStatus) => {
    setAttendance((prev) =>
      prev.map((a) => (a.athlete_id === athleteId ? { ...a, status } : a)),
    );
  };

  const handleObservacionesChange = (athleteId: number, observaciones: string) => {
    setAttendance((prev) =>
      prev.map((a) => (a.athlete_id === athleteId ? { ...a, observaciones } : a)),
    );
  };

  const handleSelectAll = (status: AttendanceStatus) => {
    setAttendance((prev) => prev.map((a) => ({ ...a, status })));
  };

  const handleSubmit = async () => {
    if (!selectedProgramId) {
      showToast({ title: "Selecciona un programa", variant: "warning" });
      return;
    }
    if (attendance.length === 0) {
      showToast({ title: "No hay deportistas para registrar", variant: "warning" });
      return;
    }

    const ok = await confirm({
      title: "Registrar asistencia",
      description: `¿Registrar asistencia para ${attendance.length} deportista${attendance.length !== 1 ? "s" : ""}?`,
    });
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
        showToast({
          title: "Errores al registrar",
          description: result.errors
            .map((e) => `Atleta ${e.athlete_id}: ${formatApiErrorValue(e.error)}`)
            .join("; "),
          variant: "error",
          duration: 6000,
        });
      } else {
        setSubmitResult({
          created: result.created,
          fecha: result.fecha || "",
          hora: result.hora || "",
        });
        setViewMode("results");
        setSelectedProgramId(null);
        setAthletes([]);
        setAttendance([]);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    present: attendance.filter((a) => a.status === "present").length,
    late: attendance.filter((a) => a.status === "late").length,
    absent: attendance.filter((a) => a.status === "absent").length,
  };

  if (viewMode === "results" && submitResult) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Asistencia registrada"
          description="Los registros se guardaron correctamente."
          eyebrow="Asistencia"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold tracking-tight text-text">
                {submitResult.created} registros creados
              </p>
              <p className="mt-1 text-sm text-muted">
                {submitResult.fecha} · {submitResult.hora}
              </p>
            </div>
            <Button onClick={() => setViewMode("register")}>
              <RefreshCw className="h-4 w-4" />
              Registrar nueva asistencia
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 sm:pb-0">
      <PageHeader
        title="Registrar asistencia"
        description="Marca la asistencia de los deportistas inscritos en un programa."
        eyebrow="Asistencia"
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold tracking-tight">
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="program-select">Programa</Label>
            <Select
              value={selectedProgramId ? String(selectedProgramId) : ""}
              onValueChange={(v) => setSelectedProgramId(v ? Number(v) : null)}
            >
              <SelectTrigger id="program-select">
                <SelectValue placeholder="Seleccionar programa" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-faint">
            La fecha y hora se registran automáticamente al guardar.
          </p>
        </CardContent>
      </Card>

      {selectedProgramId && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="font-display text-lg font-semibold tracking-tight">
              Deportistas inscritos
              <span className="ml-2 text-sm font-normal text-muted">
                ({athletes.length})
              </span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectAll("present")}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Todos presentes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSelectAll("absent")}
              >
                <XCircle className="h-3.5 w-3.5" />
                Todos ausentes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAthletes ? (
              <div className="space-y-2.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : athletes.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Sin deportistas inscritos"
                description="No hay deportistas inscritos en este programa."
              />
            ) : (
              <div className="space-y-2.5">
                {athletes.map((athlete) => {
                  const existing = attendance.find(
                    (a) => a.athlete_id === athlete.athlete_id,
                  );
                  const currentStatus = existing?.status || "absent";
                  return (
                    <div
                      key={athlete.athlete_id}
                      className={cn(
                        "flex flex-col gap-3 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center",
                        rowToneFor(currentStatus),
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text">{athlete.athlete_name}</p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_BUTTONS.map(({ status, label, icon: Icon }) => {
                          const isActive = currentStatus === status;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              onClick={() =>
                                handleStatusChange(athlete.athlete_id, status)
                              }
                              aria-pressed={isActive}
                            >
                              {isActive ? (
                                <Icon className="h-3.5 w-3.5" />
                              ) : (
                                <Circle className="h-3.5 w-3.5" />
                              )}
                              {label}
                            </Button>
                          );
                        })}
                      </div>

                      <Input
                        placeholder="Observaciones..."
                        className="w-full sm:w-56"
                        value={existing?.observaciones || ""}
                        onChange={(e) =>
                          handleObservacionesChange(
                            athlete.athlete_id,
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedProgramId && athletes.length > 0 && (
        <>
          {/* Inline submit area on desktop */}
          <div className="hidden sm:flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-sm text-muted">
              <span className="font-medium text-text">{counts.present}</span> presentes ·{" "}
              <span className="font-medium text-text">{counts.late}</span> tarde ·{" "}
              <span className="font-medium text-text">{counts.absent}</span> ausentes
            </p>
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              <ClipboardCheck className="h-4 w-4" />
              {submitting ? "Registrando..." : `Registrar ${attendance.length}`}
            </Button>
          </div>

          {/* Mobile fixed bottom bar */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface/95 backdrop-blur p-4 sm:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <p className="flex-1 text-xs text-muted">
                <span className="font-medium text-text">{counts.present}</span>P{" · "}
                <span className="font-medium text-text">{counts.late}</span>T{" · "}
                <span className="font-medium text-text">{counts.absent}</span>A
              </p>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
              >
                <ClipboardCheck className="h-4 w-4" />
                {submitting ? "Guardando..." : "Registrar"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
