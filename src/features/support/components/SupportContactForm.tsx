import { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { MailCheck, LifeBuoy } from "lucide-react";

import { useAuthStore } from "@/features/auth/store/authStore";
import { supportApi } from "@/features/support/api/supportApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useThrottle } from "@/features/auth/lib/useThrottle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldErrorText } from "@/components/common/FieldErrorText";
import { flagAndShakeInvalidFields } from "@/lib/formAnimations";

/**
 * Support / contact form (contract §4). `email` is required only when the user
 * is unauthenticated (the backend uses the session email otherwise). A hidden
 * honeypot field traps bots — a non-empty value still 200s silently, so the
 * frontend simply treats every 200 as a success.
 */
export default function SupportContactForm() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { handleError } = useApiErrorHandler();
  const { cooldown, handle: handleThrottle } = useThrottle();
  const [sent, setSent] = useState(false);

  const schema = Yup.object({
    subject: Yup.string().required("El asunto es obligatorio"),
    message: Yup.string().required("El mensaje es obligatorio"),
    email: isAuthenticated
      ? Yup.string()
      : Yup.string().email("Correo no válido").required("El correo es obligatorio"),
    honeypot: Yup.string(),
  });

  if (sent) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-success/10 p-2 text-success">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text">Mensaje enviado</h3>
            <p className="text-sm text-muted-foreground">
              Gracias por escribirnos. Te responderemos pronto.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-text">¿Necesitas más ayuda?</h3>
          <p className="text-sm text-muted-foreground">
            Escríbenos y nuestro equipo de soporte te ayudará.
          </p>
        </div>
      </div>

      <Formik
        initialValues={{ subject: "", message: "", email: "", honeypot: "" }}
        validationSchema={schema}
        validateOnChange={false}
        validateOnBlur={false}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          try {
            await supportApi.submitSupportRequest({
              subject: values.subject,
              message: values.message,
              email: isAuthenticated ? undefined : values.email,
              honeypot: values.honeypot,
            });
            setSent(true);
            resetForm();
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
            className="space-y-4"
          >
            {!isAuthenticated && (
              <div className="space-y-1.5" data-field="email">
                <Label htmlFor="support-email">Correo</Label>
                <Field
                  as={Input}
                  id="support-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu.correo@ejemplo.com"
                />
                <ErrorMessage name="email" component={FieldErrorText} />
              </div>
            )}

            <div className="space-y-1.5" data-field="subject">
              <Label htmlFor="support-subject">Asunto</Label>
              <Field as={Input} id="support-subject" name="subject" />
              <ErrorMessage name="subject" component={FieldErrorText} />
            </div>

            <div className="space-y-1.5" data-field="message">
              <Label htmlFor="support-message">Mensaje</Label>
              <Field as={Textarea} id="support-message" name="message" rows={5} />
              <ErrorMessage name="message" component={FieldErrorText} />
            </div>

            {/* Honeypot — hidden from real users, traps bots (contract §4). */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="support-website">No llenar este campo</label>
              <Field
                id="support-website"
                name="honeypot"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {cooldown > 0 ? (
              <p className="text-sm text-warning">Inténtalo de nuevo en {cooldown} segundos</p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || cooldown > 0}>
                {isSubmitting ? "Enviando..." : "Enviar mensaje"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
