import { useCallback, useRef, useState } from "react";
import { AlertCircle, Camera, Loader2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import SkeletonOverlay from "@/features/technical-evaluation/components/SkeletonOverlay";
import { useCameraAccess } from "@/features/technical-evaluation/hooks/useCameraAccess";
import { useRecordingTimer } from "@/features/technical-evaluation/hooks/useRecordingTimer";
import {
  technicalEvaluationApi,
  type KickType,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface RecordingCaptureProps {
  kickType: KickType;
  onComplete: (sessionId: number) => void;
  onError: (msg: string) => void;
}

const PRECOUNTDOWN_SECS = 3;
const RECORD_SECS = 10;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export default function RecordingCapture({
  kickType,
  onComplete,
  onError,
}: RecordingCaptureProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const {
    stream,
    error: camError,
    hasPermission,
    requestCamera,
    stopCamera,
  } = useCameraAccess();

  const [phase, setPhase] = useState<
    "idle" | "countdown" | "recording" | "uploading"
  >("idle");
  const [countdown, setCountdown] = useState(PRECOUNTDOWN_SECS);

  const { secondsLeft, progress, start: startTimer } = useRecordingTimer(
    RECORD_SECS,
    () => stopRecording(),
  );

  // The current <video> element. Tracked in state (rather than a ref) so the
  // SkeletonOverlay can react when the element changes across phases.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Callback ref: re-attaches the live stream every time the <video> element
  // mounts. Each phase (idle/countdown/recording) renders its own <video>, so
  // a plain useEffect+useRef would only fire once and the new elements would
  // stay black.
  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      if (node && stream) {
        node.srcObject = stream;
      }
      setVideoEl(node);
    },
    [stream],
  );

  // Keep the pose landmarker alive only while the camera is up — releases the
  // GPU/WASM resources the moment recording wraps up.
  const overlayEnabled = !!stream;

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    stopCamera();
    setPhase("uploading");
  }, [stopCamera]);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      try {
        const base64 = await blobToDataUrl(blob);
        const session = await technicalEvaluationApi.createSession(
          kickType,
          base64,
        );
        onComplete(session.id);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? `Error al subir la grabación: ${err.message}`
            : "Error al subir la grabación.";
        onError(message);
        // Drop out of the "uploading" spinner and re-acquire the camera so the
        // user can retry without reloading.
        setPhase("idle");
        setCountdown(PRECOUNTDOWN_SECS);
        requestCamera();
      }
    };

    recorder.start();
    setPhase("recording");
    startTimer();
  }, [stream, kickType, startTimer, onComplete, onError]);

  const handleStart = async () => {
    await requestCamera();
  };

  const handleBeginCountdown = () => {
    setPhase("countdown");
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setPhase("recording");
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // Idle: ask for camera permission, then show preview + start button
  if (phase === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Video className="h-5 w-5 text-primary" />
            Grabar patada
          </CardTitle>
          <p className="text-sm text-muted">
            Técnica seleccionada:{" "}
            <span className="font-medium text-text">{kickType}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {camError && (
            <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{camError}</span>
            </div>
          )}

          {!hasPermission ? (
            <EmptyState
              icon={Camera}
              title="Acceso a la cámara requerido"
              description="Para grabar la patada necesitamos permiso para acceder a la cámara de tu dispositivo."
              action={
                <Button onClick={handleStart}>
                  <Camera className="h-4 w-4" />
                  Solicitar acceso a cámara
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border bg-black">
                <div className="relative aspect-video">
                  <video
                    ref={setVideoNode}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  <SkeletonOverlay video={videoEl} enabled={overlayEnabled} />
                </div>
              </div>
              <Button className="w-full" onClick={handleBeginCountdown}>
                Comenzar grabación
              </Button>
              <p className="text-center text-xs text-faint">
                Al iniciar, tendrás {PRECOUNTDOWN_SECS} segundos para colocarte y
                {" "}
                {RECORD_SECS} segundos para ejecutar la patada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (phase === "countdown") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold tracking-tight">
            Prepárate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            <div className="relative aspect-video">
              <video
                ref={setVideoNode}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <SkeletonOverlay video={videoEl} enabled={overlayEnabled} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="font-display text-8xl font-semibold tabular-nums text-white drop-shadow-lg">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted">
            Prepárate para ejecutar la patada
          </p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "recording") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <span
              className="inline-flex h-2 w-2 animate-pulse-soft rounded-full bg-error"
              aria-hidden="true"
            />
            Grabando · {kickType}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-black">
            <div className="relative aspect-video">
              <video
                ref={setVideoNode}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <SkeletonOverlay video={videoEl} enabled={overlayEnabled} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-error">
                <span
                  className="h-2 w-2 animate-pulse-soft rounded-full bg-error"
                  aria-hidden="true"
                />
                REC
              </span>
              <span className="font-display tabular-nums text-text">
                {secondsLeft}s{" "}
                <span className="text-faint">/ {RECORD_SECS}s</span>
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de grabación"
            >
              <div
                className="h-full bg-error transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-sm text-muted">
            Ejecuta la patada con máxima fuerza y precisión.
          </p>
        </CardContent>
      </Card>
    );
  }

  // uploading
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Procesando
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div>
            <p className="font-display text-base font-semibold tracking-tight text-text">
              Subiendo y analizando…
            </p>
            <p className="mt-1 text-sm text-muted">
              Esto puede tardar unos segundos.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
