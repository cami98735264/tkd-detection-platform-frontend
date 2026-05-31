import { describe, it, expect } from "vitest";
import { passwordStrength, passwordSchema, PASSWORD_RULES } from "./passwordPolicy";

// The backend enforces the same 5 rules (len>=8, upper, lower, digit, special);
// these assert the client mirror so the UI never disagrees with the server.

describe("passwordStrength (contract §4 password policy)", () => {
  it("counts the 5 satisfied rules", () => {
    expect(PASSWORD_RULES).toHaveLength(5);
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(2); // length + lowercase
    expect(passwordStrength("Abcdefgh")).toBe(3); // + uppercase
    expect(passwordStrength("Abcdefg1")).toBe(4); // + digit
    expect(passwordStrength("Abcdef1!")).toBe(5); // + special
  });
});

describe("passwordSchema", () => {
  it("accepts a password satisfying all 5 rules", () => {
    expect(passwordSchema.isValidSync("Abcdef1!")).toBe(true);
  });

  it("rejects when any single rule is missing", () => {
    expect(passwordSchema.isValidSync("")).toBe(false); // required
    expect(passwordSchema.isValidSync("Ab1!")).toBe(false); // too short
    expect(passwordSchema.isValidSync("abcdef1!")).toBe(false); // no uppercase
    expect(passwordSchema.isValidSync("ABCDEF1!")).toBe(false); // no lowercase
    expect(passwordSchema.isValidSync("Abcdefg!")).toBe(false); // no digit
    expect(passwordSchema.isValidSync("Abcdefg1")).toBe(false); // no special
  });
});
