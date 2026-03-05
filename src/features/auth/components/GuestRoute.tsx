import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function GuestRoute({ children }: Props) {
  const { isAuthenticated, status } = useAuthStore();

  // AuthInit already blocks rendering during 'initializing', but guard anyway.
  if (status === "initializing") return null;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
