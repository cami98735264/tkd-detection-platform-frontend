import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  techniques: vi.fn(),
  listAttempts: vi.fn(),
  techniqueStats: vi.fn(),
  calibrate: vi.fn(),
  calibrations: vi.fn(),
  revertCalibration: vi.fn(),
}));
vi.mock("../api/poomsaeApi", () => ({ poomsaeApi: h }));

import { MemoryRouter } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/authStore";
import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import type { AuthUser } from "@/types/entities";

import TechniqueCalibrationPage from "./TechniqueCalibrationPage";

const crit = (key: string) => ({ key, label: key, value: 1, expected: null, passed: true });
const attempts = [
  {
    id: 10,
    user: 1,
    mode: "technique",
    technique: 4,
    segment: null,
    status: "completed",
    score: 90,
    element_scores: null,
    criteria_results: [crit("knee")],
    feedback: "",
    created_at: "2026-10-01T10:00:00Z",
  },
  {
    id: 11,
    user: 1,
    mode: "segment",
    technique: null,
    segment: 2,
    poomsae_name: "Taegeuk Il Jang",
    segment_name: "Inicio",
    status: "completed",
    score: 85,
    element_scores: null,
    criteria_results: [crit("2.ap_kubi.knee")],
    feedback: "",
    created_at: "2026-10-02T10:00:00Z",
  },
  {
    id: 12,
    user: 7,
    athlete_name: "Otro deportista",
    mode: "technique",
    technique: 4,
    segment: null,
    status: "completed",
    score: 60,
    element_scores: null,
    criteria_results: [],
    feedback: "",
    created_at: "2026-10-03T10:00:00Z",
  },
  {
    id: 13,
    user: 1,
    mode: "technique",
    technique: 8,
    segment: null,
    status: "completed",
    score: 70,
    element_scores: null,
    criteria_results: [],
    feedback: "",
    created_at: "2026-10-04T10:00:00Z",
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <FeedbackProvider>
        <TechniqueCalibrationPage />
      </FeedbackProvider>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g.ResizeObserver ??= NoopObserver;
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    status: "ready",
    isAuthenticated: true,
    user: { id: 1, role: "administrator", full_name: "Maestro" } as AuthUser,
  });
  h.techniques.mockResolvedValue([
    { id: 4, code: "ap_kubi", name: "Ap kubi", element: "stance" },
    { id: 8, code: "arae_makki", name: "Arae makki", element: "block" },
  ]);
  h.listAttempts.mockResolvedValue({ count: 4, next: null, previous: null, results: attempts });
  h.techniqueStats.mockResolvedValue({
    technique: 4,
    attempts: 12,
    criteria: [
      {
        key: "knee",
        label: "Rodilla adelantada",
        min: 90,
        max: 120,
        unit: "deg",
        n: 12,
        mean: 104,
        p10: 95,
        p50: 103,
        p90: 118,
        pass_rate: 0.75,
      },
    ],
  });
  h.calibrations.mockResolvedValue([
    {
      id: 5,
      created_at: "2026-10-05T10:00:00Z",
      created_by_name: "Maestro",
      attempt_ids: [1, 2],
      new_criteria: [{ key: "knee", label: "Rodilla adelantada", min: 85, max: 125, unit: "deg" }],
    },
  ]);
});

async function pickTechnique() {
  renderPage();
  await waitFor(() => expect(screen.getByRole("option", { name: "Ap kubi" })).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText("Técnica"), { target: { value: "4" } });
  return screen.findByText("Rodilla adelantada");
}

describe("TechniqueCalibrationPage", () => {
  it("shows the per-criterion stats and the history", async () => {
    await pickTechnique();
    expect(h.techniqueStats).toHaveBeenCalledWith(4, null);
    expect(screen.getByText("90°–120°")).toBeInTheDocument();
    expect(screen.getByText("103°")).toBeInTheDocument();
    expect(screen.getByText("75 %")).toBeInTheDocument();
    expect(await screen.findByText(/85°–125°/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Desde (opcional)"), {
      target: { value: "2026-10-01" },
    });
    await waitFor(() => expect(h.techniqueStats).toHaveBeenLastCalledWith(4, "2026-10-01"));
  });

  it("lists only my completed attempts that include the technique", async () => {
    await pickTechnique();
    expect(screen.getByLabelText("Usar el intento 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Usar el intento 11")).toBeInTheDocument();
    expect(screen.queryByLabelText("Usar el intento 12")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Usar el intento 13")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Solo intentos grabados por mí"));
    expect(screen.getByLabelText("Usar el intento 12")).toBeInTheDocument();
    expect(screen.queryByLabelText("Usar el intento 13")).not.toBeInTheDocument();
  });

  it("previews a calibration, then applies it after confirmation", async () => {
    h.calibrate
      .mockResolvedValueOnce({
        proposed: [
          {
            key: "knee",
            label: "Rodilla adelantada",
            unit: "deg",
            current: [90, 120],
            proposed: [88, 126],
            samples: 2,
          },
        ],
        applied: false,
      })
      .mockResolvedValueOnce({ proposed: [], applied: true });
    await pickTechnique();
    const apply = screen.getByRole("button", { name: /Aplicar calibración/ });
    expect(apply).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Usar el intento 10"));
    fireEvent.click(screen.getByLabelText("Usar el intento 11"));
    fireEvent.change(screen.getByLabelText("Tolerancia"), { target: { value: "lenient" } });
    fireEvent.click(screen.getByRole("button", { name: "Previsualizar propuesta" }));
    await waitFor(() =>
      expect(h.calibrate).toHaveBeenCalledWith(4, {
        attempt_ids: [10, 11],
        tolerance: "lenient",
        apply: false,
      }),
    );
    expect(await screen.findByText("88°–126°")).toBeInTheDocument();
    fireEvent.click(apply);
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(h.calibrate).toHaveBeenLastCalledWith(4, {
        attempt_ids: [10, 11],
        tolerance: "lenient",
        apply: true,
      }),
    );
    expect(await screen.findByText("Aplicada")).toBeInTheDocument();
  });

  it("reverts a calibration from the history", async () => {
    h.revertCalibration.mockResolvedValue({});
    await pickTechnique();
    fireEvent.click(await screen.findByRole("button", { name: /Revertir/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(h.revertCalibration).toHaveBeenCalledWith(4, 5));
  });
});
