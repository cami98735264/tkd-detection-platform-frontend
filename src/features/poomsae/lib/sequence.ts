// Addendum C — movement scripts, ordered-sequence results and full
// run-throughs. API bodies are normalised defensively: the backend is being
// built in parallel and empty/legacy payloads must render as before.
import { config } from "@/config/env";

import type {
  HandCheck,
  MovementCheck,
  MovementResult,
  Poomsae,
  PoomsaeAttempt,
  PoomsaeMovement,
  PoomsaeSegment,
  ScriptCheckResult,
  ScriptMismatch,
  SegmentResult,
  SequenceSummary,
} from "../types";

/** Shown with every result (C.6 limitation). */
export const HAND_SHAPE_NOTE =
  "La forma de la mano se evalúa cuando la mano se ve con claridad; para mejores resultados graba más cerca o con buena luz.";

export const HAND_SHAPE_LABEL: Record<string, string> = {
  fist: "Puño",
  knife: "Mano de cuchillo",
  fingertips: "Punta de dedos",
  palm: "Palma",
};

/** "fist" → "Puño"; unknown / empty → "No evaluable". */
export function handShapeLabel(shape: string | null | undefined): string {
  if (!shape) return "No evaluable";
  return HAND_SHAPE_LABEL[shape] ?? "No evaluable";
}

/** `hand` of a movement / technique result (C.8), or null when absent. */
export function normalizeHandCheck(v: unknown): HandCheck | null {
  if (!isObj(v)) return null;
  const s = (x: unknown) => (typeof x === "string" && x ? x : null);
  const confidence = num(v.confidence);
  const evaluable = v.evaluable === true && (confidence == null || confidence >= 0.5);
  return {
    expected: s(v.expected),
    detected: s(v.detected),
    confidence,
    evaluable,
    passed: evaluable && typeof v.passed === "boolean" ? v.passed : null,
  };
}

/** Criteria rows whose key is "<prefix>hand_shape" carry a detected shape code. */
export function isHandShapeKey(key: string): boolean {
  return key === "hand_shape" || key.endsWith(".hand_shape");
}

/** Server limit for full run-through recordings (POOMSAE_FULL_MAX_VIDEO_BYTES). */
export const FULL_MAX_VIDEO_BYTES = 90 * 1024 * 1024;
/** Server limit for club-hosted reference videos (POOMSAE_REFERENCE_MAX_BYTES). */
export const REFERENCE_MAX_VIDEO_BYTES = 90 * 1024 * 1024;
/** Camera recording length offered for a full form (Taegeuk forms last ~30–60 s). */
export const FULL_RECORD_SECONDS = 90;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

/** A FK rendered as an id, a `{id, name}` summary or null. */
function fk(v: unknown): { id: number | null; name: string | null } {
  if (isObj(v)) return { id: num(v.id), name: typeof v.name === "string" ? v.name : null };
  return { id: num(v), name: null };
}

/** List from a bare array, a paginated body or `{movements: [...]}`. */
function list(data: unknown, key?: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (isObj(data)) {
    if (Array.isArray(data.results)) return data.results;
    if (key && Array.isArray(data[key])) return data[key] as unknown[];
  }
  return [];
}

export function normalizeMovement(raw: unknown): PoomsaeMovement | null {
  if (!isObj(raw)) return null;
  const number = num(raw.number);
  if (number == null) return null;
  const stance = fk(raw.stance);
  const hand = fk(raw.hand);
  const kick = fk(raw.kick);
  const segment = fk(raw.segment);
  return {
    id: num(raw.id),
    number,
    name: str(raw.name) || `Movimiento ${number}`,
    description: str(raw.description),
    segment: segment.id,
    stance: stance.id,
    stance_name: stance.name ?? (typeof raw.stance_name === "string" ? raw.stance_name : null),
    hand: hand.id,
    hand_name: hand.name ?? (typeof raw.hand_name === "string" ? raw.hand_name : null),
    kick: kick.id,
    kick_name: kick.name ?? (typeof raw.kick_name === "string" ? raw.kick_name : null),
    turn_deg: num(raw.turn_deg) ?? 0,
    step: typeof raw.step === "string" ? raw.step : null,
    kihap: raw.kihap === true,
    hold: raw.hold !== false,
  };
}

