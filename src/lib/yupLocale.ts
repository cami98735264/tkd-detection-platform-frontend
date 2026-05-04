import { setLocale } from "yup";

setLocale({
  mixed: {
    default: "Valor inválido",
    required: "Este campo es obligatorio",
    defined: "Este campo debe estar definido",
    notNull: "No puede ser nulo",
    oneOf: "Debe ser uno de los siguientes valores: ${values}",
    notOneOf: "No puede ser uno de los siguientes valores: ${values}",
    notType: ({ type }) => `El valor debe ser de tipo ${type}`,
  },
  string: {
    length: "Debe tener exactamente ${length} caracteres",
    min: "Debe tener al menos ${min} caracteres",
    max: "Debe tener máximo ${max} caracteres",
    matches: 'Formato inválido: debe coincidir con "${regex}"',
    email: "Debe ser un correo electrónico válido",
    url: "Debe ser una URL válida",
    uuid: "Debe ser un UUID válido",
    trim: "No debe tener espacios al inicio ni al final",
    lowercase: "Debe estar en minúsculas",
    uppercase: "Debe estar en mayúsculas",
  },
  number: {
    min: "Debe ser mayor o igual a ${min}",
    max: "Debe ser menor o igual a ${max}",
    lessThan: "Debe ser menor a ${less}",
    moreThan: "Debe ser mayor a ${more}",
    positive: "Debe ser un número positivo",
    negative: "Debe ser un número negativo",
    integer: "Debe ser un número entero",
  },
  date: {
    min: "Debe ser posterior a ${min}",
    max: "Debe ser anterior a ${max}",
  },
  boolean: {
    isValue: "Debe ser ${value}",
  },
  object: {
    noUnknown: "Contiene campos no permitidos",
  },
  array: {
    min: "Debe tener al menos ${min} elementos",
    max: "Debe tener máximo ${max} elementos",
    length: "Debe tener exactamente ${length} elementos",
  },
});
