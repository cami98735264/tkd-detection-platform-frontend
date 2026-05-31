# Two-Factor Authentication (TOTP) Contract — tkd-backend ↔ tkd-frontend

STATUS: ACTIVE (backend finalizes this file during its run; frontend treats the
post-backend version as the single source of truth).

This contract is the sync boundary between the two codebases for TOTP 2FA. Backend
is built first and MUST keep this file accurate — if the implementation deviates
from any clause below, update THIS FILE in the same change and note it under
"Deviations". Frontend MUST NOT invent endpoints, query params, routes, or error
codes; it consumes only what is written here.

Canonical location (committed to the BACKEND repo): `docs/2fa-contract.md`
The frontend repo keeps a verbatim copy at `docs/2fa-contract.md`.

Related contracts: `docs/email-contract.md` (envelope, throttling, security bells)
and `docs/realtime-contract.md` (the `notification.created` bell transport). The
new `security.2fa_*` bell types are added to both contracts' §6.

---

## 0. Conventions (inherited — do not change)

- Auth: JWT in httpOnly cookies (`access_token` 15m, `refresh_token` 30d), browser
  sends them automatically (`withCredentials: true`). A non-httpOnly companion
  `access_token_expires_at` exposes only the expiry epoch for proactive refresh.
- Base URL: `${API_BASE_URL}/${API_PREFIX}/` → default `http://localhost:8000/api/v1/`.
- Success envelope: `{ "success": true, "data": <payload|null>, "error": null }`.
- Error envelope: `{ "success": false, "data": null, "error": { "code", "message",
  "fields"?, "field_codes"? } }`.
- Error `code` values: `validation_error` (400), `unauthorized` (401),
  `forbidden` (403), `not_found` (404), `throttled` (429), `server_error` (5xx).
- All user-facing copy is Spanish.
- **All `auth/2fa/*` endpoints use the envelope above** (built via the same `ok()`/
  `err()` helpers as the email endpoints). The ONLY exception is the login deviation
  in §5, which keeps the pre-existing *bare* (non-enveloped) login body.

## 1. Model (opt-in, additive, default OFF)

2FA is per-user and opt-in. No existing user is forced or locked out. Enabling
requires confirming a TOTP code; the account is "2FA-active" only once confirmed.
A user has exactly one TOTP device. Secrets are encrypted at rest (Fernet) and are
NEVER returned after activation, never logged, never placed in email context.

`auth/me/` gains one additive read-only boolean field: **`has_2fa`** (true when the
user has a confirmed TOTP device). All other `auth/me/` fields are unchanged; the
body remains *bare* (non-enveloped), consistent with the email contract's note 9.

## 2. Throttling & brute force (both sides)

- Every `auth/2fa/*` endpoint is rate limited per-IP and (where a user is known)
  per-account, identical mechanism to the email endpoints. On limit: 429,
  `error.code = "throttled"`, `Retry-After` header (seconds). Frontend MUST surface
  "Inténtalo de nuevo en N segundos" and respect `Retry-After`.
- The challenge endpoint (`auth/2fa/verify/`) ALSO enforces a **DB-backed** attempt
  cap (independent of the fail-open cache throttle): after
  `TWOFACTOR_VERIFY_MAX_ATTEMPTS` (default 5) failed attempts within
  `TWOFACTOR_VERIFY_WINDOW_MINUTES` (default 15) the user is locked for the rest of
  the window — further verify calls return 429 `throttled` even if Redis is down.

## 3. Error codes (frontend switches on these)

Field-scoped codes on `error.field_codes`:
  - `code = ["invalid_code"]` — wrong/expired/replayed TOTP code OR wrong recovery
    code, on `activate`, `verify`, `disable`, `recovery-codes/regenerate`. The
    message is GENERIC and identical whether the failure was TOTP or recovery, and
    never reveals "almost"/remaining attempts (enumeration-safe second factor).
  - `password = ["invalid"]` — wrong current password on `disable` /
    `recovery-codes/regenerate`.
Top-level `error.code`:
  - `409` `validation_error` — `setup` called while 2FA is already active.
  - `401` `unauthorized` — challenge token missing/expired/tampered/tv-mismatch on
    `verify` (frontend restarts the login flow).

