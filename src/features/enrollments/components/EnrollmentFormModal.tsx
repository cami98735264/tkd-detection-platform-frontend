import { useCallback } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormModal from "@/components/common/FormModal";
import AsyncSelectField from "@/components/common/AsyncSelectField";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import type { Enrollment } from "@/types/entities";

const schema = Yup.object({
  athlete: Yup.number().required("Selecciona un deportista"),
  program: Yup.number().required("Selecciona un programa"),
  start_date: Yup.string().required("La fecha de inicio es obligatoria"),
  end_date: Yup.string().nullable().defined(),
  status: Yup.string().required(),
  notes: Yup.string().nullable().defined(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment?: Enrollment | null;
  onSubmit: (values: {
    athlete: number;
    program: number;
    start_date: string;
    end_date: string | null;
    status: string;
    notes: string | null;
  }) => Promise<void>;
}

export default function EnrollmentFormModal({
  open,
  onOpenChange,
  enrollment,
  onSubmit,
}: Props) {
  const isEdit = !!enrollment;

  const loadAthletes = useCallback(
    (input: string, page: number) =>
      athletesApi.list(page, input).then((res) => ({
        options: res.results.map((a) => ({ value: a.id, label: a.full_name })),
        hasMore: res.next !== null,
      })),
    []
  );

  const loadPrograms = useCallback(
    (input: string, page: number) =>
      programsApi.list(page, input).then((res) => ({
        options: res.results.map((p) => ({ value: p.id, label: p.name })),
        hasMore: res.next !== null,
      })),
    []
  );

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Inscripción" : "Nueva Inscripción"}
    >
      {!open ? null : <Formik
        initialValues={{
          athlete: enrollment?.athlete ?? ("" as any),
          program: enrollment?.program ?? ("" as any),
          start_date: enrollment?.start_date ?? "",
          end_date: enrollment?.end_date ?? "",
          status: enrollment?.status ?? "active",
          notes: enrollment?.notes ?? "",
        }}
        enableReinitialize
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          await onSubmit({
            athlete: Number(values.athlete),
            program: Number(values.program),
            start_date: values.start_date,
            end_date: values.end_date || null,
            status: values.status,
            notes: values.notes || null,
          });
          setSubmitting(false);
        }}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form className="space-y-4">
            <div className="space-y-1">
              <Label>Deportista</Label>
              <AsyncSelectField
                name="athlete"
                value={enrollment?.athlete ?? null}
                onChange={(val) => setFieldValue("athlete", val)}
                loadOptions={loadAthletes}
                placeholder="Buscar deportista..."
              />
              <ErrorMessage name="athlete" component="p" className="text-sm text-red-500" />
            </div>

            <div className="space-y-1">
              <Label>Programa</Label>
              <AsyncSelectField
                name="program"
                value={enrollment?.program ?? null}
                onChange={(val) => setFieldValue("program", val)}
                loadOptions={loadPrograms}
                placeholder="Buscar programa..."
              />
              <ErrorMessage name="program" component="p" className="text-sm text-red-500" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Field as={Input} type="date" name="start_date" />
                <ErrorMessage name="start_date" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <Field as={Input} type="date" name="end_date" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Estado</Label>
              <Field
                as="select"
                name="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="dropped">Retirado</option>
              </Field>
            </div>

            <div className="space-y-1">
              <Label>Notas</Label>
              <Field as={Textarea} name="notes" rows={2} />
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
      </Formik>}
    </FormModal>
  );
}
