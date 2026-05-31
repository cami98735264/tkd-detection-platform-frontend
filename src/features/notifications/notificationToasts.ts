import type { ToastOptions } from "@/feedback/types";
import type { AuthUser, Notification } from "@/types/entities";

type Role = AuthUser["role"];

function str(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

/**
 * Map a live `notification.created` to a role/type-aware toast.
 *
 * Returns `null` when the role shouldn't be toasted for this type (defence in
 * depth — the per-user feed already scopes server-side). Fired ONLY from live
 * pushes, never during the initial REST backfill, so users aren't spammed on
 * load. Resource `*.updated` events never reach here (they don't toast).
 */
export function buildNotificationToast(
  n: Notification,
  role: Role,
): ToastOptions | null {
  switch (n.type) {
    case "tech_eval.completed":
      if (role === "sportsman" || role === "parent") {
        const athlete = str(n.data?.athlete_name);
        return {
          title: "Tu evaluación de patada está lista",
          description:
            role === "parent" && athlete ? `Deportista: ${athlete}` : undefined,
          variant: "success",
        };
      }
      return null;

    case "tech_eval.failed":
      if (role === "sportsman" || role === "parent") {
        return {
          title: "El análisis de tu patada falló",
          description: n.body || undefined,
          variant: "error",
        };
      }
      return null;

    case "report.completed":
      if (role === "administrator") {
        const title = str(n.data?.title) ?? n.title;
        return { title: `Reporte '${title}' generado`, variant: "success" };
      }
      return null;

    case "report.failed":
      if (role === "administrator") {
        return {
          title: "La generación del reporte falló",
          description: n.body || undefined,
          variant: "error",
        };
      }
      return null;

    // Security bell notifications (contract §6) — all roles, deep-link to the
    // profile security section via resource "user" (see notificationLinks).
    case "security.password_changed":
      return {
        title: "Tu contraseña fue cambiada",
        description: n.body || undefined,
        variant: "warning",
      };

    case "security.email_changed":
      return {
        title: "Tu correo fue actualizado",
        description: n.body || undefined,
        variant: "info",
      };

    case "security.new_device_login":
      return {
        title: "Nuevo inicio de sesión detectado",
        description: n.body || undefined,
        variant: "warning",
      };

    case "security.account_locked":
      return {
        title: "Tu cuenta fue bloqueada temporalmente",
        description: n.body || undefined,
        variant: "error",
      };

    // Two-factor (TOTP) bell notifications (2fa-contract §6).
    case "security.2fa_enabled":
      return {
        title: "Verificación en dos pasos activada",
        description: n.body || undefined,
        variant: "success",
      };

    case "security.2fa_disabled":
      return {
        title: "Verificación en dos pasos desactivada",
        description: n.body || undefined,
        variant: "warning",
      };

    case "security.2fa_recovery_used":
      return {
        title: "Código de recuperación utilizado",
        description: n.body || undefined,
        variant: "warning",
      };

    case "security.2fa_recovery_regenerated":
      return {
        title: "Códigos de recuperación regenerados",
        description: n.body || undefined,
        variant: "info",
      };

    case "security.new_2fa_device":
      return {
        title: "Nuevo dispositivo de confianza",
        description: n.body || undefined,
        variant: "info",
      };

    default:
      // Any other durable notification still surfaces as a generic toast using
      // its own copy (these are user-facing by definition).
      if (n.title) {
        return { title: n.title, description: n.body || undefined, variant: "info" };
      }
      return null;
  }
}
