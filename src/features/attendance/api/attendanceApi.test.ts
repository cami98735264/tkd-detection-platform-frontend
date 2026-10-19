import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/http", () => ({ http: { post: h.post, get: vi.fn() } }));

import { attendanceApi, needsConfirmation, type AttendanceRecord } from "./attendanceApi";

const base = { status: "absent" } as AttendanceRecord;

describe("attendance confirmation", () => {
  it("POSTs to /attendances/{id}/confirm/", async () => {
    await attendanceApi.confirm(3);
    expect(h.post).toHaveBeenCalledWith("/attendances/3/confirm/", {});
  });

  it("prefers explicit confirmation fields, else 'present' means done", () => {
    expect(needsConfirmation({ ...base })).toBe(true);
    expect(needsConfirmation({ ...base, status: "present" })).toBe(false);
    expect(needsConfirmation({ ...base, status: "present", confirmed: false })).toBe(true);
    expect(needsConfirmation({ ...base, confirmed: true })).toBe(false);
    expect(needsConfirmation({ ...base, confirmed_at: null })).toBe(true);
    expect(needsConfirmation({ ...base, confirmed_at: "2026-10-10T18:00:00Z" })).toBe(false);
  });
});
