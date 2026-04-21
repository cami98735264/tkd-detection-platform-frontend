import { useEffect, useRef, useState } from "react";

export function useCameraAccess() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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