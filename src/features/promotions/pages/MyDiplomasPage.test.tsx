import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/features/auth/store/authStore";
import type { AuthUser } from "@/types/entities";

const h = vi.hoisted(() => ({
  listPromotions: vi.fn(),
  myPermissions: vi.fn(),
  belts: vi.fn(),
  downloadFile: vi.fn(),
}));

vi.mock("../api/promotionsApi", () => ({
  promotionsApi: {
    listPromotions: h.listPromotions,
    myPermissions: h.myPermissions,
    belts: h.belts,
    diplomaUrl: (p: { id: number; diploma_url: string | null }) =>
      p.diploma_url ?? `/api/v1/belt-promotions/${p.id}/diploma/`,
    scanUrl: (p: { id: number }) => `/api/v1/belt-promotions/${p.id}/file/`,
  },
}));
vi.mock("@/lib/download", () => ({ downloadFile: h.downloadFile }));

import { FeedbackProvider } from "@/feedback/FeedbackProvider";

import MyDiplomasPage from "./MyDiplomasPage";

const base = {
  athlete: 3,
  athlete_name: "Ana",
  from_belt: 1,
  from_belt_name: "Blanco",
  to_belt: 2,
  promotion_date: "2026-10-01",
  exam: null,
  has_file: false,
  file_url: null,
  can_edit: false,
  notes: "",
};

beforeEach(() => {
  useAuthStore.setState({
    status: "ready",
    isAuthenticated: true,
    user: { id: 1, email: "a@x.co", full_name: "Ana", role: "sportsman" } as AuthUser,
  });
  h.belts.mockResolvedValue([]);
  h.downloadFile.mockReset().mockResolvedValue(undefined);
  h.listPromotions.mockResolvedValue({
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        ...base,
        id: 1,
        to_belt_name: "Amarillo",
        diploma_number: "DIP-2026-0001",
        diploma_authorized: true,
        can_download_diploma: true,
        diploma_url: "/api/v1/belt-promotions/1/diploma/",
      },
      {
        ...base,
        id: 2,
        to_belt_name: "Verde",
        diploma_number: "DIP-2026-0002",
        diploma_authorized: false,
        can_download_diploma: false,
        diploma_url: null,
      },
    ],
  });
});

function renderPage() {
  return render(
    <FeedbackProvider>
      <MyDiplomasPage />
    </FeedbackProvider>,
  );
}

describe("MyDiplomasPage", () => {
  it("offers the download only for authorized diplomas", async () => {
    h.myPermissions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Amarillo")).toBeInTheDocument();
    expect(screen.getByText("Pendiente de autorización")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: /Descargar diploma/ });
    expect(buttons).toHaveLength(1);
    expect(screen.getByText(/requiere autorización del maestro/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Registrar diploma/ })).not.toBeInTheDocument();

    fireEvent.click(buttons[0]);
    expect(h.downloadFile).toHaveBeenCalledWith(
      "/api/v1/belt-promotions/1/diploma/",
      "DIP-2026-0001.pdf",
    );
  });

  it("shows the register action to users holding can_register", async () => {
    h.myPermissions.mockResolvedValue([
      { athlete: 3, athlete_name: "Ana", can_register: true, can_download_generated: false },
    ]);
    renderPage();
    expect(await screen.findByRole("button", { name: /Registrar diploma/ })).toBeInTheDocument();
  });
});
