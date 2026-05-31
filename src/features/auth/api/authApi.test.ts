import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/env", () => ({ config: { mockAuth: false } }));
vi.mock("@/lib/http", () => ({
  http: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("@/features/auth/store/authStore", () => {
  const state = { setAuthenticated: vi.fn(), clearSession: vi.fn() };
  return { useAuthStore: { getState: () => state } };
});

import { authApi } from "@/features/auth/api/authApi";
import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";

const post = vi.mocked(http.post);
const get = vi.mocked(http.get);
const setAuthenticated = vi.mocked(useAuthStore.getState().setAuthenticated);
const clearSession = vi.mocked(useAuthStore.getState().clearSession);

function envelope<T>(data: T) {
  return { success: true as const, data, error: null };
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  setAuthenticated.mockReset();
  clearSession.mockReset();
});

describe("authApi envelope unwrapping (contract §0/§7 note 1)", () => {
  it("confirmEmailChange returns the inner data payload", async () => {
    post.mockResolvedValue(envelope({ email: "new@example.com" }));
    const res = await authApi.confirmEmailChange({ uid: "u", token: "t" });
    expect(res).toEqual({ email: "new@example.com" });
    expect(post).toHaveBeenCalledWith("/auth/email/change/confirm/", {
      uid: "u",
      token: "t",
    });
  });

  it("requestEmailChange unwraps pending_email", async () => {
    post.mockResolvedValue(envelope({ pending_email: "new@example.com" }));
    const res = await authApi.requestEmailChange({
      new_email: "new@example.com",
      current_password: "secret",
    });
    expect(res).toEqual({ pending_email: "new@example.com" });
  });

  it("confirmPasswordReset resolves void for data:null", async () => {
    post.mockResolvedValue(envelope(null));
    await expect(
      authApi.confirmPasswordReset({ uid: "u", token: "t", new_password: "Aa1!aaaa" }),
    ).resolves.toBeUndefined();
  });

  it("getInvitation unwraps the invitation detail", async () => {
    get.mockResolvedValue(envelope({ email: "i@x.com", role: "sportsman", full_name: "" }));
    const res = await authApi.getInvitation("tok en/slash");
    expect(res).toEqual({ email: "i@x.com", role: "sportsman", full_name: "" });
    // token must be URL-encoded into the path
    expect(get).toHaveBeenCalledWith("/auth/invitations/tok%20en%2Fslash/");
  });

  it("inviteUser posts to the invitations endpoint and unwraps", async () => {
    post.mockResolvedValue(
      envelope({ id: 7, email: "i@x.com", role: "parent", status: "pending" }),
    );
    const res = await authApi.inviteUser({ email: "i@x.com", role: "parent" });
    expect(res.status).toBe("pending");
    expect(post).toHaveBeenCalledWith("/auth/invitations/", {
      email: "i@x.com",
      role: "parent",
      full_name: undefined,
    });
  });

  it("confirmEmailVerification unwraps {email_verified:true}", async () => {
    post.mockResolvedValue(envelope({ email_verified: true }));
    const res = await authApi.confirmEmailVerification({ uid: "u", token: "t" });
    expect(res).toEqual({ email_verified: true });
    expect(post).toHaveBeenCalledWith("/auth/email/verify/confirm/", { uid: "u", token: "t" });
  });
});

describe("authApi request endpoints (contract §1/§4 — generic, data:null)", () => {
  it("requestPasswordReset posts {email} and resolves void", async () => {
    post.mockResolvedValue(envelope(null));
    await expect(authApi.requestPasswordReset({ email: "a@b.com" })).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/auth/password/reset/", { email: "a@b.com" });
  });

  it("sendVerificationEmail posts {email} and resolves void", async () => {
    post.mockResolvedValue(envelope(null));
    await expect(authApi.sendVerificationEmail({ email: "a@b.com" })).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/auth/email/verify/send/", { email: "a@b.com" });
  });

  it("cancelEmailChange posts to the cancel endpoint and resolves void", async () => {
    post.mockResolvedValue(envelope(null));
    await expect(authApi.cancelEmailChange()).resolves.toBeUndefined();
    expect(post).toHaveBeenCalledWith("/auth/email/change/cancel/");
  });
});

describe("authApi bare auth endpoints stay non-enveloped (contract §0/§7 note 1)", () => {
  it("login posts raw creds, then me() + setAuthenticated (no unwrap)", async () => {
    const user = {
      id: 9, email: "a@b.com", full_name: "A B", is_staff: false,
      role: "sportsman" as const, email_verified: true, pending_email: null,
    };
    post.mockResolvedValue(undefined); // bare /auth/login/ response
    get.mockResolvedValue(user); // bare /auth/me/ response (NOT an envelope)

    await authApi.login({ email: "a@b.com", password: "secret" });

    expect(post).toHaveBeenCalledWith("/auth/login/", { email: "a@b.com", password: "secret" });
    expect(get).toHaveBeenCalledWith("/auth/me/");
    expect(setAuthenticated).toHaveBeenCalledWith(user);
  });

  it("me returns the bare user object verbatim", async () => {
    const user = {
      id: 1, email: "x@y.com", full_name: "X Y", is_staff: true,
      role: "administrator" as const, email_verified: false, pending_email: "new@y.com",
    };
    get.mockResolvedValue(user);
    await expect(authApi.me()).resolves.toEqual(user);
    expect(get).toHaveBeenCalledWith("/auth/me/");
  });

  it("logout posts then clears the session", async () => {
    post.mockResolvedValue(undefined);
    await authApi.logout();
    expect(post).toHaveBeenCalledWith("/auth/logout/");
    expect(clearSession).toHaveBeenCalledTimes(1);
  });
});

describe("authApi.acceptInvitation flow (contract §4)", () => {
  it("POSTs accept, then me(), then setAuthenticated, and returns the user", async () => {
    const user = {
      id: 5, email: "invitee@x.com", full_name: "Invitee", is_staff: false,
      role: "sportsman" as const, email_verified: true, pending_email: null,
    };
    post.mockResolvedValue(envelope({ user })); // accept envelope
    get.mockResolvedValue(user); // subsequent me()

    const res = await authApi.acceptInvitation({
      token: "tok",
      password: "Aa1!aaaa",
      profile: { nombres: "Inv", apellidos: "Itee", telefono: "300" },
    });

    expect(post).toHaveBeenCalledWith("/auth/invitations/accept/", {
      token: "tok",
      password: "Aa1!aaaa",
      profile: { nombres: "Inv", apellidos: "Itee", telefono: "300" },
    });
    expect(get).toHaveBeenCalledWith("/auth/me/");
    expect(setAuthenticated).toHaveBeenCalledWith(user);
    expect(res).toEqual(user);
  });
});
