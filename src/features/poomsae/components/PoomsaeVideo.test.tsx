import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/env", () => ({ config: { apiUrl: "", apiPrefix: "api/v1" } }));

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

  it("plays the club-hosted reference video from the API with segment jumps", () => {
    const play = vi.fn(() => Promise.resolve());
    Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play });
    render(
      <PoomsaeVideo
        poomsae={{
          ...base,
          id: 7,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          video_source: "youtube",
          has_reference_video: true,
          reference_video_url: "/api/v1/poomsae/7/reference-video/",
        }}
        segments={[
          { id: 2, order: 2, name: "Final", video_start_s: 30, video_end_s: 45 },
          { id: 1, order: 1, name: "Inicio", video_start_s: 0, video_end_s: 15 },
          { id: 3, order: 3, name: "Sin tiempos", video_start_s: null, video_end_s: null },
        ]}
      />,
    );
    const video = screen.getByLabelText("Video de referencia: Taegeuk Il Jang") as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video.getAttribute("src")).toBe("/api/v1/poomsae/7/reference-video/");
    expect(video).toHaveAttribute("controls");
    expect(screen.queryByTitle(/Video de referencia/)).not.toBeInTheDocument();
    const jumps = screen.getAllByRole("button", { name: /Ir al segmento/ });
    expect(jumps.map((b) => b.textContent)).toEqual(["1. 0:00", "2. 0:30"]);
    fireEvent.click(screen.getByRole("button", { name: "Ir al segmento 2: Final" }));
    expect(video.currentTime).toBe(30);
    expect(play).toHaveBeenCalled();
  });
});