/** Ordered movement script from any list-like body. */
export function normalizeMovements(data: unknown): PoomsaeMovement[] {
  return list(data, "movements")
    .map(normalizeMovement)
    .filter((m): m is PoomsaeMovement => m != null)
    .sort((a, b) => a.number - b.number);
}

/** Movements of one segment: by `movement_numbers`, else by the movement's segment FK. */
export function movementsForSegment(
  movements: PoomsaeMovement[],
  segment: Pick<PoomsaeSegment, "id" | "movement_numbers">,
): PoomsaeMovement[] {
  const numbers = Array.isArray(segment.movement_numbers)
    ? segment.movement_numbers.map(num).filter((n): n is number => n != null)
    : [];
  if (numbers.length > 0) {
    const set = new Set(numbers);
    return movements.filter((m) => set.has(m.number));
  }
  return movements.filter((m) => m.segment === segment.id);
}

/** Signed turn → Spanish (+ = left / counter-clockwise, − = right). */
export function turnLabel(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg) || deg === 0) return "Sin giro";
  const abs = Math.abs(deg);
  if (abs === 180) return "Giro 180° (media vuelta)";
  return `Giro ${abs}° a la ${deg > 0 ? "izquierda" : "derecha"}`;
}

/** Arrow glyph for a turn (shown next to the movement name). */
export function turnArrow(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg) || deg === 0) return "↑";
  if (Math.abs(deg) === 180) return "↓";
  return deg > 0 ? "↰" : "↱";
}

export const STEP_LABEL: Record<string, string> = {
  forward: "Avanza",
  backward: "Retrocede",
  in_place: "En el sitio",
  side: "Lateral",
};

export function stepLabel(step: string | null | undefined): string {
  if (!step) return "—";
  return STEP_LABEL[step] ?? step;
}

/** Turn values offered in the admin script editor. */
export const TURN_OPTIONS = [-180, -90, -45, 0, 45, 90, 180, 270, -270];

function check(v: unknown): MovementCheck | null {
  if (!isObj(v)) return null;
  const pick = (x: unknown) => (typeof x === "number" || typeof x === "string" ? x : null);
  return { expected: pick(v.expected), measured: pick(v.measured), passed: v.passed === true };
}

/** `movement_results` of a sequence attempt; [] for legacy attempts. */
export function normalizeMovementResults(data: unknown): MovementResult[] {
  return list(data)
    .filter(isObj)
    .map((r) => {
      const number = num(r.number) ?? 0;
      return {
        number,
        name: str(r.name) || `Movimiento ${number}`,
        matched: r.matched === true,
        time_s: num(r.time_s),
        score: num(r.score),
        turn: check(r.turn),
        step: check(r.step),
        hand: normalizeHandCheck(r.hand),
        issues: Array.isArray(r.issues) ? r.issues.map(str).filter(Boolean) : [],
      };
    })
    .sort((a, b) => a.number - b.number);
}

export function normalizeSequenceSummary(data: unknown): SequenceSummary | null {
  if (!isObj(data)) return null;
  const expected = num(data.expected_movements);
  if (expected == null) return null;
  return {
    expected_movements: expected,
    detected_movements: num(data.detected_movements) ?? 0,
    matched_in_order: num(data.matched_in_order) ?? 0,
    missing: Array.isArray(data.missing)
      ? data.missing.map(num).filter((n): n is number => n != null)
      : [],
    extra: num(data.extra) ?? 0,
    order_ok: data.order_ok === true,
  };
}

export function normalizeSegmentResults(data: unknown): SegmentResult[] {
  return list(data)
    .filter(isObj)
    .map((r) => {
      const seg = fk(r.segment);
      return {
        segment: seg.id,
        segment_name: str(r.segment_name) || seg.name || "Segmento",
        score: num(r.score),
        matched: num(r.matched),
        expected: num(r.expected),
      };
    });
}

/** True when the attempt carries the C.2 sequence analysis. */
export function hasSequenceResults(attempt: Pick<PoomsaeAttempt, "movement_results">): boolean {
  return normalizeMovementResults(attempt.movement_results).length > 0;
}

