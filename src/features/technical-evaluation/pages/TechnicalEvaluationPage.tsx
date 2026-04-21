import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import ConsentStep from "@/features/technical-evaluation/components/ConsentStep";
import KickSelection from "@/features/technical-evaluation/components/KickSelection";
import RecordingCapture from "@/features/technical-evaluation/components/RecordingCapture";
import EvaluationResultsView from "@/features/technical-evaluation/components/EvaluationResults";
import { technicalEvaluationApi, type KickType, type EvaluationSession } from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Step = "consent" | "kick" | "record" | "results";

export default function TechnicalEvaluationPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [step, setStep] = useState<Step>("consent");
  const [, setConsentGranted] = useState(false);
  const [kickType, setKickType] = useState<KickType | null>(null);
  const [, setSessionId] = useState<number | null>(null);
  const [session, setSession] = useState<EvaluationSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  // Check if consent already granted on mount
  useEffect(() => {
    technicalEvaluationApi
      .getConsent()
      .then((res) => {
        if (res.consent_granted) {
          setConsentGranted(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleConsented = () => {
    setConsentGranted(true);
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
          // retry after 2s
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
    setStep("kick");
    setKickType(null);
    setSessionId(null);
    setSession(null);
  };

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