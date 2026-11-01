import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/evaluations/api/beltsApi", () => ({
  beltsApi: { list: () => Promise.resolve({ results: [] }) },
}));
vi.mock("@/features/athletes/api/athletesApi", () => ({
  athletesApi: { categories: () => Promise.reject(new Error("offline")) },
}));
vi.mock("@/features/users/api/usersApi", () => ({ usersApi: { list: vi.fn() } }));

import { resetAthleteCategoriesCache } from "@/features/athletes/hooks/useAthleteCategories";
import { sportAge } from "@/features/athletes/lib/athleteCategories";

import AthletePersonalDataSection from "./AthletePersonalDataSection";
import { emptyAthletePersonalData, isAthletePersonalDataValid } from "./types";

function Harness({ initialCategory = "" }: { initialCategory?: string }) {
  const [data, setData] = useState({ ...emptyAthletePersonalData(), category: initialCategory });
  return (
    <>
      <AthletePersonalDataSection
        data={data}
        onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
        hideAccountSection
      />
      <output data-testid="category">{data.category}</output>
    </>
  );
}

/** A birth date whose sport age (by Dec 31 this year) is `age`. */
function dobForAge(age: number): string {
  const year = new Date().getFullYear() - age;
  return `${year}-06-15`;
}

beforeEach(() => resetAthleteCategoriesCache());

describe("AthletePersonalDataSection category", () => {
  it("has no weight category and pre-selects the category from the birth date", async () => {
    render(<Harness />);
    expect(screen.queryByText(/Categoría de competencia/)).not.toBeInTheDocument();
    expect(screen.getByText("Categoría *")).toBeInTheDocument();
    const dob = dobForAge(13);
    expect(sportAge(dob)).toBe(13);
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento *"), { target: { value: dob } });
    expect(screen.getByTestId("category")).toHaveTextContent("cadete");
    expect(await screen.findByText("Sugerida por la edad del deportista.")).toBeInTheDocument();
  });

  it("keeps a category chosen by hand when the birth date changes", () => {
    render(<Harness initialCategory="mayores" />);
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento *"), {
      target: { value: dobForAge(9) },
    });
    expect(screen.getByTestId("category")).toHaveTextContent("mayores");
    expect(screen.getByText("Sugerida por la edad: Infantiles.")).toBeInTheDocument();
  });

  it("requires the category", () => {
    const base = { ...emptyAthletePersonalData(), full_name: "Ana", date_of_birth: "2010-01-01" };
    expect(isAthletePersonalDataValid(base)).toBe(false);
    expect(isAthletePersonalDataValid({ ...base, category: "juvenil" })).toBe(true);
  });
});
