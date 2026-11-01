import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PoomsaeAttempt } from "../types";
import AttemptResult from "./AttemptResult";

const attempt: PoomsaeAttempt = {
  id: 4,
  segment: 2,
  technique: null,
  mode: "segment",
  status: "completed",
  score: 82.4,
  element_scores: { stance: 90, block: 70 },
  criteria_results: [
    {
      key: "knee",
      label: "Rodilla adelantada flexionada",
      value: 105,
      expected: "90–120°",
      passed: true,
    },
    {
      key: "arm",
      label: "Brazo de defensa a la altura",
      value: 40,
      expected: "≥ 60",
      passed: false,
    },
  ],
  feedback: "Mantén la espalda recta.\n- Baja más la cadera en ap kubi.",
  created_at: "2026-10-31T10:00:00Z",
};

describe("AttemptResult", () => {
  it("shows score, element scores, criteria and feedback", () => {
    const onRepeat = vi.fn();
    render(<AttemptResult attempt={attempt} onRepeat={onRepeat} repeatLabel="Repetir segmento" />);
    expect(screen.getByLabelText("Puntaje 82.4")).toHaveTextContent("82");
    expect(screen.getByText("Segmento superado")).toBeInTheDocument();
    expect(screen.getByText("Posiciones")).toBeInTheDocument();
    expect(screen.getByText("Defensas")).toBeInTheDocument();
    expect(screen.getByLabelText("Cumplido")).toBeInTheDocument();
    expect(screen.getByLabelText("No cumplido")).toBeInTheDocument();
    expect(screen.getByText("Baja más la cadera en ap kubi.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Repetir segmento/ }));
    expect(onRepeat).toHaveBeenCalled();
  });

  it("explains a failed analysis", () => {
    render(<AttemptResult attempt={{ ...attempt, status: "failed", feedback: "" }} />);
    expect(screen.getByText("No se pudo analizar el intento")).toBeInTheDocument();
  });
});
