import { describe, expect, it } from "vitest";

import {
  MAX_SIGNATURE_BYTES,
  buildClubProfilePayload,
  isClubProfileDirty,
  normalizeClubProfile,
  toClubProfileForm,
  validateClubProfileForm,
  validateSignatureFile,
} from "./clubProfile";

function fileOf(name: string, type: string, size = 10): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const profile = normalizeClubProfile({
  name: "Club Deportivo Warriors TKD Espinal",
  legal_rep_name: "Jonathan De La Rosa Moreno",
  email: "warriostkdespinal@gmail.com",
  include_signature: false,
  default_training_days: ["sábado", "martes"],
  default_session_hours: 2,
  updated_at: "2026-11-01T10:00:00Z",
});

describe("normalizeClubProfile", () => {
  it("fills defaults and keeps known values", () => {
    expect(profile.include_signature).toBe(false);
    expect(profile.default_training_days).toEqual(["martes", "sábado"]);
    expect(profile.default_session_hours).toBe(2);
    expect(profile.signature_url).toBeNull();
    expect(normalizeClubProfile(null)).toMatchObject({
      name: "",
      default_session_hours: null,
      updated_at: null,
    });
  });
});

describe("club profile form", () => {
  it("round-trips the profile into a payload", () => {
    const values = toClubProfileForm(profile);
    expect(values.default_session_hours).toBe("2");
    const payload = buildClubProfilePayload({ ...values, city: "  Espinal, Tolima " });
    expect(payload).toMatchObject({
      name: "Club Deportivo Warriors TKD Espinal",
      city: "Espinal, Tolima",
      include_signature: false,
      default_training_days: ["martes", "sábado"],
      default_session_hours: 2,
    });
    expect(toClubProfileForm(normalizeClubProfile({})).default_session_hours).toBe("");
  });

  it("detects changes", () => {
    const values = toClubProfileForm(profile);
    expect(isClubProfileDirty(values, profile)).toBe(false);
    expect(isClubProfileDirty({ ...values, include_signature: true }, profile)).toBe(true);
  });

  it("validates required fields, email and hours", () => {
    const values = toClubProfileForm(profile);
    expect(validateClubProfileForm(values)).toEqual({});
    const errors = validateClubProfileForm({
      ...values,
      name: " ",
      legal_rep_name: "",
      email: "nope",
      default_session_hours: "0",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "default_session_hours",
      "email",
      "legal_rep_name",
      "name",
    ]);
  });
});

describe("validateSignatureFile", () => {
  it("accepts PNG/JPG up to 2 MB", () => {
    expect(validateSignatureFile(fileOf("firma.png", "image/png"))).toBeNull();
    expect(validateSignatureFile(fileOf("firma.JPG", "image/jpeg"))).toBeNull();
    expect(validateSignatureFile(fileOf("firma.jpeg", ""))).toBeNull();
  });

  it("rejects other formats, empty and oversized files", () => {
    expect(validateSignatureFile(null)).toBe("Selecciona una imagen.");
    expect(validateSignatureFile(fileOf("firma.pdf", "application/pdf"))).toMatch(/PNG o JPG/);
    expect(validateSignatureFile(fileOf("firma.png", "image/png", 0))).toMatch(/vacío/);
    expect(
      validateSignatureFile(fileOf("firma.png", "image/png", MAX_SIGNATURE_BYTES + 1)),
    ).toMatch(/2 MB/);
  });
});
