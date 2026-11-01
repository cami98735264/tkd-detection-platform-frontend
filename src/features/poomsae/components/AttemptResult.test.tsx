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

  it("renders legacy attempts without a movement timeline, with the hand-shape note", () => {
    render(<AttemptResult attempt={attempt} />);
    expect(screen.queryByText("Movimiento a movimiento")).not.toBeInTheDocument();
    expect(screen.queryByText("Secuencia")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "La forma de la mano (puño, mano de cuchillo, punta de dedos) no se evalúa con la cámara.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the movement timeline, sequence summary and new element scores", () => {
    render(
      <AttemptResult
        attempt={{
          ...attempt,
          element_scores: { stance: 80, sequence: 75, direction: 60 },
          movement_results: [
            {
              number: 1,
              name: "Ap seogi · Arae makki",
              matched: true,
              time_s: 2.4,
              score: 88,
              turn: { expected: 90, measured: 84, passed: true },
              step: { expected: "forward", measured: "forward", passed: true },
              issues: [],
            },
            {
              number: 2,
              name: "Ap seogi · Momtong jireugi",
              matched: false,
              time_s: null,
              score: null,
              turn: { expected: -90, measured: 10, passed: false },
              step: null,
              issues: ["No se detectó el puño a la altura del plexo."],
            },
          ],
          sequence_summary: {
            expected_movements: 2,
            detected_movements: 1,
            matched_in_order: 1,
            missing: [2],
            extra: 0,
            order_ok: true,
          },
        }}
      />,
    );
    expect(screen.getByText("Orden y número de movimientos")).toBeInTheDocument();
    expect(screen.getByText("Giros y desplazamientos")).toBeInTheDocument();
    expect(screen.getByText("Secuencia")).toBeInTheDocument();
    expect(screen.getByText(/Faltan: 2\./)).toBeInTheDocument();
    expect(screen.getByText("1. Ap seogi · Arae makki")).toBeInTheDocument();
    expect(screen.getByLabelText("Detectado")).toBeInTheDocument();
    expect(screen.getByLabelText("No detectado")).toBeInTheDocument();
    expect(screen.getByText("En 0:02")).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Giro: esperado Giro 90° a la derecha, medido Giro 10° a la izquierda/),
    ).toHaveTextContent("✗");
    expect(screen.getByText("No se detectó el puño a la altura del plexo.")).toBeInTheDocument();
  });

  it("shows per-segment scores and the certification badge for a full attempt", () => {
    render(
      <AttemptResult
        attempt={{
          ...attempt,
          mode: "full",
          segment: null,
          score: 74,
          segment_results: [
            { segment: 1, segment_name: "Inicio", score: 80, matched: 6, expected: 6 },
            { segment: 2, segment_name: "Final", score: 62, matched: 4, expected: 6 },
          ],
        }}
      />,
    );
    expect(screen.getByText("Resultado de la forma completa")).toBeInTheDocument();
    expect(screen.getByText("Forma certificada")).toBeInTheDocument();
    expect(screen.getByText("Resultado por segmento")).toBeInTheDocument();
    expect(screen.getByLabelText("Puntaje de Final")).toHaveAttribute("aria-valuenow", "62");
    expect(screen.getByText("4/6 mov.")).toBeInTheDocument();
  });

  it("explains a failed analysis", () => {
    render(<AttemptResult attempt={{ ...attempt, status: "failed", feedback: "" }} />);
    expect(screen.getByText("No se pudo analizar el intento")).toBeInTheDocument();
  });
});
