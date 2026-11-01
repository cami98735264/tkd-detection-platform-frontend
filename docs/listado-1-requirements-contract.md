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
* `GET  /api/v1/athlete-documents/waiver-template/` → PDF of the club's blank
  liability-waiver letter (to print, sign and upload). Any authenticated user.
  Optional `?athlete_id=` pre-fills athlete + guardian names.

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
  others: own scope).
* `GET /api/v1/issued-documents/verify/{code}/` (any authenticated user) →
  `{"valid": true, "kind": "...", "athlete_name": "...", "issued_at": "..."}` or 404.

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
