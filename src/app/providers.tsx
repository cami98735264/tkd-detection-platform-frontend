import { useEffect } from "react";
import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { RealtimeProvider } from "@/features/realtime";
import { NotificationsBootstrap } from "@/features/notifications/NotificationsBootstrap";

function AuthInit({ children }: { children: React.ReactNode }) {
  const { status, setAuthenticated, clearSession } = useAuthStore();

  useEffect(() => {
    // Always go through authApi.me() — mock mode is handled inside authApi,
    // including the sessionStorage logout simulation.
    authApi
      .me()
      .then((user) => setAuthenticated(user))
      .catch(() => clearSession());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block routing until the session check resolves — prevents flash-redirects.
  if (status === "initializing") return null;

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider>
      <AuthInit>
        <RealtimeProvider>
          <NotificationsBootstrap />
          {children}
        </RealtimeProvider>
      </AuthInit>
    </FeedbackProvider>
  );
}
