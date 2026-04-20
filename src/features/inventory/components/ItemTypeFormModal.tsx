import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { ItemType } from "../api/itemTypesApi";

const schema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ItemType | null;
  onSubmit: (values: { name: string }) => Promise<void>;
}

export default function ItemTypeFormModal({ open, onOpenChange, item, onSubmit }: Props) {
  const isEdit = !!item;

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar Tipo" : "Nuevo Tipo"}>
      {!open ? null : (
        <Formik
          initialValues={{
            name: item?.name ?? "",
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
                <Label>Nombre del tipo</Label>
                <Field as={Input} name="name" placeholder="Ej: Casco, Tatami, Otro" />
                <ErrorMessage name="name" component="p" className="text-sm text-red-500" />
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