import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormModal from "@/components/common/FormModal";
import { programsApi } from "@/features/programs/api/programsApi";
import type { Program } from "@/types/entities";
import type { Training } from "../api/trainingsApi";

const TRAINING_TYPES = [
  "Fuerza",
  "Velocidad",
  "Agilidad",
  "Flexibilidad",
  "Sparring",
  "Poomsae",
  "Rompiendo",
  "Evaluación de cinturón",
];

const schema = Yup.object({
  program: Yup.number().min(1, "El programa es obligatorio").required("El programa es obligatorio"),
  nombre: Yup.string().required("El nombre es obligatorio"),
  descripcion: Yup.string().required("La descripción es obligatoria"),
  fecha: Yup.string().required("La fecha es obligatoria"),
  time: Yup.string().required("La hora es obligatoria"),
  numero_atletas: Yup.number().min(1).required("Número de atletas obligatorio"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training?: Training | null;
  onSubmit: (values: {
    program: number;
    nombre: string;
    descripcion: string;
    fecha: string;
    time: string;
    numero_atletas: number;
  }) => Promise<void>;
}

export default function TrainingFormModal({ open, onOpenChange, training, onSubmit }: Props) {
  const isEdit = !!training;
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (open) {
      programsApi
        .list(1, "")
        .then((res) => setPrograms(res.results))
        .catch(() => {});
    }
  }, [open]);

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar entrenamiento" : "Nuevo entrenamiento"}
    >
      {!open ? null : (
        <Formik
          initialValues={{
            program: training?.program ?? 0,
            nombre: training?.nombre ?? "",
            descripcion: training?.descripcion ?? "",
            fecha: training?.fecha ?? "",
            time: training?.time ?? "",
            numero_atletas: training?.numero_atletas ?? 1,
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit(values);
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue, setFieldTouched }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="training-program">Programa</Label>
                <Select
                  value={values.program ? String(values.program) : ""}
                  onValueChange={(v) => {
                    setFieldValue("program", v ? Number(v) : 0);
                    setFieldTouched("program", true, false);
                  }}
                >
                  <SelectTrigger id="training-program">
                    <SelectValue placeholder="Seleccionar programa" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorMessage name="program" component="p" className="text-sm text-error" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="training-type">Tipo de entrenamiento</Label>
                <Select
                  value={values.nombre || ""}
                  onValueChange={(v) => {
                    setFieldValue("nombre", v);
                    setFieldTouched("nombre", true, false);
                  }}
                >
                  <SelectTrigger id="training-type">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ErrorMessage name="nombre" component="p" className="text-sm text-error" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="training-descripcion">Descripción</Label>
                <Field as={Input} id="training-descripcion" name="descripcion" />
                <ErrorMessage name="descripcion" component="p" className="text-sm text-error" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="training-fecha">Fecha</Label>
                  <Field as={Input} id="training-fecha" type="date" name="fecha" />
                  <ErrorMessage name="fecha" component="p" className="text-sm text-error" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="training-time">Hora</Label>
                  <Field as={Input} id="training-time" type="time" name="time" />
                  <ErrorMessage name="time" component="p" className="text-sm text-error" />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="training-atletas">Número de atletas</Label>
                <Field
                  as={Input}
                  id="training-atletas"
                  type="number"
                  name="numero_atletas"
                  min="1"
                />
                <ErrorMessage
                  name="numero_atletas"
                  component="p"
                  className="text-sm text-error"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </FormModal>
  );
}
