// src/lib/http.ts

import axios, { AxiosResponse } from "axios"
import { config } from "@/config/env"
import { ApiError, ApiErrorBody } from "@/types/api"
import { useAuthStore } from "@/features/auth/store/authStore"
import { useFeedbackStore } from "@/store/feedbackStore"

// -----------------------------------------------------
// EVENTO DE FEEDBACK GLOBAL
// -----------------------------------------------------

interface HttpEvent {
  type: "success" | "warning" | "error"
  message: string
  status?: number
  code?: string
  metadata?: unknown
}

export const emitHttpEvent = (event: HttpEvent) => {
  useFeedbackStore.getState().setEvent(event)
}

// -----------------------------------------------------
// FUNCIÓN PARA EXTRAER EL MENSAJE DINÁMICAMENTE
// (REQUERIMIENTO DE CRISTIAN)
// -----------------------------------------------------

function extractMessage(data: any): string {
  if (!data) return "Operación completada"

  const possibleKeys = [
    "message",
    "response",
    "detail",
    "msg",
    "description",
  ]

  for (const key of possibleKeys) {
    if (typeof data[key] === "string") {
      return data[key]
    }
  }

  return "Operación completada"
}

// -----------------------------------------------------
// AXIOS INSTANCE
// -----------------------------------------------------

export const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// -----------------------------------------------------
// RESPONSE INTERCEPTOR
// -----------------------------------------------------

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const message = extractMessage(response.data)

    emitHttpEvent({
      type: "success",
      status: response.status,
      message,
      metadata: response.config.url,
    })

    return response
  },

  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      emitHttpEvent({
        type: "error",
        message: "Error inesperado",
      })

      return Promise.reject(error)
    }

    const status = error.response?.status ?? 0

    const body: ApiErrorBody =
      (error.response?.data as ApiErrorBody) ?? {
        detail: error.message,
      }

    const message = extractMessage(body)

    emitHttpEvent({
      type: status >= 500 ? "error" : status >= 400 ? "warning" : "error",
      status,
      message,
      metadata: error.config?.url,
    })

    // -------------------------------------
    // Manejo automático de sesión
    // -------------------------------------

    if (status === 401) {
      useAuthStore.getState().clearSession()
      window.location.replace("/login")

      return Promise.reject(
        new ApiError(401, {
          detail: "Sesión expirada. Inicia sesión nuevamente.",
        }),
      )
    }

    return Promise.reject(new ApiError(status, body))
  },
)

// -----------------------------------------------------
// CLIENTE HTTP TIPADO
// -----------------------------------------------------

export const http = {
  get: async <T = unknown>(endpoint: string) => {
    const res = await axiosInstance.get<T>(endpoint)
    return res.data
  },

  post: async <T = unknown>(endpoint: string, body?: unknown) => {
    const res = await axiosInstance.post<T>(endpoint, body)
    return res.data
  },

  put: async <T = unknown>(endpoint: string, body?: unknown) => {
    const res = await axiosInstance.put<T>(endpoint, body)
    return res.data
  },

  patch: async <T = unknown>(endpoint: string, body?: unknown) => {
    const res = await axiosInstance.patch<T>(endpoint, body)
    return res.data
  },

  delete: async <T = unknown>(endpoint: string) => {
    const res = await axiosInstance.delete<T>(endpoint)
    return res.data
  },
}