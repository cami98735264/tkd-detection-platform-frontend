import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  showToast: vi.fn(),
  handleError: vi.fn(),
  realtime: { status: "closed", reconnectNonce: 0 },
  handlers: new Map<string, (env: { id: unknown }) => void>(),
}));

vi.mock("@/features/technical-evaluation/api/technicalEvaluationApi", () => ({
  technicalEvaluationApi: { getSession: h.getSession },
}));
vi.mock("@/feedback/useFeedback", () => ({ useFeedback: () => ({ showToast: h.showToast }) }));
vi.mock("@/feedback/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ handleError: h.handleError }),
}));
vi.mock("@/features/realtime", () => ({
  useRealtime: () => h.realtime,
  useRealtimeEvent: (type: string, handler: (env: { id: unknown }) => void) =>
    h.handlers.set(type, handler),
}));

import { useEvaluationSession } from "./useEvaluationSession";

const processing = { id: 5, status: "processing", results: null, recommendations: "" };
const completed = {
  id: 5,
  status: "completed",
  results: { overall_score: 80 },
  recommendations: "",
};
const failed = { id: 5, status: "failed", results: null, recommendations: "Video corrupto" };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  h.getSession.mockReset();
  h.showToast.mockReset();
  h.realtime = { status: "closed", reconnectNonce: 0 };
});
afterEach(() => vi.useRealTimers());

describe("useEvaluationSession", () => {
  it("polls every 2 s while the socket is closed and stops at a terminal status", async () => {
    h.getSession.mockResolvedValueOnce(processing).mockResolvedValue(completed);
    const { result } = renderHook(() => useEvaluationSession(true));

    act(() => result.current.begin(5));
    expect(result.current.loadingSession).toBe(true);
    await waitFor(() => expect(h.getSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    await waitFor(() => expect(result.current.session?.status).toBe("completed"));
    expect(result.current.loadingSession).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(h.getSession).toHaveBeenCalledTimes(2);
  });

  it("toasts a failed analysis on the polling path", async () => {
    h.getSession.mockResolvedValue(failed);
    const { result } = renderHook(() => useEvaluationSession(true));
    act(() => result.current.begin(5));
    await waitFor(() =>
      expect(h.showToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" })),
    );
  });

  it("relies on realtime events (no polling) while the socket is open", async () => {
    h.realtime = { status: "open", reconnectNonce: 0 };
    h.getSession.mockResolvedValueOnce(processing).mockResolvedValue(completed);
    const { result } = renderHook(() => useEvaluationSession(true));
    act(() => result.current.begin(5));
    await waitFor(() => expect(h.getSession).toHaveBeenCalledTimes(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(h.getSession).toHaveBeenCalledTimes(1);

    await act(async () => {
      h.handlers.get("tech_eval.updated")?.({ id: 99 }); // other session: ignored
      h.handlers.get("tech_eval.updated")?.({ id: 5 });
    });
    await waitFor(() => expect(result.current.session?.status).toBe("completed"));
    expect(h.getSession).toHaveBeenCalledTimes(2);
  });

  it("does nothing until the results step is active, and clear() forgets the session", async () => {
    h.getSession.mockResolvedValue(completed);
    const { result, rerender } = renderHook(({ active }) => useEvaluationSession(active), {
      initialProps: { active: false },
    });
    act(() => result.current.begin(5));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(h.getSession).not.toHaveBeenCalled();

    rerender({ active: true });
    await waitFor(() => expect(result.current.session?.status).toBe("completed"));
    act(() => result.current.clear());
    expect(result.current.session).toBeNull();
  });
});
