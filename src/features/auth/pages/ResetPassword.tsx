import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { authApi } from "@/features/auth/api/authApi";
import { ApiError, tokenRejectionState, type TokenRejection } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { useThrottle } from "@/features/auth/lib/useThrottle";
import { passwordSchema } from "@/features/auth/lib/passwordPolicy";
import { AuthShell } from "@/features/auth/components/AuthShell";
import AuthStatusView from "@/features/auth/components/AuthStatusView";
import PasswordStrength from "@/features/auth/components/PasswordStrength";
import { TOKEN_REJECTION_COPY } from "@/features/auth/lib/tokenCopy";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

const schema = Yup.object({
  new_password: passwordSchema,
  confirm_password: Yup.string()
    .oneOf([Yup.ref("new_password")], "Las contraseñas no coinciden")
    .required("Confirma la contraseña"),
});

export default function ResetPassword() {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const { cooldown, handle: handleThrottle } = useThrottle();

  const [rejection, setRejection] = useState<TokenRejection | null>(null);
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    return (
      <AuthShell>
        <AuthStatusView
          tone="error"
          title="Enlace inválido"
          message="El enlace de restablecimiento está incompleto. Solicita uno nuevo."
        >
          <Button asChild className="w-full">
            <Link to="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </AuthStatusView>
      </AuthShell>
    );
  }

  if (rejection) {
    const copy = TOKEN_REJECTION_COPY[rejection];
    return (
      <AuthShell>
        <AuthStatusView tone="warning" title={copy.title} message={copy.message}>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Solicitar nuevo enlace</Link>
          </Button>
        </AuthStatusView>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <AuthStatusView
          tone="success"
          title="Contraseña actualizada"
          message="Tu contraseña fue restablecida. Ya puedes iniciar sesión."
        >
          <Button asChild className="w-full">
            <Link to="/login">Ir a iniciar sesión</Link>
          </Button>
        </AuthStatusView>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Nueva contraseña
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
            Restablecer contraseña
          </h2>
          <p className="mt-2 text-sm text-muted">
            Elige una nueva contraseña para tu cuenta.
          </p>
        </header>

        <Formik
          initialValues={{ new_password: "", confirm_password: "" }}
          validationSchema={schema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={async (values, { setSubmitting, setFieldError }) => {
            try {
              await authApi.confirmPasswordReset({
                uid,
                token,
                new_password: values.new_password,
              });
              setDone(true);
              showToast({ title: "Contraseña actualizada", variant: "success" });
            } catch (err) {
              const rej = tokenRejectionState(err);
              if (rej) {
                setRejection(rej);
              } else if (err instanceof ApiError && err.fields?.new_password?.length) {
                setFieldError("new_password", err.fields.new_password[0]);
              } else if (!handleThrottle(err)) {
                handleError(err);
              }
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, validateForm, submitForm, values }) => (
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
              className="space-y-5"
            >
              <div className="space-y-1.5" data-field="new_password">
                <Label htmlFor="new_password">Nueva contraseña</Label>
                <Field
                  as={PasswordInput}
                  id="new_password"
                  name="new_password"
                  autoComplete="new-password"
                />
                <PasswordStrength value={values.new_password} />
                <ErrorMessage name="new_password" component={FieldErrorText} />
              </div>

              <div className="space-y-1.5" data-field="confirm_password">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Field
                  as={PasswordInput}
                  id="confirm_password"
                  name="confirm_password"
                  autoComplete="new-password"
                />
                <ErrorMessage name="confirm_password" component={FieldErrorText} />
              </div>

              {cooldown > 0 ? (
                <p className="text-center text-sm text-warning">
                  Inténtalo de nuevo en {cooldown} segundos
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || cooldown > 0}
              >
                {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
              </Button>

              <p className="text-center text-sm text-muted">
                <Link to="/login" className="text-primary hover:underline">
                  Volver al inicio de sesión
                </Link>
              </p>
            </Form>
          )}
        </Formik>
      </div>
    </AuthShell>
  );
}
