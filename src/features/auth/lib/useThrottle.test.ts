import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useThrottle } from "./useThrottle";
import { ApiError } from "@/types/api";

function throttled(retryAfter?: number) {
  // 429 → ApiError.isThrottled is true; retryAfter comes from the header value.
  return new ApiError(429, { detail: "slow down" }, retryAfter);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("useThrottle.handle (contract §2)", () => {
  it("seeds the cooldown from Retry-After and returns true", () => {
    const { result } = renderHook(() => useThrottle());
    let handled: boolean | undefined;
    act(() => {
      handled = result.current.handle(throttled(42));
    });
    expect(handled).toBe(true);
    expect(result.current.cooldown).toBe(42);
  });

  it("falls back to 30s when Retry-After is absent", () => {
    const { result } = renderHook(() => useThrottle());
    act(() => {
      result.current.handle(throttled(undefined));
    });
    expect(result.current.cooldown).toBe(30);
  });

  it("returns false and does not start a cooldown for non-throttled errors", () => {
    const { result } = renderHook(() => useThrottle());
    let handled: boolean | undefined;
    act(() => {
      handled = result.current.handle(new ApiError(400, { detail: "bad" }));
    });
    expect(handled).toBe(false);
    expect(result.current.cooldown).toBe(0);

    act(() => {
      handled = result.current.handle(new Error("not an ApiError"));
    });
    expect(handled).toBe(false);
  });

  it("counts the cooldown down once per second", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useThrottle());
    act(() => {
      result.current.handle(throttled(3));
    });
    expect(result.current.cooldown).toBe(3);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.cooldown).toBe(2);
  });
});
