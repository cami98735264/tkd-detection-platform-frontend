// Shared state shape and constants of the enrollment wizard (EnrollmentFormSheet).

export type AthleteMode = "link" | "register";

export const STEPS = [
  {
    id: 1,
    title: "Datos Personales",
    description: "Selecciona o registra al deportista y elige el programa",
  },
  {
    id: 2,
    title: "Datos del Acudiente",
    description: "Acudiente requerido para deportistas menores de edad",
  },
  {
    id: 3,
    title: "Consentimientos",
    description: "Confirmación y autorizaciones",
  },
];

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export interface EnrollmentExtras {
  program_id: number | null;
  start_date: string;
  end_date: string;
  notes: string;
  blood_type: string;
  certificado_medico: File | null;
  guardian_documento: string;
  guardian_address: string;
  acepta_terminos: boolean;
  acepta_datos: boolean;
  acepta_imagenes: boolean;
  confirmacion_precision: boolean;
}

export const emptyExtras = (): EnrollmentExtras => ({
  program_id: null,
  start_date: "",
  end_date: "",
  notes: "",
  blood_type: "",
  certificado_medico: null,
  guardian_documento: "",
  guardian_address: "",
  acepta_terminos: false,
  acepta_datos: false,
  acepta_imagenes: false,
  confirmacion_precision: false,
});
