import { http } from "@/lib/http";
import { useAuthStore } from "@/features/auth/store/authStore";
import { config } from "@/config/env";
import { ApiError, type ApiEnvelope } from "@/types/api";
import type { AuthUser } from "@/types/entities";
import type { RoleName } from "@/config/permissions";

const MOCK_CREDENTIALS = { email: "admin@warriors.com", password: "123456" };

// ---------------------------------------------------------------------------
// Payload & response types
// ---------------------------------------------------------------------------

export interface LoginPayload {
  email: string;
  password: string;
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

const MOCK_USER: AuthUser = {
  id: 1,
  email: "admin@warriors.com",
  full_name: "Admin Mock",
  is_staff: true,
  role: "administrator",
  email_verified: true,
  pending_email: null,
};

// sessionStorage key used to simulate cookie invalidation after mock logout.
// sessionStorage is per-tab and cleared when the tab/browser closes,
// closely mimicking a real session cookie being revoked by the server.
const MOCK_LOGGED_OUT_KEY = "mock_logged_out";

// ---------------------------------------------------------------------------
// Auth API — Django sets/clears the httpOnly JWT cookie on each response.
// When config.mockAuth is true all calls are short-circuited locally.
// ---------------------------------------------------------------------------

export const authApi = {
  /**
   * POST /api/auth/login/
   * Django sets the httpOnly access + refresh cookies in the response.
   */
  login: async (payload: LoginPayload): Promise<void> => {
    if (config.mockAuth) {
      if (
        payload.email !== MOCK_CREDENTIALS.email ||
        payload.password !== MOCK_CREDENTIALS.password
      ) {
        throw new ApiError(401, {
          detail: "No se encontró una cuenta activa con esas credenciales.",
        });
      }
      sessionStorage.removeItem(MOCK_LOGGED_OUT_KEY);
      useAuthStore.getState().setAuthenticated(MOCK_USER);
      return;
    }
    await http.post<void>("/auth/login/", payload);
    const user = await authApi.me();
    useAuthStore.getState().setAuthenticated(user);
  },

  /**
   * POST /api/auth/logout/
   * Django clears the cookies server-side.
   */
  logout: async (): Promise<void> => {
    if (config.mockAuth) {
      sessionStorage.setItem(MOCK_LOGGED_OUT_KEY, "1");
      useAuthStore.getState().clearSession();
      return;
    }
    await http.post<void>("/auth/logout/");
    useAuthStore.getState().clearSession();
  },

  /**
   * GET /api/auth/me/
   * Returns the currently authenticated user (validates the cookie server-side).
   * In mock mode, rejects if the user explicitly logged out this session.
   */
  me: (): Promise<AuthUser> => {
    if (config.mockAuth) {
      if (sessionStorage.getItem(MOCK_LOGGED_OUT_KEY)) {
        return Promise.reject(new Error("mock: logged out"));
      }
      return Promise.resolve(MOCK_USER);
    }
    return http.get<AuthUser>("/auth/me/");
  },

  // --- Password reset (enumeration-safe request + token confirm) -----------

  /** POST /api/auth/password/reset/ — generic success (contract §1). */
  requestPasswordReset: async (payload: { email: string }): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/auth/password/reset/", payload);
  },

  /** POST /api/auth/password/reset/confirm/ — 200 data:null. */
  confirmPasswordReset: async (payload: ConfirmPasswordResetPayload): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/auth/password/reset/confirm/", payload);
  },

  /**
   * POST /api/auth/password/change/ (pre-existing; not in the email contract).
   */
  changePassword: (payload: { current_password: string; new_password: string }): Promise<void> => {
    if (config.mockAuth) return Promise.resolve();
    return http.post<void>("/auth/password/change/", payload);
  },

  // --- Email verification --------------------------------------------------

  /** POST /api/auth/email/verify/send/ — generic success (contract §1). */
  sendVerificationEmail: async (payload: { email: string }): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/auth/email/verify/send/", payload);
  },

  /** POST /api/auth/email/verify/confirm/ — 200 data:{ email_verified:true }. */
  confirmEmailVerification: async (
    payload: ConfirmTokenPayload,
  ): Promise<{ email_verified: true }> => {
    if (config.mockAuth) return { email_verified: true };
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
    if (config.mockAuth) return { pending_email: payload.new_email };
    const res = await http.post<ApiEnvelope<{ pending_email: string }>>(
      "/auth/email/change/request/",
      payload,
    );
    return unwrap(res);
  },

  /** POST /api/auth/email/change/confirm/ — 200 data:{ email }. */
  confirmEmailChange: async (payload: ConfirmTokenPayload): Promise<{ email: string }> => {
    if (config.mockAuth) return { email: MOCK_USER.email };
    const res = await http.post<ApiEnvelope<{ email: string }>>(
      "/auth/email/change/confirm/",
      payload,
    );
    return unwrap(res);
  },

  /** POST /api/auth/email/change/cancel/ — 200 data:null. */
  cancelEmailChange: async (): Promise<void> => {
    if (config.mockAuth) return;
    await http.post<ApiEnvelope<null>>("/auth/email/change/cancel/");
  },

  // --- Invitations ---------------------------------------------------------

  /** POST /api/auth/invitations/ — admin; 201 data:{ id, email, role, status }. */
  inviteUser: async (payload: InviteUserPayload): Promise<Invitation> => {
    if (config.mockAuth) {
      return { id: 1, email: payload.email, role: payload.role, status: "pending" };
    }
    const res = await http.post<ApiEnvelope<Invitation>>("/auth/invitations/", payload);
    return unwrap(res);
  },

  /** GET /api/auth/invitations/<token>/ — 200 data:{ email, role, full_name }. */
  getInvitation: async (token: string): Promise<InvitationDetail> => {
    if (config.mockAuth) {
      return { email: "invitee@warriors.com", role: "sportsman", full_name: "" };
    }
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
    if (config.mockAuth) {
      sessionStorage.removeItem(MOCK_LOGGED_OUT_KEY);
      useAuthStore.getState().setAuthenticated(MOCK_USER);
      return MOCK_USER;
    }
    await http.post<ApiEnvelope<{ user: AuthUser }>>("/auth/invitations/accept/", payload);
    const user = await authApi.me();
    useAuthStore.getState().setAuthenticated(user);
    return user;
  },
};
