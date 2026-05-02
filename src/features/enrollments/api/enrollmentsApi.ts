import { http, axiosInstance } from "@/lib/http";
import type { PaginatedResponse } from "@/types/api";
import type { Enrollment, EnrollmentCreatePayload } from "@/types/entities";

export const enrollmentsApi = {
  list: (page = 1) =>
    http.get<PaginatedResponse<Enrollment>>(`/enrollments/?page=${page}`),

  get: (id: number) => http.get<Enrollment>(`/enrollments/${id}/`),

  getMyEnrollments: () =>
    http.get<Enrollment[]>("/enrollments/me/"),

  create: (data: EnrollmentCreatePayload) => {
    // If there's a file, use FormData
    if (data.certificado_medico) {
      const formData = new FormData();
      formData.append("athlete_id", String(data.athlete_id));
      formData.append("program_id", String(data.program_id));
      formData.append("start_date", data.start_date);
      if (data.end_date) formData.append("end_date", data.end_date);
      if (data.notes) formData.append("notes", data.notes);
      if (data.blood_type) formData.append("blood_type", data.blood_type);
      formData.append("certificado_medico", data.certificado_medico);
      if (data.guardian_full_name) formData.append("guardian_full_name", data.guardian_full_name);
      if (data.guardian_documento) formData.append("guardian_documento", data.guardian_documento);
      if (data.guardian_relationship) formData.append("guardian_relationship", data.guardian_relationship);
      if (data.guardian_email) formData.append("guardian_email", data.guardian_email);
      if (data.guardian_address) formData.append("guardian_address", data.guardian_address);
      formData.append("acepta_terminos", String(data.acepta_terminos));
      formData.append("acepta_datos", String(data.acepta_datos));
      formData.append("acepta_imagenes", String(data.acepta_imagenes));
      formData.append("confirmacion_precision", String(data.confirmacion_precision));
      return axiosInstance.post<Enrollment>("/enrollments/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(r => r.data);
    }
    return http.post<Enrollment>("/enrollments/", data);
  },

  update: (id: number, data: Partial<EnrollmentCreatePayload>) => {
    if (data.certificado_medico) {
      const formData = new FormData();
      if (data.athlete_id) formData.append("athlete_id", String(data.athlete_id));
      if (data.program_id) formData.append("program_id", String(data.program_id));
      if (data.start_date) formData.append("start_date", data.start_date);
      if (data.end_date) formData.append("end_date", data.end_date);
      if (data.notes) formData.append("notes", data.notes);
      if (data.blood_type) formData.append("blood_type", data.blood_type);
      formData.append("certificado_medico", data.certificado_medico);
      if (data.guardian_full_name) formData.append("guardian_full_name", data.guardian_full_name);
      if (data.guardian_documento) formData.append("guardian_documento", data.guardian_documento);
      if (data.guardian_relationship) formData.append("guardian_relationship", data.guardian_relationship);
      if (data.guardian_email) formData.append("guardian_email", data.guardian_email);
      if (data.guardian_address) formData.append("guardian_address", data.guardian_address);
      if (data.acepta_terminos !== undefined) formData.append("acepta_terminos", String(data.acepta_terminos));
      if (data.acepta_datos !== undefined) formData.append("acepta_datos", String(data.acepta_datos));
      if (data.acepta_imagenes !== undefined) formData.append("acepta_imagenes", String(data.acepta_imagenes));
      if (data.confirmacion_precision !== undefined) formData.append("confirmacion_precision", String(data.confirmacion_precision));
      return axiosInstance.put<Enrollment>(`/enrollments/${id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then(r => r.data);
    }
    return http.put<Enrollment>(`/enrollments/${id}/`, data);
  },

  delete: (id: number) => http.delete(`/enrollments/${id}/`),
};
