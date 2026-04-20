import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ReactNode } from "react";
import type { RoleName } from "@/config/permissions";

interface Props {
  children: ReactNode;
  allowedRoles: readonly RoleName[];
  redirectTo?: string;
}

export default function RoleRoute({ children, allowedRoles, redirectTo = "/dashboard" }: Props) {
  const { isAuthenticated, status, user } = useAuthStore();

  if (status === "initializing") return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !allowedRoles.includes(user.role as RoleName)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
