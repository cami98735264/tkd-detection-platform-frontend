import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

// Self-hosted runtime + model (no third-party CDN at runtime, so the CSP stays
// 'self'-only and nothing can be swapped upstream):
// - WASM runtime: copied at build time from the exact-pinned
//   @mediapipe/tasks-vision package (scripts/build-lib.mjs) into
//   /vendor/mediapipe/<version>/wasm — always the same version as the JS API.
// - Model: committed under public/models/, a copy of Google's versioned
//   pose_landmarker_lite/float16/1 asset (the same model the backend uses).
declare const __MEDIAPIPE_VERSION__: string | undefined;
const MEDIAPIPE_VERSION =
  typeof __MEDIAPIPE_VERSION__ !== "undefined" ? __MEDIAPIPE_VERSION__ : "0.10.35";
export const WASM_BASE = `/vendor/mediapipe/${MEDIAPIPE_VERSION}/wasm`;
export const MODEL_URL = "/models/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface PoseDetect {
  (video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResult | null;
}

/**
 * Lazily creates a MediaPipe PoseLandmarker (Tasks API) configured for VIDEO
 * mode. The first call downloads ~5 MB of WASM + model on a cold cache; both
 * are served from this origin with immutable caching (see public/_headers).
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
