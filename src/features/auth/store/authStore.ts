import { create } from "zustand";

// ---------------------------------------------------------------------------
// Auth Store
// ---------------------------------------------------------------------------
// Auth state lives in memory only — the real session is the httpOnly JWT
// cookie managed entirely by Django. No localStorage is used.
//
// On every app mount, initAuth() (called from Providers) hits GET /api/auth/me/.
// If the cookie is valid Django returns the user → setAuthenticated().
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

  /** Mark session as active — also flips status to 'ready'. */
  setAuthenticated: () => void;

  /** Clear session — also flips status to 'ready'. */
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: "initializing",
  isAuthenticated: false,

  setAuthenticated: () => set({ isAuthenticated: true, status: "ready" }),

  clearSession: () => set({ isAuthenticated: false, status: "ready" }),
}));
