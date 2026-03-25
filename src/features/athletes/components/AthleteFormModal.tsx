import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { Athlete } from "@/types/entities";

const schema = Yup.object({
  full_name: Yup.string().required("El nombre es obligatorio"),
  date_of_birth: Yup.string().nullable().defined(),
  category: Yup.string().nullable().defined(),
  status: Yup.string().required("El estado es obligatorio"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete?: Athlete | null;
  onSubmit: (values: {
    full_name: string;
    date_of_birth: string | null;
    category: string | null;
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

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Deportista" : "Nuevo Deportista"}
    >
      {!open ? null : <Formik
        initialValues={{
          full_name: athlete?.full_name ?? "",
          date_of_birth: athlete?.date_of_birth ?? "",
          category: athlete?.category ?? "",
          status: athlete?.status ?? "active",
        }}
        enableReinitialize
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          await onSubmit({
            full_name: values.full_name,
            date_of_birth: values.date_of_birth || null,
            category: values.category || null,
            status: values.status,
          });
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre completo</Label>
              <Field as={Input} name="full_name" />
              <ErrorMessage
                name="full_name"
                component="p"
                className="text-sm text-red-500"
              />
            </div>

            <div className="space-y-1">
              <Label>Fecha de nacimiento</Label>
              <Field as={Input} type="date" name="date_of_birth" />
            </div>

            <div className="space-y-1">
              <Label>Categoría</Label>
              <Field as={Input} name="category" />
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Field
                as="select"
                name="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-green-600 hover:bg-green-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>}
    </FormModal>
  );
}
