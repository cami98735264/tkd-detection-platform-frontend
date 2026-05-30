import { useEffect } from "react";
import { config } from "@/config/env";
import { useAuthStore } from "@/features/auth/store/authStore";
import { realtimeClient } from "./realtimeClient";

/**
 * Owns the single shared WebSocket's lifecycle.
 *
 * - Mounts/unmounts a refcounted connection (StrictMode-safe via the client).
 * - Drives the auth gate: connect only when the session is ready + authenticated
 *   (and not in mock-auth mode, and a wsUrl exists); close on logout.
 * - Reconnects immediately when the tab regains focus.
 *
 * Place inside AuthInit and inside FeedbackProvider in src/app/providers.tsx.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // One connect()/disconnect() pair for the provider's lifetime (refcounted).
  useEffect(() => {
    realtimeClient.connect();
    return () => realtimeClient.disconnect();
  }, []);

  // Drive the auth gate. Selector keeps this to the two booleans we care about.
  const enabled = useAuthStore(
    (s) => s.status === "ready" && s.isAuthenticated,
  );
  useEffect(() => {
    realtimeClient.setEnabled(enabled && !config.mockAuth && !!config.wsUrl);
  }, [enabled]);

  // Refocus → reconnect immediately if the socket isn't already open.
  useEffect(() => {
    const onVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        realtimeClient.getStatus() !== "open"
      ) {
        realtimeClient.reconnectNow();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return <>{children}</>;
}
