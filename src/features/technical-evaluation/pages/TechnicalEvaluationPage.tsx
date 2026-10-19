import { useEffect, useRef, useState } from "react";
import { RefreshCw, ShieldAlert, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

import ConsentStep from "@/features/technical-evaluation/components/ConsentStep";
import KickSelection from "@/features/technical-evaluation/components/KickSelection";
import RecordingCapture from "@/features/technical-evaluation/components/RecordingCapture";
import LinkedMinorsCard from "@/features/technical-evaluation/components/LinkedMinorsCard";
import ResultsBlock from "@/features/technical-evaluation/components/ResultsBlock";
import StartEvaluationCard from "@/features/technical-evaluation/components/StartEvaluationCard";
import { useEvaluationSession } from "@/features/technical-evaluation/hooks/useEvaluationSession";
import {
  technicalEvaluationApi,
  type AthleteConsent,
  type ConsentStatus,
  type KickType,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { useAuthStore } from "@/features/auth/store/authStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import type { Athlete } from "@/types/entities";

type Step = "choose" | "consent" | "history" | "kick" | "record" | "results";

const STEP_ORDER: Step[] = ["choose", "consent", "history", "kick", "record", "results"];

type ConsentInfo = ConsentStatus;

export default function TechnicalEvaluationPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const user = useAuthStore((s) => s.user);
  const isSportsman = user?.role === "sportsman";
  const isParent = user?.role === "parent";

  const [step, setStep] = useState<Step>("choose");
  const prevStepRef = useRef<Step>(step);
  const stepDirection: "right" | "left" =
    STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStepRef.current) ? "right" : "left";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);
  const [myAthlete, setMyAthlete] = useState<Athlete | null>(null);
  const [kickType, setKickType] = useState<KickType | null>(null);
  const {
    session,
    loadingSession,
    begin: beginSession,
    clear: clearSession,
  } = useEvaluationSession(step === "results");
  const [consentInfo, setConsentInfo] = useState<ConsentInfo | null>(null);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [linkedMinors, setLinkedMinors] = useState<AthleteConsent[]>([]);
  const [selectedChild, setSelectedChild] = useState<AthleteConsent | null>(null);

  // Load athlete and consent on mount for sportsman
  useEffect(() => {
    if (isSportsman) {
      Promise.all([athletesApi.getMe(), technicalEvaluationApi.getConsent()])
        .then(([ath, consent]) => {
          setMyAthlete(ath);
          setConsentInfo(Array.isArray(consent) ? null : consent);
        })
        .catch(() => {
          setMyAthlete(null);
          setConsentInfo({ consent_granted: false, consent_timestamp: null });
        })
        .finally(() => setLoadingConsent(false));
    } else if (isParent) {
      technicalEvaluationApi
        .getConsent()
        .then((data) => {
          if (Array.isArray(data)) setLinkedMinors(data);
        })
        .catch(() => {})
        .finally(() => setLoadingConsent(false));
    }
  }, [isSportsman, isParent]);

  const isAdult = myAthlete?.date_of_birth
    ? (() => {
        const dob = new Date(myAthlete.date_of_birth);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18;
      })()
    : false;

  // Auto-advance once athlete and consent are loaded
  useEffect(() => {
    if (!step || step !== "choose" || !myAthlete || !consentInfo) return;
    if (isAdult && isSportsman && consentInfo.consent_granted) {
      setStep("kick");
      return;
    }
    if (!isAdult && isSportsman && consentInfo.consent_granted) {
      setStep("kick");
    }
  }, [step, myAthlete, consentInfo, isAdult, isSportsman]);

  const handleConsented = () => {
    setConsentInfo({
      consent_granted: true,
      consent_timestamp: new Date().toISOString(),
    });
    setStep("history");
  };

  const handleKickSelected = (kick: KickType) => {
    setKickType(kick);
    setStep("record");
  };

  const handleRecordingComplete = (id: number) => {
    beginSession(id);
    setStep("results");
  };

  const handleReset = () => {
    setStep("choose");
    setKickType(null);
    clearSession();
    setSelectedChild(null);
  };

  const handleRetry = () => {
    setStep("record");
    clearSession();
  };

  const handleGrantConsent = async (athleteId: number) => {
    try {
      await technicalEvaluationApi.setConsent(true, athleteId);
      setLinkedMinors((prev) =>
        prev.map((m) =>
          m.athlete_id === athleteId
            ? {
                ...m,
                consent_granted: true,
                consent_timestamp: new Date().toISOString(),
              }
            : m,
        ),
      );
      showToast({ title: "Consentimiento otorgado", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  const handleRevokeConsent = async (athleteId: number) => {
    try {
      await technicalEvaluationApi.setConsent(false, athleteId);
      setLinkedMinors((prev) =>
        prev.map((m) =>
          m.athlete_id === athleteId
            ? { ...m, consent_granted: false, consent_timestamp: null }
            : m,
        ),
      );
      showToast({ title: "Consentimiento revocado", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  const pageHeaderEyebrow = isParent ? "Acudiente" : undefined;
  const pageHeaderDescription = isParent
    ? "Autoriza la grabación y registra patadas de tus deportistas vinculados."
    : "Registra una patada para analizar ángulo, altura, velocidad y estabilidad.";

  // ---- Loading (initial) ----
  if (loadingConsent) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evaluación técnica"
          description={pageHeaderDescription}
          eyebrow={pageHeaderEyebrow}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // ---- Parent view ----
  if (isParent) {
    const authorizedMinors = linkedMinors.filter((m) => m.consent_granted);
    const showFlow = !!selectedChild && step !== "choose";

    return (
      <div className="space-y-6">
        <PageHeader
          title="Evaluación técnica"
          description={pageHeaderDescription}
          eyebrow={pageHeaderEyebrow}
          actions={
            showFlow ? (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="h-4 w-4" />
                Nueva evaluación
              </Button>
            ) : undefined
          }
        />

        {linkedMinors.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="Sin deportistas vinculados"
              description="Cuando un administrador vincule un deportista a tu cuenta, podrás autorizar y registrar evaluaciones técnicas aquí."
            />
          </Card>
        ) : (
          <>
            <LinkedMinorsCard
              minors={linkedMinors}
              onGrant={handleGrantConsent}
              onRevoke={handleRevokeConsent}
            />

            {step === "choose" && (
              <StartEvaluationCard
                minors={authorizedMinors}
                onSelect={(minor) => {
                  setSelectedChild(minor);
                  setStep("kick");
                }}
              />
            )}

            {showFlow && (
              <div
                key={step}
                className={
                  stepDirection === "right" ? "animate-slide-from-right" : "animate-slide-from-left"
                }
              >
                {step === "kick" && <KickSelection onSelected={handleKickSelected} />}
                {step === "record" && kickType && (
                  <RecordingCapture
                    kickType={kickType}
                    athleteId={selectedChild?.athlete_id}
                    onComplete={handleRecordingComplete}
                    onError={(msg) => showToast({ title: msg, variant: "error" })}
                  />
                )}
                {step === "results" && (
                  <ResultsBlock
                    loading={loadingSession}
                    session={session}
                    onReset={handleReset}
                    onRetry={handleRetry}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ---- Sportsman view ----
  if (!myAthlete) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evaluación técnica"
          description={pageHeaderDescription}
          eyebrow={pageHeaderEyebrow}
        />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Sin perfil deportivo vinculado"
            description="No tienes un perfil de deportista vinculado a tu cuenta. Contacta al administrador para completar tu inscripción."
          />
        </Card>
      </div>
    );
  }

  // Minor sportsman without parent consent
  if (!isAdult && consentInfo?.requires_parent_consent && !consentInfo?.consent_granted) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evaluación técnica"
          description={pageHeaderDescription}
          eyebrow={pageHeaderEyebrow}
        />
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="Consentimiento parental requerido"
            description="Como eres menor de edad, uno de tus padres o acudientes debe autorizar la evaluación técnica desde su cuenta. Pídele que active esta opción en su panel, sección «Evaluación técnica»."
          />
        </Card>
      </div>
    );
  }

  // Adult sportsman who hasn't consented yet
  if (isAdult && step === "choose" && (!consentInfo || !consentInfo.consent_granted)) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Evaluación técnica"
          description={pageHeaderDescription}
          eyebrow={pageHeaderEyebrow}
        />
        <ConsentStep onConsented={handleConsented} />
      </div>
    );
  }

  // Adult sportsman proceeding through the flow
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluación técnica"
        description={pageHeaderDescription}
        eyebrow={pageHeaderEyebrow}
        actions={
          step !== "consent" && step !== "choose" ? (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4" />
              Nueva evaluación
            </Button>
          ) : undefined
        }
      />

      <div
        key={step}
        className={
          stepDirection === "right" ? "animate-slide-from-right" : "animate-slide-from-left"
        }
      >
        {step === "kick" && <KickSelection onSelected={handleKickSelected} />}

        {step === "record" && kickType && (
          <RecordingCapture
            kickType={kickType}
            onComplete={handleRecordingComplete}
            onError={(msg) => showToast({ title: msg, variant: "error" })}
          />
        )}

        {step === "results" && (
          <ResultsBlock
            loading={loadingSession}
            session={session}
            onReset={handleReset}
            onRetry={handleRetry}
          />
        )}
      </div>
    </div>
  );
}
