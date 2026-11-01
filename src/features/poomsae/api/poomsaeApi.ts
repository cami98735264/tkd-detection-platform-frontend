import { axiosInstance, http } from "@/lib/http";
import { asList, toQuery } from "@/lib/list";
import type { PaginatedResponse } from "@/types/api";

import { normalizeCalibrations, normalizeProposal, normalizeStats } from "../lib/calibration";
import {
  normalizeMovement,
  normalizeMovements,
  normalizeScriptCheck,
  type MovementDraft,
} from "../lib/sequence";
import type {
  AttemptMode,
  AttemptStatus,
  AttemptUpload,
  CalibrationProposal,
  CalibrationTolerance,
  Poomsae,
  PoomsaeAttempt,
  PoomsaeDetail,
  PoomsaeMovement,
  ScriptCheckResult,
  Technique,
  TechniqueCalibration,
  TechniqueStats,
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
  if (data.mode === "full" && data.poomsae != null) fd.append("poomsae", String(data.poomsae));
  if (data.athlete != null) fd.append("athlete", String(data.athlete));
  if (data.recording) {
    const ext = data.recording.type.includes("mp4") ? "mp4" : "webm";
    const name =
      data.recording instanceof File && data.recording.name
        ? data.recording.name
        : `intento.${ext}`;
    fd.append("recording", data.recording, name);
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
      // Full run-throughs may be up to 90 MB.
      timeout: data.mode === "full" ? 600_000 : 120_000,
    }),

  getAttempt: (id: number) => http.get<PoomsaeAttempt>(`/poomsae/attempts/${id}/`),

  listAttempts: (
    params: {
      athleteId?: number | null;
      segment?: number | null;
      technique?: number | null;
      poomsae?: number | null;
      mode?: AttemptMode | null;
      status?: AttemptStatus | null;
      page?: number;
    } = {},
  ) =>
    http.get<PaginatedResponse<PoomsaeAttempt>>(
      `/poomsae/attempts/${toQuery({
        athlete_id: params.athleteId,
        segment: params.segment,
        technique: params.technique,
        poomsae: params.poomsae,
        mode: params.mode,
        status: params.status,
        page: params.page,
      })}`,
    ),

  // --- Addendum C ----------------------------------------------------------

  /** GET /poomsae/{id}/movements/ (unpaginated, ordered by number). */
  movements: (poomsaeId: number): Promise<PoomsaeMovement[]> =>
    http.get<unknown>(`/poomsae/${poomsaeId}/movements/`).then(normalizeMovements),

  /** PATCH /poomsae/movements/{id}/ (admin). */
  updateMovement: (
    id: number,
    patch: Partial<MovementDraft> & { description?: string },
  ): Promise<PoomsaeMovement | null> =>
    http.patch<unknown>(`/poomsae/movements/${id}/`, patch).then(normalizeMovement),

  /** PATCH /poomsae/{id}/ JSON fields (admin). */
  updatePoomsae: (
    id: number,
    patch: Partial<
      Pick<Poomsae, "video_url" | "video_source" | "video_credit" | "video_license_note" | "active">
    >,
  ) => http.patch<PoomsaeDetail>(`/poomsae/${id}/`, patch),

  /** Upload/replace the club-hosted reference video (multipart, admin). */
  uploadReferenceVideo: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("reference_video", file, file.name);
    return axiosInstance
      .patch<PoomsaeDetail>(`/poomsae/${id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600_000,
      })
      .then((r) => r.data);
  },

  /** Remove the club-hosted reference video (admin). */
  removeReferenceVideo: (id: number) =>
    http.patch<PoomsaeDetail>(`/poomsae/${id}/`, { remove_reference_video: true }),

  /** GET /poomsae/techniques/{id}/stats/?since= (admin). */
  techniqueStats: (id: number, since?: string | null): Promise<TechniqueStats> =>
    http.get<unknown>(`/poomsae/techniques/${id}/stats/${toQuery({ since })}`).then(normalizeStats),

  /** POST /poomsae/techniques/{id}/calibrate/ — preview (apply=false) or apply. */
  calibrate: (
    id: number,
    body: { attempt_ids: number[]; tolerance: CalibrationTolerance; apply: boolean },
  ): Promise<CalibrationProposal> =>
    http.post<unknown>(`/poomsae/techniques/${id}/calibrate/`, body).then(normalizeProposal),

  /** GET /poomsae/techniques/{id}/calibrations/ (history). */
  calibrations: (id: number): Promise<TechniqueCalibration[]> =>
    http.get<unknown>(`/poomsae/techniques/${id}/calibrations/`).then(normalizeCalibrations),

  /** POST /poomsae/techniques/{id}/calibrations/{cid}/revert/. */
  revertCalibration: (id: number, calibrationId: number) =>
    http.post<unknown>(`/poomsae/techniques/${id}/calibrations/${calibrationId}/revert/`),

  /** POST /poomsae/{id}/review-script/ (admin): mark the script reviewed + notes (C.9). */
  reviewScript: (id: number, body: { reviewed: boolean; notes: string }) =>
    http.post<PoomsaeDetail>(`/poomsae/${id}/review-script/`, body),

  /** POST /poomsae/{id}/script-check/ (admin): compare the script with a reference attempt. */
  scriptCheck: (id: number, attemptId: number): Promise<ScriptCheckResult> =>
    http
      .post<unknown>(`/poomsae/${id}/script-check/`, { attempt_id: attemptId })
      .then(normalizeScriptCheck),
};
