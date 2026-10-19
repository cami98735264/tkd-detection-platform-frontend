import { http } from "@/lib/http";
import { mockBackend } from "@/features/auth/mocks/mockBackend";
import { type ApiEnvelope } from "@/types/api";

// ---------------------------------------------------------------------------
// Two-factor (TOTP) management API (2fa-contract §4). All endpoints use the
// `{success,data,error}` envelope, so methods unwrap `.data`. The challenge
// (`/auth/2fa/verify/`) lives in authApi because it establishes a session.
// MOCK_AUTH dev builds swap in the fake from ../mocks/mockBackend.ts.
// ---------------------------------------------------------------------------

export interface TwoFactorSetup {
  otpauth_uri: string;
  secret: string;
  issuer: string;
}

export interface TwoFactorActivateResult {
  recovery_codes: string[];
  activated: true;
}

export interface TwoFactorStatus {
  enabled: boolean;
  confirmed_at: string | null;
  recovery_codes_remaining: number;
  trusted_devices_count: number;
}

export interface TrustedDevice {
  id: number;
  device_label: string;
  ip: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface ReAuthPayload {
  password: string;
  code: string;
}

export interface DisablePayload extends ReAuthPayload {
  sign_out_everywhere?: boolean;
}

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  return envelope.data;
}

const realTwoFactorApi = {
  /** POST /auth/2fa/setup/ — start/refresh an unconfirmed device. */
  setup: async (): Promise<TwoFactorSetup> => {
    const res = await http.post<ApiEnvelope<TwoFactorSetup>>("/auth/2fa/setup/");
    return unwrap(res);
  },

  /** POST /auth/2fa/activate/ — confirm the pending secret; returns codes once. */
  activate: async (code: string): Promise<TwoFactorActivateResult> => {
    const res = await http.post<ApiEnvelope<TwoFactorActivateResult>>("/auth/2fa/activate/", {
      code,
    });
    return unwrap(res);
  },

  /** GET /auth/2fa/status/ */
  status: async (): Promise<TwoFactorStatus> => {
    const res = await http.get<ApiEnvelope<TwoFactorStatus>>("/auth/2fa/status/");
    return unwrap(res);
  },

  /** POST /auth/2fa/recovery-codes/regenerate/ — re-auth; returns a new set once. */
  regenerateRecoveryCodes: async (payload: ReAuthPayload): Promise<string[]> => {
    const res = await http.post<ApiEnvelope<{ recovery_codes: string[] }>>(
      "/auth/2fa/recovery-codes/regenerate/",
      payload,
    );
    return unwrap(res).recovery_codes;
  },

  /** POST /auth/2fa/disable/ — re-auth (+ optional sign-out-everywhere). */
  disable: async (payload: DisablePayload): Promise<void> => {
    await http.post<ApiEnvelope<null>>("/auth/2fa/disable/", payload);
  },

  /** GET /auth/2fa/trusted-devices/ */
  listTrustedDevices: async (): Promise<TrustedDevice[]> => {
    const res = await http.get<ApiEnvelope<TrustedDevice[]>>("/auth/2fa/trusted-devices/");
    return unwrap(res);
  },

  /** DELETE /auth/2fa/trusted-devices/<id>/ */
  revokeTrustedDevice: async (id: number): Promise<void> => {
    await http.delete<ApiEnvelope<null>>(`/auth/2fa/trusted-devices/${id}/`);
  },

  /** POST /auth/2fa/trusted-devices/revoke-all/ */
  revokeAllTrustedDevices: async (): Promise<number> => {
    const res = await http.post<ApiEnvelope<{ revoked: number }>>(
      "/auth/2fa/trusted-devices/revoke-all/",
    );
    return unwrap(res).revoked;
  },
};

export type TwoFactorApi = typeof realTwoFactorApi;

export const twoFactorApi: TwoFactorApi = mockBackend?.twoFactorApi ?? realTwoFactorApi;
