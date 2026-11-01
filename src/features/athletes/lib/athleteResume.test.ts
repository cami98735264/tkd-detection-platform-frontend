import { describe, expect, it } from "vitest";

import type { Athlete } from "@/types/entities";

import {
  emptyAthletePersonalData,
  buildRegistrationPayload,
  isAthletePersonalDataValid,
  extractAthleteErrors,
} from "@/features/athletes/components/sections/types";
import { ApiError } from "@/types/api";

import {
  buildResumePayload,
  emptyAthleteResume,
  extractResumeErrors,
  formatTrainingDays,
  hasResumeData,
  normalizeTrainingDays,
  optionLabel,
  parseSessionHours,
  resumeFromAthlete,
  toggleTrainingDay,
  validateAthleteResume,
  GENDER_OPTIONS,
  ID_DOCUMENT_TYPE_OPTIONS,
} from "./athleteResume";

describe("training days", () => {
  it("normalizes names (accents/case), drops unknown values and sorts Monday first", () => {
    expect(normalizeTrainingDays(["Sabado", "martes", "JUEVES", "martes", "feriado", 3])).toEqual([
      "martes",
      "jueves",
      "sábado",
    ]);
    expect(normalizeTrainingDays(null)).toEqual([]);
    expect(normalizeTrainingDays("lunes")).toEqual([]);
  });

  it("toggles one day keeping the order", () => {
    expect(toggleTrainingDay(["jueves"], "lunes", true)).toEqual(["lunes", "jueves"]);
    expect(toggleTrainingDay(["lunes", "jueves"], "lunes", false)).toEqual(["jueves"]);
    expect(toggleTrainingDay(["miércoles"], "miercoles", false)).toEqual([]);
  });

  it("formats the list like the constancia", () => {
    expect(formatTrainingDays(["sábado", "martes", "jueves"])).toBe("martes, jueves y sábado");
    expect(formatTrainingDays(["lunes", "viernes"])).toBe("lunes y viernes");
    expect(formatTrainingDays(["domingo"])).toBe("domingo");
    expect(formatTrainingDays(undefined)).toBe("");
  });
});

describe("session hours", () => {
  it("parses decimal hours with comma or dot", () => {
    expect(parseSessionHours("2")).toBe(2);
    expect(parseSessionHours("1,5")).toBe(1.5);
    expect(parseSessionHours(" 1.25 ")).toBe(1.3);
    expect(parseSessionHours("")).toBeNull();
    expect(parseSessionHours("0")).toBeNull();
    expect(parseSessionHours("30")).toBeNull();
    expect(parseSessionHours("abc")).toBeNull();
  });

  it("validates the section", () => {
    expect(validateAthleteResume(emptyAthleteResume())).toEqual({});
    expect(
      validateAthleteResume({ ...emptyAthleteResume(), session_hours: "99", join_date: "x" }),
    ).toEqual({
      session_hours: expect.stringContaining("horas") as string,
      join_date: "Fecha no válida.",
    });
  });
});

describe("resumeFromAthlete", () => {
  it("reads stored values only, rejecting unknown choices", () => {
    const athlete = {
      gender: "F",
      document_type: "XX",
      document_number: "1104954182",
      blood_group: "O",
      rh_factor: "+",
      join_date: "2022-02-01T00:00:00Z",
      training_days: ["martes", "sábado"],
      session_hours: "2.0",
      effective_document_number: "999",
    } as unknown as Athlete;
    const state = resumeFromAthlete(athlete);
    expect(state.gender).toBe("F");
    expect(state.document_type).toBe("");
    expect(state.document_number).toBe("1104954182");
    expect(state.join_date).toBe("2022-02-01");
    expect(state.training_days).toEqual(["martes", "sábado"]);
    expect(state.session_hours).toBe("2.0");
    expect(resumeFromAthlete(null)).toEqual(emptyAthleteResume());
    expect(resumeFromAthlete({ session_hours: null }).session_hours).toBe("");
    expect(hasResumeData(state)).toBe(true);
    expect(hasResumeData(emptyAthleteResume())).toBe(false);
  });
});

describe("buildResumePayload", () => {
  it("omits blank fields on create", () => {
    expect(buildResumePayload(emptyAthleteResume())).toEqual({});
    expect(
      buildResumePayload({
        ...emptyAthleteResume(),
        gender: "M",
        eps: "  Nueva EPS ",
        training_days: ["jueves", "martes"],
        session_hours: "1,5",
        join_date: "2024-03-01",
      }),
    ).toEqual({
      gender: "M",
      eps: "Nueva EPS",
      training_days: ["martes", "jueves"],
      session_hours: 1.5,
      join_date: "2024-03-01",
    });
  });

  it("sends cleared fields blank on edit so they get erased", () => {
    const previous = {
      ...emptyAthleteResume(),
      eps: "Sura",
      phone: "300",
      training_days: ["lunes" as const],
      session_hours: "2",
      join_date: "2024-01-01",
    };
    const next = { ...previous, eps: "", training_days: [], session_hours: "", join_date: "" };
    expect(buildResumePayload(next, previous)).toEqual({
      eps: "",
      phone: "300",
      training_days: [],
      session_hours: null,
      join_date: null,
    });
  });

  it("maps backend field errors", () => {
    expect(extractResumeErrors({ eps: ["Muy largo"], full_name: ["x"] })).toEqual({
      eps: "Muy largo",
    });
    expect(extractResumeErrors(null)).toEqual({});
  });

  it("labels options", () => {
    expect(optionLabel(GENDER_OPTIONS, "F")).toBe("Femenino");
    expect(optionLabel(ID_DOCUMENT_TYPE_OPTIONS, "TI")).toBe("Tarjeta de Identidad");
    expect(optionLabel(GENDER_OPTIONS, "")).toBe("");
  });
});

describe("athlete registration with hoja de vida", () => {
  it("adds the filled B.3 fields to the registration payload", () => {
    const personal = {
      ...emptyAthletePersonalData(),
      full_name: " Ana ",
      date_of_birth: "2012-05-01",
      category: "infantil",
      sportsman_user_id: 4,
      resume: { ...emptyAthleteResume(), mother_name: "Rosa", rh_factor: "-" as const },
    };
    const payload = buildRegistrationPayload(personal, null);
    expect(payload).toMatchObject({ full_name: "Ana", mother_name: "Rosa", rh_factor: "-" });
    expect(payload).not.toHaveProperty("eps");
  });

  it("blocks submit while the hoja de vida is invalid", () => {
    const base = {
      ...emptyAthletePersonalData(),
      full_name: "Ana",
      date_of_birth: "2012-05-01",
      category: "infantil",
    };
    expect(isAthletePersonalDataValid(base)).toBe(true);
    expect(
      isAthletePersonalDataValid({
        ...base,
        resume: { ...emptyAthleteResume(), session_hours: "-1" },
      }),
    ).toBe(false);
  });

  it("extracts hoja de vida errors from an API error", () => {
    const err = new ApiError(400, {
      error: {
        code: "validation_error",
        message: "Datos inválidos",
        fields: { session_hours: ["Número inválido"] },
      },
    });
    expect(extractAthleteErrors(err).errors.resume).toEqual({ session_hours: "Número inválido" });
    const plain = new ApiError(400, {
      error: {
        code: "validation_error",
        message: "Datos inválidos",
        fields: { full_name: ["Requerido"] },
      },
    });
    expect(extractAthleteErrors(plain).errors.resume).toBeUndefined();
  });
});
