# Email Infrastructure Contract — tkd-backend ↔ tkd-frontend

STATUS: DRAFT (backend finalizes this file during its run; frontend treats the
post-backend version as the single source of truth).

This contract is the sync boundary between the two codebases. Backend is built
first and MUST keep this file accurate — if the implementation deviates from any
clause below, update THIS FILE in the same change and note it under "Deviations".
Frontend MUST NOT invent endpoints, query params, routes, or error codes; it
consumes only what is written here. Any ambiguity the frontend hits is a contract
bug — fix it here, not by guessing.

Canonical location (committed to the BACKEND repo): docs/email-contract.md
The frontend repo keeps a verbatim copy at docs/email-contract.md kept in sync.

---

## 0. Conventions (already established in the codebase — do not change)

- Auth: JWT in httpOnly cookies. Browser sends cookies automatically
  (frontend axios `withCredentials: true`). No bearer tokens in JS.
- Base URL: `${API_BASE_URL}/${API_PREFIX}/` → default `http://localhost:8000/api/v1/`.
- Response envelope (success): `{ "success": true, "data": <payload|null>, "error": null }`
- Response envelope (error):
  `{ "success": false, "data": null,
     "error": { "code": <string>, "message": <string>,
                "fields": { <field>: [<msg>...] },
                "field_codes": { <field>: [<code>...] } } }`
- Error `code` values in use: `validation_error` (400), `unauthorized` (401),
  `forbidden` (403), `not_found` (404), `throttled` (429), `server_error` (5xx).
- All user-facing copy is Spanish.
- Links inside emails are built from backend `FRONTEND_URL`. Frontend route paths
  below MUST match exactly so those links resolve.

## 1. Enumeration safety (CRITICAL — both sides)

For "request" style endpoints (password reset request, verification send/resend,
email-change request when the target may not exist), the backend ALWAYS returns
the SAME generic 200 success regardless of whether the account/email exists.
Frontend MUST show a generic "if an account exists, we've sent an email" message
and never branch UI on account existence.

## 2. Rate limiting (both sides)

Email-triggering endpoints are throttled per-IP and per-account. On limit the
backend returns 429 with `error.code = "throttled"` and, when known, a
`Retry-After` header (seconds). Frontend MUST surface "Inténtalo de nuevo en N
segundos", disable the trigger, and respect `Retry-After` if present.

## 3. Tokens (backend-owned, opaque to frontend)

Tokens are opaque strings the frontend only forwards. They arrive via email links
to the frontend routes in §5 as query params and are POSTed back verbatim.
Token-rejection responses use 400 `validation_error` with a stable
`error.field_codes.token` value the frontend switches on:
  - `token_invalid`   → malformed / unknown
  - `token_expired`   → valid but past TTL
  - `token_revoked`   → already used, or superseded by a newer token of the same purpose
Frontend renders distinct states for invalid, expired, and revoked (used/superseded).

TTLs (informational; backend authoritative): reset 60m, email_verify 24h,
email_change 24h, invitation 7d.

## 4. REST endpoints

All paths are relative to the API base (`/api/v1/`). All bodies/responses use the
envelope in §0. "Auth" = requires authenticated cookie session.

### Password reset
- `POST auth/password/reset/`            Auth: no   Body: { email }
  → 200 generic success (§1). Sends reset email if account exists.
- `POST auth/password/reset/confirm/`    Auth: no   Body: { uid, token, new_password }
  → 200 { data: null } on success (also revokes user's sessions; sends
    "password changed" email). 400 token_* on bad token; 400 validation_error
    with `fields.new_password` on weak password.

### Email verification
- `POST auth/email/verify/send/`         Auth: no   Body: { email }
  → 200 generic success (§1).
- `POST auth/email/verify/confirm/`      Auth: no   Body: { uid, token }
  → 200 { data: { email_verified: true } }. 400 token_* on bad token.

### Email change (authenticated)
- `POST auth/email/change/request/`      Auth: yes  Body: { new_email, current_password }
  → 200 { data: { pending_email: <new_email> } }. Sends confirm link to new
    address + notice to old address. 400 validation_error if email in use /
    wrong password (field-scoped).
- `POST auth/email/change/confirm/`      Auth: no   Body: { uid, token }
  → 200 { data: { email: <new_email> } }. 400 token_*.
- `POST auth/email/change/cancel/`       Auth: yes  Body: {}
  → 200 { data: null }. Clears any pending change.

### Invitations
- `POST auth/invitations/`               Auth: yes (admin) Body: { email, role, full_name? }
  → 201 { data: { id, email, role, status: "pending" } }. Sends invitation email.
    409/validation_error if email already an active account.
- `GET  auth/invitations/<token>/`       Auth: no
  → 200 { data: { email, role, full_name } } to prefill the accept screen;
    400 token_* if invalid/expired.
- `POST auth/invitations/accept/`        Auth: no
  Body: { token, password, profile?: { nombres?, apellidos?, telefono? ... } }
  → 200 sets password, activates + verifies account, and ESTABLISHES A SESSION by
    setting auth cookies (same as login). data: { user: { id, email, full_name,
    is_staff, role } }. Frontend then calls `auth/me/` as usual.

### Support / contact
- `POST support/contact/`                Auth: optional  Body:
  { subject, message, email?, honeypot? }   (email required only if unauthenticated;
  honeypot must be empty — non-empty silently 200s with no send)
  → 200 { data: null }. Throttled per §2.

