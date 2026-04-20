import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { Meeting } from "../api/meetingsApi";

const schema = Yup.object({
  title: Yup.string().required("El título es obligatorio"),
  description: Yup.string().required("La descripción es obligatoria"),
  date: Yup.string().required("La fecha es obligatoria"),
  time: Yup.string().required("La hora es obligatoria"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting?: Meeting | null;
  onSubmit: (values: { title: string; description: string; date: string; time: string }) => Promise<void>;
}

export default function MeetingFormModal({ open, onOpenChange, meeting, onSubmit }: Props) {
  const isEdit = !!meeting;

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar Reunión" : "Nueva Reunión"}>
      {!open ? null : (
        <Formik
          initialValues={{
            title: meeting?.title ?? "",
            description: meeting?.description ?? "",
            date: meeting?.date ?? "",
            time: meeting?.time ?? "",
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
                <Label>Título</Label>
                <Field as={Input} name="title" />
                <ErrorMessage name="title" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Field as={Input} name="description" />
                <ErrorMessage name="description" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Field as={Input} type="date" name="date" />
                <ErrorMessage name="date" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Hora</Label>
                <Field as={Input} type="time" name="time" />
                <ErrorMessage name="time" component="p" className="text-sm text-red-500" />
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
