import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import type { AuthUser } from "@/types/entities";

dayjs.extend(relativeTime);

type Role = AuthUser["role"];

/**
 * Map a notification's `resource` to a route for deep-linking.
 *
 * There are no id-based detail routes for these resources, so we land on the
 * role-appropriate list page (the contract's `resource_id` isn't needed for
 * navigation). Returns `null` for unknown resources → no navigation.
 */
export function resolveNotificationLink(
  resource: string,
  role: Role | undefined,
): string | null {
  switch (resource) {
    case "tech_eval_session":
      return "/dashboard/evaluacion-tecnica";
    case "report":
      return "/dashboard/reportes";
    case "evaluation":
      if (role === "administrator") return "/dashboard/evaluacion";
      if (role === "parent") return "/dashboard/acudiente/mis-hijos/evaluaciones";
      return "/dashboard/deportista/mis-evaluaciones";
    case "enrollment":
      return "/dashboard/inscripcion";
    case "user":
      // Security bell notifications (contract §6) → profile security section.
      return "/dashboard/profile";
    default:
      return null;
  }
}

/** Spanish relative time ("hace 5 minutos") for a notification timestamp. */
export function relativeTimeEs(iso: string): string {
  return dayjs(iso).locale("es").fromNow();
}
