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

// Legacy rows stored a plain human string ("Lunes a Viernes 5pm") in the
// `schedule` field. Treat anything that isn't a valid JSON array as empty so
// the picker renders without crashing.
function parseSchedule(value: string | null | undefined): ScheduleEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ScheduleEntry[]) : [];
  } catch {
    return [];
  }
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
      title={isEdit ? "Editar edición" : "Nueva edición"}
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
                  <Label htmlFor="edition-start">Fecha de inicio</Label>
                  <Field as={Input} id="edition-start" type="date" name="start_date" />
                  <ErrorMessage name="start_date" component="p" className="text-sm text-error" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edition-end">Fecha de fin (opcional)</Label>
                  <Field as={Input} id="edition-end" type="date" name="end_date" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Horario</Label>
                <SchedulePicker
                  value={parseSchedule(values.schedule)}
                  onChange={(parsed: ScheduleEntry[]) =>
                    setFieldValue("schedule", JSON.stringify(parsed))
                  }
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edition-active"
                  checked={values.active}
                  onChange={(e) => setFieldValue("active", e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="edition-active">Activa</Label>
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
