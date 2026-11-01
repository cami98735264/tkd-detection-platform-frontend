// Req 6 + 6.1 — belt promotion exams, promotions (diplomas) and permissions.
// Mirrors docs/listado-1-requirements-contract.md (apps.promotions).

export type ExamResult = "pending" | "approved" | "rejected";

export interface TechnicalScore {
  criterion: string;
  score: number;
  weight: number;
  notes?: string;
}

export interface AdminCheckDef {
  key: string;
  label: string;
}

/** GET /promotion-exams/criteria/ */
export interface ExamCriteria {
  criteria: TechnicalScore[];
  passing_score: number;
  admin_checks: AdminCheckDef[];
}

export type AdminChecks = Record<string, boolean>;

export interface PromotionExam {
  id: number;
  athlete: number;
  athlete_name?: string;
  from_belt: number | null;
  from_belt_name?: string | null;
  to_belt: number;
  to_belt_name?: string | null;
  exam_date: string;
  examiner?: number | null;
  examiner_name?: string | null;
  technical_scores: TechnicalScore[];
  technical_score: number | null;
  passing_score: number;
  admin_checks: AdminChecks;
  result: ExamResult;
  notes: string;
  evaluation?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface PromotionExamPayload {
  athlete: number;
  from_belt?: number | null;
  to_belt: number;
  exam_date: string;
  technical_scores: TechnicalScore[];
  passing_score: number;
  admin_checks?: AdminChecks;
  notes?: string;
}

export interface BeltPromotion {
  id: number;
  athlete: number;
  athlete_name: string;
  from_belt: number | null;
  from_belt_name: string | null;
  to_belt: number;
  to_belt_name: string | null;
  promotion_date: string;
  exam: number | null;
  exam_result?: ExamResult | null;
  diploma_number: string;
  diploma_authorized: boolean;
  authorized_by?: number | null;
  authorized_at?: string | null;
  has_file: boolean;
  file_url: string | null;
  diploma_original_filename?: string | null;
  /** null when THIS user may not download the generated diploma. */
  diploma_url: string | null;
  can_download_diploma: boolean;
  can_edit: boolean;
  registered_by?: number | null;
  registered_by_name?: string | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface BeltPromotionPayload {
  athlete: number;
  from_belt?: number | null;
  to_belt: number;
  promotion_date: string;
  notes?: string;
  diploma_file?: File | null;
}

export interface FinalizeResponse {
  exam: PromotionExam;
  promotion: BeltPromotion | null;
}

export interface DiplomaPermission {
  id: number;
  athlete: number;
  athlete_name?: string;
  user: number;
  user_name?: string;
  user_email?: string;
  can_register: boolean;
  can_download_generated: boolean;
  granted_by?: number | null;
  granted_at?: string;
  revoked_at?: string | null;
}

export interface DiplomaPermissionPayload {
  athlete: number;
  user: number;
  can_register: boolean;
  can_download_generated: boolean;
}

/** GET /diploma-permissions/mine/ */
export interface MyDiplomaPermission {
  athlete: number;
  athlete_name: string;
  can_register: boolean;
  can_download_generated: boolean;
}

export interface BeltOption {
  id: number;
  nombre: string;
  grado?: number;
}
