# API contract — "Listado 1 de requerimientos" (Nov 2026)

Shared contract between the backend (Django/DRF) and the frontend (React SPA)
for the 8 requirements of the club's first improvement list. Backend and
frontend were implemented in parallel against THIS document: if an
implementation has to deviate, update this file in the same commit.

Conventions (same as the rest of the API):

* Base path `/api/v1/`. Auth = existing JWT cookie session.
* Plain DRF responses (no `success` envelope). Lists are paginated
  `{count, next, previous, results}` (`?page=`, `?page_size=` ≤ 100) unless
  marked *(unpaginated)*.
* Errors use the existing exception handler (400 with field errors, 403, 404).
* Roles: `administrator` (= the club's *maestro*), `sportsman`, `parent`.
  Athlete visibility = `apps.common.scoping.accessible_athletes(user)`:
  admin → all, sportsman → own record, parent → linked children. Objects
  outside the scope answer **404**.
* Uploaded files: validated with `apps.programs.certificates.validate_certificate`
  rules (PDF/JPG/PNG, magic bytes, ≤ 5 MB) and stored in PRIVATE storage
  (`apps.common.storage`); downloaded ONLY through authenticated endpoints
  (frontend uses `src/lib/download.ts` → `downloadFile(url, filename)`).
* Generated PDFs: `apps.common.pdf.render_institutional_pdf` (club logo,
  green/yellow bands, verification code). Responses are
  `application/pdf` with `Content-Disposition: attachment`.
* Dates `YYYY-MM-DD`, datetimes ISO-8601.

---

## Req 1 — Visual identity (frontend only)

Brand colours: **green** (primary) and **yellow** (accent), from the flag of
El Espinal. Suggested tokens: primary green `#0B7A3B` (≈ `oklch(0.52 0.13 150)`),
hover `#075A2B`, accent yellow `#F5C400` (≈ `oklch(0.84 0.17 90)`), yellow
foreground = dark ink. Applies to light AND dark themes, focus ring, charts,
login page, PDFs rendered client-side (dashboard export).

---

## Req 3 — Athlete categories (age/sport classification, no weight)

`Athlete.category` becomes a choice field (nullable):

| value | label | suggested age (years, on Dec 31 of current year) |
|---|---|---|
| `preinfantil` | Preinfantiles | ≤ 7 |
| `infantil` | Infantiles | 8 – 11 |
| `cadete` | Cadetes | 12 – 14 |
| `juvenil` | Juveniles | 15 – 17 |
| `mayores` | Mayores (sénior) | ≥ 18 |

* Athlete serializer (`/athletes/`, `/athletes/register/`, `/athlete/me/`)
  exposes `category` (value) and read-only `category_display` (label) and
  `suggested_category` (from `date_of_birth`, may be null).
* Each athlete has exactly ONE category. The club decides; the age table is a
  suggestion (frontend pre-selects `suggested_category` when empty).
* `GET /api/v1/athlete-categories/` *(unpaginated)* →
  `[{"value": "preinfantil", "label": "Preinfantiles", "min_age": null, "max_age": 7}, ...]`.
* Athlete list filter: `GET /athletes/?category=cadete`.
* `/athletes/register/` accepts optional `category`; `""` is stored as null.
  A legacy `categoria_competencia` sent by an old client is ignored (no error),
  both on register and on `PATCH /athletes/{id}/`.
* The **weight-based competition category** (`categoria_competencia`) is
  removed from the athlete registration/edit FORM. The DB column/API field
  stays (read-only legacy) so nothing breaks; `/competition-categories/` admin
  CRUD remains untouched.
* Data migration maps legacy free-text `category` values (case/accent
  insensitive: "pre-infantil", "infantil(es)", "cadete(s)", "juvenil(es)",
  "mayor(es)", "senior/sénior") and sets everything else to null.

---

## Req 4 + 5 — Athlete documents (medical certificate, sports insurance, liability waiver)

App `apps.athlete_documents`. Model `AthleteDocument`:

```
id, athlete(FK), doc_type, title, file(private storage name), original_filename,
content_type, size, status, review_notes, reviewed_by(FK User, null), reviewed_at,
uploaded_by(FK User), insurer, policy_number, valid_from, valid_until,
created_at, updated_at
```

`doc_type` values:

| value | label |
|---|---|
| `medical_certificate` | Certificado médico |
| `sports_insurance` | Seguro deportivo (afiliación / comprobante) |
| `liability_waiver` | Carta de exoneración de responsabilidad (firmada) |
| `other` | Otro documento |

`status`: `pending` (default) · `approved` · `rejected`. Only admins review.
Insurance-only optional fields: `insurer`, `policy_number`, `valid_from`, `valid_until`.

Permissions:
* List/download: admin; the athlete's own sportsman account; linked parents.
* Upload: admin, the athlete himself, linked parent/guardian.
* Delete: admin always; uploader only while `status == "pending"`.
* Review (approve/reject): admin only.

Endpoints:

* `GET  /api/v1/athletes/{athlete_id}/documents/` *(unpaginated)* →
  list of documents (newest first) + legacy enrollment medical certificates
  (`source: "enrollment"`, `id` = `"enrollment-<enrollment_id>"`, read-only,
  `download_url` = existing `/api/v1/enrollments/{id}/certificate/`).
  Optional `?doc_type=`.
* `POST /api/v1/athletes/{athlete_id}/documents/` multipart:
  `doc_type` (req), `file` (req), `title`, `insurer`, `policy_number`,
  `valid_from`, `valid_until` → 201 document.
* `GET  /api/v1/athlete-documents/{id}/` → document.
* `GET  /api/v1/athlete-documents/{id}/download/` → file stream.
* `DELETE /api/v1/athlete-documents/{id}/` → 204.
* `POST /api/v1/athlete-documents/{id}/review/` (admin)
  `{"status": "approved"|"rejected", "review_notes": "..."}` → document.
* `GET  /api/v1/athletes/{athlete_id}/documents/checklist/` →
  `{"athlete": id, "items": [{"doc_type": "medical_certificate", "label": "...",
  "required": true, "status": "missing"|"pending"|"approved"|"rejected",
  "document_id": 12|null}, ...], "complete": bool}`
  Required: medical_certificate, sports_insurance, liability_waiver.
  A doc_type counts with its most recent non-rejected document (enrollment
  medical certificates count as `approved` medical_certificate).
  *Implemented (be-docs):* precedence is approved > pending > rejected (a newer
  pending upload does not hide an approved one; `rejected` only when every
  document of that type was rejected). Each item also carries
  `"source": "document"|"enrollment"|null` and `"download_url"` (null when
  missing); `document_id` is null when the item is satisfied by an enrollment
  certificate. `complete` = every required item is `approved`.
  Python hook: `apps.athlete_documents.services.documents_checklist(athlete)`
  returns exactly this body.
* `GET  /api/v1/athlete-documents/waiver-template/` → PDF of the club's blank
  liability-waiver letter (to print, sign and upload). Any authenticated user.
  Optional `?athlete_id=` pre-fills athlete + guardian names.
  An `athlete_id` outside the caller's scope → 404.
* Upload notes: `insurer`/`policy_number`/`valid_from`/`valid_until` are
  ignored (stored empty) unless `doc_type == "sports_insurance"`;
  `valid_until < valid_from` → 400. Empty `title` defaults to the doc_type
  label. `doc_type_display` is the full label from the table above.
  Delete by a non-admin who is not the uploader, or after review → 403.

Document JSON:
```json
{"id": 12, "athlete": 3, "athlete_name": "Ana Gómez", "doc_type": "sports_insurance",
 "doc_type_display": "Seguro deportivo", "title": "Póliza 2026", "original_filename": "poliza.pdf",
 "content_type": "application/pdf", "size": 120334, "status": "pending", "status_display": "Pendiente",
 "review_notes": "", "reviewed_by_name": null, "reviewed_at": null,
 "uploaded_by": 7, "uploaded_by_name": "Luis Gómez", "insurer": "SURA", "policy_number": "123",
 "valid_from": "2026-01-01", "valid_until": "2026-12-31", "source": "document",
 "download_url": "/api/v1/athlete-documents/12/download/", "can_delete": true,
 "created_at": "...", "updated_at": "..."}
```

---

## Req 2 — Enrollment certificates (constancias de inscripción)

Model `IssuedDocument` (in `apps.athlete_documents`) records every generated
PDF: `id, kind ("enrollment_certificate"|"athlete_resume"), athlete, enrollment (null),
code (unique, e.g. "CI-2026-000123" / "HV-2026-000045"), issued_by, issued_at`.

* `GET /api/v1/athletes/{athlete_id}/certificates/` *(unpaginated)* → the
  athlete's enrollments that can be certified (status `active` or `completed`):
  `[{"enrollment_id": 5, "program_name": "...", "start_date": "...", "end_date": null,
  "status": "active", "download_url": "/api/v1/enrollments/5/enrollment-certificate/",
  "last_issued_at": "..."|null, "last_code": "CI-..."|null}]`
* `GET /api/v1/enrollments/{enrollment_id}/enrollment-certificate/` → PDF
  "Constancia de inscripción" (athlete name, document, birth date, category,
  belt, program, start date, status, guardian if minor, issue date, code,
  signature block). Scoped by athlete visibility (admin/self/parents).
  Dropped enrollments → 400.
* `GET /api/v1/issued-documents/?athlete_id=&kind=` → history (admin: all,
  others: own scope). Paginated; items `{id, kind, kind_display, athlete,
  athlete_name, enrollment, code, issued_by, issued_by_name, issued_at}`.
* `GET /api/v1/issued-documents/verify/{code}/` (any authenticated user) →
  `{"valid": true, "kind": "...", "athlete_name": "...", "issued_at": "..."}` or 404
  (also returns `code` and `kind_display`; lookup is case-insensitive).

## Req 5 — Athlete CV (hoja de vida deportiva)

* `GET /api/v1/athletes/{athlete_id}/resume/` → PDF from the club template:
  personal data, category, current belt, guardians/emergency contacts,
  enrollments, belt promotions (from `apps.promotions` if any), evaluations
  summary, technical-evaluation stats, gamification level/badges (if present),
  documents checklist. Issued as `IssuedDocument(kind="athlete_resume")`.
  Same visibility as the athlete.

---

## Req 6 + 6.1 — Belt promotions, examinations and diplomas

App `apps.promotions`.

### Examination (refactor of the evaluation flow)

Model `PromotionExam`:
```
id, athlete, from_belt(FK Belt, null), to_belt(FK Belt), exam_date, examiner(FK User),
technical_scores (JSON list [{"criterion": "Poomsae", "score": 0-100, "weight": 1.0, "notes": ""}]),
technical_score (computed weighted avg 0-100), passing_score (default 70),
admin_checks (JSON {"documents_complete": bool, "attendance_ok": bool, "fees_ok": bool, "min_time_in_belt_ok": bool}),
result ("pending"|"approved"|"rejected"), notes, evaluation(FK evaluations.Evaluation, null),
created_at, updated_at
```
Default technical criteria (returned by `/promotion-exams/criteria/`):
Poomsae, Técnica de patadas, Técnica de manos / defensas, Kyorugi (combate),
Teoría y terminología, Actitud y disciplina — all weight 1.0.

* `GET /api/v1/promotion-exams/criteria/` → `{"criteria": [...], "passing_score": 70,
  "admin_checks": [{"key": "documents_complete", "label": "..."}, ...]}`
* `GET/POST /api/v1/promotion-exams/` (admin write; read scoped). Filters
  `?athlete_id=&result=`. On create, `from_belt` defaults to athlete's current
  belt; `admin_checks.documents_complete` and `attendance_ok` are PRE-COMPUTED
  by the server (documents checklist complete; attendance ≥ 75 % in the last
  90 days, true when no attendance data) but the maestro may override.
* `GET/PATCH/DELETE /api/v1/promotion-exams/{id}/` (admin write).
* `POST /api/v1/promotion-exams/{id}/finalize/` (admin) → computes
  `technical_score`; `result = approved` iff score ≥ passing_score AND all
  admin checks true; else `rejected`. When approved it creates (or returns) the
  `BeltPromotion` for that exam, updates `Athlete.belt_actual = to_belt` and
  returns `{"exam": {...}, "promotion": {...}|null}`.
* Exams also create a classic `Evaluation` row (result_summary + metrics) so
  the existing evaluations pages keep showing them.

### Promotions & diplomas

Model `BeltPromotion`:
```
id, athlete, from_belt(null), to_belt, promotion_date, exam(FK PromotionExam, null),
diploma_number (unique, auto "DIP-2026-0001"), diploma_authorized (bool),
authorized_by(FK User, null), authorized_at, diploma_file (private storage name, uploaded scan, optional),
diploma_original_filename, registered_by(FK User), notes, created_at, updated_at
```

Model `DiplomaPermission` (maestro grants a sportsman or parent rights over ONE athlete):
```
id, athlete, user(FK User; sportsman = the athlete himself, or a linked parent),
can_register (bool: create promotion records + upload diploma scans),
can_download_generated (bool: download auto-generated diplomas),
granted_by, granted_at, revoked_at (null = active)
```

Endpoints:

* `GET /api/v1/belt-promotions/?athlete_id=` (scoped) — list.
* `POST /api/v1/belt-promotions/` — admin, or a user with an active
  `can_register` permission for that athlete. Manual registration of an
  external/historic diploma: `athlete, from_belt, to_belt, promotion_date, notes`
  (+ optional multipart `diploma_file`). Non-admin registrations start with
  `diploma_authorized=false`.
* `GET/PATCH/DELETE /api/v1/belt-promotions/{id}/` (PATCH/DELETE: admin, or the
  registering user with can_register while not authorized).
* `POST /api/v1/belt-promotions/{id}/upload/` multipart `file` — admin or
  `can_register` → stores scan.
* `GET /api/v1/belt-promotions/{id}/file/` → uploaded scan (scoped read).
* `POST /api/v1/belt-promotions/{id}/authorize/` (admin) `{"authorized": true|false}`.
  Authorizing requires: linked exam approved OR promotion registered manually
  by an admin.
* `GET /api/v1/belt-promotions/{id}/diploma/` → auto-generated diploma PDF
  (landscape, club template, "Diploma de ascenso" + athlete + new belt + date +
  diploma number). Allowed only when `diploma_authorized` AND (user is admin
  OR user has active `can_download_generated` for the athlete). Otherwise 403
  with a Spanish message. Logged as an `IssuedDocument`-like entry is NOT
  required (diploma_number is the code).
* Promotion JSON includes: `athlete_name, from_belt_name, to_belt_name,
  has_file, file_url, diploma_url (null when not downloadable by THIS user),
  can_download_diploma, can_edit, exam_result`.
* `GET/POST /api/v1/diploma-permissions/` (admin; `?athlete_id=`),
  `PATCH/DELETE /api/v1/diploma-permissions/{id}/` (DELETE = revoke).
  Validation: the user must be the athlete's own account or a linked parent.
* `GET /api/v1/diploma-permissions/mine/` → active permissions of the current
  user: `[{"athlete": 3, "athlete_name": "...", "can_register": true, "can_download_generated": false}]`.

Implementation notes (backend, feat/be-promo):

* Exam JSON: `id, athlete, athlete_name, from_belt, from_belt_name, to_belt,
  to_belt_name, exam_date, examiner, examiner_name, technical_scores,
  technical_score (float|null), passing_score (float), admin_checks, result,
  result_display, notes, evaluation, promotion_id, created_at, updated_at`.
  `technical_scores` defaults to the six criteria with `score: null` when
  omitted; `technical_score` stays null until every criterion has a score, and
  finalize answers 400 while any score is missing. `fees_ok` and
  `min_time_in_belt_ok` default to `false` (the maestro confirms them);
  unknown `admin_checks` keys → 400. PATCH merges `admin_checks`.
* `to_belt` must have a higher `grado` than `from_belt` (exams and promotions) → 400.
* Finalized exams can't be PATCHed (400); approved exams can't be deleted
  (400). Deleting an exam also deletes its mirrored `Evaluation`.
* Promotion JSON also has `authorized_by_name`, `registered_by_name`,
  `diploma_original_filename`. `athlete` can't change on PATCH. A non-admin
  without an active `can_register` for the athlete gets 403 on create/upload.
* `GET /diploma-permissions/` lists ACTIVE permissions only; add
  `?include_revoked=true` for history (`active`/`revoked_at` fields). Also
  `?user_id=`. Item JSON: `id, athlete, athlete_name, user, user_name,
  user_email, user_role, can_register, can_download_generated, granted_by,
  granted_by_name, granted_at, revoked_at, active`. Only ONE active grant per
  (athlete, user) — a duplicate POST → 400 (PATCH it instead); revoked grants
  can't be PATCHed (400). Administrators can't be grantees (400).

---

## Req 7 — Gamification

App `apps.gamification`.

Activity sources (each counts as an "active day" for streaks and gives XP):

| source | XP |
|---|---|
| Attendance `present`/`late` | 20 |
| Technical-evaluation (kick) session `completed` | 15 (+10 if overall_score ≥ 80) |
| Poomsae segment attempt completed | 15 |
| Self-reported practice log (max 1 per day) | 10 |
| Challenge completed | challenge.xp_reward |
| Badge earned | badge.xp_reward |

Models: `PracticeLog(athlete, date, minutes, activity, notes)` (unique athlete+date),
`XpEvent(athlete, source, source_id, points, date, description)` (unique
source+source_id+athlete — idempotent), `Badge(code, name, description, icon, xp_reward)`,
`AthleteBadge(athlete, badge, earned_at)`, `Challenge(title, description, kind
"kick"|"weekly", kick_type (null), metric "sessions"|"min_score"|"practice_days"|"attendance_days"|"poomsae_segments",
target_value, start_date, end_date, category (null = all), xp_reward, active, created_by)`,
`ChallengeProgress(challenge, athlete, value, completed_at)`.

Levels (XP thresholds): 1 Principiante 0 · 2 Aprendiz 100 · 3 Practicante 300 ·
4 Competidor 600 · 5 Avanzado 1000 · 6 Experto 1500 · 7 Maestro del dojang 2200.

Seed badges (data migration): `first_kick` Primera patada, `streak_3` Racha de 3 días,
`streak_7` Racha de 7 días, `streak_30` Racha de 30 días, `score_80` Patada de 80+,
`score_90` Patada de 90+, `challenge_1` Primer reto, `challenges_5` 5 retos,
`poomsae_first` Primer segmento de Poomsae, `level_3` Nivel Practicante.

Hooks: post_save signals on Attendance, TechEvalSession (status → completed),
PoomsaeAttempt (status → completed); PracticeLog create. Each hook records the
XpEvent, updates challenge progress and awards badges. A management command
`recompute_gamification` rebuilds everything from history (idempotent).

Endpoints:

* `GET /api/v1/gamification/profile/?athlete_id=` (default: own athlete; parents
  must pass a child id; admin any) →
  `{"athlete": 3, "athlete_name": "...", "category": "cadete", "xp": 420,
  "level": {"number": 3, "name": "Practicante", "min_xp": 300, "next_min_xp": 600, "progress": 0.4},
  "streak": {"current": 4, "best": 9, "last_active_date": "2026-10-31", "active_today": true},
  "badges": [{"code": "streak_3", "name": "...", "description": "...", "icon": "flame", "earned_at": "..."}],
  "locked_badges": [{...same without earned_at}],
  "active_challenges": [{"id": 1, "title": "...", "kind": "weekly", "metric": "...", "target_value": 3,
     "value": 1, "completed": false, "end_date": "...", "xp_reward": 50}],
  "recent_events": [{"date": "...", "source": "attendance", "points": 20, "description": "..."}]}`
* `GET /api/v1/gamification/leaderboard/?category=&period=week|month|all`
  *(unpaginated, top 50)* → `{"category": "cadete", "period": "month", "results":
  [{"rank": 1, "athlete": 3, "athlete_name": "...", "category": "cadete", "xp": 300,
  "level": 3, "streak": 4, "badges": 5, "is_me": false}]}`. Non-admins see
  only their own category (default = own athlete's category). Ranking
  criteria: XP in period, ties → current streak, then badges.
* `GET/POST /api/v1/gamification/practice-logs/?athlete_id=` — sportsman (own),
  parent (child, `athlete` required in body), admin. Body `{"athlete"?, "date", "minutes", "activity", "notes"}`.
  Date can't be in the future nor older than 7 days (non-admin).
* `GET /api/v1/gamification/challenges/?active=true` (scoped: all authenticated read;
  each item includes `my_progress` when the user has an athlete) ;
  `POST/PATCH/DELETE` admin only. `kind="kick"` challenges require `kick_type`
  (one of the TechEvalSession KICK_TYPES) and use metric `sessions` or `min_score`.
  `POST /api/v1/gamification/challenges/generate-weekly/` (admin) creates the
  default weekly challenge set for the current ISO week (idempotent). A Celery
  beat entry is optional; the endpoint is enough.
* `GET /api/v1/gamification/badges/` *(unpaginated)* — catalogue.

Backend implementation notes (feat/be-gami-poomsae — additive, no shape removed):

* Streak: consecutive active days ending **today or yesterday** (a day without
  activity breaks it). Active day = any attendance/kick/Poomsae/practice event.
* `XpEvent.source_id` is a string (badge events use the badge `code`).
  `source` values: `attendance`, `tech_eval`, `poomsae`, `practice`, `challenge`, `badge`.
  Attendance changed to `absent` (or deleted) removes its XP; deleting a kick
  session / Poomsae attempt / practice log removes its XP too.
* Seed badge XP: first_kick 20, streak_3 30, streak_7 70, streak_30 300,
  score_80 40, score_90 80, challenge_1 25, challenges_5 100, poomsae_first 20,
  level_3 50. Icons are lucide names (`footprints`, `flame`, `target`, `zap`,
  `flag`, `trophy`, `sparkles`, `star`).
* Profile: `athlete_id` is required for parents AND admins (400 otherwise);
  out-of-scope ids → 404. `active_challenges` items also carry `description`,
  `kick_type`, `start_date`.
* Leaderboard: only athletes with XP > 0 in the period (status active) are
  listed; `level` is from all-time XP. Parents may pass `?athlete_id=` to
  pick which child's category to show. A non-admin whose athlete has no
  category gets `{"category": null, "results": [], "detail": "..."}`.
  Admin without `?category=` → all categories (`"category": null`).
* Practice logs list is paginated. `athlete` is required in the body for
  parents and admins. Minutes 1–600; one log per athlete per day (400 on
  `date`). Admins may back-date beyond 7 days.
* Challenges list is paginated; `?active=true|false`, `?kind=`, admin
  `?category=`. Non-admins only see challenges for all categories or their
  athletes' categories. `my_progress` (null without athlete; `?athlete_id=`
  selects a child) = `{"athlete", "value", "target_value", "completed",
  "completed_at", "progress"}`. `weekly` challenges may also set `kick_type`
  (only with `sessions`/`min_score`). `min_score` value = best kick score in
  the window. `poomsae_segments` counts completed Poomsae attempts (segment or
  technique mode) in the window.
* `generate-weekly` → `{"created": n, "results": [challenge, ...]}` (201 when
  something was created, else 200). Default set (Mon–Sun of the ISO week):
  practice 3 days (50 XP), attend 2 classes (40), 3 Poomsae attempts (50),
  3 sessions of the week's kick (60, kick rotates by week), that kick ≥ 80 (60).
* Command: `python manage.py recompute_gamification [--athlete ID ...]`.

---

## Req 8 — Poomsae module

App `apps.poomsae`. Phase 1 = fundamentals (8.3) + segmented practice (8.2).

Models:
* `Poomsae(id, name "Taegeuk Il Jang", korean_name, order, belt (FK Belt, null — the belt that learns it),
  description, video_url (YouTube or club URL), video_source "club"|"youtube"|"external",
  video_credit (author/channel), video_license_note, active)`
* `PoomsaeSegment(poomsae, order, name, description, video_start_s, video_end_s,
  techniques (M2M Technique), expected_movements (int))`
* `Technique(code, name, korean_name, element "displacement"|"stance"|"block"|"hand_attack"|"kick",
  description, criteria (JSON list of {"key","label","joint","min","max","unit"}), difficulty 1-3)`
* `PoomsaeAttempt(user, athlete, segment (null), technique (null), mode "segment"|"technique",
  recording (private storage name), status "processing"|"completed"|"failed",
  score 0-100, element_scores (JSON {element: score}), criteria_results (JSON list
  [{"key","label","value","expected","passed"}]), feedback (text), created_at)`

Seed data (data migration): the 8 Taegeuk poomsae (Il Jang → Pal Jang) with
belt mapping (Il Jang ↔ 8 KUP etc.), each split into 3–6 segments with
description; ~14 fundamental techniques: Ap seogi, Ap kubi, Dwit kubi,
Juchum seogi, Naranhi seogi (stances); Arae makki, Momtong an makki,
Olgul makki, Momtong bakkat makki (blocks); Momtong jireugi, Dubeon jireugi
(hand attacks); Ap chagi, Yeop chagi (kicks); Dwiro dolgi / pivot (displacement).
YouTube reference videos: ONLY official/club-shareable embeds — store the URL,
credit and license note; the frontend embeds via `youtube-nocookie.com` iframe
(no download). Seed may leave `video_url` empty when no verified source is known.

Analysis: the client records the segment/technique with the camera (same
recorder as the kick module), uploads it; the server runs MediaPipe Pose
(reuse `apps.technical_evaluation.analysis` helpers) and scores per element
against the technique criteria (joint angles for stances/blocks/punches,
knee extension + hip height for kicks, hip displacement/turn for
displacements). Fallback: the client may instead send pre-computed landmark
frames as JSON (`landmarks` field) — the server then skips video decoding.
Async via Celery like kick sessions (eager in tests).

Endpoints (all authenticated; writes on catalogue = admin):

* `GET /api/v1/poomsae/` *(unpaginated)* → poomsae list with `segments_count`,
  `belt_name`, `video_embed_url` (youtube-nocookie embed or null), `my_progress`
  `{"segments_completed": 2, "segments_total": 5, "best_score": 78}`.
* `GET /api/v1/poomsae/{id}/` → detail incl. `segments` (with `techniques`
  summaries and `video_start_s/end_s`) and the athlete's best score per segment.
* `POST/PATCH/DELETE /api/v1/poomsae/` and `/api/v1/poomsae/{id}/` (admin).
* `GET /api/v1/poomsae/techniques/?element=` *(unpaginated)*.
* `POST /api/v1/poomsae/attempts/` multipart: `mode`, `segment` or `technique`,
  `athlete` (required for parents/admin; optional for sportsman), and either
  `recording` (webm/mp4 ≤ 50 MB) or `landmarks` (JSON). Consent rules identical
  to kick sessions (parents of minors must have TechEvalConsent). → 201
  `{"id", "status": "processing"}`.
* `GET /api/v1/poomsae/attempts/?athlete_id=&segment=&technique=` (scoped, paginated).
* `GET /api/v1/poomsae/attempts/{id}/` → attempt with score, element_scores,
  criteria_results, feedback (Spanish recommendations), status.
* The athlete can repeat a segment any number of times; the poomsae counts as
  completed when every segment has a completed attempt with score ≥ 70.

Backend implementation notes (feat/be-gami-poomsae — additive):

* Extra admin catalogue endpoints: `GET/POST /api/v1/poomsae/segments/?poomsae=`,
  `GET/PATCH/DELETE /api/v1/poomsae/segments/{id}/` (body `techniques` = list
  of technique ids; responses render technique summaries) and
  `POST/PATCH/DELETE /api/v1/poomsae/techniques/{id}/`. Criteria `joint`
  must be one of the measures documented in `apps/poomsae/analysis.py`
  (`knee_avg`, `knee_bent`, `knee_straight`, `stance_length`,
  `feet_to_shoulders`, `weight_bent_leg`, `elbow_extended`,
  `extended_wrist_height`, `extended_wrist_reach`, `raised_wrist_height`,
  `raised_elbow`, `kick_knee_extension`, `kick_foot_height`,
  `kick_body_alignment`, `punch_count`, `hip_turn`, `hip_level`); `unit` ∈
  `deg|ratio|count`.
* `/poomsae/` list/detail: non-admins only see `active` poomsae; admins see
  all (`?active=`). `my_progress` is null when the viewer has no athlete
  (admins; parents/admins may pass `?athlete_id=`). Detail adds
  `completed` (bool); each segment has `my_best_score`, `my_attempts`,
  `completed`. Technique summaries: `id, code, name, korean_name, element,
  element_display, difficulty`.
* `video_url` must be http(s); with `video_source="youtube"` it must be a
  parseable YouTube URL (watch, youtu.be, embed, shorts). Seed leaves it empty.
* Attempt create also accepts `athlete_id` (alias of `athlete`) and a base64
  `recording_url` data URL (same as the kick module). Errors: 400 on `mode`,
  `segment`, `technique`, `landmarks`, `recording`; 404 athlete out of scope;
  403 consent. `landmarks` = list of frames (or `{"frames": [...]}`), ≤ 900
  frames; a frame = list of 33 `{x,y,z,visibility}` (or `[x,y,z,v]`) or
  `{"<index>": {...}}`. Landmarks are discarded after the analysis.
* Consent: identical to kick sessions for sportsman/parent; additionally an
  adult sportsman who explicitly revoked self-consent is blocked, and admins
  (maestro) may record adults freely but minors only with a linked parent's
  consent.
* Attempt JSON: `id, user, user_name, athlete, athlete_name, mode, segment,
  segment_name, poomsae, poomsae_name, technique, technique_name, status,
  score, passed, element_scores, criteria_results (each also has "score" and
  "element"; segment keys are "<technique_code>.<key>"), feedback,
  has_recording, created_at, updated_at`.
  Filters: `?athlete_id=&segment=&technique=&poomsae=&mode=&status=`.
* `DELETE /api/v1/poomsae/attempts/{id}/` — the user who recorded it, or an admin.
* Recording limit: `POOMSAE_MAX_VIDEO_BYTES` (default 50 MB).

---

## Addendum — Kick evaluation: executed vs optimal values + detailed feedback

Existing module `apps.technical_evaluation` (kick sessions). The results must
show, for each metric, the EXECUTED value against the OPTIMAL value for that
kick type (and athlete), plus a detailed description of what to improve:
Ángulo / ángulo óptimo · Altura ejecutada / altura óptima de pateo ·
Velocidad ejecutada / velocidad óptima · Estabilidad ejecutada / estabilidad óptima.

`TechEvalSession` gains `metric_details` (JSONField, default list) filled by the
analysis; `results` in `GET /technical-evaluation/sessions/` and
`/sessions/{id}/` keeps every existing key (`angle, height, speed, stability,
overall_score, recommendations`) and ADDS:

```json
"metrics": [
  {"key": "angle", "label": "Ángulo de la técnica", "unit": "°",
   "value": 173.3, "optimal": 175.0, "optimal_min": 165.0, "optimal_max": 180.0,
   "ratio": 0.99, "score": 97.0, "status": "optimal",
   "status_display": "Óptimo",
   "description": "Explicación en español de qué mide, cómo quedó frente al óptimo y qué corregir."},
  {"key": "height", "label": "Altura de pateo", "unit": "cm", ...},
  {"key": "speed", "label": "Velocidad de la técnica", "unit": "m/s", ...},
  {"key": "stability", "label": "Estabilidad", "unit": "%", ...}
],
"detailed_recommendations": [
  {"metric": "height", "priority": "high"|"medium"|"low", "title": "Eleva la altura del pateo",
   "detail": "Texto detallado…", "drills": ["Ejercicio 1", "Ejercicio 2"]}
],
"optimal_reference": {"kick_type": "Dollyo Chagui", "athlete_height_cm": 165.0,
                       "height_basis": "athlete"|"estimated", "source_note": "…"}
```

* `status`: `optimal` (inside [optimal_min, optimal_max]), `close` (score ≥ 70),
  `needs_work` (else). `ratio` = value / optimal (rounded 2 decimals).
* Optimal values are per kick type (table in `apps/technical_evaluation/optimal.py`,
  documented with the rationale). Height optimum scales with the athlete's
  `height_cm` when known (e.g. head-level kicks ≈ 0.9 × stature, body-level ≈ 0.6 ×),
  otherwise the stature estimated from the video scale.
* Old sessions without `metric_details` get them computed on the fly from the
  stored values (serializer), so history pages show the comparison too.
* `recommendations` (string) stays as a short summary for backward compatibility,
  but it must no longer be just "¡Excelente técnica general!" when any metric is
  below its optimum: mention the weakest metric(s).

Implementation notes (backend, additive — the keys above are unchanged):
* Each `metrics[]` item also carries `executed_label` ("Altura de la patada
  ejecutada", …), `optimal_label` ("Altura óptima de pateo", …) and
  `direction` (`ok` | `low` | `high`: which side of the optimal range the value
  fell on). `ratio` is `null` only if `optimal` is 0.
* `optimal_reference` also carries `kick_description` and `target_level`.
* `detailed_recommendations` lists every non-optimal metric, lowest score first
  (`needs_work` → `high`, `close` → `medium`); when all four are optimal it holds
  one `low` maintenance item.
* Per-metric score: 100 at `optimal`, 90 at the range edges, then linear decay
  to 0 over a per-metric tolerance (angle 45°, height 0.45 × stature,
  speed 4 m/s, stability 45 points). When `Athlete.height_cm` is empty the
  stature is the same 170 cm the analysis calibrates the video scale with
  (`height_basis: "estimated"`).


---

## Addendum B — Official club models (constancia + hoja de vida), Nov 2026

The club sent its OFFICIAL models; they replace the generic designs of Req 2
(constancia) and Req 5 (hoja de vida). Originals + page renders live in
`docs/club-models/` (backend repo): `constancia-modelo.{docx,pdf,png}`,
`hoja-de-vida-modelo.pdf`, `hoja-de-vida-p1..p5.png`. Generated PDFs must
look like those models (layout, wording, order), filled with platform data.

### B.1 Institutional header (all generated PDFs)

As in both models: official logo top-left (`apps/common/assets/club-logo-official.jpg`,
the warrior helmet "WARRIORS TKD ESPINAL"), and on the right, right-aligned:
**CLUB DEPORTIVO WARRIORS TKD ESPINAL** (bold serif, blue `#1F4FC1`), then
"Reconocimiento Deportivo N° 049 noviembre 10 de 2022", "Resolución No. 007
septiembre 10 de 2021", "Afiliado a la Liga Tolimense de Taekwondo" (small bold).
No coloured bands in the constancia / hoja de vida (white page like the model);
a thin green/yellow rule under the header is allowed. Diplomas keep their
design but use the same header data. Footer: small grey verification code +
page number. All header texts come from `ClubProfile` (B.2).

### B.2 `ClubProfile` (singleton, `apps.athlete_documents`)

Fields: `name` ("Club Deportivo Warriors TKD Espinal"), `short_name`
("Club Warriors TKD Espinal"), `recognition` ("Reconocimiento Deportivo N° 049
noviembre 10 de 2022"), `resolution` ("Resolución No. 007 septiembre 10 de 2021"),
`league` ("Afiliado a la Liga Tolimense de Taekwondo"), `city` ("Espinal, Tolima"),
`legal_rep_name` ("Jonathan De La Rosa Moreno"), `legal_rep_title_prefix` ("Lic."),
`legal_rep_role` ("Representante legal del Club Warriors TKD Espinal"),
`phone` ("3209575357"), `email` ("warriostkdespinal@gmail.com" — as written in the model),
`signature` (private storage name; seeded from `apps/common/assets/legal-rep-signature.png`),
`include_signature` (bool, default true), `default_training_days` (["martes","jueves","sábado"]),
`default_session_hours` (2), `updated_at`. Seeded by data migration with the values above.

* `GET /api/v1/club-profile/` (any authenticated) → all fields except the
  signature path; `has_signature` bool; `signature_url` (admin only, else null).
* `PATCH /api/v1/club-profile/` (admin; JSON or multipart with `signature` PNG/JPG ≤ 2 MB;
  `remove_signature=true` deletes it).
* `GET /api/v1/club-profile/signature/` (admin) → image stream.

### B.3 Athlete record — new fields needed by the hoja de vida

Added to `Athlete` (all optional, blank allowed; exposed in `/athletes/`,
`/athletes/register/`, `/athlete/me/`; sportsman/parent may NOT edit except
via existing rules):

| field | type / values |
|---|---|
| `gender` | `"M"` Masculino · `"F"` Femenino · `""` |
| `document_type` | `"TI"` Tarjeta de Identidad · `"CC"` Cédula de Ciudadanía · `"RC"` Registro Civil · `"CE"` Cédula de Extranjería · `""` |
| `document_number` | str(30). If empty, fall back to the linked user's `UserProfile.documento`. |
| `birth_place` | str(120) |
| `civil_status` | str(30) (free text, e.g. "Soltero(a)") |
| `eps` | str(120) — Seguro E.P.S. |
| `blood_group` | `"A"`·`"B"`·`"AB"`·`"O"`·`""` |
| `rh_factor` | `"+"`·`"-"`·`""` |
| `allergies` | text — "Enfermedad o alergia a" |
| `address` | str(255) — Dirección residencial |
| `phone` | str(30) |
| `mother_name`, `mother_occupation`, `mother_phone` | str |
| `father_name`, `father_occupation`, `father_phone` | str |
| `join_date` | date — Fecha de ingreso al club. If null → earliest enrollment `start_date`, else `created_at` date. |
| `training_days` | JSON list of Spanish weekday names (e.g. ["martes","jueves","sábado"]); empty → derived from the active enrollment's edition schedule (`[{days, startTime, endTime}]`), else `ClubProfile.default_training_days`. |
| `session_hours` | decimal(4,1) null → derived from schedule (endTime−startTime), else `ClubProfile.default_session_hours`. |

Read-only helpers in the athlete JSON: `gender_display`, `document_type_display`,
`effective_document_number`, `effective_join_date`, `effective_training_days`,
`effective_session_hours`, `gup_number` (10..1 from belt grado 1..10; null for DAN).
Data migration: copy `Enrollment.blood_type` ("O+") of the latest enrollment into
blood_group/rh_factor when empty; copy profile `address`/`telefono` when empty.

### B.4 Constancia (replaces Req 2 PDF; same endpoints)

`GET /api/v1/enrollments/{id}/enrollment-certificate/` and a NEW athlete-level
`GET /api/v1/athletes/{id}/constancia/` (works even without enrollments, using
`effective_join_date`). Letter size or A4 portrait, model text verbatim with data
(gender-aware: el/la deportista, identificado/a, inscrito/a, del/de la interesado/a):

> **CONSTANCIA**
> El {name}, en cabeza de su representante legal ***{legal_rep_name}***, certifica que
> {el deportista|la deportista} ***{Athlete full name}***, ***identificad{o|a} con {Tarjeta de Identidad|Cédula de Ciudadanía|…} No. {number with thousands dots, e.g. 1.104.954.182}***,
> se encuentra debidamente inscrit{o|a} en nuestro club desde el mes de {mes} del año {año}.
>
> Asimismo, se certifica que {el|la} deportista asiste regularmente a los entrenamientos
> los {martes, jueves y sábados}, con una intensidad de {2} horas por sesión, cumpliendo
> con los lineamientos y procesos formativos establecidos por nuestra institución.
>
> Esta constancia se expide a solicitud {del interesado|de la interesada} para los fines que considere pertinentes.
>
> Dado en {Espinal, Tolima}, a los {11} días del mes de {febrero} de {2026}.
>
> Atentamente,
> {Lic.} {legal_rep_name}
> {legal_rep_role}
> Teléfono: {phone}
> Correo: {email}
>
> FIRMA {signature image over the line when include_signature} _________________________

Unknown gender → "el/la deportista", "identificado(a)" etc. Weekday list joined
with commas and "y"; plural forms ("los martes"). Missing document → omit the
"identificado con…" clause. Verification code (CI-…) in the footer as before.
Dropped enrollment → 400 still.

### B.5 Hoja de vida (replaces Req 5 PDF; same endpoint `/athletes/{id}/resume/`)

A4, 5 sections like the model (page breaks may be compacted to 3–4 pages but
order/wording must match), every page with the B.1 header:

1. **HOJA DE VIDA** — boxed label/value rows: Nombres, Apellidos (split full_name:
   prefer linked UserProfile nombres/apellidos; else first token(s) heuristics:
   if 4+ words first two are names), Documento de identidad: T.I ☐ C.C. ☐ (tick the
   matching box), Número del documento, Lugar y Fecha de Nacimiento, Edad,
   Género: Masculino ☐ Femenino ☐ (ticked), Estado Civil, Seguro E.P.S., Grupo
   Sanguíneo, Factor RH, Enfermedad o Alergia a, Dirección Residencial, Teléfono,
   Nombre de la Madre / Ocupación / Teléfono, Nombre del Padre / Ocupación / Teléfono.
   Empty values → empty box (form can still be completed by hand).
2. **INFORMACIÓN TÉCNICA** — Fecha de Ingreso, Categoría (age category label),
   Peso Kg, Grado Actual (belt name without the "N KUP - " prefix), Gup Nº.
3. **INFORMACIÓN DE GRADOS (GUP)** table: Gup Nº | Grado | Fecha (Día | Mes | Año),
   rows Gup 10 Blanco, 9 Blanco-Franja amarilla, 8 Amarillo, 7 Amarillo-franja verde,
   6 Verde, 5 Verde franja – azul, 4 Azul, 3 Azul – Franja rojo, 2 Rojo,
   1 Rojo – Franja negro. Dates filled from `promotions.BeltPromotion` (to_belt grado
   ↔ gup = 11 − grado; latest promotion per belt). Note below: "Nota: Los respectivos
   grados deben ser otorgados por clubes oficiales. Anexar fotocopias de los diplomas."
   (If DAN promotions exist, add rows "1 DAN"… after the table.)
4. **Exoneración de responsabilidad** — model text verbatim (two paragraphs), then
   "Firma padre de Familia: ____ / C.c. ____ de: ____" (pre-print the guardian's
   name + document under the line when known) and "Firma Deportista: ____ /
   T.I. y/o C.C. ____" (pre-print athlete document).
5. **Anexos** — model text + numbered list: 1. Anexar una foto legible del documento
   de identidad del deportista; 2. Certificado de afiliación de la EPS del deportista
   (puede ser la emitida por el Adress). Then a status line per annex from the
   athlete's uploaded documents (✓ Cargado / Pendiente).

The previous extra sections (programs, evaluations, kick stats, gamification) are
REMOVED from the hoja de vida (not in the model). Code HV-… in footer as before.

### B.6 Documents — new annex types

`AthleteDocument.doc_type` adds `identity_document` ("Documento de identidad
(foto legible)") and `eps_certificate` ("Certificado de afiliación EPS (ADRES)").
`REQUIRED_TYPES` = medical_certificate, sports_insurance, liability_waiver,
identity_document, eps_certificate. The waiver template PDF uses the model's
exoneración text verbatim (B.5 §4) with the same signature lines.

### B.7 Frontend

* Athlete form (admin create/edit + enrollment wizard sections): new section
  "Hoja de vida" with all B.3 fields (selects for gender, document_type,
  blood_group, rh_factor; training days as weekday checkboxes; session hours number;
  join date). Show the athlete's sportsman `documento` as placeholder for document_number.
* Athlete detail page: buttons "Descargar constancia" (`/athletes/{id}/constancia/`)
  and "Descargar hoja de vida" in the header; sportsman "Mi inscripción"/documents
  page and parent page too.
* Documents panel: the two new doc types appear in checklist/upload select.
* Admin page "Datos del club" (`/dashboard/club`, admin only, nav under
  Administración): edit ClubProfile fields, upload/replace/remove signature
  image (preview via authenticated blob), toggle include_signature.
