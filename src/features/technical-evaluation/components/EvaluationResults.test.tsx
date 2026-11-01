import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  AnalysisQuality,
  EvaluationResults,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";

import EvaluationResultsView from "./EvaluationResults";
import { MetricTableCell } from "./MetricComparison";

const legacy: EvaluationResults = {
  angle: 173.3,
  height: 160.8,
  speed: 5.8,
  stability: 85.6,
  overall_score: 82,
  recommendations: "¡Excelente técnica general!",
};

const withMetrics: EvaluationResults = {
  ...legacy,
  recommendations: "Mejora la altura y la velocidad del pateo.",
  metrics: [
    // Deliberately out of display order: the view must sort angle→stability.
    {
      key: "stability",
      label: "Estabilidad",
      unit: "%",
      value: 85.6,
      optimal: 90,
      optimal_min: 85,
      optimal_max: 100,
      ratio: 0.95,
      score: 95,
      status: "optimal",
      status_display: "Óptimo",
      description: "Mantuviste el equilibrio sobre la pierna de apoyo.",
    },
    {
      key: "angle",
      label: "Ángulo de la técnica",
      unit: "°",
      value: 173.3,
      optimal: 175,
      optimal_min: 165,
      optimal_max: 180,
      ratio: 0.99,
      score: 97,
      status: "optimal",
      status_display: "Óptimo",
      description: "La extensión de la rodilla está dentro del rango óptimo.",
    },
    {
      key: "height",
      label: "Altura de pateo",
      unit: "cm",
      value: 120,
      optimal: 148.5,
      optimal_min: 140,
      optimal_max: 160,
      ratio: 0.81,
      score: 72,
      status: "close",
      status_display: "Cerca",
      description: "El pie quedó por debajo de la altura de la cabeza.",
    },
    {
      key: "speed",
      label: "Velocidad de la técnica",
      unit: "m/s",
      value: 3.1,
      optimal: 7,
      optimal_min: 6,
      optimal_max: 9,
      ratio: 0.44,
      score: 40,
      status: "needs_work",
      status_display: "Por mejorar",
      description: "La patada fue lenta frente a la velocidad óptima.",
    },
  ],
  detailed_recommendations: [
    {
      metric: "height",
      priority: "medium",
      title: "Eleva la altura del pateo",
      detail: "Trabaja la flexibilidad de cadera.",
      drills: ["Patadas a la pared", "Estiramientos de aductores"],
    },
    {
      metric: "angle",
      priority: "low",
      title: "Mantén la extensión",
      detail: "Sigue extendiendo la rodilla al final.",
      drills: [],
    },
    {
      metric: "speed",
      priority: "high",
      title: "Gana velocidad",
      detail: "Acelera la recogida de la rodilla.",
      drills: ["Patadas con banda elástica"],
    },
  ],
  optimal_reference: {
    kick_type: "Dollyo Chagui",
    athlete_height_cm: 165,
    height_basis: "athlete",
    source_note: "Referencia por tipo de patada.",
  },
};

