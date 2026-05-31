import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/env", () => ({ config: { mockAuth: false } }));
vi.mock("@/lib/http", () => ({
  http: { post: vi.fn(), get: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/features/auth/store/authStore", () => {
  const state = { setAuthenticated: vi.fn(), clearSession: vi.fn() };
  return { useAuthStore: { getState: () => state } };
});

import { twoFactorApi } from "@/features/auth/api/twoFactorApi";
import { authApi } from "@/features/auth/api/authApi";
import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";

const post = vi.mocked(http.post);
const get = vi.mocked(http.get);
const del = vi.mocked(http.delete);
const setAuthenticated = vi.mocked(useAuthStore.getState().setAuthenticated);

function envelope<T>(data: T) {
  return { success: true as const, data, error: null };
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  del.mockReset();
  setAuthenticated.mockReset();
});

describe("twoFactorApi envelope unwrapping (2fa-contract §4)", () => {
  it("setup unwraps {otpauth_uri, secret, issuer}", async () => {
    post.mockResolvedValue(
      envelope({ otpauth_uri: "otpauth://x", secret: "S", issuer: "TKD" }),
    );
    const res = await twoFactorApi.setup();
    expect(res).toEqual({ otpauth_uri: "otpauth://x", secret: "S", issuer: "TKD" });
    expect(post).toHaveBeenCalledWith("/auth/2fa/setup/");
  });

  it("activate posts {code} and unwraps recovery codes", async () => {
    post.mockResolvedValue(envelope({ recovery_codes: ["A", "B"], activated: true }));
    const res = await twoFactorApi.activate("123456");
    expect(res.recovery_codes).toEqual(["A", "B"]);
    expect(post).toHaveBeenCalledWith("/auth/2fa/activate/", { code: "123456" });
  });

  it("status unwraps the status payload", async () => {
    post.mockReset();
    get.mockResolvedValue(
      envelope({
        enabled: true, confirmed_at: "2026-01-01T00:00:00Z",
        recovery_codes_remaining: 9, trusted_devices_count: 2,
      }),
    );
    const res = await twoFactorApi.status();
    expect(res.enabled).toBe(true);
    expect(res.recovery_codes_remaining).toBe(9);
    expect(get).toHaveBeenCalledWith("/auth/2fa/status/");
  });

  it("regenerateRecoveryCodes returns the inner array", async () => {
    post.mockResolvedValue(envelope({ recovery_codes: ["X", "Y", "Z"] }));
    const res = await twoFactorApi.regenerateRecoveryCodes({ password: "p", code: "123456" });
    expect(res).toEqual(["X", "Y", "Z"]);
    expect(post).toHaveBeenCalledWith("/auth/2fa/recovery-codes/regenerate/", {
      password: "p", code: "123456",
    });
  });

  it("disable posts the re-auth payload (incl. sign_out_everywhere)", async () => {
    post.mockResolvedValue(envelope(null));
    await twoFactorApi.disable({ password: "p", code: "123456", sign_out_everywhere: true });
    expect(post).toHaveBeenCalledWith("/auth/2fa/disable/", {
      password: "p", code: "123456", sign_out_everywhere: true,
    });
  });

  it("revokeTrustedDevice DELETEs the device path", async () => {
    del.mockResolvedValue(envelope(null));
    await twoFactorApi.revokeTrustedDevice(7);
    expect(del).toHaveBeenCalledWith("/auth/2fa/trusted-devices/7/");
  });

  it("revokeAllTrustedDevices returns the revoked count", async () => {
    post.mockResolvedValue(envelope({ revoked: 3 }));
    const res = await twoFactorApi.revokeAllTrustedDevices();
    expect(res).toBe(3);
    expect(post).toHaveBeenCalledWith("/auth/2fa/trusted-devices/revoke-all/");
  });
});

describe("authApi.login 2FA branch (2fa-contract §5)", () => {
  it("returns 2fa_required without authenticating when challenge is present", async () => {
    post.mockResolvedValue({
      two_factor_required: true,
      challenge_token: "chal.jwt",
      methods: ["totp", "recovery"],
    });
    const result = await authApi.login({ email: "a@b.com", password: "x" });
    expect(result).toEqual({
      status: "2fa_required",
      challengeToken: "chal.jwt",
      methods: ["totp", "recovery"],
    });
    // No me()/setAuthenticated when a second factor is still required.
    expect(get).not.toHaveBeenCalled();
    expect(setAuthenticated).not.toHaveBeenCalled();
  });

  it("authenticates normally when no 2FA is required", async () => {
    const user = {
      id: 1, email: "a@b.com", full_name: "A B", is_staff: false,
      role: "sportsman" as const, email_verified: true, pending_email: null, has_2fa: false,
    };
    post.mockResolvedValue(undefined); // bare login body, no 2FA flag
    get.mockResolvedValue(user);
    const result = await authApi.login({ email: "a@b.com", password: "x" });
    expect(result).toEqual({ status: "authenticated" });
    expect(setAuthenticated).toHaveBeenCalledWith(user);
  });
});

describe("authApi.verifyTwoFactor (2fa-contract §4)", () => {
  it("posts the challenge + code, then me() + setAuthenticated", async () => {
    const user = {
      id: 1, email: "a@b.com", full_name: "A B", is_staff: false,
      role: "sportsman" as const, email_verified: true, pending_email: null, has_2fa: true,
    };
    post.mockResolvedValue(undefined); // bare verify body (cookies set server-side)
    get.mockResolvedValue(user);
    await authApi.verifyTwoFactor({ challengeToken: "chal.jwt", code: "123456", rememberDevice: true });
    expect(post).toHaveBeenCalledWith("/auth/2fa/verify/", {
      challenge_token: "chal.jwt", code: "123456", remember_device: true,
    });
    expect(get).toHaveBeenCalledWith("/auth/me/");
    expect(setAuthenticated).toHaveBeenCalledWith(user);
  });
});
