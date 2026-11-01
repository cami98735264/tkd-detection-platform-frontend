import { http } from "@/lib/http";
import { asList, toQuery } from "@/lib/list";
import type { PaginatedResponse } from "@/types/api";

import type {
  AttemptUpload,
  Poomsae,
  PoomsaeAttempt,
  PoomsaeDetail,
  Technique,
  TechniqueElement,
} from "../types";

/** Multipart body for POST /poomsae/attempts/ (recording or landmarks JSON). */
export function attemptFormData(data: AttemptUpload): FormData {
  const fd = new FormData();
  fd.append("mode", data.mode);
  if (data.mode === "segment" && data.segment != null) fd.append("segment", String(data.segment));
  if (data.mode === "technique" && data.technique != null) {
    fd.append("technique", String(data.technique));
  }
  if (data.athlete != null) fd.append("athlete", String(data.athlete));
  if (data.recording) {
    const ext = data.recording.type.includes("mp4") ? "mp4" : "webm";
    fd.append("recording", data.recording, `intento.${ext}`);
  } else if (data.landmarks && data.landmarks.length > 0) {
    fd.append("landmarks", JSON.stringify(data.landmarks));
  }
  return fd;
}

export const poomsaeApi = {
  list: () => http.get<unknown>("/poomsae/").then((d) => asList<Poomsae>(d)),

  get: (id: number, athleteId?: number | null) =>
    http.get<PoomsaeDetail>(`/poomsae/${id}/${toQuery({ athlete_id: athleteId })}`),

  techniques: (element?: TechniqueElement) =>
    http
      .get<unknown>(`/poomsae/techniques/${toQuery({ element })}`)
      .then((d) => asList<Technique>(d)),

  createAttempt: (data: AttemptUpload) =>
    http.post<Pick<PoomsaeAttempt, "id" | "status">>("/poomsae/attempts/", attemptFormData(data), {
      headers: { "Content-Type": "multipart/form-data" },
      // Large uploads over mobile links: the global 10 s timeout is too tight.
      timeout: 120_000,
    }),

  getAttempt: (id: number) => http.get<PoomsaeAttempt>(`/poomsae/attempts/${id}/`),

  listAttempts: (
    params: {
      athleteId?: number | null;
      segment?: number | null;
      technique?: number | null;
      page?: number;
    } = {},
  ) =>
    http.get<PaginatedResponse<PoomsaeAttempt>>(
      `/poomsae/attempts/${toQuery({
        athlete_id: params.athleteId,
        segment: params.segment,
        technique: params.technique,
        page: params.page,
      })}`,
    ),
};
