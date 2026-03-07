import { axiosInstance } from "./http";
import { ApiRequestConfig } from "@/types/api";

/**
 * GET
 */
export async function apiGet<T>(
  url: string,
  config?: ApiRequestConfig<T>
): Promise<T> {
  const res = await axiosInstance.get<T>(url, config);
  return res.data;
}

/**
 * POST
 */
export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: ApiRequestConfig<T>
): Promise<T> {
  const res = await axiosInstance.post<T>(url, body, config);
  return res.data;
}

/**
 * PUT
 */
export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: ApiRequestConfig<T>
): Promise<T> {
  const res = await axiosInstance.put<T>(url, body, config);
  return res.data;
}

/**
 * PATCH
 */
export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: ApiRequestConfig<T>
): Promise<T> {
  const res = await axiosInstance.patch<T>(url, body, config);
  return res.data;
}

/**
 * DELETE
 */
export async function apiDelete<T>(
  url: string,
  config?: ApiRequestConfig<T>
): Promise<T> {
  const res = await axiosInstance.delete<T>(url, config);
  return res.data;
}