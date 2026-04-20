import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { User } from "../api/usersApi";

const ROLES = [
  { value: "sportsman", label: "Deportista" },
  { value: "parent", label: "Acudiente" },
  { value: "administrator", label: "Administrador" },
];

const schema = Yup.object({
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  full_name: Yup.string().required("El nombre es obligatorio"),
  role: Yup.string().required("El rol es obligatorio"),
  is_active: Yup.boolean().default(true),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (values: {
    email: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }) => Promise<void>;
}

export default function UserFormModal({
  open,
  onOpenChange,
  user,
  onSubmit,
}: Props) {
  const isEdit = !!user;

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Usuario" : "Nuevo Usuario"}
    >
      {!open ? null : (
        <Formik
          initialValues={{
            email: user?.email ?? "",
            full_name: user?.full_name ?? "",
            role: user?.role ?? "sportsman",
            is_active: user?.is_active ?? true,
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
                <Label>Nombre completo</Label>
                <Field as={Input} name="full_name" />
                <ErrorMessage
                  name="full_name"
                  component="p"
                  className="text-sm text-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <Field as={Input} type="email" name="email" />
                <ErrorMessage
                  name="email"
                  component="p"
                  className="text-sm text-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label>Rol</Label>
                <Field
                  as="select"
                  name="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Field>
                <ErrorMessage
                  name="role"
                  component="p"
                  className="text-sm text-red-500"
                />
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
        </Formik>
      )}
    </FormModal>
  );
}
