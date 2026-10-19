import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";
import { mockBackend } from "@/features/auth/mocks/mockBackend";
import { type ApiEnvelope } from "@/types/api";
import type { AuthUser } from "@/types/entities";
import type { RoleName } from "@/config/permissions";

// ---------------------------------------------------------------------------
// Payload & response types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
}

/** Bare login response body (non-enveloped, like the pre-existing auth endpoints). */
interface LoginResponseBody {
  two_factor_required?: boolean;
  challenge_token?: string;
  methods?: string[];
}

/**
 * Result of `authApi.login` (2fa-contract §5). On `authenticated` the store has
 * already been populated; on `2fa_required` the caller must run the challenge
 * step (no session was established, no cookies set).
 */
export type LoginResult =
  | { status: "authenticated" }
  | { status: "2fa_required"; challengeToken: string; methods: string[] };

export interface VerifyTwoFactorPayload {
  challengeToken: string;
  code: string;
  rememberDevice?: boolean;
}

// --- Email-flow payloads & responses (contract §4) -------------------------

export interface ConfirmPasswordResetPayload {
  uid: string;
  token: string;
  new_password: string;
}

export interface ConfirmTokenPayload {
  uid: string;
  token: string;
}

export interface RequestEmailChangePayload {
  new_email: string;
  current_password: string;
}

export interface InviteUserPayload {
  email: string;
  role: RoleName;
  full_name?: string;
}

export interface Invitation {
  id: number;
  email: string;
  role: RoleName;
  status: "pending";
}

export interface InvitationDetail {
  email: string;
  role: RoleName;
  full_name: string;
}

export interface AcceptInvitationProfile {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
  profile?: AcceptInvitationProfile;
}

/** Unwrap the standard success envelope to its `data` payload (contract §0). */
function unwrap<T>(envelope: ApiEnvelope<T>): T {
  return envelope.data;
}

// ---------------------------------------------------------------------------
// Auth API — Django sets/clears the httpOnly JWT cookie on each response.
// Development-only mock mode (MOCK_AUTH=true) swaps in ../mocks/mockBackend.ts;
// production builds replace that module with a stub, so no mock credentials or
// secrets are ever bundled.
// ---------------------------------------------------------------------------

