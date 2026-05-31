import { describe, it, expect } from "vitest";
import { ApiError, tokenRejectionState } from "@/types/api";

function tokenError(code: string): ApiError {
  return new ApiError(400, {
    success: false,
    data: null,
    error: {
      code: "validation_error",
      message: "Token rejected",
      field_codes: { token: [code] },
    },
  });
}

describe("ApiError throttling (contract §2)", () => {
  it("flags a 429 as throttled", () => {
    const err = new ApiError(429, { detail: "slow down" }, 42);
    expect(err.isThrottled).toBe(true);
    expect(err.retryAfter).toBe(42);
  });

  it("flags error.code === 'throttled' as throttled", () => {
    const err = new ApiError(400, {
      success: false,
      data: null,
      error: { code: "throttled", message: "Too many" },
    });
    expect(err.isThrottled).toBe(true);
    expect(err.code).toBe("throttled");
  });

  it("defaults retryAfter to null when absent or invalid", () => {
    expect(new ApiError(400, { detail: "x" }).retryAfter).toBeNull();
    expect(new ApiError(400, { detail: "x" }, NaN).retryAfter).toBeNull();
  });
});

describe("tokenRejectionState (contract §3)", () => {
  it("maps each stable token field_code", () => {
    expect(tokenRejectionState(tokenError("token_invalid"))).toBe("invalid");
    expect(tokenRejectionState(tokenError("token_expired"))).toBe("expired");
    expect(tokenRejectionState(tokenError("token_revoked"))).toBe("revoked");
  });

  it("returns null for unknown codes and non-token errors", () => {
    expect(tokenRejectionState(tokenError("something_else"))).toBeNull();
    expect(tokenRejectionState(new ApiError(400, { detail: "nope" }))).toBeNull();
  });

  it("returns null for non-ApiError values", () => {
    expect(tokenRejectionState(new Error("boom"))).toBeNull();
    expect(tokenRejectionState(null)).toBeNull();
  });
});

describe("ApiError.hasFieldCode", () => {
  it("detects field-scoped codes used by the email flows", () => {
    const err = new ApiError(409, {
      success: false,
      data: null,
      error: {
        code: "validation_error",
        message: "in use",
        field_codes: { email: ["email_in_use"] },
      },
    });
    expect(err.hasFieldCode("email", "email_in_use")).toBe(true);
    expect(err.hasFieldCode("email", "other")).toBe(false);
  });

  it("detects email-change field codes (current_password:invalid, new_email:email_in_use)", () => {
    const wrongPw = new ApiError(400, {
      success: false,
      data: null,
      error: {
        code: "validation_error",
        message: "La contraseña actual es incorrecta.",
        field_codes: { current_password: ["invalid"] },
      },
    });
    expect(wrongPw.hasFieldCode("current_password", "invalid")).toBe(true);

    const inUse = new ApiError(400, {
      success: false,
      data: null,
      error: {
        code: "validation_error",
        message: "Ese correo ya está en uso.",
        field_codes: { new_email: ["email_in_use"] },
      },
    });
    expect(inUse.hasFieldCode("new_email", "email_in_use")).toBe(true);
    expect(inUse.hasFieldCode("new_email", "invalid")).toBe(false);
  });

  it("is false when there are no field codes at all", () => {
    expect(new ApiError(500, { detail: "boom" }).hasFieldCode("email", "email_in_use")).toBe(false);
  });
});
