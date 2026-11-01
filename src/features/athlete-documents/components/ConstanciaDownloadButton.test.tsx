import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ downloadConstancia: vi.fn() }));
vi.mock("../api/athleteDocumentsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/athleteDocumentsApi")>();
  return { ...actual, athleteDocumentsApi: { ...actual.athleteDocumentsApi, ...h } };
});

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import ConstanciaDownloadButton from "./ConstanciaDownloadButton";

beforeEach(() => vi.clearAllMocks());

describe("ConstanciaDownloadButton", () => {
  it("downloads the athlete constancia", async () => {
    let finish: () => void = () => {};
    h.downloadConstancia.mockReturnValue(new Promise<void>((r) => (finish = r)));
    render(
      <FeedbackProvider>
        <ConstanciaDownloadButton athleteId={7} athleteName="Ana Gómez" />
      </FeedbackProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Descargar constancia/ }));
    expect(h.downloadConstancia).toHaveBeenCalledWith(7, "Ana Gómez");
    expect(await screen.findByRole("button", { name: /Generando/ })).toBeDisabled();
    finish();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Descargar constancia/ })).toBeEnabled(),
    );
  });

  it("recovers after a failed download", async () => {
    h.downloadConstancia.mockRejectedValue(new Error("boom"));
    render(
      <FeedbackProvider>
        <ConstanciaDownloadButton athleteId={7} />
      </FeedbackProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Descargar constancia/ }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Descargar constancia/ })).toBeEnabled(),
    );
  });
});
