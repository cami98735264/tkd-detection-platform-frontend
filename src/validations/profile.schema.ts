import * as Yup from "yup";

export const profileValidationSchema = Yup.object({
  nombres: Yup.string()
    .min(2, "Debe tener al menos 2 caracteres")
    .required("El nombre es obligatorio"),

  apellidos: Yup.string()
    .min(2, "Debe tener al menos 2 caracteres")
    .required("El apellido es obligatorio"),

  telefono: Yup.string()
    .min(7, "Número inválido")
    .required("El teléfono es obligatorio"),

  documento: Yup.string()
    .min(6, "Documento inválido")
    .required("El documento es obligatorio"),

  date_of_birth: Yup.string().nullable().defined(),

  address: Yup.string().defined(),
});
