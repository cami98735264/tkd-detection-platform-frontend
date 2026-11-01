import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecordingCapture, {
  type CapturedRecording,
} from "@/features/technical-evaluation/components/RecordingCapture";
import { useFeedback } from "@/feedback/useFeedback";

import { poomsaeApi } from "../api/poomsaeApi";
import { useAttemptPolling } from "../hooks/useAttemptPolling";
import type { AttemptMode } from "../types";
import AttemptResult from "./AttemptResult";
import ConsentGate from "./ConsentGate";

interface Props {
  mode: AttemptMode;
  targetId: number;
  targetName: string;
  /** Reference shown before recording (video segment / technique notes). */
  reference: ReactNode;
  /** Athlete id for parents/admin (null = own athlete). */
  athleteId: number | null;
  recordSeconds?: number;
  onClose: () => void;
  /** Called after an attempt finished (refresh progress/history). */
  onFinished?: () => void;
}

type Step = "reference" | "record" | "result";

/** Reference → record with the camera → poll the analysis → result / repeat. */
export default function PracticeFlow({
  mode,
  targetId,
  targetName,
  reference,
  athleteId,
  recordSeconds = 15,
  onClose,
  onFinished,
}: Props) {
  const { showToast } = useFeedback();
  const [step, setStep] = useState<Step>("reference");
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { attempt, done, timedOut } = useAttemptPolling(step === "result" ? attemptId : null);
  const finishedId = done && attempt ? attempt.id : null;
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);
  useEffect(() => {
    if (finishedId != null) onFinishedRef.current?.();
  }, [finishedId]);

  const upload = useCallback(
    async ({ recording, landmarks }: CapturedRecording) => {
      const created = await poomsaeApi.createAttempt({
        mode,
        segment: mode === "segment" ? targetId : undefined,
        technique: mode === "technique" ? targetId : undefined,
        athlete: athleteId,
        recording,
        landmarks: recording ? null : landmarks,
      });
      return created.id;
    },
    [mode, targetId, athleteId],
  );

  const repeat = () => {
    setAttemptId(null);
    setStep("record");
  };
  const repeatLabel = mode === "segment" ? "Repetir segmento" : "Repetir técnica";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold text-text">
          {mode === "segment" ? "Practicar segmento" : "Practicar técnica"}: {targetName}
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {step === "reference" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Observa la referencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reference}
            <Button onClick={() => setStep("record")}>
              <Camera className="h-4 w-4" />
              Estoy listo, grabar
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "record" && (
        <ConsentGate athleteId={athleteId}>
          <RecordingCapture
            title={mode === "segment" ? "Grabar segmento" : "Grabar técnica"}
            label={targetName}
            recordSeconds={recordSeconds}
            recordingHint="Ejecuta los movimientos con calma, de frente o de lado a la cámara, con el cuerpo completo visible."
            upload={upload}
            onComplete={(id) => {
              setAttemptId(id);
              setStep("result");
            }}
            onError={(msg) => showToast({ title: msg, variant: "error" })}
          />
        </ConsentGate>
      )}

      {step === "result" &&
        (attempt && done ? (
          <AttemptResult
            attempt={attempt}
            onRepeat={repeat}
            repeatLabel={repeatLabel}
            onClose={onClose}
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              {timedOut ? (
                <>
                  <p className="font-medium text-text">
                    El análisis está tardando más de lo normal.
                  </p>
                  <p className="text-sm text-muted">
                    Podrás ver el resultado en el historial de intentos cuando termine.
                  </p>
                  <Button variant="outline" onClick={onClose}>
                    Volver
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-display font-semibold text-text">Analizando tu ejecución…</p>
                  <p className="text-sm text-muted">Esto puede tardar unos segundos.</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
