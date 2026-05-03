import { useCallback, useContext, useRef } from "react";
import { FeedbackContext } from "./FeedbackProvider";
import { ApiError } from "@/types/api";

export function useApiErrorHandler() {
  const context = useContext(FeedbackContext);
  const contextRef = useRef(context);
  contextRef.current = context;

  const handleError = useCallback((error: unknown) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    if (error instanceof ApiError) {
      ctx.showToast({
        title: error.isServerError ? "Error del servidor" : "Error",
        description: error.userMessage,
        variant: error.isServerError ? "error" : "warning",
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Error inesperado";

    ctx.showToast({
      title: "Error",
      description: message,
      variant: "error",
    });
  }, []);

  return { handleError };
}