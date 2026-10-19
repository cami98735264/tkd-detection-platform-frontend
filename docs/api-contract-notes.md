# API contract notes (frontend ⇄ backend)

Assumptions the frontend is coded against for the PHVA audit fixes (October 2026).
They were agreed while the backend was being changed in parallel. The backend's
own description is `tkd-detection-platform-backend/docs/api/frontend-contract-changes-2026-10.md`
and `docs/api/reports-contract.md` (plus OpenAPI at `/api/schema/`); this file was
reconciled against them. If they diverge again, update this file **and** the code
paths listed in each section.

All paths are relative to `/api/v1/` and go through the same-origin edge proxy
(`src/edge/proxy.ts`), so the httpOnly auth cookies are first-party and are sent
automatically (`withCredentials: true` in `src/lib/http.ts`).

## 1. Authentication is cookie-only (audit R9)

- `POST auth/login/`, `POST auth/2fa/verify/` and `POST auth/refresh/` **no longer
  return `access` / `refresh` tokens in the JSON body** (login/verify answer
  `{ "user": { id, email, full_name } }`). Tokens live only in the httpOnly
  cookies the backend sets. `auth/login/` may answer `429` with `Retry-After`.
- The login body keeps only the 2FA fields: `two_factor_required`,
  `challenge_token`, `methods` (see `docs/2fa-contract.md` §5). On a successful
  login / verify / invitation acceptance the frontend calls `GET auth/me/` for the
  user.
- The companion, non-httpOnly cookie `access_token_expires_at` (epoch seconds) is
  still read for the proactive refresh. It carries no secret.
- Frontend status: verified that nothing reads tokens from a response body or
  stores them (`localStorage`/`sessionStorage` hold only the colour theme and the
  dev-only mock-logout flag). Code: `src/features/auth/api/authApi.ts`,
  `src/lib/http.ts`.

## 2. Attendance confirmation (audit R12)

- `POST attendances/{id}/confirm/` (empty body) is allowed for the **sportsman
  who owns the record** or a **parent linked to that athlete**. Anyone else gets
  `403` with a human-readable `detail` (or the standard error envelope).
- `200` returns the updated attendance record (status becomes `present`).
- If the backend adds explicit `confirmed: boolean` or `confirmed_at: string|null`
  fields, the UI uses them to decide whether to show the action; otherwise it
  shows it for records whose `status !== "present"`.
- Frontend: action rendered only for `sportsman`/`parent`; row patched in place on
  success; on `403` the action is hidden for that record and the reason shown.
  Code: `src/features/attendance/api/attendanceApi.ts`,
  `src/features/attendance/pages/AttendancePage.tsx`.

## 3. Reports (audit R13)

- `POST reports/generate/` `{ title, report_type, filters_applied? }` → `202` with
  the report (`status: "pending"`).
- `GET reports/` and `GET reports/{id}/` expose `status` ∈
  `pending | completed | failed` (the UI also understands `processing`). The
  report object drops `file_reference` and adds `file_format: "csv"` and
  `download_url` (`/api/v1/reports/{id}/download/` once completed, else `null`).
  The `report.updated` realtime event may carry a partial row.
- **New:** `GET reports/{id}/download/` (authenticated, admin) returns the
  generated **CSV** (`Content-Type: text/csv`, `Content-Disposition: attachment;
  filename="…"`). `409` while pending/failed, `410` after `expires_at` (30 days),
  `404` if the file is gone; the JSON error body is shown to the user. The
  client uses `download_url` and falls back to the fixed path.
- Frontend: `/dashboard/reportes` (admins) lists, generates, polls every 4 s while
  a visible report is pending/processing and the realtime socket is closed, and
  downloads via axios `responseType: "blob"` so the cookies are sent.
  Code: `src/features/reports/`, `src/lib/download.ts`.
- `GET dashboard/export/` returns **JSON** (summary data), not a PDF; the old
  `dashboard/export/pdf/` is a deprecated alias with the same JSON. The client
  (`dashboardApi.exportSummary()`) calls the new path and falls back to the alias
  on `404`, so it works before and after the backend deploy. The PDF is rendered in
  the browser with jsPDF (`/dashboard/reportes/estadisticas`).

## 4. Medical certificates (audit R3)

- Certificates are **no longer served publicly under `/media/`**.
- The enrollment payload exposes `has_certificado_medico` and an **authenticated
  download URL** `certificado_medico_url` = `/api/v1/enrollments/{id}/certificate/`
  (or `null`); `certificado_medico_adjunto` is no longer sent. The frontend also accepts
  `certificado_medico_download_url`, `medical_certificate_url` and
  `certificate_url` (first non-empty wins). Absolute URLs, root-relative paths
  (`/api/v1/...`) and API-relative paths are all supported.
- Transitional fallback: if only the legacy `certificado_medico_adjunto` storage
  path is present, the UI requests `/media/<path>` (still with cookies).
- Frontend: never an `<a href>`; the file is fetched as a Blob with the session
  cookies and saved. Code: `src/features/enrollments/lib/certificate.ts`,
  `src/features/enrollments/components/CertificateDownloadButton.tsx`.

## 5. Errors

- Standard envelope `{ success: false, data: null, error: { code, message,
  fields?, field_codes? } }` (legacy `{ detail }` tolerated). Blob endpoints may
  return it as a JSON Blob; the client decodes it.
- Offline/timeout, `5xx`, `403`, `429` and an expired session are shown once as a
  global toast (`src/lib/httpErrors.ts`); `400/404/409` are handled by the form.

## 6. Unchanged on purpose

- Kick video upload (`POST technical-evaluation/sessions/`) still sends the
  recording as a base64 data-URL in JSON (audit R24, cycle 2). The new backend
  also accepts a multipart `recording` file, but the backend currently in
  production stores an empty `recording_url` without error when the field is
  missing (creating a session that fails later), so a runtime fallback can't
  detect it. Switch to multipart only after the new backend is deployed.
