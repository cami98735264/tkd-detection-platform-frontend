import type { Poomsae, PoomsaeSegment, Technique, TechniqueElement } from "../types";
import { referenceVideoSrc } from "./sequence";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-char YouTube video id from any common URL form. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0];
  } else if (
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "music.youtube.com"
  ) {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
      id = m ? m[1] : null;
    }
  }
  return id && YT_ID.test(id) ? id : null;
}

/** Privacy-enhanced embed URL (youtube-nocookie.com), or null for non-YouTube URLs. */
export function toNoCookieEmbed(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/**
 * Embed URL limited to a time range (segment reference). `start`/`end` in
 * seconds; `rel=0` keeps suggestions to the same channel.
 */
export function embedWithRange(
  embedUrl: string,
  start?: number | null,
  end?: number | null,
  autoplay = false,
): string {
  const u = new URL(embedUrl);
  u.searchParams.set("rel", "0");
  u.searchParams.set("modestbranding", "1");
  if (start != null && start >= 0) u.searchParams.set("start", String(Math.floor(start)));
  else u.searchParams.delete("start");
  if (end != null && end > (start ?? 0)) u.searchParams.set("end", String(Math.ceil(end)));
  else u.searchParams.delete("end");
  if (autoplay) u.searchParams.set("autoplay", "1");
  else u.searchParams.delete("autoplay");
  return u.toString();
}

export type ResolvedVideo =
  { kind: "youtube"; embedUrl: string } | { kind: "file"; src: string } | { kind: "none" };

const VIDEO_FILE = /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i;

/**
 * How to show a poomsae's reference video: the club-hosted upload, the server's youtube-nocookie
 * embed (or one derived from a YouTube URL), an HTML5 <video> for club-hosted
 * files (same origin / root-relative), or nothing.
 */
export function resolveVideo(
  p: Pick<Poomsae, "video_url" | "video_embed_url" | "video_source"> &
    Partial<Pick<Poomsae, "id" | "has_reference_video" | "reference_video_url">>,
): ResolvedVideo {
  // Club-hosted upload (C.5) wins: served by the authenticated API endpoint.
  if (p.has_reference_video && p.id != null) {
    const src = referenceVideoSrc({
      id: p.id,
      has_reference_video: true,
      reference_video_url: p.reference_video_url ?? null,
    });
    if (src) return { kind: "file", src };
  }
  const embed =
    (p.video_embed_url && toNoCookieEmbed(p.video_embed_url)) || toNoCookieEmbed(p.video_url);
  if (embed) return { kind: "youtube", embedUrl: embed };
  const url = p.video_url?.trim();
  if (url && (p.video_source === "club" || url.startsWith("/") || VIDEO_FILE.test(url))) {
    return { kind: "file", src: url };
  }
  return { kind: "none" };
}

/** 75 → "1:15". */
export function formatSeconds(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0) return "—";
  const total = Math.floor(s);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export const ELEMENT_LABEL: Record<TechniqueElement, string> = {
  displacement: "Desplazamientos",
  stance: "Posiciones",
  block: "Defensas",
  hand_attack: "Ataques de mano",
  kick: "Patadas",
};

export const ELEMENT_ORDER: TechniqueElement[] = [
  "displacement",
  "stance",
  "block",
  "hand_attack",
  "kick",
];

/** Sequence-mode element scores (Addendum C.2). */
const EXTRA_ELEMENT_LABEL: Record<string, string> = {
  sequence: "Orden y número de movimientos",
  direction: "Giros y desplazamientos",
};

export function elementLabel(key: string): string {
  return ELEMENT_LABEL[key as TechniqueElement] ?? EXTRA_ELEMENT_LABEL[key] ?? key;
}

/** Techniques grouped by element, in the teaching order. Empty groups dropped. */
export function groupByElement(techniques: Technique[]) {
  return ELEMENT_ORDER.map((element) => ({
    element,
    label: ELEMENT_LABEL[element],
    items: techniques.filter((t) => t.element === element),
  })).filter((g) => g.items.length > 0);
}

/** Best score of a segment, whichever field name the serializer used. */
export function segmentBest(s: PoomsaeSegment): number | null {
  return s.best_score ?? s.my_best_score ?? null;
}

/** A segment counts as passed with a completed attempt scoring ≥ 70. */
export const SEGMENT_PASS_SCORE = 70;
