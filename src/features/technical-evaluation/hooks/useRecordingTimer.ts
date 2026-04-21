import { useEffect, useState, useCallback } from "react";

export function useRecordingTimer(
  durationSeconds: number,
  onComplete: () => void,
) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(() => {
    setSecondsLeft(durationSeconds);
    setIsRunning(true);
  }, [durationSeconds]);

  const reset = useCallback(() => {
    setSecondsLeft(durationSeconds);
    setIsRunning(false);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    if (secondsLeft <= 0) {
      setIsRunning(false);
      onComplete();
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, secondsLeft, onComplete]);

  return {
    secondsLeft,
    isRunning,
    start,
    reset,
    progress: ((durationSeconds - secondsLeft) / durationSeconds) * 100,
  };
}