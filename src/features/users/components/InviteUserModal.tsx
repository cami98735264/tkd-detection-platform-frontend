import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/types/api";
import type { RoleName } from "@/config/permissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import FormModal from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful invite (e.g. to refresh the users list). */
  onInvited?: () => void;
}

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: "sportsman", label: "Deportista" },
  { value: "parent", label: "Acudiente" },
  { value: "administrator", label: "Administrador" },
];

const schema = Yup.object({
  email: Yup.string().email("Correo no válido").required("El correo es obligatorio"),
  role: Yup.string().required("Selecciona un rol"),
  full_name: Yup.string(),
});

/**
 * Admin "Invite user" modal (contract §4 invitations). Sends an invitation
 * email; handles HTTP 409 with `field_codes.email === ["email_in_use"]`
 * (an active account already exists) as an inline field error.
 */
export default function InviteUserModal({ open, onOpenChange, onInvited }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invitar usuario"
      description="Le enviaremos un correo con un enlace para crear su cuenta."
    >
      <Formik
        initialValues={{ email: "", role: "sportsman" as RoleName, full_name: "" }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
        onSubmit={async (values, { setSubmitting, setFieldError }) => {
          try {
            await authApi.inviteUser({
              email: values.email,
              role: values.role,
              full_name: values.full_name || undefined,
            });
            showToast({
              title: "Invitación enviada",
              description: `Se envió una invitación a ${values.email}.`,
              variant: "success",
            });
            onInvited?.();
            onOpenChange(false);
          } catch (err) {
            if (err instanceof ApiError && err.hasFieldCode("email", "email_in_use")) {
              setFieldError("email", "Ya existe una cuenta activa con este correo");
            } else {
              handleError(err);
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, validateForm, submitForm }) => (
          <Form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const formEl = e.currentTarget;
              const errs = await validateForm();
              if (Object.keys(errs).length > 0) {
                flagAndShakeInvalidFields(formEl, errs);
                return;
              }
              submitForm();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5" data-field="email">
              <Label htmlFor="invite-email">Correo</Label>
              <Field
                as={Input}
                id="invite-email"
                name="email"
                type="email"
                autoComplete="off"
              />
              <ErrorMessage name="email" component={FieldErrorText} />
            </div>

            <div className="space-y-1.5" data-field="full_name">
              <Label htmlFor="invite-full-name">Nombre completo (opcional)</Label>
              <Field as={Input} id="invite-full-name" name="full_name" />
              <ErrorMessage name="full_name" component={FieldErrorText} />
            </div>

            <div className="space-y-1.5" data-field="role">
              <Label htmlFor="invite-role">Rol</Label>
              <Field
                as="select"
                id="invite-role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="role" component={FieldErrorText} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Enviar invitación"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </FormModal>
  );
}
