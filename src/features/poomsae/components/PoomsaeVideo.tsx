import { useEffect, useRef } from "react";
import { VideoOff } from "lucide-react";

import { embedWithRange, resolveVideo } from "../lib/video";
import type { Poomsae } from "../types";

export interface VideoRange {
  start: number | null;
  end: number | null;
  /** Bumped on every "jump" so the same range can be replayed. */
  nonce: number;
}

interface Props {
  poomsae: Pick<
    Poomsae,
    | "name"
    | "video_url"
    | "video_embed_url"
    | "video_source"
    | "video_credit"
    | "video_license_note"
  >;
  range?: VideoRange | null;
}

/**
 * Reference video: youtube-nocookie iframe (no download), HTML5 <video> for
 * club-hosted files, or a fallback message. A `range` jumps to a segment.
 */
export default function PoomsaeVideo({ poomsae, range }: Props) {
  const video = resolveVideo(poomsae);
  const videoRef = useRef<HTMLVideoElement>(null);

  // HTML5 player: seek and stop at the segment end.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !range) return;
    if (range.start != null) el.currentTime = range.start;
    const end = range.end;
    const onTime = () => {
      if (end != null && el.currentTime >= end) el.pause();
    };
    el.addEventListener("timeupdate", onTime);
    void el.play?.()?.catch?.(() => {});
    return () => el.removeEventListener("timeupdate", onTime);
  }, [range]);

  const credit = (poomsae.video_credit || poomsae.video_license_note) && (
    <p className="mt-2 text-xs text-faint">
      {poomsae.video_credit && <>Video: {poomsae.video_credit}. </>}
      {poomsae.video_license_note}
    </p>
  );

  if (video.kind === "youtube") {
    const src = range
      ? embedWithRange(video.embedUrl, range.start, range.end, true)
      : embedWithRange(video.embedUrl);
    return (
      <div>
        <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            key={range ? `${range.start}-${range.end}-${range.nonce}` : "full"}
            src={src}
            title={`Video de referencia: ${poomsae.name}`}
            className="absolute inset-0 h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            allowFullScreen
          />
        </div>
        {credit}
      </div>
    );
  }

  if (video.kind === "file") {
    return (
      <div>
        <video
          ref={videoRef}
          src={video.src}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-lg border border-border bg-black"
          aria-label={`Video de referencia: ${poomsae.name}`}
        />
        {credit}
      </div>
    );
  }

  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2/50 p-6 text-center">
      <VideoOff className="h-8 w-8 text-faint" aria-hidden="true" />
      <p className="text-sm font-medium text-text">Video de referencia no disponible</p>
      <p className="max-w-sm text-xs text-muted">
        El club aún no ha publicado un video verificado para este poomsae. Guíate por la descripción
        de cada segmento y por las indicaciones de tu maestro.
      </p>
    </div>
  );
}
