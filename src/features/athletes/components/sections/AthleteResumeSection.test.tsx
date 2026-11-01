import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { emptyAthleteResume, type AthleteResumeState } from "@/features/athletes/lib/athleteResume";

import AthleteResumeSection from "./AthleteResumeSection";

function Harness({
  initial = emptyAthleteResume(),
  defaultOpen = true,
  documentPlaceholder,
}: {
  initial?: AthleteResumeState;
  defaultOpen?: boolean;
  documentPlaceholder?: string;
}) {
  const [data, setData] = useState(initial);
  return (
    <>
      <AthleteResumeSection
        data={data}
        onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
        defaultOpen={defaultOpen}
        documentPlaceholder={documentPlaceholder}
      />
      <output data-testid="state">{JSON.stringify(data)}</output>
    </>
  );
}

const state = () =>
  JSON.parse(screen.getByTestId("state").textContent ?? "{}") as AthleteResumeState;

describe("AthleteResumeSection", () => {
  it("starts collapsed and expands on demand", () => {
    render(<Harness defaultOpen={false} />);
    const toggle = screen.getByRole("button", { name: /Hoja de vida/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Seguro E.P.S.")).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Seguro E.P.S.")).toBeInTheDocument();
  });

  it("groups the B.3 fields into sub-blocks", () => {
    render(<Harness />);
    for (const legend of ["Identificación", "Salud", "Contacto", "Padres", "Información técnica"]) {
      expect(screen.getByRole("group", { name: legend })).toBeInTheDocument();
    }
  });

  it("edits selects, text fields, days and hours", () => {
    render(<Harness documentPlaceholder="1104954182" />);
    expect(screen.getByLabelText("Número de documento")).toHaveAttribute(
      "placeholder",
      "1104954182",
    );
    fireEvent.change(screen.getByLabelText("Tipo de documento"), { target: { value: "TI" } });
    fireEvent.change(screen.getByLabelText("Género"), { target: { value: "F" } });
    fireEvent.change(screen.getByLabelText("Grupo sanguíneo"), { target: { value: "O" } });
    fireEvent.change(screen.getByLabelText("Factor RH"), { target: { value: "+" } });
    fireEvent.change(screen.getByLabelText("Nombre de la madre"), { target: { value: "Rosa" } });
    fireEvent.change(screen.getByLabelText("Enfermedad o alergia a"), {
      target: { value: "Polen" },
    });
    fireEvent.change(screen.getByLabelText("Fecha de ingreso al club"), {
      target: { value: "2022-02-01" },
    });
    fireEvent.click(screen.getByLabelText("Sábado"));
    fireEvent.click(screen.getByLabelText("Martes"));
    fireEvent.change(screen.getByLabelText("Horas por sesión"), { target: { value: "2" } });

    expect(state()).toMatchObject({
      document_type: "TI",
      gender: "F",
      blood_group: "O",
      rh_factor: "+",
      mother_name: "Rosa",
      allergies: "Polen",
      join_date: "2022-02-01",
      training_days: ["martes", "sábado"],
      session_hours: "2",
    });

    fireEvent.click(screen.getByLabelText("Martes"));
    expect(state().training_days).toEqual(["sábado"]);
  });

  it("flags invalid session hours", () => {
    render(<Harness initial={{ ...emptyAthleteResume(), session_hours: "48" }} />);
    expect(screen.getByText(/entre 0,5 y 24/)).toBeInTheDocument();
  });
});
