import * as Yup from "yup";

const SPECIAL = /[!@#$%^&*()_+\-=[\]{};:'"\\|,.<>/?]/;

/** Mirrors the backend `validate_password_strength` rules (Spanish labels). */
export const PASSWORD_RULES: ReadonlyArray<{
  test: (v: string) => boolean;
  label: string;
}> = [
  { test: (v) => v.length >= 8, label: "Al menos 8 caracteres" },
  { test: (v) => /[A-Z]/.test(v), label: "Una letra mayúscula" },
  { test: (v) => /[a-z]/.test(v), label: "Una letra minúscula" },
  { test: (v) => /[0-9]/.test(v), label: "Un número" },
  { test: (v) => SPECIAL.test(v), label: "Un carácter especial" },
];

/** Yup schema enforcing the same policy client-side (backend is authoritative). */
export const passwordSchema = Yup.string()
  .required("La contraseña es obligatoria")
  .min(8, "Debe tener al menos 8 caracteres")
  .matches(/[A-Z]/, "Debe incluir una letra mayúscula")
  .matches(/[a-z]/, "Debe incluir una letra minúscula")
  .matches(/[0-9]/, "Debe incluir un número")
  .matches(SPECIAL, "Debe incluir un carácter especial");

/** Number of satisfied rules (0–5). */
export function passwordStrength(value: string): number {
  return PASSWORD_RULES.filter((r) => r.test(value)).length;
}
