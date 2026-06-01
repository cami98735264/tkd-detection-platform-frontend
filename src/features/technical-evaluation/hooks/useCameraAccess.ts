import { useEffect, useRef, useState } from "react";

export function useCameraAccess() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestCamera = async () => {
    try {
      // Video-only: pose analysis never uses audio, and an audio track only
      // bloats the uploaded recording (and triggers Opus-decode noise server
      // side). Bound the resolution/frame rate so the upload stays small enough
      // to complete over weak mobile uplinks — 720p@24fps is ample for
      // whole-body pose landmarking.
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      setStream(s);
      setHasPermission(true);
      setError(null);
    } catch {
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  return { stream, error, hasPermission, requestCamera, stopCamera };
}