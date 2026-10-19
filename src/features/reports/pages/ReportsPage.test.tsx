import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "@/types/entities";

const h = vi.hoisted(() => ({
  list: vi.fn(),
  download: vi.fn(),
  generate: vi.fn(),
  realtime: { status: "closed", reconnectNonce: 0 },
}));

vi.mock("@/features/reports/api/reportsApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/reports/api/reportsApi")>();
  return {
    ...actual,
    reportsApi: { list: h.list, download: h.download, generate: h.generate, delete: vi.fn() },
  };
});
vi.mock("@/features/realtime", () => ({
  useRealtime: () => h.realtime,
  useRealtimeEvent: () => {},
}));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import ReportsPage, { REPORT_POLL_MS } from "./ReportsPage";

function report(status: Report["status"]): Report {
  return {
    id: 7,
    title: "Asistencia octubre",
    report_type: "attendance",
    created_by_id: 1,
    created_by_name: "Admin",
    filters_applied: {},
    status,
    generated_at: null,
    file_reference: null,
    created_at: "2026-10-01T10:00:00Z",
    expires_at: null,
    download_url: status === "completed" ? "/api/v1/reports/7/download/" : null,
  };
}

const page = (r: Report) => ({ count: 1, next: null, previous: null, results: [r] });

function renderPage() {
  return render(
    <FeedbackProvider>
      <ReportsPage />
    </FeedbackProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  h.realtime = { status: "closed", reconnectNonce: 0 };
  h.list.mockReset();
  h.download.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("ReportsPage", () => {
  it("polls while a report is processing and offers the download once completed", async () => {
    h.list
      .mockResolvedValueOnce(page(report("processing")))
      .mockResolvedValue(page(report("completed")));
    renderPage();

    expect((await screen.findAllByText("Procesando")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Descargar CSV")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPORT_POLL_MS + 10);
    });

    expect((await screen.findAllByText("Completado")).length).toBeGreaterThan(0);
    expect(h.list).toHaveBeenCalledTimes(2);

    const [button] = screen.getAllByLabelText("Descargar CSV");
    fireEvent.click(button);
    expect(h.download).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));

    // Terminal state: polling stops.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPORT_POLL_MS * 3);
    });
    expect(h.list).toHaveBeenCalledTimes(2);
  });

  it("does not poll when the realtime socket delivers updates", async () => {
    h.realtime = { status: "open", reconnectNonce: 0 };
    h.list.mockResolvedValue(page(report("pending")));
    renderPage();
    expect((await screen.findAllByText("Pendiente")).length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REPORT_POLL_MS * 3);
    });
    expect(h.list).toHaveBeenCalledTimes(1);
  });

  it("shows failed reports without a download action", async () => {
    h.list.mockResolvedValue(page(report("failed")));
    renderPage();
    expect((await screen.findAllByText("Fallido")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Descargar CSV")).not.toBeInTheDocument();
  });
});
