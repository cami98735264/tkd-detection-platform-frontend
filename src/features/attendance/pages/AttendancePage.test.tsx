import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AttendanceRecord } from "@/features/attendance/api/attendanceApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ApiError } from "@/types/api";
import type { AuthUser } from "@/types/entities";

const h = vi.hoisted(() => ({ list: vi.fn(), confirm: vi.fn() }));

vi.mock("@/features/attendance/api/attendanceApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/attendance/api/attendanceApi")>();
  return {
    ...actual,
    attendanceApi: { ...actual.attendanceApi, list: h.list, confirm: h.confirm },
  };
});
// The filters pull parent/athlete lists from other APIs; not under test here.
vi.mock("@/features/attendance/components/AttendanceFilters", () => ({ default: () => null }));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import AttendancePage from "./AttendancePage";

function record(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: 11,
    athlete_id: 5,
    athlete_name: "Ana Pérez",
    edition_id: 1,
    edition_name: "2026-II",
    program_name: "Infantil",
    fecha: "2026-10-10",
    hora: "17:00",
    status: "absent",
    observaciones: "",
    registered_by_name: "Admin",
    created_at: "2026-10-10T17:00:00Z",
    updated_at: "2026-10-10T17:00:00Z",
    ...overrides,
  };
}

function signInAs(role: AuthUser["role"]) {
  useAuthStore.setState({
    status: "ready",
    isAuthenticated: true,
    user: { id: 1, email: "u@x.co", full_name: "U", role } as AuthUser,
  });
}

function renderPage() {
  return render(
    <FeedbackProvider>
      <AttendancePage />
    </FeedbackProvider>,
  );
}

async function confirmRow() {
  const [button] = await screen.findAllByLabelText("Confirmar asistencia");
  fireEvent.click(button);
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
}

beforeEach(() => {
  h.list
    .mockReset()
    .mockResolvedValue({ count: 1, next: null, previous: null, results: [record()] });
  h.confirm.mockReset();
});

describe("AttendancePage — confirm attendance", () => {
  it("is not offered to administrators", async () => {
    signInAs("administrator");
    renderPage();
    expect((await screen.findAllByText("Ausente")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Confirmar asistencia")).not.toBeInTheDocument();
  });

  it("is not offered for records that are already present", async () => {
    signInAs("sportsman");
    h.list.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [record({ status: "present" })],
    });
    renderPage();
    expect((await screen.findAllByText("Presente")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Confirmar asistencia")).not.toBeInTheDocument();
  });

  it.each(["sportsman", "parent"] as const)(
    "lets a %s confirm and updates the row in place",
    async (role) => {
      signInAs(role);
      h.confirm.mockResolvedValue(record({ status: "present" }));
      renderPage();

      await confirmRow();

      await waitFor(() => expect(h.confirm).toHaveBeenCalledWith(11));
      expect((await screen.findAllByText("Presente")).length).toBeGreaterThan(0);
      expect(await screen.findByText("Asistencia confirmada")).toBeInTheDocument();
      expect(screen.queryByLabelText("Confirmar asistencia")).not.toBeInTheDocument();
      expect(h.list).toHaveBeenCalledTimes(1); // no full reload needed
    },
  );

  it("handles a 403 by explaining and hiding the action for that record", async () => {
    signInAs("parent");
    h.confirm.mockRejectedValue(
      new ApiError(403, { detail: "No estás vinculado con este atleta." }),
    );
    renderPage();

    await confirmRow();

    expect(await screen.findByText("No estás vinculado con este atleta.")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByLabelText("Confirmar asistencia")).not.toBeInTheDocument(),
    );
    expect(screen.getAllByText("Ausente").length).toBeGreaterThan(0);
  });
});
