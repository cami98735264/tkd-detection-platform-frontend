import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import SchedulePicker, { type ScheduleEntry } from "@/components/common/SchedulePicker";
import type { Edition } from "@/types/entities";

const schema = Yup.object({
  start_date: Yup.string().required("Fecha de inicio requerida"),
  end_date: Yup.string().nullable().defined(),
  schedule: Yup.string().nullable().defined(),
  active: Yup.boolean().required(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edition?: Edition | null;
  onSubmit: (values: {
    start_date: string;
    end_date: string | null;
    schedule: string | null;
    active: boolean;
  }) => Promise<void>;
}

export default function EditionFormModal({
  open,
  onOpenChange,
  edition,
  onSubmit,
}: Props) {
  const isEdit = !!edition;

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Edición" : "Nueva Edición"}
    >
      {!open ? null : (
        <Formik
          initialValues={{
            start_date: edition?.start_date ?? "",
            end_date: edition?.end_date ?? "",
            schedule: edition?.schedule ?? "",
            active: edition?.active ?? true,
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit({
              start_date: values.start_date,
              end_date: values.end_date || null,
              schedule: values.schedule || null,
              active: values.active,
            });
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Fecha de inicio</Label>
                  <Field as={Input} type="date" name="start_date" />
                  <ErrorMessage name="start_date" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Fecha de fin (opcional)</Label>
                  <Field as={Input} type="date" name="end_date" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Horario</Label>
                <SchedulePicker
                  value={values.schedule ? JSON.parse(values.schedule) : []}
                  onChange={(parsed: ScheduleEntry[]) =>
                    setFieldValue("schedule", JSON.stringify(parsed))
                  }
                />
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
      )}
    </FormModal>
  );
}