import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { athletesApi } from "@/features/athletes/api/athletesApi";
import { usersApi } from "@/features/users/api/usersApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete } from "@/types/entities";

import AthletePersonalDataSection from "./sections/AthletePersonalDataSection";
import ParentAccountSection from "./sections/ParentAccountSection";
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
} from "./sections/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete?: Athlete | null;
  onSuccess?: () => void;
}

export default function AthleteFormSheet({
  open,
  onOpenChange,
  athlete,
  onSuccess,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const isEdit = !!athlete;
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [personal, setPersonal] = useState<AthletePersonalDataState>(emptyAthletePersonalData);
  const [parent, setParent] = useState<ParentAccountState>(emptyParentAccount);

  const [personalErrors, setPersonalErrors] = useState<AthleteFieldErrors>({});
  const [parentErrors, setParentErrors] = useState<ParentFieldErrors>({});
  const [sportsmanEmailExists, setSportsmanEmailExists] = useState(false);
  const [parentEmailExists, setParentEmailExists] = useState(false);

  const prevStepRef = useRef(step);
  const direction = step >= prevStepRef.current ? "right" : "left";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  // Reset whenever the sheet (re)opens or the editing target changes.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setParent(emptyParentAccount());
    if (athlete) {
      setPersonal({
        ...emptyAthletePersonalData(),
        full_name: athlete.full_name ?? "",
        date_of_birth: athlete.date_of_birth ?? "",
        belt_actual: athlete.belt_actual != null ? String(athlete.belt_actual) : "",
        categoria_competencia:
          athlete.categoria_competencia != null
            ? String(athlete.categoria_competencia)
            : "",
        height_cm: athlete.height_cm ?? "",
        status: athlete.status ?? "active",
      });
    } else {
      setPersonal(emptyAthletePersonalData());
    }
  }, [open, athlete]);

  const age = calculateAge(personal.date_of_birth);
  const isMinor = age !== null && age < 18;

  const updatePersonal = useCallback(
    (patch: Partial<AthletePersonalDataState>) => {
      setPersonal((prev) => ({ ...prev, ...patch }));
      // Clear field errors as the user edits the corresponding field.
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

  const personalValid = isAthletePersonalDataValid(personal, {
    requireAccount: !isEdit,
  });
  const parentValid = !isMinor || isEdit ? true : isParentAccountValid(parent);

  const handleClose = () => {
    setPersonal(emptyAthletePersonalData());
    setParent(emptyParentAccount());
    setPersonalErrors({});
    setParentErrors({});
    setSportsmanEmailExists(false);
    setParentEmailExists(false);
    setStep(1);
    onOpenChange(false);
  };

  const handleNext = () => {
    if (personalValid) setStep(2);
  };
  const handleBack = () => setStep(1);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (isEdit && athlete) {
        await athletesApi.update(athlete.id, {
          full_name: personal.full_name,
          date_of_birth: personal.date_of_birth || null,
          categoria_competencia: personal.categoria_competencia
            ? Number(personal.categoria_competencia)
            : null,
          belt_actual: personal.belt_actual ? Number(personal.belt_actual) : null,
          height_cm: personal.height_cm.trim() ? personal.height_cm.trim() : null,
          status: personal.status,
        });
        showToast({ title: "Deportista actualizado", variant: "success" });
      } else {
        await athletesApi.register(
          buildRegistrationPayload(personal, isMinor ? parent : null),
        );
        showToast({ title: "Deportista registrado", variant: "success" });
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
      // Jump back to the step that has the offending field so the user sees it.
      if (Object.keys(athleteExtract.errors).length > 0) setStep(1);
      else if (Object.keys(parentExtract.errors).length > 0) setStep(2);
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const showStep1 = step === 1;
  const showStep2 = step === 2 && isMinor && !isEdit;
  const isLastStep = isEdit || !isMinor || step === 2;

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
          <SheetTitle>
            {isEdit ? "Editar deportista" : "Registrar deportista"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Actualiza los datos del deportista."
              : "Crea el deportista junto con su cuenta y, si es menor, vincula un acudiente."}
          </SheetDescription>
        </SheetHeader>

        {!isEdit && <Stepper step={step} showGuardian={isMinor} />}

        <div
          key={step}
          className={
            direction === "right"
              ? "animate-slide-from-right"
              : "animate-slide-from-left"
          }
        >
          {showStep1 && (
            <AthletePersonalDataSection
              data={personal}
              onChange={updatePersonal}
              hideAccountSection={isEdit}
              errors={personalErrors}
              emailExistsHint={sportsmanEmailExists}
              onLinkExistingEmail={linkExistingSportsmanByEmail}
            />
          )}

          {showStep2 && (
            <ParentAccountSection
              data={parent}
              onChange={updateParent}
              errors={parentErrors}
              emailExistsHint={parentEmailExists}
              onLinkExistingEmail={linkExistingParentByEmail}
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
            <Button
              onClick={handleSubmit}
              disabled={submitting || !personalValid || !parentValid}
            >
              {submitting
                ? "Guardando..."
                : isEdit
                  ? "Actualizar"
                  : "Registrar"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!personalValid}>
              Siguiente <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stepper({ step, showGuardian }: { step: 1 | 2; showGuardian: boolean }) {
  const steps = showGuardian
    ? [
        { id: 1, title: "Datos Personales" },
        { id: 2, title: "Datos del Acudiente" },
      ]
    : [{ id: 1, title: "Datos Personales" }];

  return (
    <div className="py-4 mt-2">
      <div className="flex items-center justify-center">
        {steps.map((s, i) => (
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
            {i < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1 ${step > s.id ? "bg-primary" : "bg-border"}`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-medium mt-3">
        {steps[step - 1]?.title}
      </p>
    </div>
  );
}
