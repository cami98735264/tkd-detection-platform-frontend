import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import { FormikSelect } from "@/components/common/FormSelect";

const REPORT_TYPES = [
  { value: "enrollment", label: "Inscripciones" },
  { value: "performance", label: "Rendimiento" },
  { value: "attendance", label: "Asistencia" },
  { value: "custom", label: "Personalizado" },
];

const schema = Yup.object({
  title: Yup.string().required("El título es obligatorio"),
  report_type: Yup.string().required("Selecciona un tipo"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    title: string;
    report_type: string;
    filters_applied?: Record<string, unknown>;
  }) => Promise<void>;
}

export default function GenerateReportModal({
  open,
  onOpenChange,
  onSubmit,
}: Props) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Generar Reporte"
      description="El reporte se generará de forma asíncrona."
    >
      {!open ? null : <Formik
        initialValues={{
          title: "",
          report_type: "",
          date_start: "",
          date_end: "",
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting }) => {
          const filters_applied: Record<string, unknown> = {};
          if (values.date_start && values.date_end) {
            filters_applied.date_range = {
              start: values.date_start,
              end: values.date_end,
            };
          }
          await onSubmit({
            title: values.title,
            report_type: values.report_type,
            filters_applied:
              Object.keys(filters_applied).length > 0
                ? filters_applied
                : undefined,
          });
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Field as={Input} name="title" />
              <ErrorMessage name="title" component="p" className="text-sm text-error" />
            </div>

            <div className="space-y-1">
              <Label>Tipo de reporte</Label>
              <FormikSelect name="report_type" options={REPORT_TYPES} />
              <ErrorMessage name="report_type" component="p" className="text-sm text-error" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha inicio (opcional)</Label>
                <Field as={Input} type="date" name="date_start" />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin (opcional)</Label>
                <Field as={Input} type="date" name="date_end" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
               
                disabled={isSubmitting}
              >
                {isSubmitting ? "Generando..." : "Generar"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>}
    </FormModal>
  );
}
