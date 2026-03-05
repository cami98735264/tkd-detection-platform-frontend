import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";
import { config } from "@/config/env";

// ---------------------------------------------------------------------------
// Payload & response types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  password_confirm: string;
  full_name: string;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  is_staff: boolean;
}

const MOCK_USER: AuthUser = {
  id: 1,
  email: "admin@warriors.com",
  full_name: "Admin Mock",
  is_staff: true,
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
      sessionStorage.removeItem(MOCK_LOGGED_OUT_KEY);
      useAuthStore.getState().setAuthenticated();
      return;
    }
    await http.post<void>("/api/auth/login/", payload);
    useAuthStore.getState().setAuthenticated();
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
    await http.post<void>("/api/auth/logout/");
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
    return http.get<AuthUser>("/api/auth/me/");
  },

  /**
   * POST /api/auth/password/reset/
   */
  requestPasswordReset: (email: string): Promise<void> => {
    if (config.mockAuth) return Promise.resolve();
    return http.post<void>("/api/auth/password/reset/", { email });
  },
};
