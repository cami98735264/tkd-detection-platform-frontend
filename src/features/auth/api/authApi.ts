import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";
import { config } from "@/config/env";
import { ApiError } from "@/types/api";
import type { AuthUser } from "@/types/entities";

const MOCK_CREDENTIALS = { email: "admin@warriors.com", password: "123456" };

// ---------------------------------------------------------------------------
// Payload & response types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

const MOCK_USER: AuthUser = {
  id: 1,
  email: "admin@warriors.com",
  full_name: "Admin Mock",
  is_staff: true,
  role: "administrator",
};

// sessionStorage key used to simulate cookie invalidation after mock logout.
// sessionStorage is per-tab and cleared when the tab/browser closes,
// closely mimicking a real session cookie being revoked by the server.
const MOCK_LOGGED_OUT_KEY = "mock_logged_out";

// ---------------------------------------------------------------------------
// Auth API — Django sets/clears the httpOnly JWT cookie on each response.
// When config.mockAuth is true all calls are short-circuited locally.
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * POST /api/auth/login/
   * Django sets the httpOnly access + refresh cookies in the response.
   */
  login: async (payload: LoginPayload): Promise<void> => {
    if (config.mockAuth) {
      if (
        payload.email !== MOCK_CREDENTIALS.email ||
        payload.password !== MOCK_CREDENTIALS.password
      ) {
        throw new ApiError(401, {
          detail: "No se encontró una cuenta activa con esas credenciales.",
        });
      }
      sessionStorage.removeItem(MOCK_LOGGED_OUT_KEY);
      useAuthStore.getState().setAuthenticated(MOCK_USER);
      return;
    }
    await http.post<void>("/auth/login/", payload);
    const user = await authApi.me();
    useAuthStore.getState().setAuthenticated(user);
  },

  /**
   * POST /api/auth/logout/
   * Django clears the cookies server-side.
   */
  logout: async (): Promise<void> => {
    if (config.mockAuth) {
      sessionStorage.setItem(MOCK_LOGGED_OUT_KEY, "1");
      useAuthStore.getState().clearSession();
      return;
    }
    await http.post<void>("/auth/logout/");
    useAuthStore.getState().clearSession();
  },

  /**
   * GET /api/auth/me/
   * Returns the currently authenticated user (validates the cookie server-side).
   * In mock mode, rejects if the user explicitly logged out this session.
   */
  me: (): Promise<AuthUser> => {
    if (config.mockAuth) {
      if (sessionStorage.getItem(MOCK_LOGGED_OUT_KEY)) {
        return Promise.reject(new Error("mock: logged out"));
      }
      return Promise.resolve(MOCK_USER);
    }
    return http.get<AuthUser>("/auth/me/");
  },

  /**
   * POST /api/auth/password/reset/
   */
  requestPasswordReset: (email: string): Promise<void> => {
    if (config.mockAuth) return Promise.resolve();
    return http.post<void>("/auth/password/reset/", { email });
  },
};
