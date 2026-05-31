import { describe, it, expect } from "vitest";
import { buildNotificationToast } from "./notificationToasts";
import type { Notification } from "@/types/entities";

type Role = "administrator" | "sportsman" | "parent";
const ROLES: Role[] = ["administrator", "sportsman", "parent"];

function notif(type: string, body = "cuerpo"): Notification {
  return {
    id: 1,
    type,
    title: "ignored-by-security-cases",
    body,
    resource: "user",
    resource_id: 1,
    data: { link: "/dashboard/profile" },
    read_at: null,
    created_at: "2026-05-30T12:00:00Z",
  };
}

// Contract §6: security.* toasts are NOT role-gated — every role gets the same
// Spanish copy. notificationLinks keys the deep-link off the resource, not role.
const SECURITY = {
  "security.password_changed": { title: "Tu contraseña fue cambiada", variant: "warning" },
  "security.email_changed": { title: "Tu correo fue actualizado", variant: "info" },
  "security.new_device_login": { title: "Nuevo inicio de sesión detectado", variant: "warning" },
  "security.account_locked": { title: "Tu cuenta fue bloqueada temporalmente", variant: "error" },
  // Two-factor (TOTP) bells (2fa-contract §6).
  "security.2fa_enabled": { title: "Verificación en dos pasos activada", variant: "success" },
  "security.2fa_disabled": { title: "Verificación en dos pasos desactivada", variant: "warning" },
  "security.2fa_recovery_used": { title: "Código de recuperación utilizado", variant: "warning" },
  "security.2fa_recovery_regenerated": { title: "Códigos de recuperación regenerados", variant: "info" },
  "security.new_2fa_device": { title: "Nuevo dispositivo de confianza", variant: "info" },
} as const;

describe("buildNotificationToast — security bells (contract §6)", () => {
  for (const [type, expected] of Object.entries(SECURITY)) {
    it(`${type} → Spanish copy for all roles`, () => {
      for (const role of ROLES) {
        const toast = buildNotificationToast(notif(type), role);
        expect(toast).not.toBeNull();
        expect(toast!.title).toBe(expected.title);
        expect(toast!.variant).toBe(expected.variant);
        expect(toast!.description).toBe("cuerpo");
      }
    });
  }
});
