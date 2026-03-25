import { create } from "zustand";
import type { AuthUser } from "@/types/entities";

// ---------------------------------------------------------------------------
// Auth Store
// ---------------------------------------------------------------------------
// Auth state lives in memory only — the real session is the httpOnly JWT
// cookie managed entirely by Django. No localStorage is used.
//
// On every app mount, initAuth() (called from Providers) hits GET /api/auth/me/.
// If the cookie is valid Django returns the user → setAuthenticated(user).
// If not, a 401 clears the session → clearSession().
// Route guards stay in 'initializing' status until that check resolves,
// preventing flash-redirects on page refresh.
// ---------------------------------------------------------------------------

export type AuthStatus = "initializing" | "ready";

interface AuthState {
  /** 'initializing' while the /me check is in-flight; 'ready' once resolved. */
  status: AuthStatus;

  /** True once the server has confirmed the cookie is valid. */
  isAuthenticated: boolean;

  /** The authenticated user object from GET /api/auth/me/. */
  user: AuthUser | null;

  /** Mark session as active — also flips status to 'ready'. */
  setAuthenticated: (user: AuthUser) => void;

  /** Clear session — also flips status to 'ready'. */
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "initializing",
  isAuthenticated: false,
  user: null,

  setAuthenticated: (user) => set({ isAuthenticated: true, user, status: "ready" }),

  clearSession: () => set({ isAuthenticated: false, user: null, status: "ready" }),
}));
