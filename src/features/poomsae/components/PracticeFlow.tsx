import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AlertTriangle, ArrowLeft, Camera, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RecordingCapture, {
  type CapturedRecording,
} from "@/features/technical-evaluation/components/RecordingCapture";
import { useFeedback } from "@/feedback/useFeedback";

import { poomsaeApi } from "../api/poomsaeApi";
import { FULL_POLLING, useAttemptPolling } from "../hooks/useAttemptPolling";
import { FULL_MAX_VIDEO_BYTES, formatMegabytes, validateVideoFile } from "../lib/sequence";
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
  const isFull = mode === "full";
  const { attempt, done, timedOut } = useAttemptPolling(
    step === "result" ? attemptId : null,
    isFull ? FULL_POLLING : undefined,
  );
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
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
        poomsae: mode === "full" ? targetId : undefined,
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
  const repeatLabel =
    mode === "full" ? "Repetir forma" : mode === "segment" ? "Repetir segmento" : "Repetir técnica";
  const heading =
    mode === "full"
      ? "Forma completa"
      : mode === "segment"
        ? "Practicar segmento"
        : "Practicar técnica";

  /** Full mode: upload a video recorded with another device/app. */
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const problem = validateVideoFile(file, FULL_MAX_VIDEO_BYTES);
    setFileError(problem);
    if (problem) return;
    setUploadingFile(true);
    try {
      const id = await upload({ recording: file, landmarks: [] });
      setAttemptId(id);
      setStep("result");
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : "";
      showToast({ title: `Error al subir el video${msg ? `: ${msg}` : "."}`, variant: "error" });
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold text-text">
          {heading}: {targetName}
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
          <div className="space-y-4">
            {isFull && (
              <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-text">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-medium">Antes de grabar la forma completa</p>
                  <p className="text-muted">
                    El video puede pesar como máximo {formatMegabytes(FULL_MAX_VIDEO_BYTES)}. La
                    grabación con la cámara dura hasta {recordSeconds} s; si subes un video,
                    recórtalo a la forma (unos 1–2 minutos). Graba desde el saludo inicial hasta el
                    final, con todo el recorrido dentro del encuadre. El análisis puede tardar
                    varios minutos.
                  </p>
                </div>
              </div>
            )}
            {uploadingFile ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-display font-semibold text-text">Subiendo el video…</p>
                  <p className="text-sm text-muted">No cierres esta página.</p>
                </CardContent>
              </Card>
            ) : (
              <RecordingCapture
                title={
                  mode === "full"
                    ? "Grabar forma completa"
                    : mode === "segment"
                      ? "Grabar segmento"
                      : "Grabar técnica"
                }
                label={targetName}
                recordSeconds={recordSeconds}
                allowEarlyStop={isFull}
                recordingHint={
                  isFull
                    ? "Ejecuta la forma completa sin detenerte. Pulsa «Terminar grabación» al acabar."
                    : "Ejecuta los movimientos con calma, de frente o de lado a la cámara, con el cuerpo completo visible."
                }
                upload={upload}
                onComplete={(id) => {
                  setAttemptId(id);
                  setStep("result");
                }}
                onError={(msg) => showToast({ title: msg, variant: "error" })}
              />
            )}
            {isFull && !uploadingFile && (
              <Card>
                <CardContent className="space-y-2 py-4">
                  <p className="text-sm font-medium text-text">¿Ya tienes el video grabado?</p>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text hover:bg-surface-2">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Subir video (MP4, WebM o MOV)
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                      className="sr-only"
                      aria-label="Subir video de la forma completa"
                      onChange={(e) => void handleFile(e)}
                    />
                  </label>
                  {fileError && (
                    <p role="alert" className="text-sm text-error">
                      {fileError}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
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
                  <p className="text-sm text-muted">
                    {isFull
                      ? "Analizar la forma completa puede tardar varios minutos. Puedes dejar esta página abierta."
                      : "Esto puede tardar unos segundos."}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
