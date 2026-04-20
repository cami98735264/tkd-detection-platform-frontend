import { useAuthStore } from "../store/authStore";
import { ADMIN_ROLES, PERMISSIONS, type Action, type Module, type RoleName } from "@/config/permissions";

export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const isAdmin = (): boolean => {
    return user?.role === "administrator";
  };

  const hasRole = (roles: readonly RoleName[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role as RoleName);
  };

  const can = (action: Action, module: Module): boolean => {
    if (!user) return false;
    const allowedRoles = PERMISSIONS[module]?.[action];
    if (!allowedRoles) return false;
    return allowedRoles.includes(user.role as RoleName);
  };

  return {
    user,
    isAdmin,
    hasRole,
    can,
  };
}
