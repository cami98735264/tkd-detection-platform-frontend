import { useAuthStore } from "../store/authStore";

/** True once the session check resolved and the user is signed in. */
export function useAuthReady(): boolean {
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return status === "ready" && isAuthenticated;
}