describe("EvaluationResultsView", () => {
  it("shows executed vs optimal values, ranges and descriptions per metric", () => {
    render(<EvaluationResultsView results={withMetrics} />);

    const cards = screen.getAllByTestId(/^metric-/);
    expect(cards.map((c) => c.dataset.testid)).toEqual([
      "metric-angle",
      "metric-height",
      "metric-speed",
      "metric-stability",
    ]);

    const angle = within(screen.getByTestId("metric-angle"));
    expect(angle.getByText("Ángulo de la técnica")).toBeInTheDocument();
    expect(angle.getByText("173.3°")).toBeInTheDocument();
    expect(angle.getByText("/ óptimo 175°")).toBeInTheDocument();
    expect(angle.getByText("Rango óptimo 165–180°")).toBeInTheDocument();
    expect(
      angle.getByText("La extensión de la rodilla está dentro del rango óptimo."),
    ).toBeInTheDocument();
    expect(angle.getByRole("img")).toHaveAccessibleName(
      "Ángulo de la técnica: 173.3° frente al rango óptimo 165–180°",
    );

    const height = within(screen.getByTestId("metric-height"));
    expect(height.getByText("120 cm")).toBeInTheDocument();
    expect(height.getByText("/ óptimo 148.5 cm")).toBeInTheDocument();

    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Mejora la altura y la velocidad del pateo.")).toBeInTheDocument();
    expect(screen.getByText(/Valores óptimos para Dollyo Chagui/)).toHaveTextContent(
      "estatura 165 cm (registrada)",
    );
    // Legacy uppercase-value cards are not rendered.
    expect(screen.queryByText("Recomendaciones")).not.toBeInTheDocument();
  });

  it("renders a status badge per metric with the success/warning/error tones", () => {
    render(<EvaluationResultsView results={withMetrics} />);

    const badge = (key: string) =>
      within(screen.getByTestId(`metric-${key}`)).getByText(
        /^(Óptimo|Cerca|Por mejorar)$/,
      ) as HTMLElement;

    expect(badge("angle")).toHaveTextContent("Óptimo");
    expect(badge("angle")).toHaveAttribute("data-status", "optimal");
    expect(badge("angle").className).toContain("text-success");

    expect(badge("height")).toHaveTextContent("Cerca");
    expect(badge("height").className).toContain("bg-warning");

    expect(badge("speed")).toHaveTextContent("Por mejorar");
    expect(badge("speed").className).toContain("text-error");
  });

  it("lists detailed recommendations sorted by priority with their drills", () => {
    render(<EvaluationResultsView results={withMetrics} />);

    expect(screen.getByRole("heading", { name: "Qué debes mejorar" })).toBeInTheDocument();
    const items = screen.getAllByTestId("improvement-item");
    expect(items.map((i) => within(i).getByText(/^(Gana|Eleva|Mantén)/).textContent)).toEqual([
      "Gana velocidad",
      "Eleva la altura del pateo",
      "Mantén la extensión",
    ]);
    expect(within(items[0]).getByText("Prioridad alta")).toBeInTheDocument();
    expect(within(items[0]).getByText("Velocidad de la técnica")).toBeInTheDocument();
    expect(within(items[1]).getByText("Prioridad media")).toBeInTheDocument();
    expect(within(items[1]).getByText("Patadas a la pared")).toBeInTheDocument();
    expect(within(items[1]).getByText("Estiramientos de aductores")).toBeInTheDocument();
    expect(within(items[2]).getByText("Prioridad baja")).toBeInTheDocument();
    expect(within(items[2]).queryByText("Ejercicios sugeridos")).not.toBeInTheDocument();
  });

  it("congratulates when every metric is optimal and there is nothing to improve", () => {
    render(
      <EvaluationResultsView
        results={{
          ...withMetrics,
          metrics: withMetrics.metrics!.map((m) => ({
            ...m,
            status: "optimal",
            status_display: "Óptimo",
          })),
          detailed_recommendations: [],
        }}
      />,
    );
    expect(
      screen.getByText(/Todas las métricas están dentro de su rango óptimo/),
    ).toBeInTheDocument();
  });

  it("falls back to the legacy value cards when the API has no metrics", () => {
    render(<EvaluationResultsView results={legacy} />);

    expect(screen.queryByTestId(/^metric-/)).not.toBeInTheDocument();
    expect(screen.queryByText("Qué debes mejorar")).not.toBeInTheDocument();
    expect(screen.getByText("Ángulo")).toBeInTheDocument();
    expect(screen.getByText("173.3")).toBeInTheDocument();
    expect(screen.getByText("Estabilidad")).toBeInTheDocument();
    expect(screen.getByText("Recomendaciones")).toBeInTheDocument();
    expect(screen.getByText("¡Excelente técnica general!")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("treats an empty or malformed metrics array as a legacy payload", () => {
    const malformed = {
      ...legacy,
      metrics: [{ key: "angle", value: "x" }],
    } as unknown as EvaluationResults;
    render(<EvaluationResultsView results={malformed} />);
    expect(screen.queryByTestId(/^metric-/)).not.toBeInTheDocument();
    expect(screen.getByText("Recomendaciones")).toBeInTheDocument();
  });

  it("keeps the onClose prop working", () => {
    const onClose = vi.fn();
    render(<EvaluationResultsView results={legacy} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar resultados" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("MetricTableCell", () => {
  it("shows executed / optimal with a status marker when metrics exist", () => {
    const { container } = render(<MetricTableCell results={withMetrics} metricKey="speed" />);
    expect(screen.getByText("3.1 m/s")).toBeInTheDocument();
    expect(screen.getByText("/ 7 m/s")).toBeInTheDocument();
    expect(screen.getByText("Por mejorar")).toBeInTheDocument();
    expect(container.querySelector('[data-status="needs_work"]')).toHaveClass("bg-error");
  });

  it("shows the raw value for legacy results and a dash without results", () => {
    const { rerender } = render(<MetricTableCell results={legacy} metricKey="height" />);
    expect(screen.getByText("160.8 cm")).toBeInTheDocument();
    rerender(<MetricTableCell results={null} metricKey="height" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("Analysis quality (v2)", () => {
  const quality: AnalysisQuality & { kicks: NonNullable<AnalysisQuality["kicks"]> } = {
    version: 2,
    real_fps: 12.2,
    confidence: 0.38,
    kicks_detected: 2,
    kicks: [
      { time_s: 1.2, leg: "left", overall: 61, angle: 150, height: 90, speed: 6, stability: 80 },
      {
        time_s: 3.4,
        leg: "right",
        overall: 74.4,
        angle: 130,
        height: 51,
        speed: 9.7,
        stability: 88,
      },
    ],
    kick_used: { time_s: 3.4, leg: "right", index: 2 },
    warnings: ["El video tiene pocos cuadros por segundo (12)."],
  };

  it("shows confidence, every kick found and the recording warnings", () => {
    render(<EvaluationResultsView results={{ ...withMetrics, analysis_quality: quality }} />);
    expect(screen.getByText("Calidad del análisis")).toBeInTheDocument();
    expect(screen.getByText("Confiabilidad baja")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Se detectaron 2 patadas; se muestra la mejor \(n\.º 2, pierna derecha, segundo 3\.4\)/,
      ),
    ).toBeInTheDocument();
    const kicks = within(screen.getByRole("list", { name: "Patadas detectadas" }));
    expect(kicks.getAllByRole("listitem")).toHaveLength(2);
    expect(kicks.getByText("#2 · 3.4 s · 74.4/100")).toBeInTheDocument();
    expect(screen.getByText("El video tiene pocos cuadros por segundo (12).")).toBeInTheDocument();
  });

  it("is hidden for legacy sessions and malformed reports", () => {
    const { rerender } = render(<EvaluationResultsView results={withMetrics} />);
    expect(screen.queryByText("Calidad del análisis")).not.toBeInTheDocument();
    rerender(
      <EvaluationResultsView
        results={{
          ...withMetrics,
          analysis_quality: { foo: 1 } as unknown as EvaluationResults["analysis_quality"],
        }}
      />,
    );
    expect(screen.queryByText("Calidad del análisis")).not.toBeInTheDocument();
  });

  it("labels a clean single-kick recording as high confidence", () => {
    render(
      <EvaluationResultsView
        results={{
          ...withMetrics,
          analysis_quality: {
            version: 2,
            confidence: 0.97,
            kicks: [quality.kicks[1]],
            kick_used: { time_s: 3.4, leg: "right", index: 1 },
            warnings: [],
          },
        }}
      />,
    );
    expect(screen.getByText("Confiabilidad alta")).toBeInTheDocument();
    expect(screen.getByText("Se detectó 1 patada en el video.")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Patadas detectadas" })).not.toBeInTheDocument();
  });
});
