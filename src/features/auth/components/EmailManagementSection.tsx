import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Mail, MailWarning, Clock } from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { authApi } from "@/features/auth/api/authApi";
import { ApiError } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useThrottle } from "@/features/auth/lib/useThrottle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import FormModal from "@/components/common/FormModal";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

const changeSchema = Yup.object({
  new_email: Yup.string().email("Correo no válido").required("El nuevo correo es obligatorio"),
  current_password: Yup.string().required("Confirma con tu contraseña actual"),
});

/**
 * Profile email management (contract §4 "Email change" + §5):
 *  - "email not verified" banner with a resend control (banner-only, never a
 *    navigation gate — §7 note 2).
 *  - email-change request → pending state (shows pending_email + cancel).
 * Verification/pending state is read from `auth/me` (§7 note 9).
 */
export default function EmailManagementSection() {
  const { user, setAuthenticated } = useAuthStore();
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const { cooldown, handle: handleThrottle } = useThrottle();

  const [modalOpen, setModalOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(user?.pending_email ?? null);
  const [canceling, setCanceling] = useState(false);

  if (!user) return null;

  const refreshUser = async () => {
    try {
      const fresh = await authApi.me();
      setAuthenticated(fresh);
      setPending(fresh.pending_email ?? null);
    } catch {
      // non-fatal: local state already reflects the action
    }
  };

  const resendVerification = async () => {
    try {
      await authApi.sendVerificationEmail({ email: user.email });
      showToast({
        title: "Correo enviado",
        description: "Si tu cuenta lo necesita, te enviamos un enlace de verificación.",
        variant: "success",
      });
    } catch (err) {
      if (!handleThrottle(err)) handleError(err);
    }
  };

  const cancelChange = async () => {
    try {
      setCanceling(true);
      await authApi.cancelEmailChange();
      setPending(null);
      await refreshUser();
      showToast({ title: "Cambio de correo cancelado", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      {user.email_verified === false ? (
        <Card className="flex flex-col gap-3 border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Tu correo no está verificado</p>
              <p className="text-sm text-muted-foreground">
                Verifica tu dirección para proteger tu cuenta.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resendVerification}
            disabled={cooldown > 0}
          >
            {cooldown > 0 ? `Reintenta en ${cooldown}s` : "Reenviar verificación"}
          </Button>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Correo electrónico</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {pending ? (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium">Cambio de correo pendiente</p>
                <p className="text-sm text-muted-foreground">
                  Confirma el enlace enviado a <strong>{pending}</strong> para
                  completar el cambio.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={cancelChange} disabled={canceling}>
              {canceling ? "Cancelando..." : "Cancelar"}
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              Cambiar correo
            </Button>
          </div>
        )}
      </Card>

      <FormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Cambiar correo electrónico"
      >
        <Formik
          initialValues={{ new_email: "", current_password: "" }}
          validationSchema={changeSchema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={async (values, { setSubmitting, setFieldError }) => {
            try {
              const res = await authApi.requestEmailChange(values);
              setPending(res.pending_email);
              setModalOpen(false);
              await refreshUser();
              showToast({
                title: "Revisa tu nuevo correo",
                description: "Te enviamos un enlace para confirmar el cambio.",
                variant: "success",
              });
            } catch (err) {
              if (err instanceof ApiError && err.hasFieldCode("current_password", "invalid")) {
                setFieldError("current_password", "Contraseña incorrecta");
              } else if (err instanceof ApiError && err.hasFieldCode("new_email", "email_in_use")) {
                setFieldError("new_email", "Este correo ya está en uso");
              } else if (!handleThrottle(err)) {
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
            >
              <div className="space-y-4">
                <div className="space-y-1.5" data-field="new_email">
                  <Label htmlFor="new_email">Nuevo correo</Label>
                  <Field
                    as={Input}
                    id="new_email"
                    name="new_email"
                    type="email"
                    autoComplete="email"
                  />
                  <ErrorMessage name="new_email" component={FieldErrorText} />
                </div>
                <div className="space-y-1.5" data-field="current_password">
                  <Label htmlFor="current_password">Contraseña actual</Label>
                  <Field
                    as={PasswordInput}
                    id="current_password"
                    name="current_password"
                    autoComplete="current-password"
                  />
                  <ErrorMessage name="current_password" component={FieldErrorText} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar enlace"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </FormModal>
    </div>
  );
}
