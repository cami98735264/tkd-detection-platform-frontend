import { useFeedback } from "./useFeedback";

export function useApiErrorHandler() {
  const { showToast } = useFeedback();

  const handleError = (error: any) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Error inesperado del servidor";

    showToast({
      title: "Error",
      description: message,
      variant: "error",
    });
  };

  return { handleError };
}