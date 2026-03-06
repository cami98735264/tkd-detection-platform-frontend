import { useEffect } from "react";
import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";

function AuthInit({ children }: { children: React.ReactNode }) {
  const { status, setAuthenticated, clearSession } = useAuthStore();

  useEffect(() => {
    // Always go through authApi.me() — mock mode is handled inside authApi,
    // including the sessionStorage logout simulation.
    authApi
      .me()
      .then(() => setAuthenticated())
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
      <AuthInit>{children}</AuthInit>
    </FeedbackProvider>
  );
}
