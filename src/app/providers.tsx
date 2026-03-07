import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import { useEffect } from "react";
import { authApi } from "@/features/auth/api/authApi";
import { useAuthStore } from "@/features/auth/store/authStore";

function AuthInit({ children }: { children: React.ReactNode }) {
  const { status, setAuthenticated, clearSession } = useAuthStore();

  useEffect(() => {
    authApi
      .me()
      .then(() => setAuthenticated())
      .catch(() => clearSession());
  }, []);

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