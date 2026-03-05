import { useFeedback } from "./useFeedback";
import { ApiError } from "@/types/api";

export function useApiErrorHandler() {
  const { showToast } = useFeedback();

  const handleError = (error: unknown) => {
    if (error instanceof ApiError) {
      showToast({
        title: error.isServerError ? "Error del servidor" : "Error",
        description: error.userMessage,
        variant: error.isServerError ? "error" : "warning",
      });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Error inesperado";

    showToast({
      title: "Error",
      description: message,
      variant: "error",
    });
  };

  return { handleError };
}