import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  program: Yup.number().required("El programa es obligatorio"),
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
  onSubmit: (values: { program: number; nombre: string; descripcion: string; fecha: string; time: string; numero_atletas: number }) => Promise<void>;
}

export default function TrainingFormModal({ open, onOpenChange, training, onSubmit }: Props) {
  const isEdit = !!training;
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (open) {
      programsApi.list(1, "").then((res) => setPrograms(res.results)).catch(() => {});
    }
  }, [open]);

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar Entrenamiento" : "Nuevo Entrenamiento"}>
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
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label>Programa</Label>
                <Field as="select" name="program" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Field>
                <ErrorMessage name="program" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Entrenamiento</Label>
                <Field as="select" name="nombre" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar...</option>
                  {TRAINING_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Field>
                <ErrorMessage name="nombre" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Field as={Input} name="descripcion" />
                <ErrorMessage name="descripcion" component="p" className="text-sm text-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Field as={Input} type="date" name="fecha" />
                  <ErrorMessage name="fecha" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Hora</Label>
                  <Field as={Input} type="time" name="time" />
                  <ErrorMessage name="time" component="p" className="text-sm text-red-500" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Número de Atletas</Label>
                <Field as={Input} type="number" name="numero_atletas" min="1" />
                <ErrorMessage name="numero_atletas" component="p" className="text-sm text-red-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
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
