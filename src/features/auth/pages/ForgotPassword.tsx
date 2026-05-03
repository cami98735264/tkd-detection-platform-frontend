import { useState } from "react";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { Link } from "react-router-dom";
import { ArrowLeft, MailCheck } from "lucide-react";
import * as Yup from "yup";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";
import { authApi } from "@/features/auth/api/authApi";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

const schema = Yup.object({
  email: Yup.string()
    .email("Correo electrónico no válido")
    .required("El correo es obligatorio"),
});

type View = "form" | "sent";

export default function ForgotPassword() {
  const { handleError } = useApiErrorHandler();
  const [view, setView] = useState<View>("form");
  const [submittedEmail, setSubmittedEmail] = useState("");

  if (view === "sent") {
    return (
      <AuthShell
        brandHeadline={
          <>
            Volver
            <br />
            al ring.
          </>
        }
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
            <MailCheck className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-text">
              Revisa tu correo
            </h2>
            <p className="mt-2 text-sm text-muted">
              Si <span className="font-medium text-text">{submittedEmail}</span> está
              registrado, recibirás un enlace para restablecer tu contraseña en los
              próximos minutos.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button asChild className="w-full" size="lg">
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted hover:text-text"
              onClick={() => setView("form")}
            >
              Probar con otro correo
            </Button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Recuperar acceso
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Ingresa tu correo y te enviaremos instrucciones para restablecerla.
          </p>
        </header>

        <Formik
          initialValues={{ email: "" }}
          validationSchema={schema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              await authApi.requestPasswordReset(values.email);
              setSubmittedEmail(values.email);
              setView("sent");
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
                const errs = await validateForm();
                if (Object.keys(errs).length > 0) {
                  flagAndShakeInvalidFields(event.currentTarget, errs);
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Enviando..." : "Enviar instrucciones"}
              </Button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm text-muted hover:text-text transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </Form>
          )}
        </Formik>
      </div>
    </AuthShell>
  );
}
