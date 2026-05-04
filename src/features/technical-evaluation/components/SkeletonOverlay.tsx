import { useEffect, useRef } from "react";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";

import { usePoseLandmarker } from "../hooks/usePoseLandmarker";

interface Props {
  video: HTMLVideoElement | null;
  enabled: boolean;
}

/**
 * Real-time pose-skeleton overlay drawn on top of a `<video>` element. Runs
 * MediaPipe PoseLandmarker per requestAnimationFrame tick. Pure visual aid —
 * it does not affect what gets recorded or uploaded.
 */
export default function SkeletonOverlay({ video, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { ready, detect } = usePoseLandmarker(enabled);

  useEffect(() => {
    if (!enabled || !ready || !video) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawer = new DrawingUtils(ctx);
    let lastTs = -1;
    let raf = 0;

    const tick = () => {
      // Match canvas backing-store size to the actual video frame size so
      // normalized landmarks land at the right pixel coordinates.
      if (
        video.videoWidth > 0 &&
        (canvas.width !== video.videoWidth ||
          canvas.height !== video.videoHeight)
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // detectForVideo requires monotonically increasing timestamps.
      const now = performance.now();
      if (now > lastTs) {
        lastTs = now;
        const result = detect(video, now);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (result?.landmarks?.[0]) {
          drawer.drawConnectors(
            result.landmarks[0],
            PoseLandmarker.POSE_CONNECTIONS,
            { color: "#22c55e", lineWidth: 3 },
          );
          drawer.drawLandmarks(result.landmarks[0], {
            color: "#fef3c7",
            radius: 3,
          });
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, ready, video, detect]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      aria-hidden="true"
    />
  );
}
