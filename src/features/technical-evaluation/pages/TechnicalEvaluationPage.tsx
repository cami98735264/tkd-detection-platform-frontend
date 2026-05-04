import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import ConsentStep from "@/features/technical-evaluation/components/ConsentStep";
import KickSelection from "@/features/technical-evaluation/components/KickSelection";
import RecordingCapture from "@/features/technical-evaluation/components/RecordingCapture";
import EvaluationResultsView from "@/features/technical-evaluation/components/EvaluationResults";
import {
  technicalEvaluationApi,
  type EvaluationSession,
  type KickType,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useAuthStore } from "@/features/auth/store/authStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import type { Athlete } from "@/types/entities";

type Step = "choose" | "consent" | "kick" | "record" | "results";

const STEP_ORDER: Step[] = ["choose", "consent", "kick", "record", "results"];

interface ConsentInfo {
  consent_granted: boolean;
  consent_timestamp: string | null;
  requires_parent_consent?: boolean;
  granted_by?: string;
}

interface AthleteConsent {
  athlete_id: number;
  athlete_name: string;
  consent_granted: boolean;
  consent_timestamp: string | null;
}

export default function TechnicalEvaluationPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const user = useAuthStore((s) => s.user);
  const isSportsman = user?.role === "sportsman";
  const isParent = user?.role === "parent";

  const [step, setStep] = useState<Step>("choose");
  const prevStepRef = useRef<Step>(step);
  const stepDirection: "right" | "left" =
    STEP_ORDER.indexOf(step) >= STEP_ORDER.indexOf(prevStepRef.current)
      ? "right"
      : "left";
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);
  const [myAthlete, setMyAthlete] = useState<Athlete | null>(null);
  const [kickType, setKickType] = useState<KickType | null>(null);
  const [, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [consentInfo, setConsentInfo] = useState<ConsentInfo | null>(null);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [linkedMinors, setLinkedMinors] = useState<AthleteConsent[]>([]);
  const [selectedChild, setSelectedChild] = useState<AthleteConsent | null>(
    null,
  );

  // Load athlete and consent on mount for sportsman
  useEffect(() => {
    if (isSportsman) {
      Promise.all([athletesApi.getMe(), technicalEvaluationApi.getConsent()])
        .then(([ath, consent]) => {
          setMyAthlete(ath);
          setConsentInfo(consent);
        })
        .catch(() => {
          setMyAthlete(null);
          setConsentInfo({ consent_granted: false, consent_timestamp: null });
        })
        .finally(() => setLoadingConsent(false));
    } else if (isParent) {
      technicalEvaluationApi
        .getConsent()
        .then((data: any) => {
          if (Array.isArray(data)) setLinkedMinors(data);
        })
        .catch(() => {})
        .finally(() => setLoadingConsent(false));
    }
  }, [isSportsman, isParent]);

  const isAdult = myAthlete?.date_of_birth
    ? (() => {
        const dob = new Date(myAthlete.date_of_birth);
        const age = Math.floor(
          (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );
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
    setStep("kick");
  };

  const handleKickSelected = (kick: KickType) => {
    setKickType(kick);
    setStep("record");
  };

  const handleRecordingComplete = (id: number) => {
    setSessionId(id);
    pollResults(id);
  };

  const pollResults = (id: number) => {
    setStep("results");
    setLoadingSession(true);

    const poll = async () => {
      try {
        const s = await technicalEvaluationApi.getSession(id);
        if (s.status === "completed" || s.status === "failed") {
          setSession(s);
          setLoadingSession(false);
          if (s.status === "failed") {
            showToast({
              title: "Error en el análisis",
              description: s.recommendations || "No se pudo procesar la patada.",
              variant: "error",
            });
          }
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setLoadingSession(false);
        handleError(new Error("Error al obtener resultados"));
      }
    };

    poll();
  };

  const handleReset = () => {
    setStep("choose");
    setKickType(null);
    setSessionId(null);
    setSession(null);
    setSelectedChild(null);
  };

  const handleRetry = () => {
    setStep("record");
    setSessionId(null);
    setSession(null);
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

  const pageHeaderEyebrow = isParent
    ? "Acudiente"
    : isSportsman
      ? "Mi entrenamiento"
      : "Seguimiento";
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
            <ScrollReveal>
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-lg font-semibold tracking-tight">
                    Deportistas vinculados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-divider">
                    {linkedMinors.map((minor) => (
                      <li
                        key={minor.athlete_id}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                            <UserCheck className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-text">
                              {minor.athlete_name}
                            </p>
                            <p className="text-xs text-faint">
                              {minor.consent_timestamp
                                ? `Autorizado el ${new Date(
                                    minor.consent_timestamp,
                                  ).toLocaleString()}`
                                : "Sin autorización"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {minor.consent_granted ? (
                            <>
                              <Badge variant="success">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Autorizado
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRevokeConsent(minor.athlete_id)
                                }
                              >
                                Revocar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline-muted">
                                <XCircle className="mr-1 h-3 w-3" />
                                Sin autorizar
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleGrantConsent(minor.athlete_id)
                                }
                              >
                                Autorizar
                              </Button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </ScrollReveal>

            {step === "choose" && (
              <ScrollReveal>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-lg font-semibold tracking-tight">
                      Iniciar evaluación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {authorizedMinors.length === 0 ? (
                      <EmptyState
                        icon={ShieldCheck}
                        title="Falta autorización"
                        description="Autoriza al menos a un deportista vinculado para comenzar una evaluación técnica."
                      />
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {authorizedMinors.map((minor) => (
                          <button
                            key={minor.athlete_id}
                            type="button"
                            onClick={() => {
                              setSelectedChild(minor);
                              setStep("kick");
                            }}
                            className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-interactive hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                          >
                            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-interactive group-hover:bg-primary/15">
                              <Camera className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-text">
                                {minor.athlete_name}
                              </p>
                              <p className="text-xs text-muted">
                                Iniciar evaluación
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </ScrollReveal>
            )}

            {showFlow && (
              <div
                key={step}
                className={
                  stepDirection === "right"
                    ? "animate-slide-from-right"
                    : "animate-slide-from-left"
                }
              >
                {step === "kick" && (
                  <KickSelection onSelected={handleKickSelected} />
                )}
                {step === "record" && kickType && (
                  <RecordingCapture
                    kickType={kickType}
                    onComplete={handleRecordingComplete}
                    onError={(msg) =>
                      showToast({ title: msg, variant: "error" })
                    }
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
  if (
    !isAdult &&
    consentInfo?.requires_parent_consent &&
    !consentInfo?.consent_granted
  ) {
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
  if (
    isAdult &&
    step === "choose" &&
    (!consentInfo || !consentInfo.consent_granted)
  ) {
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
          stepDirection === "right"
            ? "animate-slide-from-right"
            : "animate-slide-from-left"
        }
      >
        {step === "consent" && <ConsentStep onConsented={handleConsented} />}

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

interface ResultsBlockProps {
  loading: boolean;
  session: EvaluationSession | null;
  onReset: () => void;
  onRetry: () => void;
}

function ResultsBlock({ loading, session, onReset, onRetry }: ResultsBlockProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div>
            <p className="font-display text-base font-semibold tracking-tight text-text">
              Analizando patada…
            </p>
            <p className="mt-1 text-sm text-muted">
              Procesando video para calcular métricas de rendimiento.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session?.results) {
    return <EvaluationResultsView results={session.results} />;
  }

  if (session?.status === "failed") {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="No se pudo procesar la evaluación"
          description={
            session.recommendations ||
            "Ocurrió un error al analizar la grabación. Intenta registrar la patada nuevamente."
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={onRetry}>
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
              <Button variant="outline" onClick={onReset}>
                Nueva evaluación
              </Button>
            </div>
          }
        />
      </Card>
    );
  }

  return null;
}
