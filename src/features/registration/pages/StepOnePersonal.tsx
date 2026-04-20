import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegistrationStore } from "@/features/registration/store/registrationStore";

const schema = Yup.object({
  first_name: Yup.string().required("Nombres requeridos").min(2).max(100),
  last_name: Yup.string().required("Apellidos requeridos").min(2).max(100),
  documento: Yup.string().required("Documento requerido"),
  birth_date: Yup.string().required("Fecha de nacimiento requerida"),
  gender: Yup.string().required("Género requerido"),
  email: Yup.string().email("Email inválido").required("Email requerido"),
  phone: Yup.string(),
  blood_type: Yup.string(),
  medical_certificate: Yup.mixed(),
  current_weight: Yup.string(),
  current_belt: Yup.number().nullable(),
});

export default function StepOnePersonal() {
  const store = useRegistrationStore();
  const { step1, setStep1 } = store;

  return (
    <Formik
      initialValues={step1}
      validationSchema={schema}
      onSubmit={(values) => {
        setStep1(values);
      }}
      enableReinitialize
    >
      {({ isSubmitting, setFieldValue, values }) => (
        <Form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Primer nombre(s)</Label>
              <Field as={Input} name="first_name" />
              <ErrorMessage name="first_name" component="p" className="text-sm text-red-500" />
            </div>
            <div className="space-y-1">
              <Label>Apellido(s)</Label>
              <Field as={Input} name="last_name" />
              <ErrorMessage name="last_name" component="p" className="text-sm text-red-500" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Documento de identidad (único)</Label>
            <Field as={Input} name="documento" />
            <ErrorMessage name="documento" component="p" className="text-sm text-red-500" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Fecha de nacimiento (dd/mm/yyyy)</Label>
              <Field as={Input} type="date" name="birth_date" />
              <ErrorMessage name="birth_date" component="p" className="text-sm text-red-500" />
            </div>
            <div className="space-y-1">
              <Label>Género</Label>
              <Field name="gender">
                {() => (
                  <Select
                    value={values.gender}
                    onValueChange={(v) => setFieldValue("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
              <ErrorMessage name="gender" component="p" className="text-sm text-red-500" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Correo electrónico</Label>
              <Field as={Input} type="email" name="email" />
              <ErrorMessage name="email" component="p" className="text-sm text-red-500" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono (formato internacional)</Label>
              <Field as={Input} name="phone" placeholder="+57 300 123 4567" />
              <ErrorMessage name="phone" component="p" className="text-sm text-red-500" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo de sangre (opcional)</Label>
              <Field name="blood_type">
                {() => (
                  <Select
                    value={values.blood_type}
                    onValueChange={(v) => setFieldValue("blood_type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                      <SelectItem value="UNKNOWN">No lo sé</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Field>
            </div>
            <div className="space-y-1">
              <Label>Peso actual (kg, opcional)</Label>
              <Field as={Input} type="number" name="current_weight" step="0.01" min="0" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Certificado médico (PDF/JPG/PNG, máx 5MB)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFieldValue("medical_certificate", file);
              }}
            />
          </div>
        </Form>
      )}
    </Formik>
  );
}