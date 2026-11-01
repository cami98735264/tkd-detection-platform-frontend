import { describe, expect, it } from "vitest";

import {
  embedWithRange,
  formatSeconds,
  groupByElement,
  resolveVideo,
  segmentBest,
  toNoCookieEmbed,
  youtubeId,
} from "./video";
import type { PoomsaeSegment, Technique } from "../types";

const ID = "dQw4w9WgXcQ";

describe("youtubeId / toNoCookieEmbed", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}&t=10`,
    `https://youtu.be/${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/embed/${ID}?start=3`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://youtube.com/shorts/${ID}`,
  ])("parses %s", (url) => {
    expect(youtubeId(url)).toBe(ID);
    expect(toNoCookieEmbed(url)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
  });

  it("rejects other hosts and malformed ids", () => {
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(youtubeId("not a url")).toBeNull();
    expect(youtubeId(null)).toBeNull();
    expect(youtubeId("https://evil.example/embed/" + ID)).toBeNull();
  });
});

describe("embedWithRange", () => {
  const base = `https://www.youtube-nocookie.com/embed/${ID}`;
  it("adds start/end/autoplay", () => {
    const u = new URL(embedWithRange(base, 12.7, 20.2, true));
    expect(u.searchParams.get("start")).toBe("12");
    expect(u.searchParams.get("end")).toBe("21");
    expect(u.searchParams.get("autoplay")).toBe("1");
    expect(u.searchParams.get("rel")).toBe("0");
  });
  it("drops an end before the start", () => {
    const u = new URL(embedWithRange(base, 30, 10));
    expect(u.searchParams.has("end")).toBe(false);
    expect(u.searchParams.has("autoplay")).toBe(false);
  });
});

describe("resolveVideo", () => {
  it("prefers the youtube-nocookie embed", () => {
    expect(
      resolveVideo({
        video_url: `https://youtu.be/${ID}`,
        video_embed_url: null,
        video_source: "youtube",
      }),
    ).toEqual({ kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${ID}` });
  });
  it("plays club files with HTML5 video", () => {
    expect(
      resolveVideo({
        video_url: "/media/poomsae/1.mp4",
        video_embed_url: null,
        video_source: "club",
      }),
    ).toEqual({ kind: "file", src: "/media/poomsae/1.mp4" });
  });
  it("returns none when there is no usable video", () => {
    expect(resolveVideo({ video_url: "", video_embed_url: null, video_source: null })).toEqual({
      kind: "none",
    });
    expect(
      resolveVideo({
        video_url: "https://example.com/page",
        video_embed_url: null,
        video_source: "external",
      }),
    ).toEqual({ kind: "none" });
  });
});

describe("helpers", () => {
  it("formats seconds", () => {
    expect(formatSeconds(75)).toBe("1:15");
    expect(formatSeconds(5)).toBe("0:05");
    expect(formatSeconds(null)).toBe("—");
  });

  it("groups techniques in teaching order", () => {
    const t = (id: number, element: Technique["element"]) =>
      ({ id, code: String(id), name: String(id), element }) as Technique;
    const groups = groupByElement([t(1, "kick"), t(2, "stance"), t(3, "stance")]);
    expect(groups.map((g) => g.label)).toEqual(["Posiciones", "Patadas"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("reads either best-score field", () => {
    expect(segmentBest({ best_score: 80 } as PoomsaeSegment)).toBe(80);
    expect(segmentBest({ my_best_score: 60 } as PoomsaeSegment)).toBe(60);
    expect(segmentBest({} as PoomsaeSegment)).toBeNull();
  });
});
