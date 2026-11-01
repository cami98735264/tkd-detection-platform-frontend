import { http } from "@/lib/http";
import { asList, toQuery } from "@/lib/list";
import type { PaginatedResponse } from "@/types/api";

import type {
  BeltOption,
  BeltPromotion,
  BeltPromotionPayload,
  DiplomaPermission,
  DiplomaPermissionPayload,
  ExamCriteria,
  ExamResult,
  FinalizeResponse,
  MyDiplomaPermission,
  PromotionExam,
  PromotionExamPayload,
} from "../types";

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

/** Multipart body for a manual promotion registration (scan optional). */
export function promotionFormData(data: BeltPromotionPayload): FormData {
  const fd = new FormData();
  fd.append("athlete", String(data.athlete));
  if (data.from_belt != null) fd.append("from_belt", String(data.from_belt));
  fd.append("to_belt", String(data.to_belt));
  fd.append("promotion_date", data.promotion_date);
  if (data.notes) fd.append("notes", data.notes);
  if (data.diploma_file) fd.append("diploma_file", data.diploma_file);
  return fd;
}

export const promotionsApi = {
  // ---- Exams ----
  criteria: () => http.get<ExamCriteria>("/promotion-exams/criteria/"),

  listExams: (
    params: { athleteId?: number | null; result?: ExamResult | ""; page?: number } = {},
  ) =>
    http.get<PaginatedResponse<PromotionExam>>(
      `/promotion-exams/${toQuery({
        athlete_id: params.athleteId,
        result: params.result,
        page: params.page,
      })}`,
    ),

  getExam: (id: number) => http.get<PromotionExam>(`/promotion-exams/${id}/`),

  createExam: (data: PromotionExamPayload) => http.post<PromotionExam>("/promotion-exams/", data),

  updateExam: (id: number, data: Partial<PromotionExamPayload>) =>
    http.patch<PromotionExam>(`/promotion-exams/${id}/`, data),

  deleteExam: (id: number) => http.delete(`/promotion-exams/${id}/`),

  finalizeExam: (id: number) => http.post<FinalizeResponse>(`/promotion-exams/${id}/finalize/`, {}),

  // ---- Promotions / diplomas ----
  listPromotions: (params: { athleteId?: number | null; page?: number } = {}) =>
    http.get<PaginatedResponse<BeltPromotion>>(
      `/belt-promotions/${toQuery({ athlete_id: params.athleteId, page: params.page })}`,
    ),

  createPromotion: (data: BeltPromotionPayload) =>
    data.diploma_file
      ? http.post<BeltPromotion>("/belt-promotions/", promotionFormData(data), MULTIPART)
      : http.post<BeltPromotion>("/belt-promotions/", {
          athlete: data.athlete,
          from_belt: data.from_belt ?? null,
          to_belt: data.to_belt,
          promotion_date: data.promotion_date,
          notes: data.notes ?? "",
        }),

  updatePromotion: (id: number, data: Partial<Omit<BeltPromotionPayload, "diploma_file">>) =>
    http.patch<BeltPromotion>(`/belt-promotions/${id}/`, data),

  deletePromotion: (id: number) => http.delete(`/belt-promotions/${id}/`),

  uploadScan: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return http.post<BeltPromotion>(`/belt-promotions/${id}/upload/`, fd, MULTIPART);
  },

  authorize: (id: number, authorized: boolean) =>
    http.post<BeltPromotion>(`/belt-promotions/${id}/authorize/`, { authorized }),

  /** Authenticated paths for downloadFile(). */
  scanUrl: (p: Pick<BeltPromotion, "id" | "file_url">) =>
    p.file_url || `/api/v1/belt-promotions/${p.id}/file/`,
  diplomaUrl: (p: Pick<BeltPromotion, "id" | "diploma_url">) =>
    p.diploma_url || `/api/v1/belt-promotions/${p.id}/diploma/`,

  // ---- Diploma permissions ----
  listPermissions: (athleteId?: number | null) =>
    http
      .get<unknown>(`/diploma-permissions/${toQuery({ athlete_id: athleteId, page_size: 100 })}`)
      .then((d) => asList<DiplomaPermission>(d)),

  createPermission: (data: DiplomaPermissionPayload) =>
    http.post<DiplomaPermission>("/diploma-permissions/", data),

  updatePermission: (
    id: number,
    data: Partial<Pick<DiplomaPermission, "can_register" | "can_download_generated">>,
  ) => http.patch<DiplomaPermission>(`/diploma-permissions/${id}/`, data),

  revokePermission: (id: number) => http.delete(`/diploma-permissions/${id}/`),

  myPermissions: () =>
    http.get<unknown>("/diploma-permissions/mine/").then((d) => asList<MyDiplomaPermission>(d)),

  // ---- Belts (catalogue for the selects) ----
  belts: () =>
    http.get<unknown>("/belts/?page_size=100").then((d) =>
      asList<BeltOption>(d)
        .slice()
        .sort((a, b) => (a.grado ?? 0) - (b.grado ?? 0)),
    ),
};
