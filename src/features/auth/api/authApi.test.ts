import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/env", () => ({ config: { mockAuth: false } }));
vi.mock("@/lib/http", () => ({
  http: { post: vi.fn(), get: vi.fn() },
}));

import { authApi } from "@/features/auth/api/authApi";
import { http } from "@/lib/http";

const post = vi.mocked(http.post);
const get = vi.mocked(http.get);

function envelope<T>(data: T) {
  return { success: true as const, data, error: null };
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
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
});
