import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import AsyncSelectField from "@/components/common/AsyncSelectField";
import { FormSelect } from "@/components/common/FormSelect";

import AthletePersonalDataSection from "@/features/athletes/components/sections/AthletePersonalDataSection";
import ParentAccountSection from "@/features/athletes/components/sections/ParentAccountSection";
import {
  buildRegistrationPayload,
  calculateAge,
  emptyAthletePersonalData,
  emptyParentAccount,
  extractAthleteErrors,
  extractParentErrors,
  isAthletePersonalDataValid,
  isParentAccountValid,
  type AthleteFieldErrors,
  type AthletePersonalDataState,
  type ParentAccountState,
  type ParentFieldErrors,
} from "@/features/athletes/components/sections/types";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { enrollmentsApi } from "@/features/enrollments/api/enrollmentsApi";
import { parentAthletesApi } from "@/features/parent/api/parentAthletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { usersApi } from "@/features/users/api/usersApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete, Enrollment } from "@/types/entities";

type AthleteMode = "link" | "register";

const STEPS = [
  {
    id: 1,
    title: "Datos Personales",
    description: "Selecciona o registra al deportista y elige el programa",
  },
  {
    id: 2,
    title: "Datos del Acudiente",
    description: "Acudiente requerido para deportistas menores de edad",
  },
  {
    id: 3,
    title: "Consentimientos",
    description: "Confirmación y autorizaciones",
  },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface EnrollmentExtras {
  program_id: number | null;
  start_date: string;
  end_date: string;
  notes: string;
  blood_type: string;
  certificado_medico: File | null;
  guardian_documento: string;
  guardian_address: string;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_imagenes: boolean;
  confirmacion_precision: boolean;
}

const emptyExtras = (): EnrollmentExtras => ({
  program_id: null,
  start_date: "",
  end_date: "",
  notes: "",
  blood_type: "",
  certificado_medico: null,
  guardian_documento: "",
  guardian_address: "",
  acepta_terminos: false,
  acepta_datos: false,
  acepta_imagenes: false,
  confirmacion_precision: false,
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Enrollment | null;
  onSuccess?: () => void;
}

export default function EnrollmentFormSheet({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const isEdit = !!editing;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Athlete selection / registration
  const [athleteMode, setAthleteMode] = useState<AthleteMode>("link");
  const [linkedAthleteId, setLinkedAthleteId] = useState<number | null>(null);
  const [linkedAthlete, setLinkedAthlete] = useState<Athlete | null>(null);
  const [personal, setPersonal] = useState<AthletePersonalDataState>(emptyAthletePersonalData);

  // Parent (only used when minor)
  const [parent, setParent] = useState<ParentAccountState>(emptyParentAccount);

  // Enrollment-specific fields
  const [extras, setExtras] = useState<EnrollmentExtras>(emptyExtras);

  // Field-level errors and duplicate-email hints surfaced from API responses.
  const [personalErrors, setPersonalErrors] = useState<AthleteFieldErrors>({});
  const [parentErrors, setParentErrors] = useState<ParentFieldErrors>({});
  const [sportsmanEmailExists, setSportsmanEmailExists] = useState(false);
  const [parentEmailExists, setParentEmailExists] = useState(false);

  const updatePersonal = useCallback(
    (patch: Partial<AthletePersonalDataState>) => {
      setPersonal((prev) => ({ ...prev, ...patch }));
      setPersonalErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(patch) as (keyof AthletePersonalDataState)[]) {
          delete (next as Record<string, unknown>)[key];
        }
        return next;
      });
      if ("sportsman_email" in patch) setSportsmanEmailExists(false);
    },
    [],
  );

  const updateParent = useCallback(
    (patch: Partial<ParentAccountState>) => {
      setParent((prev) => ({ ...prev, ...patch }));
      setParentErrors((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(patch) as (keyof ParentAccountState)[]) {
          delete (next as Record<string, unknown>)[key];
        }
        return next;
      });
      if ("parent_email" in patch) setParentEmailExists(false);
    },
    [],
  );

  const linkExistingSportsmanByEmail = useCallback(async () => {
    const email = personal.sportsman_email.trim();
    if (!email) return;
    try {
      const res = await usersApi.list({
        search: email,
        role: "sportsman",
        withoutAthlete: true,
      });
      const match = res.results.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (!match) {
        showToast({
          title: "Cuenta encontrada pero no disponible",
          description:
            "Esta cuenta ya tiene un deportista registrado. Búscala manualmente o usa un correo distinto.",
          variant: "warning",
        });
        return;
      }
      setPersonal((prev) => ({
        ...prev,
        sportsman_mode: "link",
        sportsman_user_id: match.id,
        sportsman_email: "",
        sportsman_password: "",
      }));
      setPersonalErrors({});
      setSportsmanEmailExists(false);
    } catch (err) {
      handleError(err);
    }
  }, [personal.sportsman_email, showToast, handleError]);

  const linkExistingParentByEmail = useCallback(async () => {
    const email = parent.parent_email.trim();
    if (!email) return;
    try {
      const res = await usersApi.list({ search: email, role: "parent" });
      const match = res.results.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (!match) {
        showToast({
          title: "Acudiente no encontrado",
          description:
            "El correo ya está en uso pero no corresponde a una cuenta de acudiente.",
          variant: "warning",
        });
        return;
      }
      setParent((prev) => ({
        ...prev,
        parent_mode: "link",
        parent_user_id: match.id,
        parent_email: "",
        parent_password: "",
        parent_full_name: "",
      }));
      setParentErrors({});
      setParentEmailExists(false);
    } catch (err) {
      handleError(err);
    }
  }, [parent.parent_email, showToast, handleError]);

  const prevStepRef = useRef(step);
  const direction = step >= prevStepRef.current ? "right" : "left";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  /* ----------------------------- Reset / hydrate ----------------------------- */

  const resetAll = useCallback(() => {
    setStep(1);
    setAthleteMode("link");
    setLinkedAthleteId(null);
    setLinkedAthlete(null);
    setPersonal(emptyAthletePersonalData());
    setParent(emptyParentAccount());
    setExtras(emptyExtras());
    setPersonalErrors({});
    setParentErrors({});
    setSportsmanEmailExists(false);
    setParentEmailExists(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      // Edit mode: only existing-athlete supported.
      setAthleteMode("link");
      setLinkedAthleteId(editing.athlete);
      setExtras({
        ...emptyExtras(),
        program_id: editing.program,
        start_date: editing.start_date || "",
        end_date: editing.end_date || "",
        notes: editing.notes || "",
        blood_type: editing.blood_type || "",
        acepta_terminos: editing.acepta_terminos || false,
        acepta_datos: editing.acepta_datos || false,
        acepta_imagenes: editing.acepta_imagenes || false,
        confirmacion_precision: editing.confirmacion_precision || false,
      });
      athletesApi
        .get(editing.athlete)
        .then(setLinkedAthlete)
        .catch(() => {});
    } else {
      resetAll();
    }
  }, [open, editing, resetAll]);

  /* ------------------------------- Computed ------------------------------- */

  const dob =
    athleteMode === "link" ? linkedAthlete?.date_of_birth ?? null : personal.date_of_birth;
  const age = calculateAge(dob ?? "");
  const isMinor = age !== null && age < 18;

  /* --------------------------- AsyncSelect loaders --------------------------- */

  const loadAthletes = useCallback((input: string, page: number) => {
    return athletesApi
      .list(page, input, "active", true)
      .then((res) => ({
        options: res.results.map((a) => ({ value: a.id, label: a.full_name })),
        hasMore: res.next !== null,
      }));
  }, []);

  const loadPrograms = useCallback((input: string, page: number) => {
    return programsApi.list(page, input).then((res) => ({
      options: res.results
        .filter((p) => p.active)
        .map((p) => ({ value: p.id, label: p.name })),
      hasMore: res.next !== null,
    }));
  }, []);

  /* ------------------------------- Handlers ------------------------------- */

  const handleAthleteSelect = (id: number | null) => {
    setLinkedAthleteId(id);
    if (id) {
      athletesApi.get(id).then(setLinkedAthlete).catch(() => {});
    } else {
      setLinkedAthlete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast({ title: "El archivo debe ser máximo 5MB", variant: "error" });
      return;
    }
    setExtras((x) => ({ ...x, certificado_medico: file }));
  };

  /* ------------------------------- Validation ----------------------------- */

  const personalValid = (): boolean => {
    if (athleteMode === "link") {
      if (linkedAthleteId == null) return false;
    } else {
      if (!isAthletePersonalDataValid(personal, { requireAccount: true })) return false;
    }
    return extras.program_id != null && extras.start_date !== "";
  };

  const parentValid = (): boolean => {
    if (!isMinor) return true;
    if (isEdit) return true;
    return isParentAccountValid(parent);
  };

  const consentsValid = (): boolean =>
    extras.acepta_terminos &&
    extras.acepta_datos &&
    extras.acepta_imagenes &&
    extras.confirmacion_precision;

  const canProceed = (): boolean => {
    if (step === 1) return personalValid();
    if (step === 2) return parentValid();
    return consentsValid();
  };

  /* ---------------------------------- Step nav --------------------------- */

  // When editing or athlete is adult, skip step 2.
  const skipStep2 = isEdit || !isMinor;

  const handleNext = () => {
    if (!canProceed()) return;
    if (step === 1 && skipStep2) setStep(3);
    else setStep((s) => s + 1);
  };
  const handleBack = () => {
    if (step === 3 && skipStep2) setStep(1);
    else setStep((s) => s - 1);
  };

  /* ------------------------------- Submit -------------------------------- */

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  const resolveAthleteId = async (): Promise<number> => {
    if (athleteMode === "link") {
      if (linkedAthleteId == null) {
        throw new Error("Selecciona un deportista.");
      }
      return linkedAthleteId;
    }
    // Atomic: creates sportsman user + athlete + (if minor) parent + ParentAthlete.
    const created = await athletesApi.register(
      buildRegistrationPayload(personal, isMinor ? parent : null),
    );
    return created.id;
  };

  const linkParentForExistingAthlete = async (athleteId: number) => {
    if (!isMinor || isEdit) return;
    if (athleteMode === "register") return; // already handled atomically above
    if (parent.parent_mode === "link") {
      await parentAthletesApi.register({
        athlete: athleteId,
        parent_relationship: parent.parent_relationship as
          | "mother"
          | "father"
          | "guardian",
        parent_user_id: parent.parent_user_id,
      });
    } else {
      await parentAthletesApi.register({
        athlete: athleteId,
        parent_relationship: parent.parent_relationship as
          | "mother"
          | "father"
          | "guardian",
        parent_full_name: parent.parent_full_name.trim(),
        parent_email: parent.parent_email.trim(),
        parent_password: parent.parent_password,
      });
    }
  };

  const buildEnrollmentPayload = async (athleteId: number) => {
    // The legacy guardian_* fields on the enrollment record act as a snapshot of
    // emergency-contact info. We populate them from the parent state when available
    // so the enrollment record remains self-contained even if the parent account
    // is later removed.
    let guardian_full_name = "";
    let guardian_email = "";
    let guardian_relationship = "";

    if (isMinor && !isEdit) {
      guardian_relationship = parent.parent_relationship;
      if (parent.parent_mode === "create") {
        guardian_full_name = parent.parent_full_name.trim();
        guardian_email = parent.parent_email.trim();
      } else if (parent.parent_user_id != null) {
        const user = await usersApi.get(parent.parent_user_id);
        guardian_full_name = user.full_name;
        guardian_email = user.email;
      }
    }

    return {
      athlete_id: athleteId,
      program_id: extras.program_id!,
      start_date: extras.start_date,
      end_date: extras.end_date || null,
      notes: extras.notes,
      blood_type: extras.blood_type,
      certificado_medico: extras.certificado_medico ?? undefined,
      guardian_full_name,
      guardian_documento: extras.guardian_documento,
      guardian_relationship,
      guardian_email,
      guardian_address: extras.guardian_address,
      acepta_terminos: extras.acepta_terminos,
      acepta_datos: extras.acepta_datos,
      acepta_imagenes: extras.acepta_imagenes,
      confirmacion_precision: extras.confirmacion_precision,
    };
  };

  const handleSubmit = async () => {
    if (!consentsValid()) {
      showToast({ title: "Debe aceptar todos los consentimientos", variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && editing) {
        const payload = await buildEnrollmentPayload(editing.athlete);
        await enrollmentsApi.update(editing.id, payload);
        showToast({ title: "Inscripción actualizada", variant: "success" });
      } else {
        const athleteId = await resolveAthleteId();
        await linkParentForExistingAthlete(athleteId);
        const payload = await buildEnrollmentPayload(athleteId);
        await enrollmentsApi.create(payload);
        showToast({ title: "Inscripción creada exitosamente", variant: "success" });
      }
      onSuccess?.();
      handleClose();
    } catch (err) {
      const athleteExtract = extractAthleteErrors(err);
      const parentExtract = extractParentErrors(err);
      setPersonalErrors(athleteExtract.errors);
      setParentErrors(parentExtract.errors);
      setSportsmanEmailExists(athleteExtract.emailExists);
      setParentEmailExists(parentExtract.emailExists);
      // Jump back to the step that owns the offending field.
      if (Object.keys(athleteExtract.errors).length > 0) setStep(1);
      else if (Object.keys(parentExtract.errors).length > 0) setStep(2);
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------------------------- UI --------------------------------- */

  const visibleSteps = skipStep2 ? STEPS.filter((s) => s.id !== 2) : STEPS;
  const currentStepMeta = STEPS.find((s) => s.id === step) ?? STEPS[0];
  const isLastStep = step === 3;

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <SheetContent
        className="w-full sm:max-w-2xl overflow-y-auto"
        onPointerDownOutside={(e) => {
          if ((e.target as HTMLElement).closest(".rs__menu-portal, .rs__menu")) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if ((e.target as HTMLElement).closest(".rs__menu-portal, .rs__menu")) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar inscripción" : "Nueva inscripción"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Actualiza los datos de la inscripción."
              : "Selecciona o registra al deportista, agrega su acudiente si es menor y firma los consentimientos."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-center py-4 mt-4">
          {visibleSteps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                      ? "bg-primary/10 text-primary border border-primary"
                      : "bg-surface-2 text-faint border border-border"
                }`}
              >
                {step > s.id ? <CheckCircle2 size={16} /> : s.id}
              </div>
              {i < visibleSteps.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <p className="font-medium">{currentStepMeta.title}</p>
          <p className="text-sm text-muted-foreground">{currentStepMeta.description}</p>
        </div>

        <div
          key={step}
          className={
            direction === "right"
              ? "animate-slide-from-right"
              : "animate-slide-from-left"
          }
        >
          {step === 1 && (
            <Step1Personal
              isEdit={isEdit}
              athleteMode={athleteMode}
              setAthleteMode={setAthleteMode}
              linkedAthleteId={linkedAthleteId}
              linkedAthlete={linkedAthlete}
              onLinkedAthleteChange={handleAthleteSelect}
              personal={personal}
              onPersonalChange={updatePersonal}
              personalErrors={personalErrors}
              sportsmanEmailExists={sportsmanEmailExists}
              onLinkSportsmanEmail={linkExistingSportsmanByEmail}
              extras={extras}
              setExtras={setExtras}
              onFileChange={handleFileChange}
              loadAthletes={loadAthletes}
              loadPrograms={loadPrograms}
              age={age}
            />
          )}

          {step === 2 && isMinor && !isEdit && (
            <ParentAccountSection
              data={parent}
              onChange={updateParent}
              description="El deportista es menor de edad. Vincula o crea la cuenta del acudiente."
              errors={parentErrors}
              emailExistsHint={parentEmailExists}
              onLinkExistingEmail={linkExistingParentByEmail}
            />
          )}

          {step === 2 && isMinor && !isEdit && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Datos de contacto adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="guardian_documento">Documento</Label>
                    <Input
                      id="guardian_documento"
                      value={extras.guardian_documento}
                      onChange={(e) =>
                        setExtras((x) => ({ ...x, guardian_documento: e.target.value }))
                      }
                      placeholder="Número de documento"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guardian_address">Dirección</Label>
                    <Input
                      id="guardian_address"
                      value={extras.guardian_address}
                      onChange={(e) =>
                        setExtras((x) => ({ ...x, guardian_address: e.target.value }))
                      }
                      placeholder="Dirección de contacto"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Step3Consents
              athleteName={
                athleteMode === "link"
                  ? linkedAthlete?.full_name ?? "—"
                  : personal.full_name
              }
              extras={extras}
              setExtras={setExtras}
              isMinor={isMinor && !isEdit}
              parent={parent}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 mt-4 border-t border-divider">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft size={16} className="mr-1" /> Anterior
            </Button>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={submitting || !consentsValid()}>
              {submitting
                ? "Guardando..."
                : isEdit
                  ? "Actualizar inscripción"
                  : "Crear inscripción"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Siguiente <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Step components                             */
/* -------------------------------------------------------------------------- */

interface Step1Props {
  isEdit: boolean;
  athleteMode: AthleteMode;
  setAthleteMode: (m: AthleteMode) => void;
  linkedAthleteId: number | null;
  linkedAthlete: Athlete | null;
  onLinkedAthleteChange: (id: number | null) => void;
  personal: AthletePersonalDataState;
  onPersonalChange: (patch: Partial<AthletePersonalDataState>) => void;
  personalErrors: AthleteFieldErrors;
  sportsmanEmailExists: boolean;
  onLinkSportsmanEmail: () => void;
  extras: EnrollmentExtras;
  setExtras: (
    updater: EnrollmentExtras | ((prev: EnrollmentExtras) => EnrollmentExtras),
  ) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadAthletes: (input: string, page: number) => Promise<{
    options: { value: number; label: string }[];
    hasMore: boolean;
  }>;
  loadPrograms: (input: string, page: number) => Promise<{
    options: { value: number; label: string }[];
    hasMore: boolean;
  }>;
  age: number | null;
}

function Step1Personal({
  isEdit,
  athleteMode,
  setAthleteMode,
  linkedAthleteId,
  linkedAthlete,
  onLinkedAthleteChange,
  personal,
  onPersonalChange,
  personalErrors,
  sportsmanEmailExists,
  onLinkSportsmanEmail,
  extras,
  setExtras,
  onFileChange,
  loadAthletes,
  loadPrograms,
  age,
}: Step1Props) {
  return (
    <div className="space-y-4">
      {!isEdit && (
        <Tabs
          value={athleteMode}
          onValueChange={(v) => setAthleteMode(v as AthleteMode)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Deportista existente</TabsTrigger>
            <TabsTrigger value="register">Registrar nuevo</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="pt-3 space-y-4">
            <div className="space-y-1.5">
              <Label>Deportista *</Label>
              <AsyncSelectField
                value={linkedAthleteId}
                onChange={onLinkedAthleteChange}
                loadOptions={loadAthletes}
                placeholder="Buscar deportista..."
              />
            </div>

            {linkedAthlete && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos del Deportista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>{" "}
                      {linkedAthlete.full_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha Nac.:</span>{" "}
                      {linkedAthlete.date_of_birth
                        ? new Date(linkedAthlete.date_of_birth).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  {age !== null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Edad:</span> {age} años
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cinturón:</span>{" "}
                        {linkedAthlete.belt_actual_name || "—"}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="register" className="pt-3">
            <AthletePersonalDataSection
              data={personal}
              onChange={onPersonalChange}
              errors={personalErrors}
              emailExistsHint={sportsmanEmailExists}
              onLinkExistingEmail={onLinkSportsmanEmail}
            />
          </TabsContent>
        </Tabs>
      )}

      {isEdit && linkedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deportista</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {linkedAthlete.full_name}
          </CardContent>
        </Card>
      )}

      <div className="space-y-1.5">
        <Label>Programa *</Label>
        <AsyncSelectField
          value={extras.program_id}
          onChange={(v) => setExtras((x) => ({ ...x, program_id: v }))}
          loadOptions={loadPrograms}
          placeholder="Buscar programa..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha Inicio *</Label>
          <Input
            type="date"
            value={extras.start_date}
            onChange={(e) => setExtras((x) => ({ ...x, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha Fin</Label>
          <Input
            type="date"
            value={extras.end_date}
            onChange={(e) => setExtras((x) => ({ ...x, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de Sangre</Label>
        <FormSelect
          value={extras.blood_type}
          onValueChange={(v) => setExtras((x) => ({ ...x, blood_type: v }))}
          options={BLOOD_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Certificado Médico (PDF/JPG/PNG, máx 5MB)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={onFileChange}
            className="flex-1"
          />
          {extras.certificado_medico && (
            <span className="text-sm text-success">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea
          value={extras.notes}
          onChange={(e) => setExtras((x) => ({ ...x, notes: e.target.value }))}
          placeholder="Observaciones adicionales..."
        />
      </div>
    </div>
  );
}

interface Step3Props {
  athleteName: string;
  extras: EnrollmentExtras;
  setExtras: (
    updater: EnrollmentExtras | ((prev: EnrollmentExtras) => EnrollmentExtras),
  ) => void;
  isMinor: boolean;
  parent: ParentAccountState;
}

function Step3Consents({ athleteName, extras, setExtras, isMinor, parent }: Step3Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de la Inscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Deportista:</span> {athleteName}
            </div>
            <div>
              <span className="text-muted-foreground">Tipo Sangre:</span>{" "}
              {extras.blood_type || "—"}
            </div>
          </div>
          {isMinor && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Acudiente:</span>{" "}
                {parent.parent_mode === "create" ? parent.parent_full_name : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Parentesco:</span>{" "}
                {parent.parent_relationship || "—"}
              </div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Fecha Inicio:</span>{" "}
            {extras.start_date}
          </div>
          <div>
            <span className="text-muted-foreground">Certificado Médico:</span>{" "}
            {extras.certificado_medico?.name || "No adjuntado"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimientos *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConsentCheckbox
            id="confirmacion_precision"
            label="Confirmo que todos los datos proporcionados son exactos y verídicos"
            checked={extras.confirmacion_precision}
            onChange={(v) => setExtras((x) => ({ ...x, confirmacion_precision: v }))}
          />
          <ConsentCheckbox
            id="acepta_datos"
            label="Autorizo el tratamiento de mis datos personales según la política de privacidad"
            checked={extras.acepta_datos}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_datos: v }))}
          />
          <ConsentCheckbox
            id="acepta_terminos"
            label="Acepto los términos y condiciones del club"
            checked={extras.acepta_terminos}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_terminos: v }))}
          />
          <ConsentCheckbox
            id="acepta_imagenes"
            label="Autorizo el uso de imágenes/fotografías para fines promocionales del club"
            checked={extras.acepta_imagenes}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_imagenes: v }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label} *
      </Label>
    </div>
  );
}
