import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({ config: { apiUrl: "", apiPrefix: "api/v1" } }));

const h = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  techniques: vi.fn(),
  movements: vi.fn(),
  updateMovement: vi.fn(),
  updatePoomsae: vi.fn(),
  uploadReferenceVideo: vi.fn(),
  removeReferenceVideo: vi.fn(),
}));
vi.mock("../api/poomsaeApi", () => ({ poomsaeApi: h }));

import { MemoryRouter } from "react-router-dom";

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import type { PoomsaeDetail, PoomsaeMovement } from "../types";
import PoomsaeAdminPage from "./PoomsaeAdminPage";

const detail: PoomsaeDetail = {
  id: 3,
  name: "Taegeuk Il Jang",
  order: 1,
  belt: 1,
  belt_name: "8 KUP",
  description: "",
  video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  video_source: "youtube",
  video_credit: "Kukkiwon",
  video_license_note: "",
  video_embed_url: null,
  segments_count: 2,
  segments: [],
  has_reference_video: true,
  reference_video_url: "/api/v1/poomsae/3/reference-video/",
  reference_video_type: "video/mp4",
  reference_video_size: 5 * 1024 * 1024,
};

const movement: PoomsaeMovement = {
  id: 41,
  number: 1,
  name: "Ap seogi · Arae makki",
  description: "",
  segment: 1,
  stance: 1,
  stance_name: "Ap seogi",
  hand: 2,
  hand_name: "Arae makki",
  kick: null,
  kick_name: null,
  turn_deg: 90,
  step: "forward",
  kihap: false,
  hold: true,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <FeedbackProvider>
        <PoomsaeAdminPage />
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
  h.list.mockResolvedValue([{ ...detail, segments: undefined }]);
  h.get.mockResolvedValue(detail);
  h.techniques.mockResolvedValue([
    { id: 1, code: "ap_seogi", name: "Ap seogi", element: "stance" },
    { id: 5, code: "ap_kubi", name: "Ap kubi", element: "stance" },
    { id: 2, code: "arae_makki", name: "Arae makki", element: "block" },
    { id: 9, code: "ap_chagi", name: "Ap chagi", element: "kick" },
  ]);
  h.movements.mockResolvedValue([movement]);
});

describe("PoomsaeAdminPage", () => {
  it("shows the club reference video and removes it after confirmation", async () => {
    h.removeReferenceVideo.mockResolvedValue({ ...detail, has_reference_video: false });
    renderPage();
    const video = await screen.findByLabelText("Video de referencia subido: Taegeuk Il Jang");
    expect(video).toHaveAttribute("src", "/api/v1/poomsae/3/reference-video/");
    expect(screen.getByText(/5 MB/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Eliminar video/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(h.removeReferenceVideo).toHaveBeenCalledWith(3));
    expect(
      await screen.findByText("Este poomsae no tiene un video subido por el club."),
    ).toBeInTheDocument();
  });

  it("rejects oversized uploads and sends valid files as multipart", async () => {
    h.uploadReferenceVideo.mockResolvedValue(detail);
    renderPage();
    const input = await screen.findByLabelText("Archivo del video de referencia");
    const big = new File(["x"], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(big, "size", { value: 200 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByRole("alert")).toHaveTextContent(/máximo/);
    expect(h.uploadReferenceVideo).not.toHaveBeenCalled();
    const ok = new File(["x"], "ref.webm", { type: "video/webm" });
    fireEvent.change(input, { target: { files: [ok] } });
    await waitFor(() => expect(h.uploadReferenceVideo).toHaveBeenCalledWith(3, ok));
  });

  it("edits the YouTube URL, credit and licence", async () => {
    h.updatePoomsae.mockResolvedValue({ ...detail, video_license_note: "CC BY" });
    renderPage();
    const licence = await screen.findByLabelText("Nota de licencia");
    const save = screen.getByRole("button", { name: /^Guardar$/ });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("URL del video"), { target: { value: "ftp://x" } });
    expect(screen.getByText(/debe empezar por http/)).toBeInTheDocument();
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("URL del video"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.change(licence, { target: { value: "CC BY" } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(h.updatePoomsae).toHaveBeenCalledWith(3, {
        video_source: "youtube",
        video_url: "https://youtu.be/dQw4w9WgXcQ",
        video_credit: "Kukkiwon",
        video_license_note: "CC BY",
      }),
    );
  });

  it("edits a movement inline and PATCHes only the changed fields", async () => {
    h.updateMovement.mockResolvedValue({ ...movement, turn_deg: -90, kihap: true, stance: 5 });
    renderPage();
    const turn = await screen.findByLabelText("Giro del movimiento 1");
    expect(turn).toHaveValue("90");
    const save = screen.getByRole("button", { name: "Guardar movimiento 1" });
    expect(save).toBeDisabled();
    fireEvent.change(turn, { target: { value: "-90" } });
    fireEvent.click(screen.getByLabelText("Kihap en el movimiento 1"));
    const stance = screen.getByLabelText("Posición del movimiento 1");
    expect(
      within(stance)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["—", "Ap seogi", "Ap kubi"]);
    fireEvent.change(stance, { target: { value: "5" } });
    fireEvent.click(save);
    await waitFor(() =>
      expect(h.updateMovement).toHaveBeenCalledWith(41, { turn_deg: -90, kihap: true, stance: 5 }),
    );
    await waitFor(() => expect(save).toBeDisabled());
  });

  it("shows an empty state without poomsae", async () => {
    h.list.mockResolvedValue({ count: 0, results: [] });
    h.list.mockResolvedValueOnce([]);
    renderPage();
    expect(await screen.findByText("No hay poomsae registrados")).toBeInTheDocument();
    expect(h.get).not.toHaveBeenCalled();
  });
});
