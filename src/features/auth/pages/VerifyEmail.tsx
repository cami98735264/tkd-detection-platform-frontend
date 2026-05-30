import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { authApi } from "@/features/auth/api/authApi";
import { tokenRejectionState, type TokenRejection } from "@/types/api";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useThrottle } from "@/features/auth/lib/useThrottle";
import { AuthShell } from "@/features/auth/components/AuthShell";
import AuthStatusView from "@/features/auth/components/AuthStatusView";
import { TOKEN_REJECTION_COPY } from "@/features/auth/lib/tokenCopy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

type Phase = "confirming" | "success" | "rejected" | "error" | "needs-token";

const emailSchema = Yup.object({
  email: Yup.string().email("Correo no válido").required("El correo es obligatorio"),
});

/** Enumeration-safe resend control (contract §1). */
function ResendVerification() {
  const { handleError } = useApiErrorHandler();
  const { cooldown, handle: handleThrottle } = useThrottle();
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <p className="text-sm text-muted">
        Si existe una cuenta con ese correo, te enviamos un enlace de verificación.
      </p>
    );
  }

  return (
    <Formik
      initialValues={{ email: "" }}
      validationSchema={emailSchema}
      validateOnChange={false}
      validateOnBlur={false}
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await authApi.sendVerificationEmail({ email: values.email });
          setSent(true);
        } catch (err) {
          if (!handleThrottle(err)) handleError(err);
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
          className="space-y-3 text-left"
        >
          <div className="space-y-1.5" data-field="email">
            <Label htmlFor="email">Reenviar verificación</Label>
            <Field
              as={Input}
              id="email"
              name="email"
              type="email"
              placeholder="tu.correo@ejemplo.com"
              autoComplete="email"
            />
            <ErrorMessage name="email" component={FieldErrorText} />
          </div>
          {cooldown > 0 ? (
            <p className="text-sm text-warning">Inténtalo de nuevo en {cooldown} segundos</p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={isSubmitting || cooldown > 0}
          >
            {isSubmitting ? "Enviando..." : "Reenviar enlace"}
          </Button>
        </Form>
      )}
    </Formik>
  );
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>(uid && token ? "confirming" : "needs-token");
  const [rejection, setRejection] = useState<TokenRejection | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!uid || !token || ran.current) return;
    ran.current = true;
    authApi
      .confirmEmailVerification({ uid, token })
      .then(() => setPhase("success"))
      .catch((err) => {
        const rej = tokenRejectionState(err);
        if (rej) {
          setRejection(rej);
          setPhase("rejected");
        } else {
          setPhase("error");
        }
      });
  }, [uid, token]);

  return (
    <AuthShell>
      {phase === "confirming" ? (
        <AuthStatusView tone="loading" title="Verificando tu correo..." />
      ) : phase === "success" ? (
        <AuthStatusView
          tone="success"
          title="Correo verificado"
          message="Tu dirección de correo fue confirmada correctamente."
        >
          <Button asChild className="w-full">
            <Link to="/dashboard">Ir al panel</Link>
          </Button>
        </AuthStatusView>
      ) : phase === "rejected" && rejection ? (
        <AuthStatusView
          tone="warning"
          title={TOKEN_REJECTION_COPY[rejection].title}
          message={TOKEN_REJECTION_COPY[rejection].message}
        >
          <ResendVerification />
        </AuthStatusView>
      ) : phase === "needs-token" ? (
        <AuthStatusView
          tone="warning"
          title="Enlace incompleto"
          message="El enlace de verificación está incompleto. Puedes solicitar uno nuevo."
        >
          <ResendVerification />
        </AuthStatusView>
      ) : (
        <AuthStatusView
          tone="error"
          title="No pudimos verificar tu correo"
          message="Ocurrió un error. Intenta nuevamente con un enlace nuevo."
        >
          <ResendVerification />
        </AuthStatusView>
      )}
    </AuthShell>
  );
}
