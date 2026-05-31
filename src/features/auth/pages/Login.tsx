import { useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import * as Yup from "yup";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";
import { authApi } from "@/features/auth/api/authApi";
import { AuthShell } from "@/features/auth/components/AuthShell";
import TwoFactorChallenge from "@/features/auth/components/TwoFactorChallenge";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import type { RoleName } from "@/config/permissions";

const schema = Yup.object({
  email: Yup.string()
    .email("Correo electrónico no válido")
    .required("El correo es obligatorio"),
  password: Yup.string().required("La contraseña es obligatoria"),
});

const redirectByRole: Record<RoleName, string> = {
  administrator: "/dashboard",
  sportsman: "/dashboard",
  parent: "/dashboard",
};

export default function Login() {
  const navigate = useNavigate();
  const { handleError } = useApiErrorHandler();
  const [challenge, setChallenge] = useState<{ token: string; methods: string[] } | null>(null);

  const goToDashboard = async () => {
    const user = await authApi.me();
    const role = user.role as RoleName;
    navigate(redirectByRole[role] ?? "/dashboard");
  };

  if (challenge) {
    return (
      <AuthShell>
        <TwoFactorChallenge
          challengeToken={challenge.token}
          methods={challenge.methods}
          onVerified={() => {
            void goToDashboard();
          }}
          onExpired={() => setChallenge(null)}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Inicia sesión
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
            Bienvenido de nuevo
          </h2>
          <p className="mt-2 text-sm text-muted">
            Accede con tu correo institucional para continuar.
          </p>
        </header>

        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={schema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const result = await authApi.login(values);
              if (result.status === "2fa_required") {
                // No session yet — present the second-factor challenge step.
                setChallenge({ token: result.challengeToken, methods: result.methods });
                return;
              }
              // Fetch user info to determine role and redirect accordingly
              await goToDashboard();
            } catch (err) {
              handleError(err);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, validateForm, submitForm }) => (
            <Form
              className="space-y-5"
              noValidate
              onSubmit={async (event) => {
                event.preventDefault();
                const formEl = event.currentTarget;
                const errs = await validateForm();
                if (Object.keys(errs).length > 0) {
                  flagAndShakeInvalidFields(formEl, errs);
                  return;
                }
                submitForm();
              }}
            >
              <div className="space-y-1.5" data-field="email">
                <Label htmlFor="email">Correo</Label>
                <Field
                  as={Input}
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="tu.correo@ejemplo.com"
                />
                <ErrorMessage name="email" component={FieldErrorText} />
              </div>

              <div className="space-y-1.5" data-field="password">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Field
                  as={PasswordInput}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <ErrorMessage name="password" component={FieldErrorText} />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
              </Button>
            </Form>
          )}
        </Formik>

        <p className="text-center text-xs text-faint">
          ¿Necesitas una cuenta? Solicítala con la administración de la academia.
        </p>
      </div>
    </AuthShell>
  );
}