/** "12.3" → "0:12". Movement times are seconds into the clip. */
export function formatClipTime(s: number | null): string {
  if (s == null || s < 0) return "—";
  const total = Math.round(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * URL for the club-hosted reference video. The API answers with the endpoint
 * path ("/api/v1/poomsae/1/reference-video/"); root-relative paths resolve
 * against the API origin (same origin through the edge proxy when API_URL is
 * empty, which keeps the auth cookie first-party and within CSP media-src
 * 'self'); bare relative paths are relative to the versioned API base.
 */
export function referenceVideoSrc(
  p: Pick<Poomsae, "id" | "has_reference_video" | "reference_video_url">,
): string | null {
  if (!p.has_reference_video) return null;
  const url = p.reference_video_url?.trim() || `poomsae/${p.id}/reference-video/`;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${config.apiUrl || ""}${url}`;
  const prefix = config.apiPrefix ? `/${config.apiPrefix}` : "";
  return `${config.apiUrl || ""}${prefix}/${url}`;
}

/** Validation of a video file picked for upload (full attempt or reference). */
export function validateVideoFile(file: File, maxBytes: number): string | null {
  const okType =
    /^video\/(mp4|webm|quicktime)$/i.test(file.type) || /\.(mp4|webm|mov)$/i.test(file.name);
  if (!okType) return "Formato no admitido. Usa un video MP4, WebM o MOV.";
  if (file.size > maxBytes) {
    return `El video pesa ${formatMegabytes(file.size)}; el máximo es ${formatMegabytes(maxBytes)}.`;
  }
  return null;
}

export function formatMegabytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

/** Editable fields of a script movement (admin table). */
export type MovementDraft = Pick<
  PoomsaeMovement,
  "name" | "turn_deg" | "step" | "kihap" | "hold" | "stance" | "hand" | "kick"
>;

export function toMovementDraft(m: PoomsaeMovement): MovementDraft {
  return {
    name: m.name,
    turn_deg: m.turn_deg,
    step: m.step,
    kihap: m.kihap,
    hold: m.hold,
    stance: m.stance,
    hand: m.hand,
    kick: m.kick,
  };
}

/** Only the fields that changed (PATCH body); {} when nothing changed. */
export function movementPatch(original: PoomsaeMovement, draft: MovementDraft) {
  const patch: Partial<MovementDraft> = {};
  const base = toMovementDraft(original);
  for (const key of Object.keys(base) as (keyof MovementDraft)[]) {
    if (base[key] !== draft[key]) (patch as Record<string, unknown>)[key] = draft[key];
  }
  if (typeof patch.name === "string") patch.name = patch.name.trim();
  return patch;
}

export function normalizeScriptCheck(data: unknown): ScriptCheckResult {
  if (!isObj(data)) return { attempt: null, mismatches: [], ok: false };
  const pick = (x: unknown) => (typeof x === "number" || typeof x === "string" ? x : null);
  const mismatches: ScriptMismatch[] = list(data.mismatches)
    .filter(isObj)
    .map((m) => {
      const number = num(m.number) ?? 0;
      return {
        number,
        name: str(m.name) || `Movimiento ${number}`,
        kind: str(m.kind),
        expected: pick(m.expected),
        measured: pick(m.measured),
        suggestion: str(m.suggestion),
      };
    })
    .sort((a, b) => a.number - b.number);
  const attempt = isObj(data.attempt) ? num(data.attempt.id) : num(data.attempt);
  return {
    attempt,
    mismatches,
    ok: data.ok === true || (data.ok == null && mismatches.length === 0),
  };
}

export const MISMATCH_KIND_LABEL: Record<string, string> = {
  missing: "No detectado",
  turn: "Giro",
  step: "Desplazamiento",
  stance: "Posición",
  hand: "Técnica de mano",
  kick: "Patada",
  hand_shape: "Forma de la mano",
};

/** Show "Guion provisional" only when the API explicitly says it isn't reviewed. */
export function isScriptProvisional(p: Pick<Poomsae, "script_reviewed"> | null | undefined) {
  return p?.script_reviewed === false;
}
