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

/** What a custom uploader receives once recording stops. */
export interface CapturedRecording {
  /** Recorded clip, or null when the browser cannot record video. */
  recording: Blob | null;
  /** Pose frames sampled by the live overlay while recording. */
  landmarks: { t: number; landmarks: { x: number; y: number; z: number; visibility?: number }[] }[];
}

interface RecordingCaptureProps {
  /** Kick module: what is recorded (also the default upload target). */
  kickType?: KickType;
  athleteId?: number;
  onComplete: (sessionId: number) => void;
  onError: (msg: string) => void;
  /**
   * Custom upload (e.g. Poomsae attempts). Resolves with the created id. When
   * omitted the clip is sent to the kick technical-evaluation endpoint.
   */
  upload?: (captured: CapturedRecording) => Promise<number>;
  /** Shown as "Técnica seleccionada" (defaults to the kick type). */
  label?: string;
  /** Card title in the idle state (default "Grabar patada"). */
  title?: string;
  /** Recording length in seconds (default 10). */
  recordSeconds?: number;
  /** Hint shown while recording. */
  recordingHint?: string;
  /** Show a "Terminar grabación" button so long takes can end early. */
  allowEarlyStop?: boolean;
}

const PRECOUNTDOWN_SECS = 3;
const DEFAULT_RECORD_SECS = 10;
/** Keep the landmark fallback payload bounded (~15 fps). */
const LANDMARK_MIN_INTERVAL_MS = 66;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  const supports = (t: string) =>
    typeof MediaRecorder.isTypeSupported !== "function" || MediaRecorder.isTypeSupported(t);
  return supports("video/webm") ? "video/webm" : supports("video/mp4") ? "video/mp4" : "video/webm";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

