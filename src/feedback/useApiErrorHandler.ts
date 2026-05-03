import { useContext } from "react";
import { FeedbackContext } from "./FeedbackProvider";
import { ApiError } from "@/types/api";

export function useApiErrorHandler() {
  const context = useContext(FeedbackContext);

  const handleError = (error: unknown) => {
    if (!context) return;

    if (error instanceof ApiError) {
      context.showToast({
        title: error.isServerError ? "Error del servidor" : "Error",
        description: error.userMessage,
        variant: error.isServerError ? "error" : "warning",
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Error inesperado";

    context.showToast({
      title: "Error",
      description: message,
      variant: "error",
    });
  };

  return { handleError };
}