## 5. Frontend routes (must match the links the backend emits)

- `/reset-password?uid=<uid>&token=<token>`        (GuestRoute)
- `/verify-email?uid=<uid>&token=<token>`          (auth-agnostic)
- `/confirm-email-change?uid=<uid>&token=<token>`  (auth-agnostic)
- `/accept-invitation?token=<token>`               (GuestRoute)

Profile page gains: email-change section (pending state + cancel) and an
"email not verified" banner with a resend control.
Help page gains: support contact form.
Admin users area gains: "Invite user" action.

The backend builds these URLs from `FRONTEND_URL`; query param NAMES above are
binding. If backend changes a param name or route, update §5 here.

## 6. In-app security notifications (reuse existing realtime bell)

Backend emits durable notifications via the existing `notify_user()` path and the
`notification.created` WebSocket event (see docs/realtime-contract.md). NEW
notification `type` values the frontend must map (toast + link):
  - `security.password_changed`
  - `security.email_changed`
  - `security.new_device_login`
  - `security.account_locked`
Two-factor (TOTP) bell types — defined in `docs/2fa-contract.md` §6, same transport
and same `/dashboard/profile` link:
  - `security.2fa_enabled`
  - `security.2fa_disabled`
  - `security.2fa_recovery_used`
  - `security.2fa_recovery_regenerated`
  - `security.new_2fa_device`
Resource/link mapping: these point to `/dashboard/profile` (security section).
Email is sent for the same events independently (except `security.new_2fa_device`,
which is bell-only); the bell is additive, never a substitute. No new WS envelope
shape — reuse `{type, resource, id, data, ts}`.

NOTE (2FA login deviation): `auth/login/` keeps its bare body but, for a user with
active 2FA and no trusted device, returns `{ two_factor_required: true,
challenge_token, methods }` at HTTP 200 with NO auth cookies. See
`docs/2fa-contract.md` §5.

## 7. Deviations log (backend appends here during its run)

The backend was implemented end-to-end against §0–§6. All paths, query param
names (`uid`/`token`), frontend routes (§5), token `field_codes`, and §6
notification types match the implementation verbatim. The notes below clarify
behaviours the frontend should be aware of:

1. **Success envelope is exact for the email endpoints.** Every endpoint in §4
   returns `{ "success": true, "data": <payload|null>, "error": null }` built
   explicitly — `data` is genuinely `null` where §4 says so (no coercion, and no
   extra `meta` key). NOTE: the pre-existing auth endpoints (`auth/login`,
   `auth/me`, `auth/profile`) still return their original *bare* bodies (not
   enveloped); that is unchanged and out of scope for this work. The frontend
   already handles login specially. All NEW email endpoints use the envelope.

2. **Email verification is not a login gate.** Existing users were grandfathered
   `email_verified = true` by a data migration. New signups/invitations start
   unverified. The backend never blocks login or API calls on verification — it
   is surfaced only as the profile banner + resend control described in §5.

3. **Account lockout is a soft, auto-unlocking window.** After 5 consecutive
   failed logins the account is locked for 15 minutes (both env-tunable:
   `ACCOUNT_LOCK_THRESHOLD`, `ACCOUNT_LOCK_WINDOW_MINUTES`). During the window,
   `auth/login` returns the SAME generic `401 unauthorized` "credenciales
   inválidas" as a wrong password (enumeration-safe — it is NOT a `429`). The
   `security.account_locked` email + bell (§6) are emitted once when the lock is
   applied. A successful login after the window clears the counter.

4. **New-device detection** fires on `auth/login` when an (IP, User-Agent) pair
   has not been seen for the user (90-day memory). It emits the
   `security.new_device_login` email + bell (§6). It never blocks login. First
   login from a given browser counts as a new device.

5. **Email-change emails (3 total).** On `request`: confirm link to the NEW
   address + an informational notice to the OLD address. On `confirm`: a
   `security.email_changed` alert to the OLD address + the `security.email_changed`
   bell (§6). Email is only updated after confirmation; confirming revokes all
   JWT sessions (token_version bump), same as password reset.

6. **Invitation accept profile keys.** The optional `profile` object accepts
   `{ nombres?, apellidos?, telefono? }` (matching the UserProfile model). Unknown
   keys are ignored.

7. **Session revocation mechanism.** Password-reset-confirm and
   email-change-confirm bump a server-side `token_version` embedded in JWTs as the
   `tv` claim, invalidating ALL outstanding access/refresh tokens and live
   WebSocket sessions at next auth. No frontend action needed beyond handling the
   resulting `401` (re-login).

8. **Additive transactional emails (not in §4, no frontend surface).** The backend
   also sends, enqueue-only: report-ready, technical-evaluation-ready, and
   enrollment-confirmation emails, reusing existing completion paths. These have
   no endpoints and require nothing from the frontend.

9. **`auth/me` now exposes verification + pending-change state (additive).** The
   `auth/me` body remains a *bare* (non-enveloped) object as in note 1, but two
   read-only fields were added so the Profile page can render the verification
   banner and the pending email-change state on load:
     - `email_verified: boolean` — the user's `email_verified` flag.
     - `pending_email: string | null` — the new address of an outstanding
       email-change request (an unused/unrevoked/unexpired `email_change` token),
       or `null` when none is pending.
   No other `auth/me` field changed; `auth/login` and `auth/profile` are unchanged.