## 4. REST endpoints

All paths relative to `/api/v1/`. "Auth" = requires authenticated cookie session.

### Enrollment & management (Auth: yes)
- `POST auth/2fa/setup/`            Body: {}
  → 200 `{ data: { otpauth_uri, secret, issuer } }`. Creates/refreshes an
    UNCONFIRMED device and returns the `otpauth://` URI (for the QR) + the base32
    `secret` (for manual entry) + `issuer`. Calling again before activation
    overwrites the pending secret. 409 `validation_error` if 2FA is already active.
- `POST auth/2fa/activate/`        Body: { code }
  → 200 `{ data: { recovery_codes: [string], activated: true } }`. Verifies the
    pending TOTP secret, marks the device confirmed, and returns the recovery codes
    ONCE (never retrievable again). Emits `security.2fa_enabled` email + bell.
    400 `field_codes.code = ["invalid_code"]` on a bad code.
- `GET  auth/2fa/status/`
  → 200 `{ data: { enabled: bool, confirmed_at: string|null,
    recovery_codes_remaining: int, trusted_devices_count: int } }`.
- `POST auth/2fa/recovery-codes/regenerate/`  Body: { password, code }
  → 200 `{ data: { recovery_codes: [string] } }`. Re-auth (password AND a valid
    TOTP-or-recovery code) required. Invalidates all prior codes, returns a fresh
    set ONCE. Emits `security.2fa_recovery_regenerated` email + bell.
    400 `field_codes.password = ["invalid"]` / `field_codes.code = ["invalid_code"]`.
- `POST auth/2fa/disable/`         Body: { password, code, sign_out_everywhere? }
  → 200 `{ data: null }`. Requires password AND a valid TOTP-or-recovery `code`.
    Deletes the device, recovery codes, and trusted devices. When
    `sign_out_everywhere` is true (default false), also bumps `token_version`
    (revokes all other sessions). Emits `security.2fa_disabled` email + bell.
    400 field-scoped codes as above.
- `GET    auth/2fa/trusted-devices/`
  → 200 `{ data: [ { id, device_label, ip, last_used_at, created_at, expires_at } ] }`
    (only active — non-revoked, non-expired — devices).
- `DELETE auth/2fa/trusted-devices/<id>/`
  → 200 `{ data: null }`. Revokes one trusted device. 404 if not owned/known.
- `POST   auth/2fa/trusted-devices/revoke-all/`
  → 200 `{ data: { revoked: int } }`.

