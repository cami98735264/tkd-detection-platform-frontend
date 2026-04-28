// ---------------------------------------------------------------------------
// Entity types — mirrors the Django REST Framework serializers exactly
// ---------------------------------------------------------------------------

/** GET /api/auth/me/ — MeSerializer */
export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  is_staff: boolean;
  role: "sportsman" | "parent" | "administrator";
}

/** GET/PUT /api/profile/ — UserProfileSerializer */
export interface Profile {
  user_id: number;
  nombres: string;
  apellidos: string;
  telefono: string;
  documento: string;
  date_of_birth: string | null;
  address: string;
  updated_at: string;
}

/** /api/athletes/ — AthleteSerializer */
export interface Athlete {
  id: number;
  user: number | null;
  full_name: string;
  date_of_birth: string | null;
  categoria_competencia: number | null;
  categoria_competencia_name: string | null;
  status: "active" | "inactive";
  belt_actual: number | null;
  belt_actual_name: string | null;
  created_at: string;
  updated_at: string;
}

/** /api/parent-athletes/ — ParentAthleteSerializer */
export interface ParentAthlete {
  id: number;
  parent: number;
  athlete: number;
  relationship: "mother" | "father" | "guardian";
  created_at: string;
}

/** /api/programs/ — ProgramSerializer */
export interface Program {
  id: number;
  name: string;
  description: string | null;
  capacity: number | null;
  active: boolean;
  schedule?: string | null;
  created_at: string;
  updated_at: string;
}

/** /api/editions/ — EditionSerializer */
export interface Edition {
  id: number;
  program: number;
  program_name: string;
  start_date: string;
  end_date: string | null;
  schedule: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** /api/enrollments/ — EnrollmentSerializer */
export interface Enrollment {
  id: number;
  athlete: number;
  athlete_name?: string;
  program: number;
  program_name?: string;
  enrolled_at: string;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "dropped";
  notes: string | null;
  certificado_medico_adjunto: string;
  consentimiento_menor: boolean;
  blood_type: string;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_imagenes: boolean;
  confirmacion_precision: boolean;
  fecha_aceptacion: string | null;
  updated_at: string;
}

/** Enrollment creation payload */
export interface EnrollmentCreatePayload {
  athlete_id: number;
  program_id: number;
  start_date: string;
  end_date?: string | null;
  notes?: string;
  blood_type?: string;
  certificado_medico?: File;
  guardian_full_name?: string;
  guardian_documento?: string;
  guardian_relationship?: string;
  guardian_email?: string;
  guardian_address?: string;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_imagenes: boolean;
  confirmacion_precision: boolean;
}

/** Nested inside Evaluation — EvaluationMetricSerializer */
export interface EvaluationMetric {
  id: number;
  metric_name: string;
  score: number;
  notes: string | null;
}

/** /api/evaluations/ — EvaluationSerializer */
export interface Evaluation {
  id: number;
  athlete: number;
  athlete_id: number;
  athlete_name: string;
  evaluator: number;
  evaluator_id: number;
  evaluator_name: string;
  program: number | null;
  program_id: number | null;
  evaluated_at: string;
  result_summary: string;
  metrics: EvaluationMetric[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** /api/competition-categories/ — CompetitionCategorySerializer */
export interface CompetitionCategory {
  id: number;
  nombre: string;
  edad_min: number;
  edad_max: number;
  belt_from: number;
  belt_to: number;
  belt_from_name: string;
  belt_to_name: string;
  peso_min: number;
  peso_max: number;
  created_at: string;
  updated_at: string;
}

/** /api/reports/ — ReportSerializer */
export interface Report {
  id: number;
  title: string;
  report_type: "enrollment" | "performance" | "attendance" | "custom";
  created_by_id: number;
  created_by_name: string;
  filters_applied: Record<string, unknown>;
  status: "pending" | "completed" | "failed";
  generated_at: string | null;
  file_reference: string | null;
  created_at: string;
  expires_at: string | null;
}
