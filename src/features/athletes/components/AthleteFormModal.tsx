import { useEffect, useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import * as Yup from "yup";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import { FormikSelect } from "@/components/common/FormSelect";
import { categoriesApi } from "@/features/categories/api/categoriesApi";
import type { Athlete, CompetitionCategory } from "@/types/entities";

const schema = Yup.object({
  full_name: Yup.string().required("El nombre es obligatorio"),
  date_of_birth: Yup.string().nullable().defined(),
  categoria_competencia: Yup.number().nullable().defined(),
  status: Yup.string().required("El estado es obligatorio"),
});

const STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete?: Athlete | null;
  onSubmit: (values: {
    full_name: string;
    date_of_birth: string | null;
    categoria_competencia: number | null;
    status: string;
  }) => Promise<void>;
}

export default function AthleteFormModal({
  open,
  onOpenChange,
  athlete,
  onSubmit,
}: Props) {
  const isEdit = !!athlete;
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);

  useEffect(() => {
    if (open) {
      categoriesApi.list(1).then((res) => setCategories(res.results)).catch(() => {});
    }
  }, [open]);

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar deportista" : "Nuevo deportista"}
      description={
        isEdit
          ? "Actualiza los datos del deportista."
          : "Crea un nuevo deportista vinculado a una categoría de competencia."
      }
    >
      {!open ? null : (
        <Formik
          initialValues={{
            full_name: athlete?.full_name ?? "",
            date_of_birth: athlete?.date_of_birth ?? "",
            categoria_competencia:
              athlete?.categoria_competencia != null
                ? String(athlete.categoria_competencia)
                : "",
            status: athlete?.status ?? "active",
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit({
              full_name: values.full_name,
              date_of_birth: values.date_of_birth || null,
              categoria_competencia: values.categoria_competencia
                ? Number(values.categoria_competencia)
                : null,
              status: values.status,
            });
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Field as={Input} id="full_name" name="full_name" />
                <ErrorMessage
                  name="full_name"
                  component="p"
                  className="text-sm text-error"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date_of_birth">Fecha de nacimiento</Label>
                <Field as={Input} id="date_of_birth" type="date" name="date_of_birth" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="categoria_competencia">Categoría de competencia</Label>
                <FormikSelect
                  id="categoria_competencia"
                  name="categoria_competencia"
                  placeholder="Sin categoría"
                  options={categories.map((cat) => ({
                    value: String(cat.id),
                    label: cat.nombre,
                  }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Estado</Label>
                <FormikSelect id="status" name="status" options={STATUS_OPTIONS} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
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
