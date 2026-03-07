import { http } from "@/lib/http";

// Simula respuestas de una API real
export const mockApi = {
  success: () =>
    http.post("/mock/success", {
      message: "Operación realizada correctamente",
    }),

  created: () =>
    http.post("/mock/created", {
      message: "Recurso creado correctamente",
    }),

  badRequest: () =>
    http.post("/mock/bad-request"),

  unauthorized: () =>
    http.post("/mock/unauthorized"),

  forbidden: () =>
    http.post("/mock/forbidden"),

  notFound: () =>
    http.post("/mock/not-found"),

  serverError: () =>
    http.post("/mock/server-error"),

  serviceUnavailable: () =>
    http.post("/mock/service-unavailable"),

  timeout: () =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 3000)
    ),
};