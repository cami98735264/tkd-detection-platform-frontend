import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import { FormikSelect } from "@/components/common/FormSelect";
import type { User } from "../api/usersApi";

const ROLES = [
  { value: "sportsman", label: "Deportista" },
  { value: "parent", label: "Acudiente" },
  { value: "administrator", label: "Administrador" },
];

const schema = (isEdit: boolean) => Yup.object({
  email: Yup.string().email("Email inválido").required("El email es obligatorio"),
  full_name: Yup.string().required("El nombre es obligatorio"),
  password: isEdit
    ? Yup.string().test(
        "min-when-set",
        "La contraseña debe tener al menos 8 caracteres",
        (value) => !value || value.length >= 8,
      )
    : Yup.string().min(8, "La contraseña debe tener al menos 8 caracteres").required("La contraseña es obligatoria"),
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
    password?: string;
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
            password: "",
            role: user?.role ?? "sportsman",
            is_active: user?.is_active ?? true,
          }}
          enableReinitialize
          validationSchema={schema(isEdit)}
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
                  className="text-sm text-error"
                />
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <Field as={Input} type="email" name="email" />
                <ErrorMessage
                  name="email"
                  component="p"
                  className="text-sm text-error"
                />
              </div>

              <div className="space-y-1">
                <Label>Contraseña</Label>
                <Field
                  as={Input}
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder={isEdit ? "Dejar vacío para no cambiar" : undefined}
                />
                <ErrorMessage
                  name="password"
                  component="p"
                  className="text-sm text-error"
                />
              </div>

              <div className="space-y-1">
                <Label>Rol</Label>
                <FormikSelect name="role" options={ROLES} placeholder="Seleccionar rol" />
                <ErrorMessage
                  name="role"
                  component="p"
                  className="text-sm text-error"
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
