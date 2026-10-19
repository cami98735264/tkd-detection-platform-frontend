import { describe, expect, it } from "vitest";

import { navConfig } from "@/features/dashboard/layout/navConfig";
import { PERMISSIONS, rolesFor, type RoleName } from "@/config/permissions";

import { dashboardRoutes, type RouteGuard } from "./routes";

function rolesOf(guard: RouteGuard): readonly RoleName[] {
  return "module" in guard ? rolesFor(guard.module, guard.action) : guard.roles;
}

const byPath = new Map(dashboardRoutes.map((r) => [r.path, r]));

describe("dashboard route table", () => {
  it("guards every route with at least one role", () => {
    for (const route of dashboardRoutes) {
      expect(rolesOf(route.guard).length, route.path).toBeGreaterThan(0);
    }
  });

  it("has no duplicate paths and no demo pages", () => {
    expect(byPath.size).toBe(dashboardRoutes.length);
    expect(byPath.has("feedback-lab")).toBe(false);
  });

  it("guards the previously unguarded pages by the permissions matrix", () => {
    expect(byPath.get("programas/:programId/ediciones")?.guard).toEqual({ module: "programs" });
    expect(byPath.get("categorias-competencia")?.guard).toEqual({
      module: "competition-categories",
    });
    expect(byPath.get("entrenamientos")?.guard).toEqual({ module: "trainings" });
    expect(byPath.get("ayuda")?.guard).toEqual({ module: "help" });
    expect(rolesOf(byPath.get("categorias-competencia")!.guard)).toEqual(["administrator"]);
  });

  it("keeps the matrix and the router in agreement for technical evaluation", () => {
    expect(PERMISSIONS["technical-evaluation"].view).toEqual(["sportsman", "parent"]);
    expect(rolesOf(byPath.get("evaluacion-tecnica")!.guard)).toEqual(["sportsman", "parent"]);
  });

  it("only offers admin pages (users, inventory, reports, attendance register) to admins", () => {
    for (const path of [
      "usuarios",
      "inventario",
      "inventario/tipos",
      "reportes",
      "asistencia/registrar",
    ]) {
      expect(rolesOf(byPath.get(path)!.guard), path).toEqual(["administrator"]);
    }
  });

  it("only links each role to routes that role may open", () => {
    for (const role of Object.keys(navConfig) as RoleName[]) {
      for (const group of navConfig[role]) {
        for (const item of group.items) {
          const path = item.to.replace(/^\/dashboard\/?/, "");
          const route = byPath.get(path);
          expect(route, `${role} → ${item.to}`).toBeDefined();
          expect(rolesOf(route!.guard), `${role} → ${item.to}`).toContain(role);
        }
      }
    }
  });
});
