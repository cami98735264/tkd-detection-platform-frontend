import { Formik, Form, Field, useFormikContext } from "formik";
import * as Yup from "yup";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import FormModal from "@/components/common/FormModal";
import SchedulePicker, { type ScheduleEntry } from "@/components/common/SchedulePicker";
import type { Program } from "@/types/entities";

const schema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  description: Yup.string().nullable(),
  schedule: Yup.string().nullable(),
  capacity: Yup.number()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .nullable()
    .typeError("La capacidad debe ser un número")
    .min(1, "Mínimo 1")
    .max(999, "Máximo 999"),
  active: Yup.boolean().required("El estado es obligatorio"),
});

interface FormValues {
  name: string;
  description: string;
  schedule: string;
  capacity: number | "";
  active: boolean;
}

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

function FieldError({ name }: { name: keyof FormValues }) {
  const { errors, touched, submitCount } = useFormikContext<FormValues>();
  const error = errors[name];
  const showError = (touched[name] || submitCount > 0) && error;
  if (!showError) return null;
  return <FieldErrorText>{error as string}</FieldErrorText>;
}

function FormErrorSummary() {
  const { errors, submitCount } = useFormikContext<FormValues>();
  const messages = Object.values(errors).filter(Boolean) as string[];
  if (submitCount === 0 || messages.length === 0) return null;
  return (
    <Alert variant="error">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Revisa los datos del formulario</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {messages.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
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
      {!open ? null : <Formik<FormValues>
        initialValues={{
          name: program?.name ?? "",
          description: program?.description ?? "",
          schedule: program?.schedule ?? "",
          capacity: program?.capacity ?? "",
          active: program?.active ?? true,
        }}
        enableReinitialize
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          await onSubmit({
            name: values.name,
            description: values.description || null,
            schedule: values.schedule || null,
            capacity: values.capacity === "" ? null : Number(values.capacity),
            active: values.active,
          });
          setSubmitting(false);
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => {
          let parsedSchedule: ScheduleEntry[] = [];
          try {
            if (values.schedule) parsedSchedule = JSON.parse(values.schedule);
          } catch {
            parsedSchedule = [];
          }
          return (
          <Form className="space-y-4">
            <FormErrorSummary />

            <div className="space-y-1">
              <Label>Nombre</Label>
              <Field as={Input} name="name" />
              <FieldError name="name" />
            </div>

            <div className="space-y-1">
              <Label>Descripción</Label>
              <Field as={Textarea} name="description" rows={3} />
              <FieldError name="description" />
            </div>

            <div className="space-y-1">
              <Label>Horario</Label>
              <SchedulePicker
                value={parsedSchedule}
                onChange={(parsed: ScheduleEntry[]) => setFieldValue("schedule", JSON.stringify(parsed))}
              />
              <FieldError name="schedule" />
            </div>

            <div className="space-y-1">
              <Label>Capacidad</Label>
              <Field as={Input} type="number" name="capacity" min={1} max={999} />
              <FieldError name="capacity" />
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </Form>
          );
        }}
      </Formik>}
    </FormModal>
  );
}
