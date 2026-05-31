import { describe, it, expect } from "vitest";
import { resolveNotificationLink } from "./notificationLinks";

const ROLES = ["administrator", "sportsman", "parent", undefined] as const;

describe("resolveNotificationLink (contract §6)", () => {
  it("maps the security 'user' resource to /dashboard/profile for every role", () => {
    for (const role of ROLES) {
      expect(resolveNotificationLink("user", role)).toBe("/dashboard/profile");
    }
  });

  it("maps the other known resources", () => {
    expect(resolveNotificationLink("tech_eval_session", "sportsman")).toBe(
      "/dashboard/evaluacion-tecnica",
    );
    expect(resolveNotificationLink("report", "administrator")).toBe("/dashboard/reportes");
    expect(resolveNotificationLink("enrollment", "parent")).toBe("/dashboard/inscripcion");
  });

  it("returns null for unknown resources (no navigation)", () => {
    expect(resolveNotificationLink("nope", "administrator")).toBeNull();
  });
});
