import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PoomsaeVideo from "./PoomsaeVideo";

const base = {
  name: "Taegeuk Il Jang",
  video_url: null,
  video_embed_url: null,
  video_source: null,
  video_credit: null,
  video_license_note: null,
};

describe("PoomsaeVideo", () => {
  it("embeds YouTube through youtube-nocookie with the segment range and credit", () => {
    render(
      <PoomsaeVideo
        poomsae={{
          ...base,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          video_source: "youtube",
          video_credit: "Kukkiwon",
          video_license_note: "Uso educativo autorizado.",
        }}
        range={{ start: 10, end: 20, nonce: 1 }}
      />,
    );
    const iframe = screen.getByTitle("Video de referencia: Taegeuk Il Jang");
    const src = new URL(iframe.getAttribute("src")!);
    expect(src.origin).toBe("https://www.youtube-nocookie.com");
    expect(src.searchParams.get("start")).toBe("10");
    expect(src.searchParams.get("end")).toBe("20");
    expect(screen.getByText(/Kukkiwon/)).toBeInTheDocument();
  });

  it("shows a fallback when there is no video", () => {
    render(<PoomsaeVideo poomsae={base} />);
    expect(screen.getByText("Video de referencia no disponible")).toBeInTheDocument();
  });

  it("plays club videos with an HTML5 player", () => {
    render(
      <PoomsaeVideo poomsae={{ ...base, video_url: "/media/p/1.mp4", video_source: "club" }} />,
    );
    expect(screen.getByLabelText("Video de referencia: Taegeuk Il Jang").tagName).toBe("VIDEO");
  });
});
