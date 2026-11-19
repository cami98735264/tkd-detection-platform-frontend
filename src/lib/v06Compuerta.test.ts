import { describe, expect, it } from "vitest";

// V06 (auditoría PHVA): prueba rota a propósito para comprobar que la CI queda en rojo. No fusionar.
describe("compuerta de CI (V06)", () => {
  it("debe fallar a propósito", () => {
    expect(1 + 1).toBe(3);
  });
});
