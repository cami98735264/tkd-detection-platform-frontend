import { http } from "@/lib/http";
import { config } from "@/config/env";
import { type ApiEnvelope } from "@/types/api";

// ---------------------------------------------------------------------------
// Two-factor (TOTP) management API (2fa-contract §4). All endpoints use the
// `{success,data,error}` envelope, so methods unwrap `.data`. The challenge
// (`/auth/2fa/verify/`) lives in authApi because it establishes a session.
// Honors config.mockAuth with safe no-ops returning representative shapes.
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

const MOCK_STATUS: TwoFactorStatus = {
  enabled: false,
  confirmed_at: null,
  recovery_codes_remaining: 0,
  trusted_devices_count: 0,
};

const MOCK_CODES = [
  "MOCK-AAAA-1111", "MOCK-BBBB-2222", "MOCK-CCCC-3333", "MOCK-DDDD-4444",
  "MOCK-EEEE-5555", "MOCK-FFFF-6666", "MOCK-GGGG-7777", "MOCK-HHHH-8888",
  "MOCK-IIII-9999", "MOCK-JJJJ-0000",
];

export const twoFactorApi = {
  /** POST /auth/2fa/setup/ — start/refresh an unconfirmed device. */
  setup: async (): Promise<TwoFactorSetup> => {
    if (config.mockAuth) {
      return {
        otpauth_uri:
          "otpauth://totp/TKD:mock@warriors.com?secret=JBSWY3DPEHPK3PXP&issuer=TKD",
        secret: "JBSWY3DPEHPK3PXP",
        issuer: "Warriors TKD",
      };
    }
    const res = await http.post<ApiEnvelope<TwoFactorSetup>>("/auth/2fa/setup/");
    return unwrap(res);
  },

  /** POST /auth/2fa/activate/ — confirm the pending secret; returns codes once. */
  activate: async (code: string): Promise<TwoFactorActivateResult> => {
    if (config.mockAuth) return { recovery_codes: MOCK_CODES, activated: true };
    const res = await http.post<ApiEnvelope<TwoFactorActivateResult>>(
      "/auth/2fa/activate/",
      { code },
    );
    return unwrap(res);
  },

  /** GET /auth/2fa/status/ */
  status: async (): Promise<TwoFactorStatus> => {
    if (config.mockAuth) return MOCK_STATUS;
    const res = await http.get<ApiEnvelope<TwoFactorStatus>>("/auth/2fa/status/");
    return unwrap(res);
  },

  /** POST /auth/2fa/recovery-codes/regenerate/ — re-auth; returns a new set once. */
  regenerateRecoveryCodes: async (payload: ReAuthPayload): Promise<string[]> => {
    if (config.mockAuth) return MOCK_CODES;
    const res = await http.post<ApiEnvelope<{ recovery_codes: string[] }>>(
      "/auth/2fa/recovery-codes/regenerate/",
      payload,
    );
    return unwrap(res).recovery_codes;
  },

  /** POST /auth/2fa/disable/ — re-auth (+ optional sign-out-everywhere). */
  disable: async (payload: DisablePayload): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/auth/2fa/disable/", payload);
  },

  /** GET /auth/2fa/trusted-devices/ */
  listTrustedDevices: async (): Promise<TrustedDevice[]> => {
    if (config.mockAuth) return [];
    const res = await http.get<ApiEnvelope<TrustedDevice[]>>("/auth/2fa/trusted-devices/");
    return unwrap(res);
  },

  /** DELETE /auth/2fa/trusted-devices/<id>/ */
  revokeTrustedDevice: async (id: number): Promise<void> => {
    if (config.mockAuth) return;
    await http.delete<ApiEnvelope<null>>(`/auth/2fa/trusted-devices/${id}/`);
  },

  /** POST /auth/2fa/trusted-devices/revoke-all/ */
  revokeAllTrustedDevices: async (): Promise<number> => {
    if (config.mockAuth) return 0;
    const res = await http.post<ApiEnvelope<{ revoked: number }>>(
      "/auth/2fa/trusted-devices/revoke-all/",
    );
    return unwrap(res).revoked;
  },
};
