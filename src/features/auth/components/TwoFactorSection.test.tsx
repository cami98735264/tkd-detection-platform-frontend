import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  user: {
    id: 1, email: "a@b.com", full_name: "A B", is_staff: false,
    role: "sportsman", email_verified: true, pending_email: null, has_2fa: false,
  },
  setAuthenticated: vi.fn(),
  showToast: vi.fn(),
  handleError: vi.fn(),
  api: {
    status: vi.fn(),
    setup: vi.fn(),
    activate: vi.fn(),
    listTrustedDevices: vi.fn(),
    regenerateRecoveryCodes: vi.fn(),
    disable: vi.fn(),
    revokeTrustedDevice: vi.fn(),
    revokeAllTrustedDevices: vi.fn(),
  },
  me: vi.fn(),
}));

vi.mock("@/features/auth/store/authStore", () => ({
  useAuthStore: () => ({ user: h.user, setAuthenticated: h.setAuthenticated }),
}));
vi.mock("@/features/auth/api/twoFactorApi", () => ({ twoFactorApi: h.api }));
vi.mock("@/features/auth/api/authApi", () => ({ authApi: { me: h.me } }));
vi.mock("@/feedback/useApiErrorHandler", () => ({
  useApiErrorHandler: () => ({ handleError: h.handleError }),
}));
vi.mock("@/feedback/useFeedback", () => ({
  useFeedback: () => ({ showToast: h.showToast }),
}));

import TwoFactorSection from "./TwoFactorSection";

beforeEach(() => {
  vi.clearAllMocks();
  h.user = {
    id: 1, email: "a@b.com", full_name: "A B", is_staff: false,
    role: "sportsman", email_verified: true, pending_email: null, has_2fa: false,
  };
  h.api.status.mockResolvedValue({
    enabled: false, confirmed_at: null,
    recovery_codes_remaining: 0, trusted_devices_count: 0,
  });
  h.api.listTrustedDevices.mockResolvedValue([]);
  h.me.mockResolvedValue(h.user);
});

describe("TwoFactorSection — disabled state", () => {
  it("renders the enable affordance", async () => {
    render(<TwoFactorSection />);
    expect(await screen.findByText("Verificación en dos pasos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Activar" })).toBeTruthy();
  });
});

describe("TwoFactorSection — enable wizard shows recovery codes once", () => {
  it("walks scan → activate → recovery and reveals the codes", async () => {
    h.api.setup.mockResolvedValue({
      otpauth_uri: "otpauth://totp/TKD:a@b.com?secret=ABC&issuer=TKD",
      secret: "ABC123SECRET",
      issuer: "TKD",
    });
    h.api.activate.mockResolvedValue({
      recovery_codes: ["AAAA-1111", "BBBB-2222"],
      activated: true,
    });

    render(<TwoFactorSection />);
    fireEvent.click(await screen.findByRole("button", { name: "Activar" }));

    // Scan step shows the manual secret.
    expect(await screen.findByText("ABC123SECRET")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    // Activate step: enter the code.
    const input = await screen.findByLabelText("Código");
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));

    // Recovery step: codes shown once.
    expect(await screen.findByText("AAAA-1111")).toBeTruthy();
    expect(screen.getByText("BBBB-2222")).toBeTruthy();
    expect(h.api.activate).toHaveBeenCalledWith("123456");
    await waitFor(() => expect(h.me).toHaveBeenCalled());
  });
});

describe("TwoFactorSection — enabled state", () => {
  it("shows remaining recovery count and management actions", async () => {
    h.user.has_2fa = true;
    h.api.status.mockResolvedValue({
      enabled: true, confirmed_at: "2026-01-01T00:00:00Z",
      recovery_codes_remaining: 7, trusted_devices_count: 0,
    });
    render(<TwoFactorSection />);
    expect(await screen.findByText("7")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Regenerar códigos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeTruthy();
  });
});
