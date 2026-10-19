import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import ParentAccountSection from "@/features/athletes/components/sections/ParentAccountSection";
import {
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

import { programsApi } from "@/features/programs/api/programsApi";
import { usersApi } from "@/features/users/api/usersApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete, Enrollment } from "@/types/entities";

import {
  STEPS,
  emptyExtras,
  type AthleteMode,
  type EnrollmentExtras,
} from "./enrollment-form/model";
import Step1Personal from "./enrollment-form/Step1Personal";
import Step2GuardianContact from "./enrollment-form/Step2GuardianContact";
import StepIndicator from "./enrollment-form/StepIndicator";
import {
  buildEnrollmentPayloadFor,
  linkParentForExistingAthleteFor,
  resolveAthleteIdFor,
  type WizardSnapshot,
} from "./enrollment-form/submit";
import Step3Consents from "./enrollment-form/Step3Consents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Enrollment | null;
  onSuccess?: () => void;
}

export default function EnrollmentFormSheet({ open, onOpenChange, editing, onSuccess }: Props) {
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

  const updatePersonal = useCallback((patch: Partial<AthletePersonalDataState>) => {
    setPersonal((prev) => ({ ...prev, ...patch }));
    setPersonalErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof AthletePersonalDataState)[]) {
        delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
    if ("sportsman_email" in patch) setSportsmanEmailExists(false);
  }, []);

  const updateParent = useCallback((patch: Partial<ParentAccountState>) => {
    setParent((prev) => ({ ...prev, ...patch }));
    setParentErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof ParentAccountState)[]) {
        delete (next as Record<string, unknown>)[key];
      }
      return next;
    });
    if ("parent_email" in patch) setParentEmailExists(false);
  }, []);

  const linkExistingSportsmanByEmail = useCallback(async () => {
    const email = personal.sportsman_email.trim();
    if (!email) return;
    try {
      const res = await usersApi.list({
        search: email,
        role: "sportsman",
        withoutAthlete: true,
      });
      const match = res.results.find((u) => u.email.toLowerCase() === email.toLowerCase());
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
      const match = res.results.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!match) {
        showToast({
          title: "Acudiente no encontrado",
          description: "El correo ya está en uso pero no corresponde a una cuenta de acudiente.",
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
    athleteMode === "link" ? (linkedAthlete?.date_of_birth ?? null) : personal.date_of_birth;
  const age = calculateAge(dob ?? "");
  const isMinor = age !== null && age < 18;

  /* --------------------------- AsyncSelect loaders --------------------------- */

  const loadAthletes = useCallback((input: string, page: number) => {
    return athletesApi.list(page, input, "active", true).then((res) => ({
      options: res.results.map((a) => ({ value: a.id, label: a.full_name })),
      hasMore: res.next !== null,
    }));
  }, []);

  const loadPrograms = useCallback((input: string, page: number) => {
    return programsApi.list(page, input).then((res) => ({
      options: res.results.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name })),
      hasMore: res.next !== null,
    }));
  }, []);

  /* ------------------------------- Handlers ------------------------------- */

  const handleAthleteSelect = (id: number | null) => {
    setLinkedAthleteId(id);
    if (id) {
      athletesApi
        .get(id)
        .then(setLinkedAthlete)
        .catch(() => {});
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

  const wizard: WizardSnapshot = {
    athleteMode,
    linkedAthleteId,
    personal,
    parent,
    extras,
    isMinor,
    isEdit,
  };
  const resolveAthleteId = () => resolveAthleteIdFor(wizard);
  const linkParentForExistingAthlete = (athleteId: number) =>
    linkParentForExistingAthleteFor(wizard, athleteId);
  const buildEnrollmentPayload = (athleteId: number) =>
    buildEnrollmentPayloadFor(wizard, athleteId);

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

        <StepIndicator steps={visibleSteps} current={step} />

        <div className="text-center mb-4">
          <p className="font-medium">{currentStepMeta.title}</p>
          <p className="text-sm text-muted-foreground">{currentStepMeta.description}</p>
        </div>

        <div
          key={step}
          className={direction === "right" ? "animate-slide-from-right" : "animate-slide-from-left"}
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
            <Step2GuardianContact extras={extras} setExtras={setExtras} />
          )}

          {step === 3 && (
            <Step3Consents
              athleteName={
                athleteMode === "link" ? (linkedAthlete?.full_name ?? "—") : personal.full_name
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
