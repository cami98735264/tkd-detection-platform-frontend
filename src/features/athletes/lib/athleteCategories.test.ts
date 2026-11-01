import { describe, expect, it } from "vitest";

import {
  ATHLETE_CATEGORIES,
  athleteCategoryText,
  categoryAgeRange,
  categoryLabel,
  normalizeCategories,
  sportAge,
  suggestCategory,
} from "./athleteCategories";

const NOV_2026 = new Date(2026, 10, 1);

describe("athlete categories", () => {
  it("computes the age turned by Dec 31 of the current year", () => {
    expect(sportAge("2014-12-31", NOV_2026)).toBe(12);
    expect(sportAge("2014-01-01", NOV_2026)).toBe(12);
    expect(sportAge("", NOV_2026)).toBeNull();
    expect(sportAge("not-a-date", NOV_2026)).toBeNull();
    expect(sportAge("2030-01-01", NOV_2026)).toBeNull();
  });

  it.each([
    ["2020-05-01", "preinfantil"], // 6
    ["2019-01-01", "preinfantil"], // 7
    ["2018-12-31", "infantil"], // 8
    ["2015-03-10", "infantil"], // 11
    ["2014-06-01", "cadete"], // 12
    ["2012-06-01", "cadete"], // 14
    ["2011-06-01", "juvenil"], // 15
    ["2009-06-01", "juvenil"], // 17
    ["2008-06-01", "mayores"], // 18
    ["1990-06-01", "mayores"],
  ])("suggests %s → %s", (dob, expected) => {
    expect(suggestCategory(dob, NOV_2026)).toBe(expected);
  });

  it("returns null without a birth date", () => {
    expect(suggestCategory(null, NOV_2026)).toBeNull();
  });

  it("labels values and age ranges", () => {
    expect(categoryLabel("cadete")).toBe("Cadetes");
    expect(categoryLabel("mayores")).toBe("Mayores (sénior)");
    expect(categoryLabel("x")).toBe("x");
    expect(categoryLabel(null)).toBeNull();
    expect(categoryAgeRange(ATHLETE_CATEGORIES[0])).toBe("hasta 7 años");
    expect(categoryAgeRange(ATHLETE_CATEGORIES[2])).toBe("12 – 14 años");
    expect(categoryAgeRange(ATHLETE_CATEGORIES[4])).toBe("18 años o más");
    expect(categoryAgeRange({ min_age: null, max_age: null })).toBe("todas las edades");
  });

  it("reads an athlete's category text", () => {
    expect(athleteCategoryText({ category: "juvenil", category_display: "Juveniles" })).toBe(
      "Juveniles",
    );
    expect(athleteCategoryText({ category: "infantil" })).toBe("Infantiles");
    expect(athleteCategoryText({})).toBeNull();
  });

  it("normalizes the API list and falls back to the static table", () => {
    expect(normalizeCategories([])).toEqual(ATHLETE_CATEGORIES);
    expect(normalizeCategories({ count: 0, results: [] })).toEqual(ATHLETE_CATEGORIES);
    expect(normalizeCategories(null)).toEqual(ATHLETE_CATEGORIES);
    expect(
      normalizeCategories([{ value: "cadete", label: "Cadetes", min_age: 12, max_age: 14 }, {}]),
    ).toEqual([{ value: "cadete", label: "Cadetes", min_age: 12, max_age: 14 }]);
    expect(normalizeCategories({ results: [{ value: "infantil", label: "Infantiles" }] })).toEqual([
      { value: "infantil", label: "Infantiles", min_age: null, max_age: null },
    ]);
  });
});
