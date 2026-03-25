import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormModal from "@/components/common/FormModal";
import type { Program } from "@/types/entities";

const schema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  description: Yup.string().nullable().defined(),
  schedule: Yup.string().nullable().defined(),
  capacity: Yup.number().nullable().min(1, "Mínimo 1").max(999, "Máximo 999"),
  active: Yup.boolean().required(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
  onSubmit: (values: {
    name: string;
    description: string | null;
    schedule: string | null;
    capacity: number | null;
    active: boolean;
  }) => Promise<void>;
}

export default function ProgramFormModal({
  open,
  onOpenChange,
  program,
  onSubmit,
}: Props) {
  const isEdit = !!program;

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Programa" : "Nuevo Programa"}
    >
      <Formik
        initialValues={{
          name: program?.name ?? "",
          description: program?.description ?? "",
          schedule: program?.schedule ?? "",
          capacity: program?.capacity ?? ("" as any),
          active: program?.active ?? true,
        }}
        enableReinitialize
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          await onSubmit({
            name: values.name,
            description: values.description || null,
            schedule: values.schedule || null,
            capacity: values.capacity ? Number(values.capacity) : null,
            active: values.active,
          });
          setSubmitting(false);
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form className="space-y-4">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Field as={Input} name="name" />
              <ErrorMessage name="name" component="p" className="text-sm text-red-500" />
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Field as={Textarea} name="description" rows={3} />
            </div>

            <div className="space-y-1">
              <Label>Horario</Label>
              <Field as={Input} name="schedule" placeholder="Lun/Mié/Vie 18:00-19:30" />
            </div>

            <div className="space-y-1">
              <Label>Capacidad</Label>
              <Field as={Input} type="number" name="capacity" min={1} max={999} />
              <ErrorMessage name="capacity" component="p" className="text-sm text-red-500" />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={values.active}
                onChange={(e) => setFieldValue("active", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="active">Activo</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
      </Formik>
    </FormModal>
  );
}