const realAuthApi = {
  /**
   * POST /api/auth/login/
   * Django sets the httpOnly access + refresh cookies in the response.
   */
  login: async (payload: LoginPayload): Promise<LoginResult> => {
    // The login body is bare (non-enveloped). For a 2FA user without a trusted
    // device the backend returns `{ two_factor_required, challenge_token, methods }`
    // and sets NO cookies — surface that so the caller can run the challenge.
    const body = await http.post<LoginResponseBody>("/auth/login/", payload);
    if (body?.two_factor_required && body.challenge_token) {
      return {
        status: "2fa_required",
        challengeToken: body.challenge_token,
        methods: body.methods ?? ["totp", "recovery"],
      };
    }
    const user = await realAuthApi.me();
    useAuthStore.getState().setAuthenticated(user);
    return { status: "authenticated" };
  },

  /**
   * POST /api/auth/2fa/verify/ (2fa-contract §4). Establishes a session exactly
   * like login (backend sets cookies); we then fetch the canonical user via me().
   */
  verifyTwoFactor: async (payload: VerifyTwoFactorPayload): Promise<void> => {
    await http.post<void>("/auth/2fa/verify/", {
      challenge_token: payload.challengeToken,
      code: payload.code,
      remember_device: payload.rememberDevice ?? false,
    });
    const user = await realAuthApi.me();
    useAuthStore.getState().setAuthenticated(user);
  },

  /**
   * POST /api/auth/logout/
   * Django clears the cookies server-side.
   */
  logout: async (): Promise<void> => {
    await http.post<void>("/auth/logout/");
    useAuthStore.getState().clearSession();
  },

  /**
   * GET /api/auth/me/
   * Returns the currently authenticated user (validates the cookie server-side).
   */
  me: (): Promise<AuthUser> => {
    return http.get<AuthUser>("/auth/me/");
  },

  // --- Password reset (enumeration-safe request + token confirm) -----------

  /** POST /api/auth/password/reset/ — generic success (contract §1). */
  requestPasswordReset: async (payload: { email: string }): Promise<void> => {
    await http.post<ApiEnvelope<null>>("/auth/password/reset/", payload);
  },

  /** POST /api/auth/password/reset/confirm/ — 200 data:null. */
  confirmPasswordReset: async (payload: ConfirmPasswordResetPayload): Promise<void> => {
    await http.post<ApiEnvelope<null>>("/auth/password/reset/confirm/", payload);
  },

  /**
   * POST /api/auth/password/change/ (pre-existing; not in the email contract).
   */
  changePassword: (payload: { current_password: string; new_password: string }): Promise<void> => {
    return http.post<void>("/auth/password/change/", payload);
  },

  // --- Email verification --------------------------------------------------

  /** POST /api/auth/email/verify/send/ — generic success (contract §1). */
  sendVerificationEmail: async (payload: { email: string }): Promise<void> => {
    await http.post<ApiEnvelope<null>>("/auth/email/verify/send/", payload);
  },

  /** POST /api/auth/email/verify/confirm/ — 200 data:{ email_verified:true }. */
  confirmEmailVerification: async (
    payload: ConfirmTokenPayload,
  ): Promise<{ email_verified: true }> => {
    const res = await http.post<ApiEnvelope<{ email_verified: true }>>(
      "/auth/email/verify/confirm/",
      payload,
    );
    return unwrap(res);
  },

  // --- Email change (authenticated) ----------------------------------------

  /** POST /api/auth/email/change/request/ — 200 data:{ pending_email }. */
  requestEmailChange: async (
    payload: RequestEmailChangePayload,
  ): Promise<{ pending_email: string }> => {
    const res = await http.post<ApiEnvelope<{ pending_email: string }>>(
      "/auth/email/change/request/",
      payload,
    );
    return unwrap(res);
  },

  /** POST /api/auth/email/change/confirm/ — 200 data:{ email }. */
  confirmEmailChange: async (payload: ConfirmTokenPayload): Promise<{ email: string }> => {
    const res = await http.post<ApiEnvelope<{ email: string }>>(
      "/auth/email/change/confirm/",
      payload,
    );
    return unwrap(res);
  },

  /** POST /api/auth/email/change/cancel/ — 200 data:null. */
  cancelEmailChange: async (): Promise<void> => {
    await http.post<ApiEnvelope<null>>("/auth/email/change/cancel/");
  },

  // --- Invitations ---------------------------------------------------------

  /** POST /api/auth/invitations/ — admin; 201 data:{ id, email, role, status }. */
  inviteUser: async (payload: InviteUserPayload): Promise<Invitation> => {
    const res = await http.post<ApiEnvelope<Invitation>>("/auth/invitations/", payload);
    return unwrap(res);
  },

  /** GET /api/auth/invitations/<token>/ — 200 data:{ email, role, full_name }. */
  getInvitation: async (token: string): Promise<InvitationDetail> => {
    const res = await http.get<ApiEnvelope<InvitationDetail>>(
      `/auth/invitations/${encodeURIComponent(token)}/`,
    );
    return unwrap(res);
  },

  /**
   * POST /api/auth/invitations/accept/ — backend sets auth cookies, then we
   * fetch the canonical user via me() and route by role like login.
   */
  acceptInvitation: async (payload: AcceptInvitationPayload): Promise<AuthUser> => {
    await http.post<ApiEnvelope<{ user: AuthUser }>>("/auth/invitations/accept/", payload);
    const user = await realAuthApi.me();
    useAuthStore.getState().setAuthenticated(user);
    return user;
  },
};

export type AuthApi = typeof realAuthApi;

export const authApi: AuthApi = mockBackend?.authApi ?? realAuthApi;
