import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

// Same model that the backend uses, fetched from Google's CDN at runtime so
// the bundler doesn't have to ship it.
const WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/" +
  "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";

export interface PoseDetect {
  (video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult | null;
}

/**
 * Lazily creates a MediaPipe PoseLandmarker (Tasks API) configured for VIDEO
 * mode. The first call downloads ~5 MB of WASM + model on a cold cache; both
 * are served by public CDNs so subsequent visits hit the browser cache.
 *
 * Toggle the `enabled` flag to disable initialization (and dispose the
 * landmarker) when the overlay isn't needed.
 */
export function usePoseLandmarker(enabled: boolean) {
  const [ready, setReady] = useState(false);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        const landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setReady(true);
      } catch (err) {
        // Soft-fail: overlay simply doesn't render. Camera + recording still work.
        console.warn("PoseLandmarker init failed", err);
      }
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      setReady(false);
    };
  }, [enabled]);

  // Stable callback so consumers can list it in effect deps without churn.
  const detect = useCallback<PoseDetect>((video, timestampMs) => {
    const lm = landmarkerRef.current;
    if (!lm) return null;
    if (video.readyState < 2) return null; // HAVE_CURRENT_DATA
    return lm.detectForVideo(video, timestampMs);
  }, []);

  return { ready, detect };
}
