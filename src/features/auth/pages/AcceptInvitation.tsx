import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

import { authApi, type InvitationDetail } from "@/features/auth/api/authApi";
import { tokenRejectionState, type TokenRejection } from "@/types/api";
import type { RoleName } from "@/config/permissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { passwordSchema } from "@/features/auth/lib/passwordPolicy";
import { AuthShell } from "@/features/auth/components/AuthShell";
import AuthStatusView from "@/features/auth/components/AuthStatusView";
import PasswordStrength from "@/features/auth/components/PasswordStrength";
import { TOKEN_REJECTION_COPY } from "@/features/auth/lib/tokenCopy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

type Phase = "loading" | "ready" | "rejected" | "error" | "needs-token";

const ROLE_LABEL: Record<RoleName, string> = {
  administrator: "Administrador",
  parent: "Acudiente",
  sportsman: "Deportista",
};

const redirectByRole: Record<RoleName, string> = {
  administrator: "/dashboard",
  sportsman: "/dashboard",
  parent: "/dashboard",
};

const schema = Yup.object({
  password: passwordSchema,
  confirm_password: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas no coinciden")
    .required("Confirma la contraseña"),
  nombres: Yup.string(),
  apellidos: Yup.string(),
  telefono: Yup.string(),
});

export default function AcceptInvitation() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const [phase, setPhase] = useState<Phase>(token ? "loading" : "needs-token");
  const [rejection, setRejection] = useState<TokenRejection | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetail | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    authApi
      .getInvitation(token)
      .then((inv) => {
        setInvitation(inv);
        setPhase("ready");
      })
      .catch((err) => {
        const rej = tokenRejectionState(err);
        if (rej) {
          setRejection(rej);
          setPhase("rejected");
        } else {
          setPhase("error");
        }
      });
  }, [token]);

  if (phase === "loading") {
    return (
      <AuthShell>
        <AuthStatusView tone="loading" title="Cargando invitación..." />
      </AuthShell>
    );
  }

  if (phase === "rejected" && rejection) {
    return (
      <AuthShell>
        <AuthStatusView
          tone="warning"
          title={TOKEN_REJECTION_COPY[rejection].title}
          message={TOKEN_REJECTION_COPY[rejection].message}
        >
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Ir a iniciar sesión</Link>
          </Button>
        </AuthStatusView>
      </AuthShell>
    );
  }

  if (phase === "needs-token" || phase === "error" || !invitation) {
    return (
      <AuthShell>
        <AuthStatusView
          tone="error"
          title="Invitación no válida"
          message="El enlace de invitación está incompleto o no es válido. Pide al administrador que te envíe uno nuevo."
        >
          <Button asChild variant="outline" className="w-full">
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
            Invitación · {ROLE_LABEL[invitation.role]}
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
            Completa tu cuenta
          </h2>
          <p className="mt-2 text-sm text-muted">
            Define tu contraseña para activar tu acceso.
          </p>
        </header>

        <Formik
          initialValues={{
            password: "",
            confirm_password: "",
            nombres: "",
            apellidos: "",
            telefono: "",
          }}
          validationSchema={schema}
          validateOnChange={false}
          validateOnBlur={false}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              const user = await authApi.acceptInvitation({
                token,
                password: values.password,
                profile: {
                  nombres: values.nombres || undefined,
                  apellidos: values.apellidos || undefined,
                  telefono: values.telefono || undefined,
                },
              });
              showToast({ title: "¡Bienvenido!", variant: "success" });
              navigate(redirectByRole[user.role as RoleName] ?? "/dashboard");
            } catch (err) {
              const rej = tokenRejectionState(err);
              if (rej) {
                setRejection(rej);
                setPhase("rejected");
              } else {
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
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" value={invitation.email} readOnly disabled />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5" data-field="nombres">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Field as={Input} id="nombres" name="nombres" autoComplete="given-name" />
                </div>
                <div className="space-y-1.5" data-field="apellidos">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Field as={Input} id="apellidos" name="apellidos" autoComplete="family-name" />
                </div>
              </div>

              <div className="space-y-1.5" data-field="telefono">
                <Label htmlFor="telefono">Teléfono</Label>
                <Field as={Input} id="telefono" name="telefono" type="tel" autoComplete="tel" />
              </div>

              <div className="space-y-1.5" data-field="password">
                <Label htmlFor="password">Contraseña</Label>
                <Field
                  as={Input}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                />
                <PasswordStrength value={values.password} />
                <ErrorMessage name="password" component={FieldErrorText} />
              </div>

              <div className="space-y-1.5" data-field="confirm_password">
                <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                <Field
                  as={Input}
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                />
                <ErrorMessage name="confirm_password" component={FieldErrorText} />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </AuthShell>
  );
}