### Challenge (Auth: no — AllowAny)
- `POST auth/2fa/verify/`          Body: { challenge_token, code, remember_device? }
  → 200 on success: ESTABLISHES A SESSION by setting auth cookies (same as login),
    returns the bare body `{ access, refresh, user: { id, email, full_name } }`
    (matching `auth/login/`'s shape — NOT the envelope). The frontend then calls
    `auth/me/` as usual. `code` may be a 6-digit TOTP code or a recovery code
    (single-use). When `remember_device` is true, a 30-day httpOnly `trusted_device`
    cookie is set and a `TrustedDevice` row created so the next login from this
    browser skips the challenge. A recovery-code login emits `security.2fa_recovery_used`.
    A new-device login (the 2FA-deferred check) emits `security.new_device_login`.
  → 400 `field_codes.code = ["invalid_code"]` on a bad/expired/replayed code (generic).
  → 401 `unauthorized` if the challenge token is missing/expired/tampered/tv-mismatch.
  → 429 `throttled` once the DB attempt cap (§2) is hit.

## 5. Login integration & the `two_factor_required` deviation

`POST auth/login/` is UNCHANGED for users without active 2FA: it returns the bare
body `{ access, refresh, user }` and sets cookies exactly as today (zero regression).

For users WITH active 2FA, two sub-cases:
- **Trusted device present** (valid `trusted_device` cookie matching a live row):
  login proceeds normally — bare `{ access, refresh, user }` + cookies, no challenge.
- **Otherwise**: login does NOT set auth cookies and instead returns, at HTTP 200,
  the bare body:
  ```json
  { "two_factor_required": true,
    "challenge_token": "<short-lived JWT>",
    "methods": ["totp", "recovery"] }
  ```
  The frontend branches on `two_factor_required` and presents the challenge step,
  POSTing `challenge_token` + `code` to `auth/2fa/verify/` (§4).

The `challenge_token` is a short-lived (default 5 min) signed JWT carrying
`purpose: "2fa_challenge"`. It CANNOT authenticate any normal endpoint or
`auth/refresh/` (both reject any token bearing a `purpose` claim), and it is killed
by a `token_version` bump. The frontend keeps it in memory only (never persisted).

The new-device email/bell for 2FA users fires on verify-success, not at login.

## 6. In-app security notifications (reuse existing realtime bell)

Backend emits durable notifications via the existing `notify_user()` path and the
`notification.created` WebSocket event. NEW notification `type` values the frontend
must map (toast + link), all deep-linking to `/dashboard/profile`:
  - `security.2fa_enabled`
  - `security.2fa_disabled`
  - `security.2fa_recovery_used`
  - `security.2fa_recovery_regenerated`
  - `security.new_2fa_device`     (a trusted device was added via remember-device)
Email is sent for the enable/disable/recovery-used/recovery-regenerated events
independently; the bell is additive. No new WS envelope shape — reuse
`{ type, resource, id, data, ts }`. (`security.new_device_login` is unchanged and
still emitted on first login from a new browser, including the 2FA verify path.)

## 7. Frontend routes / surfaces

- Login page (`/login`): adds the in-place challenge step (no new route). 6-digit
  TOTP entry + "usar código de recuperación" toggle + "recordar este dispositivo
  30 días" checkbox.
- Profile Security section (`/dashboard/profile`): adds the 2FA panel — enable
  wizard (QR + manual secret → activate → recovery codes shown once), and, when
  enabled, status + remaining recovery count + regenerate (re-auth) + disable
  (re-auth, with optional sign-out-everywhere) + trusted-device list & revoke.

## 8. Security invariants (binding on backend)

Secret encrypted at rest (Fernet/MultiFernet), never returned post-activation,
never logged, never in `EmailLog.context_json`. Recovery codes hashed (sha256 +
pepper), shown once, atomic single-use, exact-remaining not leaked on failure.
Challenge token short-lived, single-purpose, tv-bound, rejected by the cookie auth,
`auth/refresh/`, and the WS middleware. Enumeration-safe generic errors (never
reveal TOTP-vs-recovery or "almost"). TOTP replay guard (monotonic step counter) +
±1 step (30s) skew only. Brute force: DB attempt counter + lockout + per-IP
throttle. Trusted-device cookie httpOnly+Secure+SameSite (from SIMPLE_JWT),
opaque + hashed at rest. Disable/regenerate require fresh re-auth (password + 2nd
factor). Every event audited with ip/user-agent/method in `TwoFactorAuditLog`.

## 9. Deviations log (backend appends here during its run)

The backend was implemented end-to-end against §0–§8. Notes:

1. **Envelope vs. bare bodies.** All `auth/2fa/*` endpoints use the `{success,data,
   error}` envelope EXCEPT `auth/2fa/verify/`, which on success returns the *bare*
   login body `{access,refresh,user}` because it establishes a session exactly like
   `auth/login/`. `auth/login/` itself keeps its bare body and gains only the
   `two_factor_required` branch (§5).
2. **`auth/me.has_2fa`** is the only `auth/me/` change — additive, read-only.
3. **Challenge token rejection** is enforced in three places: the DRF
   `CookieJWTAuthentication`, `auth/refresh/` (via `refresh_access_token`), and the
   Channels WS middleware — all reject any JWT carrying a `purpose` claim.
4. **Recovery codes** are shown exactly once (on `activate` and on `regenerate`).
   There is no endpoint to re-list them. `status` exposes only the remaining count.
5. **Trusted devices** are bound to an opaque random token stored only as a hash;
   the cookie holds the raw token. Revoking a row (or `token_version` bump via
   sign-out-everywhere) forces the challenge again on the next login.
