import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCameraAccess } from "@/features/technical-evaluation/hooks/useCameraAccess";
import { useRecordingTimer } from "@/features/technical-evaluation/hooks/useRecordingTimer";
import { technicalEvaluationApi, type KickType } from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface RecordingCaptureProps {
  kickType: KickType;
  onComplete: (sessionId: number) => void;
  onError: (msg: string) => void;
}

const PRECOUNTDOWN_SECS = 3;
const RECORD_SECS = 10;

export default function RecordingCapture({ kickType, onComplete, onError }: RecordingCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { stream, error: camError, hasPermission, requestCamera, stopCamera } = useCameraAccess();

  const [phase, setPhase] = useState<"idle" | "countdown" | "recording" | "uploading">("idle");
  const [countdown, setCountdown] = useState(PRECOUNTDOWN_SECS);

  const { secondsLeft, progress, start: startTimer } = useRecordingTimer(
    RECORD_SECS,
    () => stopRecording(),
  );

  // Attach stream to video element
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
      const formData = new FormData();
      formData.append("video", blob, "recording.webm");

      // Upload and create session
      try {
        // Simulate upload - in production this would upload the blob
        // For now we create the session with a placeholder URL
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          // In production: upload video file first, then create session
          // For now we proceed with the session
          const session = await technicalEvaluationApi.createSession(kickType, base64);
          onComplete(session.id);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        onError("Error al subir la grabación.");
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

  // Once camera is granted and user is idle, show start button
  if (phase === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grabar Patada: {kickType}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {camError && <p className="text-error text-sm">{camError}</p>}

          {!hasPermission ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                Solicite acceso a la cámara para comenzar la grabación.
              </p>
              <Button className="w-full" onClick={handleStart}>
                Solicitar acceso a cámara
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-black rounded-lg overflow-hidden aspect-video">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              <Button className="w-full" onClick={handleBeginCountdown}>
                Comenzar grabación
              </Button>
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
          <CardTitle>Prepárate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl font-bold text-white drop-shadow-lg">{countdown}</span>
            </div>
          </div>
          <p className="text-center text-muted-foreground">Prepárate para executar la patada</p>
        </CardContent>
      </Card>
    );
  }

  if (phase === "recording") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Grabando: {kickType}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-error">
                <span className="h-2 w-2 rounded-full bg-error animate-pulse-soft" aria-hidden="true" />
                REC
              </span>
              <span className="font-display tabular-nums text-text">
                {secondsLeft}s <span className="text-faint">/ {RECORD_SECS}s</span>
              </span>
            </div>
            <div
              className="w-full bg-surface-2 rounded-full h-2 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de grabación"
            >
              <div
                className="bg-error h-2 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="text-center text-muted-foreground text-sm">
            Ejecuta la patada con máxima fuerza y precisión
          </p>
        </CardContent>
      </Card>
    );
  }

  // uploading
  return (
    <Card>
      <CardHeader>
        <CardTitle>Procesando</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Subiendo y analizando la patada...</p>
        </div>
      </CardContent>
    </Card>
  );
}