export default function RecordingCapture({
  kickType,
  athleteId,
  onComplete,
  onError,
  upload,
  label,
  title: idleTitle = "Grabar patada",
  recordSeconds = DEFAULT_RECORD_SECS,
  recordingHint = "Ejecuta la patada con máxima fuerza y precisión.",
  allowEarlyStop = false,
}: RecordingCaptureProps) {
  const RECORD_SECS = recordSeconds;
  const subject = label ?? kickType ?? "";
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<CapturedRecording["landmarks"]>([]);
  const capturingRef = useRef(false);
  const startedAtRef = useRef(0);

  const handleFrame = useCallback(
    (landmarks: { x: number; y: number; z: number; visibility?: number }[], ts: number) => {
      if (!capturingRef.current) return;
      const t = Math.round(ts - startedAtRef.current);
      const last = framesRef.current[framesRef.current.length - 1];
      if (last && t - last.t < LANDMARK_MIN_INTERVAL_MS) return;
      framesRef.current.push({
        t,
        landmarks: landmarks.map((l) => ({ x: l.x, y: l.y, z: l.z, visibility: l.visibility })),
      });
    },
    [],
  );

  const { stream, error: camError, hasPermission, requestCamera, stopCamera } = useCameraAccess();

  const [phase, setPhase] = useState<"idle" | "countdown" | "recording" | "uploading">("idle");
  const [countdown, setCountdown] = useState(PRECOUNTDOWN_SECS);

  const {
    secondsLeft,
    progress,
    start: startTimer,
    reset: resetTimer,
  } = useRecordingTimer(recordSeconds, () => stopRecording());

  // The current <video> element. Tracked in state (rather than a ref) so the
  // SkeletonOverlay can react when the element changes.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Callback ref: re-attach the live stream whenever the <video> element
  // mounts or the stream identity changes.
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

  // Upload what was captured (custom uploader or the kick endpoint).
  const finish = useCallback(
    async (blob: Blob | null) => {
      try {
        let id: number;
        if (upload) {
          id = await upload({ recording: blob, landmarks: framesRef.current });
        } else {
          if (!blob || !kickType) throw new Error("No se pudo grabar el video.");
          const base64 = await blobToDataUrl(blob);
          const session = await technicalEvaluationApi.createSession(kickType, base64, athleteId);
          id = session.id;
        }
        onComplete(id);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? `Error al subir la grabación: ${err.message}`
            : "Error al subir la grabación.";
        onError(message);
        setPhase("idle");
        setCountdown(PRECOUNTDOWN_SECS);
        requestCamera();
      }
    },
    [upload, kickType, athleteId, onComplete, onError, requestCamera],
  );

  const stopRecording = useCallback(() => {
    capturingRef.current = false;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // onstop uploads
    } else if (!recorder) {
      void finish(null); // landmark-only fallback
    }
    stopCamera();
    setPhase("uploading");
  }, [stopCamera, finish]);

  const startRecording = useCallback(() => {
    if (!stream) return;
    chunksRef.current = [];
    framesRef.current = [];
    startedAtRef.current = performance.now();
    capturingRef.current = true;
    mediaRecorderRef.current = null;

    if (typeof MediaRecorder === "undefined") {
      // No video recording in this browser: custom uploaders can still send
      // the pose frames collected by the overlay.
      if (!upload) {
        capturingRef.current = false;
        onError("Tu navegador no permite grabar video.");
        return;
      }
      setPhase("recording");
      startTimer();
      return;
    }

    // Cap the bitrate so a 10s clip lands around ~1.2 MB instead of the
    // browser default (often 2.5+ Mbps ≈ 3+ MB, which inflates ~33% more once
    // base64-encoded for the JSON upload). Smaller payloads are the difference
    // between an upload completing or stalling out (nginx 408 / client timeout)
    // on flaky mobile connections. 1 Mbps@720p stays well within MediaPipe's
    // accuracy needs.
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_000_000,
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      void finish(new Blob(chunksRef.current, { type: mimeType }));
    };

    recorder.start();
    setPhase("recording");
    startTimer();
  }, [stream, upload, startTimer, onError, finish]);

  const handleStart = async () => {
    await requestCamera();
  };

  const handleBeginCountdown = () => {
    setPhase("countdown");
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          startRecording();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // Phase: uploading — separate card, no video stage.
  if (phase === "uploading") {
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
              <p className="mt-1 text-sm text-muted">Esto puede tardar unos segundos.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Phase: idle without permission — request access first.
  if (phase === "idle" && !hasPermission) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <Video className="h-5 w-5 text-primary" />
            {idleTitle}
          </CardTitle>
          <p className="text-sm text-muted">
            Técnica seleccionada: <span className="font-medium text-text">{subject}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {camError && (
            <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{camError}</span>
            </div>
          )}
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
        </CardContent>
      </Card>
    );
  }

  // Phases idle (with permission) / countdown / recording all share the same
  // Card structure. The <video> + <SkeletonOverlay> stay mounted across phase
  // transitions so the pose landmarker isn't torn down and re-initialized
  // (which would briefly drop the skeleton during recording).
  const title =
    phase === "countdown" ? (
      <>Prepárate</>
    ) : phase === "recording" ? (
      <>
        <span
          className="inline-flex h-2 w-2 animate-pulse-soft rounded-full bg-error"
          aria-hidden="true"
        />
        Grabando · {subject}
      </>
    ) : (
      <>
        <Video className="h-5 w-5 text-primary" />
        {idleTitle}
      </>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          {title}
        </CardTitle>
        {phase === "idle" && (
          <p className="text-sm text-muted">
            Técnica seleccionada: <span className="font-medium text-text">{subject}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {camError && (
          <div className="flex items-start gap-2 rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{camError}</span>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-black">
          <div className="relative aspect-video">
            <video
              ref={setVideoNode}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <SkeletonOverlay video={videoEl} enabled={overlayEnabled} onFrame={handleFrame} />
            {phase === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="font-display text-8xl font-semibold tabular-nums text-white drop-shadow-lg">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        </div>

        {phase === "idle" && (
          <>
            <div className="rounded-md border border-border bg-surface-2/50 p-3 text-xs text-muted">
              <p className="font-medium text-text">Para un análisis preciso:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>
                  Coloca la cámara <span className="text-text">de costado</span> al deportista, a la
                  altura de la cadera.
                </li>
                <li>Distancia de ~3 m, con el cuerpo completo (cabeza a pies) visible.</li>
                <li>Buena iluminación y fondo sin obstáculos.</li>
              </ul>
            </div>
            <Button className="w-full" onClick={handleBeginCountdown}>
              Comenzar grabación
            </Button>
            <p className="text-center text-xs text-faint">
              Al iniciar, tendrás {PRECOUNTDOWN_SECS} segundos para colocarte y {RECORD_SECS}{" "}
              segundos para ejecutar {upload ? "el movimiento" : "la patada"}.
            </p>
          </>
        )}

        {phase === "countdown" && (
          <p className="text-center text-sm text-muted">
            Prepárate para ejecutar {upload ? "el movimiento" : "la patada"}
          </p>
        )}

        {phase === "recording" && (
          <>
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
                  {secondsLeft}s <span className="text-faint">/ {RECORD_SECS}s</span>
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
            <p className="text-center text-sm text-muted">{recordingHint}</p>
            {allowEarlyStop && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  resetTimer();
                  stopRecording();
                }}
              >
                Terminar grabación
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
