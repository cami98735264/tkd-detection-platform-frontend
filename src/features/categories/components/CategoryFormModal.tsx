import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { CompetitionCategory } from "@/types/entities";

const schema = Yup.object({
  nombre: Yup.string().required("El nombre es obligatorio"),
  edad_min: Yup.number().min(0).required("Edad mínima obligatoria"),
  edad_max: Yup.number().min(0).moreThan(Yup.ref("edad_min"), "Debe ser mayor que edad mínima").required("Edad máxima obligatoria"),
  belt_from: Yup.number().min(0).required("Cinturón inicial obligatorio"),
  belt_to: Yup.number().min(0).required("Cinturón final obligatorio"),
  peso_min: Yup.number().min(0).required("Peso mínimo obligatorio"),
  peso_max: Yup.number().min(0).moreThan(Yup.ref("peso_min"), "Debe ser mayor que peso mínimo").required("Peso máximo obligatorio"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CompetitionCategory | null;
  onSubmit: (values: {
    nombre: string;
    edad_min: number;
    edad_max: number;
    belt_from: number;
    belt_to: number;
    peso_min: number;
    peso_max: number;
  }) => Promise<void>;
}

export default function CategoryFormModal({ open, onOpenChange, category, onSubmit }: Props) {
  const isEdit = !!category;

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar Categoría" : "Nueva Categoría"}>
      {!open ? null : (
        <Formik
          initialValues={{
            nombre: category?.nombre ?? "",
            edad_min: category?.edad_min ?? 0,
            edad_max: category?.edad_max ?? 0,
            belt_from: category?.belt_from ?? 0,
            belt_to: category?.belt_to ?? 0,
            peso_min: category?.peso_min ?? 0,
            peso_max: category?.peso_max ?? 0,
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
                <Label>Nombre</Label>
                <Field as={Input} name="nombre" />
                <ErrorMessage name="nombre" component="p" className="text-sm text-red-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Edad Mínima</Label>
                  <Field as={Input} type="number" name="edad_min" />
                  <ErrorMessage name="edad_min" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Edad Máxima</Label>
                  <Field as={Input} type="number" name="edad_max" />
                  <ErrorMessage name="edad_max" component="p" className="text-sm text-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cinturón Desde</Label>
                  <Field as={Input} type="number" name="belt_from" />
                  <ErrorMessage name="belt_from" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Cinturón Hasta</Label>
                  <Field as={Input} type="number" name="belt_to" />
                  <ErrorMessage name="belt_to" component="p" className="text-sm text-red-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Peso Mínimo (kg)</Label>
                  <Field as={Input} type="number" name="peso_min" step="0.1" />
                  <ErrorMessage name="peso_min" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Peso Máximo (kg)</Label>
                  <Field as={Input} type="number" name="peso_max" step="0.1" />
                  <ErrorMessage name="peso_max" component="p" className="text-sm text-red-500" />
                </div>
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
