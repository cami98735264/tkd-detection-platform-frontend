import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import { rolesFor, type Action, type Module, type RoleName } from "@/config/permissions";
import { useAuthStore } from "../store/authStore";

type Props = {
  children: ReactNode;
  redirectTo?: string;
} & (
  | {
      /** Roles allowed by src/config/permissions.ts for `action` on `module`. */
      module: Module;
      /** Defaults to "view". */
      action?: Action;
      allowedRoles?: never;
    }
  | {
      /** Explicit roles, for role-specific page variants (e.g. "my evaluations"). */
      allowedRoles: readonly RoleName[];
      module?: never;
      action?: never;
    }
);

export default function RoleRoute({ children, redirectTo = "/dashboard", ...rule }: Props) {
  const { isAuthenticated, status, user } = useAuthStore();

  if (status === "initializing") return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowed = rule.module ? rolesFor(rule.module, rule.action) : rule.allowedRoles;
  if (!user || !allowed.includes(user.role as RoleName)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
