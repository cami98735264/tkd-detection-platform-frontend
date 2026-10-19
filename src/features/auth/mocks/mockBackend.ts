// DEVELOPMENT-ONLY fake backend for the auth / 2FA APIs (MOCK_AUTH=true), so the
// UI can be exercised without the Django API.
//
// Production safety: scripts/build-lib.mjs replaces this module with
// ./mockBackend.disabled.ts whenever MOCK_AUTH is not "true" (the default), so
// none of the fake credentials, users or TOTP secrets below are bundled.
// `npm run build` additionally fails if they ever appear in the output.
import { config } from "@/config/env";
import type { AuthApi } from "@/features/auth/api/authApi";
import type { TwoFactorApi, TwoFactorStatus } from "@/features/auth/api/twoFactorApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ApiError } from "@/types/api";
import type { AuthUser } from "@/types/entities";

export interface MockBackend {
  authApi: AuthApi;
  twoFactorApi: TwoFactorApi;
}

const MOCK_CREDENTIALS = { email: "admin@warriors.com", password: "123456" };

const MOCK_USER: AuthUser = {
  id: 1,
  email: "admin@warriors.com",
  full_name: "Admin Mock",
  is_staff: true,
  role: "administrator",
  email_verified: true,
  pending_email: null,
  has_2fa: false,
};

// sessionStorage key used to simulate cookie invalidation after mock logout
// (per-tab, cleared with the tab, like a revoked session cookie).
const MOCK_LOGGED_OUT_KEY = "mock_logged_out";

const MOCK_STATUS: TwoFactorStatus = {
  enabled: false,
  confirmed_at: null,
  recovery_codes_remaining: 0,
  trusted_devices_count: 0,
};

const MOCK_CODES = Array.from({ length: 10 }, (_, i) => {
  const letter = String.fromCharCode(65 + i).repeat(4);
  const digit = String((i + 1) % 10).repeat(4);
  return `MOCK-${letter}-${digit}`;
});

const MOCK_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

function signIn(): AuthUser {
  sessionStorage.removeItem(MOCK_LOGGED_OUT_KEY);
  useAuthStore.getState().setAuthenticated(MOCK_USER);
  return MOCK_USER;
}

const mockAuthApi: AuthApi = {
  login: async (payload) => {
    if (
      payload.email !== MOCK_CREDENTIALS.email ||
      payload.password !== MOCK_CREDENTIALS.password
    ) {
      throw new ApiError(401, {
        detail: "No se encontró una cuenta activa con esas credenciales.",
      });
    }
    signIn();
    return { status: "authenticated" };
  },
  verifyTwoFactor: async () => {
    signIn();
  },
  logout: async () => {
    sessionStorage.setItem(MOCK_LOGGED_OUT_KEY, "1");
    useAuthStore.getState().clearSession();
  },
  me: () =>
    sessionStorage.getItem(MOCK_LOGGED_OUT_KEY)
      ? Promise.reject(new Error("mock: logged out"))
      : Promise.resolve(MOCK_USER),
  requestPasswordReset: async () => {},
  confirmPasswordReset: async () => {},
  changePassword: () => Promise.resolve(),
  sendVerificationEmail: async () => {},
  confirmEmailVerification: async () => ({ email_verified: true }),
  requestEmailChange: async (payload) => ({ pending_email: payload.new_email }),
  confirmEmailChange: async () => ({ email: MOCK_USER.email }),
  cancelEmailChange: async () => {},
  inviteUser: async (payload) => ({
    id: 1,
    email: payload.email,
    role: payload.role,
    status: "pending",
  }),
  getInvitation: async () => ({ email: "invitee@warriors.com", role: "sportsman", full_name: "" }),
  acceptInvitation: async () => signIn(),
};

const mockTwoFactorApi: TwoFactorApi = {
  setup: async () => ({
    otpauth_uri: `otpauth://totp/TKD:mock@warriors.com?secret=${MOCK_TOTP_SECRET}&issuer=TKD`,
    secret: MOCK_TOTP_SECRET,
    issuer: "Warriors TKD",
  }),
  activate: async () => ({ recovery_codes: MOCK_CODES, activated: true }),
  status: async () => MOCK_STATUS,
  regenerateRecoveryCodes: async () => MOCK_CODES,
  disable: async () => {},
  listTrustedDevices: async () => [],
  revokeTrustedDevice: async () => {},
  revokeAllTrustedDevices: async () => 0,
};

export const mockBackend: MockBackend | null = config.mockAuth
  ? { authApi: mockAuthApi, twoFactorApi: mockTwoFactorApi }
  : null;
