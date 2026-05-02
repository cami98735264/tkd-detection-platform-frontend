import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ShieldAlert, CheckCircle, XCircle } from "lucide-react";
import ConsentStep from "@/features/technical-evaluation/components/ConsentStep";
import KickSelection from "@/features/technical-evaluation/components/KickSelection";
import RecordingCapture from "@/features/technical-evaluation/components/RecordingCapture";
import EvaluationResultsView from "@/features/technical-evaluation/components/EvaluationResults";
import { technicalEvaluationApi, type KickType, type EvaluationSession } from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useAuthStore } from "@/features/auth/store/authStore";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import type { Athlete } from "@/types/entities";

type Step = "choose" | "consent" | "kick" | "record" | "results";

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
  const [myAthlete, setMyAthlete] = useState<Athlete | null>(null);
  const [kickType, setKickType] = useState<KickType | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [consentInfo, setConsentInfo] = useState<ConsentInfo | null>(null);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [linkedMinors, setLinkedMinors] = useState<AthleteConsent[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  // Load athlete and consent on mount for sportsman
  useEffect(() => {
    if (isSportsman) {
      Promise.all([
        athletesApi.getMe(),
        technicalEvaluationApi.getConsent(),
      ])
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
      technicalEvaluationApi.getConsent()
        .then((data: any) => {
          if (Array.isArray(data)) {
            setLinkedMinors(data);
          }
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

  const canProceed = isSportsman
    ? isAdult
      ? consentInfo?.consent_granted
      : (consentInfo?.consent_granted && !consentInfo?.requires_parent_consent)
    : isParent;

  const handleConsented = () => {
    setConsentInfo({ consent_granted: true, consent_timestamp: new Date().toISOString() });
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
            showToast({ title: "Error en el análisis", description: "No se pudo procesar la patada.", variant: "error" });
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
  };

  const handleGrantConsent = async (athleteId: number) => {
    try {
      await technicalEvaluationApi.setConsent(true, athleteId);
      setLinkedMinors((prev) =>
        prev.map((m) =>
          m.athlete_id === athleteId
            ? { ...m, consent_granted: true, consent_timestamp: new Date().toISOString() }
            : m
        )
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
            : m
        )
      );
      showToast({ title: "Consentimiento revocado", variant: "success" });
    } catch (err) {
      handleError(err);
    }
  };

  // ---- Parent view ----
  if (isParent && !loadingConsent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        </div>

        {linkedMinors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No tienes deportistas vinculados.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>DeportistasVinculados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkedMinors.map((minor) => (
                  <div key={minor.athlete_id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{minor.athlete_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {minor.consent_timestamp
                          ? `Consentimiento: ${new Date(minor.consent_timestamp).toLocaleString()}`
                          : "Sin consentimiento"}
                      </p>
                    </div>
                    <div>
                      {minor.consent_granted ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle size={12} className="mr-1" /> Autorizado
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeConsent(minor.athlete_id)}
                          >
                            Revocar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <XCircle size={12} className="mr-1" /> Sin autorizar
                          </Badge>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleGrantConsent(minor.athlete_id)}
                          >
                            Autorizar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {step !== "choose" && step !== "kick" && step !== "record" && step !== "results" ? null : (
              <Card>
                <CardHeader>
                  <CardTitle>Sessions de Evaluación</CardTitle>
                </CardHeader>
                <CardContent>
                  {step === "kick" && (
                    <KickSelection onSelected={handleKickSelected} />
                  )}
                  {step === "record" && kickType && (
                    <RecordingCapture
                      kickType={kickType}
                      onComplete={handleRecordingComplete}
                      onError={(msg) => showToast({ title: msg, variant: "error" })}
                    />
                  )}
                  {step === "results" && (
                    loadingSession ? (
                      <div className="py-12 flex flex-col items-center gap-4">
                        <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full" />
                        <p className="text-muted-foreground">Analizando patada...</p>
                      </div>
                    ) : session?.results ? (
                      <EvaluationResultsView results={session.results} />
                    ) : (
                      <p className="text-center text-muted-foreground">Sin resultados.</p>
                    )
                  )}
                </CardContent>
              </Card>
            )}

            {step === "choose" && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Selecciona un menor para continuar con la evaluación.
                  </p>
                  {linkedMinors.filter(m => m.consent_granted).map((minor) => (
                    <div key={minor.athlete_id} className="flex justify-center gap-4">
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedChildId(minor.athlete_id);
                          setStep("kick");
                        }}
                      >
                        Evaluar a {minor.athlete_name}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {step !== "choose" && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw size={16} className="mr-2" /> Nueva evaluación
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ---- Sportsman view ----
  if (loadingConsent) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!myAthlete) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldAlert className="mx-auto mb-4 text-yellow-500" size={48} />
            <p className="text-muted-foreground">
              No tienes un perfil de deportista vinculado. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Minor sportsman without parent consent
  if (!isAdult && consentInfo?.requires_parent_consent && !consentInfo?.consent_granted) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
            <ShieldAlert className="text-yellow-500" size={48} />
            <div>
              <p className="font-medium text-lg mb-2">Consentimiento parental requerido</p>
              <p className="text-muted-foreground">
                Como eres menor de edad, uno de tus padres o acudientes debe autorizar
                la evaluación técnica desde su cuenta.
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              Tu padre/acudiente puede activar esta opción en su dashboard, sección "Evaluación Técnica"
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Adult sportsman who hasn't consented yet
  if (isAdult && step === "choose" && (!consentInfo || !consentInfo.consent_granted)) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        <ConsentStep onConsented={handleConsented} />
      </div>
    );
  }

  // Adult sportsman proceeding
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Evaluación Técnica</h1>
        {step !== "consent" && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw size={16} className="mr-2" />
            Nueva evaluación
          </Button>
        )}
      </div>

      {step === "consent" && (
        <ConsentStep onConsented={handleConsented} />
      )}

      {step === "kick" && (
        <KickSelection onSelected={handleKickSelected} />
      )}

      {step === "record" && kickType && (
        <RecordingCapture
          kickType={kickType}
          onComplete={handleRecordingComplete}
          onError={(msg) => showToast({ title: msg, variant: "error" })}
        />
      )}

      {step === "results" && (
        <>
          {loadingSession ? (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <div className="animate-spin h-12 w-12 border-4 border-green-600 border-t-transparent rounded-full" />
                <div className="text-center">
                  <p className="font-medium">Analizando patada...</p>
                  <p className="text-sm text-muted-foreground">
                    Procesando video para calcular métricas de rendimiento.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : session?.results ? (
            <EvaluationResultsView results={session.results} />
          ) : session?.status === "failed" ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-red-500 font-medium mb-4">
                  No se pudo procesar la evaluación.
                </p>
                <Button onClick={handleReset}>Intentar de nuevo</Button>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}