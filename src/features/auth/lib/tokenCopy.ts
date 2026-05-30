import type { TokenRejection } from "@/types/api";

/**
 * Spanish copy for each token-rejection state (contract §3). Distinct messages
 * for invalid/used vs expired vs revoked-by-newer so the user knows what to do.
 */
export const TOKEN_REJECTION_COPY: Record<
  TokenRejection,
  { title: string; message: string }
> = {
  invalid: {
    title: "Enlace inválido",
    message:
      "Este enlace no es válido o ya fue utilizado. Solicita uno nuevo para continuar.",
  },
  expired: {
    title: "Enlace expirado",
    message: "Este enlace expiró. Solicita uno nuevo para continuar.",
  },
  revoked: {
    title: "Enlace reemplazado",
    message:
      "Este enlace fue reemplazado por uno más reciente. Usa el último enlace que recibiste.",
  },
};
