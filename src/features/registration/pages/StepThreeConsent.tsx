import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Label } from "@/components/ui/label";
import { useRegistrationStore } from "@/features/registration/store/registrationStore";

const schema = Yup.object({
  consent_data_accuracy: Yup.boolean().oneOf([true], "Debe aceptar"),
  consent_data_policy: Yup.boolean().oneOf([true], "Debe aceptar"),
  consent_terms: Yup.boolean().oneOf([true], "Debe aceptar"),
  consent_media_auth: Yup.boolean().oneOf([true], "Debe aceptar"),
});

export default function StepThreeConsent() {
  const store = useRegistrationStore();
  const { step1, step2, step3, setStep3 } = store;

  return (
    <Formik
      initialValues={step3}
      validationSchema={schema}
      onSubmit={(values) => {
        setStep3({ ...values, submitted_at: new Date().toISOString() });
      }}
      enableReinitialize
    >
      {({ isSubmitting, values }) => (
        <Form className="space-y-6">
          {/* Summary */}
          <div className="rounded-md border p-4 space-y-2">
            <h3 className="font-semibold text-lg">Resumen de inscripción</h3>
            <div className="grid gap-2 text-sm">
              <p>
                <span className="font-medium">Nombre:</span> {step1.first_name} {step1.last_name}
              </p>
              <p>
                <span className="font-medium">Documento:</span> {step1.documento}
              </p>
              <p>
                <span className="font-medium">Email:</span> {step1.email}
              </p>
              {step1.phone && (
                <p>
                  <span className="font-medium">Teléfono:</span> {step1.phone}
                </p>
              )}
              {step2 && (
                <>
                  <hr className="border-gray-200" />
                  <p className="font-medium">Contacto de emergencia:</p>
                  <p>{step2.full_name} ({step2.relationship})</p>
                  {step2.email && <p>{step2.email}</p>}
                  {step2.address && <p>{step2.address}</p>}
                </>
              )}
            </div>
          </div>

          {/* Consents */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Field
                type="checkbox"
                name="consent_data_accuracy"
                id="consent_data_accuracy"
                className="mt-1 h-4 w-4"
              />
              <Label htmlFor="consent_data_accuracy" className="text-sm cursor-pointer">
                Confirmo que todos los datos proporcionados son correctos y completos.
              </Label>
            </div>
            <ErrorMessage name="consent_data_accuracy" component="p" className="text-sm text-red-500" />

            <div className="flex items-start gap-3">
              <Field
                type="checkbox"
                name="consent_data_policy"
                id="consent_data_policy"
                className="mt-1 h-4 w-4"
              />
              <Label htmlFor="consent_data_policy" className="text-sm cursor-pointer">
                Acepto la política de tratamiento de datos personales.
              </Label>
            </div>
            <ErrorMessage name="consent_data_policy" component="p" className="text-sm text-red-500" />

            <div className="flex items-start gap-3">
              <Field
                type="checkbox"
                name="consent_terms"
                id="consent_terms"
                className="mt-1 h-4 w-4"
              />
              <Label htmlFor="consent_terms" className="text-sm cursor-pointer">
                Acepto los términos y condiciones del programa.
              </Label>
            </div>
            <ErrorMessage name="consent_terms" component="p" className="text-sm text-red-500" />

            <div className="flex items-start gap-3">
              <Field
                type="checkbox"
                name="consent_media_auth"
                id="consent_media_auth"
                className="mt-1 h-4 w-4"
              />
              <Label htmlFor="consent_media_auth" className="text-sm cursor-pointer">
                Autorizo el uso de mi imagen/audio en material informativo y redes sociales.
              </Label>
            </div>
            <ErrorMessage name="consent_media_auth" component="p" className="text-sm text-red-500" />
          </div>
        </Form>
      )}
    </Formik>
  );
}