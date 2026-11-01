import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({ config: { apiUrl: "", apiPrefix: "api/v1" } }));

const h = vi.hoisted(() => ({
  get: vi.fn(),
  movements: vi.fn(),
  listAttempts: vi.fn(),
  getAttempt: vi.fn(),
  createAttempt: vi.fn(),
}));
vi.mock("../api/poomsaeApi", () => ({ poomsaeApi: h }));
// Camera + consent are covered elsewhere; here the recorder is a stub.
vi.mock("../components/ConsentGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/features/technical-evaluation/components/RecordingCapture", () => ({
  default: ({ title, recordSeconds }: { title: string; recordSeconds: number }) => (
    <p>
      {title} · {recordSeconds}s
    </p>
  ),
}));

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/authStore";
import { FeedbackProvider } from "@/feedback/FeedbackProvider";
import type { AuthUser } from "@/types/entities";

import type { PoomsaeDetail } from "../types";
import PoomsaeDetailPage from "./PoomsaeDetailPage";

const detail: PoomsaeDetail = {
  id: 3,
  name: "Taegeuk Il Jang",
  order: 1,
  belt: 1,
  belt_name: "8 KUP",
  description: "Primera forma.",
  video_url: null,
  video_source: null,
  video_embed_url: null,
  segments_count: 2,
  has_reference_video: true,
  reference_video_url: "/api/v1/poomsae/3/reference-video/",
  my_progress: {
    segments_completed: 2,
    segments_total: 2,
    best_score: 80,
    best_full_score: 76,
    full_completed: true,
  },
  certified: true,
  segments: [
    {
      id: 1,
      order: 1,
      name: "Inicio",
      description: "",
      video_start_s: 0,
      video_end_s: 12,
      techniques: [],
      movement_numbers: [1, 2],
    },
    {
      id: 2,
      order: 2,
      name: "Final",
      description: "",
      video_start_s: 12,
      video_end_s: 30,
      techniques: [],
      movement_numbers: [3],
    },
  ],
  movements: [
    { number: 1, name: "Ap seogi · Arae makki", turn_deg: 90, step: "forward", kihap: false },
    { number: 2, name: "Ap seogi · Momtong jireugi", turn_deg: 0, step: "forward" },
    { number: 3, name: "Ap kubi · Momtong jireugi", turn_deg: -90, step: "forward", kihap: true },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/poomsae/3"]}>
      <FeedbackProvider>
        <Routes>
          <Route path="/dashboard/poomsae/:id" element={<PoomsaeDetailPage />} />
        </Routes>
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
  // jsdom has no media playback.
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: () => Promise.resolve(),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    status: "ready",
    isAuthenticated: true,
    user: { id: 1, role: "sportsman", full_name: "Ana" } as AuthUser,
  });
  h.get.mockResolvedValue(detail);
  h.movements.mockResolvedValue([]);
  h.listAttempts.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  h.createAttempt.mockResolvedValue({ id: 50, status: "processing" });
  h.getAttempt.mockResolvedValue({ id: 50, status: "processing" });
});

describe("PoomsaeDetailPage (Addendum C)", () => {
  it("shows the certification badge, the club video and the full-form card", async () => {
    renderPage();
    expect((await screen.findAllByText("Forma certificada")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Video de referencia: Taegeuk Il Jang")).toHaveAttribute(
      "src",
      "/api/v1/poomsae/3/reference-video/",
    );
    expect(screen.getByText(/3 movimientos/)).toBeInTheDocument();
    expect(screen.getByText("Mejor puntaje: 76")).toBeInTheDocument();
    // The script is embedded: no extra request.
    expect(h.movements).not.toHaveBeenCalled();
  });

  it("shows the 'Guion provisional' badge when the script isn't reviewed", async () => {
    h.get.mockResolvedValue({ ...detail, script_reviewed: false });
    renderPage();
    expect(await screen.findByText("Guion provisional")).toBeInTheDocument();
  });

  it("hides the provisional badge for reviewed scripts", async () => {
    h.get.mockResolvedValue({ ...detail, script_reviewed: true });
    renderPage();
    await screen.findAllByText("Forma certificada");
    expect(screen.queryByText("Guion provisional")).not.toBeInTheDocument();
  });

  it("shows the ordered movement checklist of a segment before recording", async () => {
    renderPage();
    const buttons = await screen.findAllByRole("button", { name: /Practicar segmento/ });
    fireEvent.click(buttons[0]);
    expect(await screen.findByText("Movimientos a ejecutar, en orden (2)")).toBeInTheDocument();
    expect(screen.getByText("Ap seogi · Arae makki")).toBeInTheDocument();
    expect(screen.getByText("Ap seogi · Momtong jireugi")).toBeInTheDocument();
    expect(screen.queryByText("Ap kubi · Momtong jireugi")).not.toBeInTheDocument();
    expect(screen.getByText("Giro 90° a la izquierda")).toBeInTheDocument();
  });

  it("fetches the script when the detail doesn't embed it", async () => {
    h.get.mockResolvedValue({ ...detail, movements: undefined });
    h.movements.mockResolvedValue([
      {
        id: 1,
        number: 3,
        name: "Ap kubi · Momtong jireugi",
        segment: 2,
        stance: null,
        stance_name: null,
        hand: null,
        hand_name: null,
        kick: null,
        kick_name: null,
        turn_deg: -90,
        step: "forward",
        kihap: true,
        hold: true,
        description: "",
      },
    ]);
    renderPage();
    await waitFor(() => expect(h.movements).toHaveBeenCalledWith(3));
    const buttons = await screen.findAllByRole("button", { name: /Practicar segmento/ });
    fireEvent.click(buttons[1]);
    expect(await screen.findByText("Ap kubi · Momtong jireugi")).toBeInTheDocument();
    expect(screen.getByText("Kihap")).toBeInTheDocument();
  });

  it("runs the full form: warning, long recording, file upload with the poomsae id", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /Practicar forma completa/ }));
    expect(await screen.findByText("Forma completa: Taegeuk Il Jang")).toBeInTheDocument();
    // Reference step: segment jump buttons + full script.
    expect(screen.getByRole("button", { name: "Ir al segmento 2: Final" })).toBeInTheDocument();
    expect(screen.getByText("Movimientos a ejecutar, en orden (3)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Estoy listo, grabar/ }));
    expect(screen.getByText(/90 MB/)).toBeInTheDocument();
    expect(screen.getByText("Grabar forma completa · 90s")).toBeInTheDocument();

    const input = screen.getByLabelText("Subir video de la forma completa");
    const big = new File(["x"], "forma.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 95 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/máximo es 90 MB/);
    expect(h.createAttempt).not.toHaveBeenCalled();

    const ok = new File(["x"], "forma.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [ok] } });
    await waitFor(() =>
      expect(h.createAttempt).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "full", poomsae: 3, recording: ok }),
      ),
    );
    expect(await screen.findByText(/puede tardar varios minutos/)).toBeInTheDocument();
    await waitFor(() => expect(h.getAttempt).toHaveBeenCalledWith(50));
  });
});
