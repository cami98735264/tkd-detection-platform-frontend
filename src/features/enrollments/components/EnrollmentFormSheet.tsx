import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import AsyncSelectField from "@/components/common/AsyncSelectField";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete, Enrollment } from "@/types/entities";

const STEPS = [
  { id: 1, title: "Datos Personales", description: "Seleccionar deportista y verificar información" },
  { id: 2, title: "Datos del Acudiente", description: "Información del responsável (si es menor)" },
  { id: 3, title: "Consentimientos", description: "Confirmación y autorizaciones" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""];

const RELATIONSHIPS = [
  { value: "mother", label: "Madre" },
  { value: "father", label: "Padre" },
  { value: "guardian", label: "Acudiente" },
  { value: "other", label: "Otro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Enrollment | null;
  onSuccess?: () => void;
}

interface FormData {
  athlete_id: number | null;
  program_id: number | null;
  start_date: string;
  end_date: string;
  notes: string;
  blood_type: string;
  certificado_medico: File | null;
  guardian_full_name: string;
  guardian_documento: string;
  guardian_relationship: string;
  guardian_email: string;
  guardian_address: string;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_imagenes: boolean;
  confirmacion_precision: boolean;
}

export default function EnrollmentFormSheet({ open, onOpenChange, editing, onSuccess }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [athleteData, setAthleteData] = useState<Athlete | null>(null);
  const isEdit = !!editing;

  const [form, setForm] = useState<FormData>({
    athlete_id: null,
    program_id: null,
    start_date: "",
    end_date: "",
    notes: "",
    blood_type: "",
    certificado_medico: null,
    guardian_full_name: "",
    guardian_documento: "",
    guardian_relationship: "",
    guardian_email: "",
    guardian_address: "",
    acepta_terminos: false,
    acepta_datos: false,
    acepta_imagenes: false,
    confirmacion_precision: false,
  });

  // Load enrollment data when editing
  useEffect(() => {
    if (editing) {
      setForm({
        athlete_id: editing.athlete,
        program_id: editing.program,
        start_date: editing.start_date || "",
        end_date: editing.end_date || "",
        notes: editing.notes || "",
        blood_type: editing.blood_type || "",
        certificado_medico: null,
        guardian_full_name: "",
        guardian_documento: "",
        guardian_relationship: "",
        guardian_email: "",
        guardian_address: "",
        acepta_terminos: editing.acepta_terminos || false,
        acepta_datos: editing.acepta_datos || false,
        acepta_imagenes: editing.acepta_imagenes || false,
        confirmacion_precision: editing.confirmacion_precision || false,
      });
      athletesApi.get(editing.athlete).then((a) => setAthleteData(a)).catch(() => {});
    } else {
      setStep(1);
      setAthleteData(null);
    }
  }, [editing]);

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(athleteData?.date_of_birth ?? null);
  const isMinor = age !== null && age < 18;

  const loadAthletes = useCallback((input: string, page: number) => {
    console.log("[EnrollmentForm] loadAthletes called with input:", input, "page:", page);
    return athletesApi.list(page, input, "active", true).then((res) => {
      console.log("[EnrollmentForm] athletes response:", res);
      return {
        options: res.results.map((a) => ({ value: a.id, label: a.full_name })),
        hasMore: res.next !== null,
      };
    });
  }, []);

  const loadPrograms = useCallback((input: string, page: number) => {
    console.log("[EnrollmentForm] loadPrograms called with input:", input, "page:", page);
    return programsApi.list(page, input).then((res) => {
      console.log("[EnrollmentForm] programs response:", res);
      return {
        options: res.results.filter((p: { active: boolean }) => p.active).map((p: { id: number; name: string }) => ({ value: p.id, label: p.name })),
        hasMore: res.next !== null,
      };
    });
  }, []);

  const handleAthleteSelect = (athleteId: number | null) => {
    setForm((f) => ({ ...f, athlete_id: athleteId }));
    if (athleteId) {
      athletesApi.get(athleteId).then((athlete) => {
        setAthleteData(athlete);
      }).catch(() => {});
    } else {
      setAthleteData(null);
    }
  };

  const handleProgramSelect = (programId: number | null) => {
    setForm((f) => ({ ...f, program_id: programId }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast({ title: "El archivo debe ser máximo 5MB", variant: "error" });
        return;
      }
      setForm((f) => ({ ...f, certificado_medico: file }));
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) {
      return !!form.athlete_id && !!form.program_id && !!form.start_date;
    }
    if (step === 2 && isMinor) {
      return !!form.guardian_full_name && !!form.guardian_relationship;
    }
    return true;
  };

  const handleNext = () => {
    if (canProceed()) setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!form.acepta_terminos || !form.acepta_datos || !form.acepta_imagenes || !form.confirmacion_precision) {
      showToast({ title: "Debe aceptar todos los consentimientos", variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && editing) {
        await enrollmentsApi.update(editing.id, form as any);
        showToast({ title: "Inscripción actualizada", variant: "success" });
      } else {
        await enrollmentsApi.create(form as any);
        showToast({ title: "Inscripción creada exitosamente", variant: "success" });
      }
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    } catch (err: any) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setAthleteData(null);
    setForm({
      athlete_id: null,
      program_id: null,
      start_date: "",
      end_date: "",
      notes: "",
      blood_type: "",
      certificado_medico: null,
      guardian_full_name: "",
      guardian_documento: "",
      guardian_relationship: "",
      guardian_email: "",
      guardian_address: "",
      acepta_terminos: false,
      acepta_datos: false,
      acepta_imagenes: false,
      confirmacion_precision: false,
    });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva Inscripción</SheetTitle>
          <SheetDescription>
            Complete los datos para inscribir a un deportista
          </SheetDescription>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center justify-center py-4 mt-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= s.id
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-green-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <p className="font-medium">{STEPS[step - 1].title}</p>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].description}</p>
        </div>

        {/* Step 1: Personal Data */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Deportista *</Label>
              <AsyncSelectField
                value={form.athlete_id}
                onChange={handleAthleteSelect}
                loadOptions={loadAthletes}
                placeholder="Buscar deportista..."
              />
            </div>

            {athleteData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos del Deportista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Nombre:</span> {athleteData.full_name}</div>
                    <div><span className="text-muted-foreground">Fecha Nac.:</span> {athleteData.date_of_birth ? new Date(athleteData.date_of_birth).toLocaleDateString() : "—"}</div>
                  </div>
                  {age !== null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-muted-foreground">Edad:</span> {age} años</div>
                      <div><span className="text-muted-foreground">Categoría:</span> {athleteData.categoria_competencia_name || "—"}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-1">
              <Label>Programa *</Label>
              <AsyncSelectField
                value={form.program_id}
                onChange={handleProgramSelect}
                loadOptions={loadPrograms}
                placeholder="Buscar programa..."
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tipo de Sangre</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.blood_type}
                onChange={(e) => setForm((f) => ({ ...f, blood_type: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {BLOOD_TYPES.filter((t) => t).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Certificado Médico (PDF/JPG/PNG, máx 5MB)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {form.certificado_medico && (
                  <span className="text-sm text-green-600">
                    <CheckCircle2 size={16} />
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Guardian (conditional) */}
        {step === 2 && (
          <div className="space-y-4">
            {!isMinor ? (
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    El deportista tiene {age} años. No se requiere información de acudiente.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Datos del Acudiente *</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label>Nombre Completo *</Label>
                      <Input
                        value={form.guardian_full_name}
                        onChange={(e) => setForm((f) => ({ ...f, guardian_full_name: e.target.value }))}
                        placeholder="Nombre del acudiente"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Parentesco *</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.guardian_relationship}
                        onChange={(e) => setForm((f) => ({ ...f, guardian_relationship: e.target.value }))}
                      >
                        <option value="">Seleccionar...</option>
                        {RELATIONSHIPS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-4 grid-cols-2">
                      <div className="space-y-1">
                        <Label>Documento</Label>
                        <Input
                          value={form.guardian_documento}
                          onChange={(e) => setForm((f) => ({ ...f, guardian_documento: e.target.value }))}
                          placeholder="Número de documento"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={form.guardian_email}
                          onChange={(e) => setForm((f) => ({ ...f, guardian_email: e.target.value }))}
                          placeholder="email@ejemplo.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Dirección</Label>
                      <Input
                        value={form.guardian_address}
                        onChange={(e) => setForm((f) => ({ ...f, guardian_address: e.target.value }))}
                        placeholder="Dirección completa"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Step 3: Consents */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen de la Inscripción</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Deportista:</span> {athleteData?.full_name}</div>
                  <div><span className="text-muted-foreground">Tipo Sangre:</span> {form.blood_type || "—"}</div>
                </div>
                {isMinor && form.guardian_full_name && (
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">Acudiente:</span> {form.guardian_full_name}</div>
                    <div><span className="text-muted-foreground">Parentesco:</span> {form.guardian_relationship}</div>
                  </div>
                )}
                <div><span className="text-muted-foreground">Fecha Inicio:</span> {form.start_date}</div>
                <div><span className="text-muted-foreground">Certificado Médico:</span> {form.certificado_medico?.name || "No adjuntado"}</div>
              </CardContent>
            </Card>

            {/* Consents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Consentimientos *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="confirmacion_precision"
                      checked={form.confirmacion_precision}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, confirmacion_precision: !!c }))}
                    />
                    <Label htmlFor="confirmacion_precision" className="text-sm font-normal cursor-pointer">
                      Confirmo que todos los datos proporcionados son exactos y verídicos *
                    </Label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="acepta_datos"
                      checked={form.acepta_datos}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, acepta_datos: !!c }))}
                    />
                    <Label htmlFor="acepta_datos" className="text-sm font-normal cursor-pointer">
                      Autorizo el tratamiento de mis datos personales según la política de privacidad *
                    </Label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="acepta_terminos"
                      checked={form.acepta_terminos}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, acepta_terminos: !!c }))}
                    />
                    <Label htmlFor="acepta_terminos" className="text-sm font-normal cursor-pointer">
                      Acepto los términos y condiciones del club *
                    </Label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="acepta_imagenes"
                      checked={form.acepta_imagenes}
                      onCheckedChange={(c) => setForm((f) => ({ ...f, acepta_imagenes: !!c }))}
                    />
                    <Label htmlFor="acepta_imagenes" className="text-sm font-normal cursor-pointer">
                      Autorizo el uso de imágenes/fotografías para fines promocionales del club *
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4 mt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft size={16} className="mr-1" /> Anterior
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step < 3 ? (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Siguiente <ChevronRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Crear Inscripción"}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}