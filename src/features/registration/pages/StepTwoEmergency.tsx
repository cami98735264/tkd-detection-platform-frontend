import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRegistrationStore } from "@/features/registration/store/registrationStore";

const schema = Yup.object({
  full_name: Yup.string().required("Nombre completo requerido"),
  relationship: Yup.string().required("Parentesco requerido"),
  documento: Yup.string(),
  email: Yup.string().email("Email inválido"),
  address: Yup.string(),
});

interface Props {
  isMinor: boolean;
}

export default function StepTwoEmergency({ isMinor }: Props) {
  const store = useRegistrationStore();
  const { step2, setStep2 } = store;

  if (!isMinor) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No requiere contacto de emergencia (mayor de 18 años)</p>
      </div>
    );
  }

  return (
    <Formik
      initialValues={
        step2 ?? {
          full_name: "",
          relationship: "",
          documento: "",
          email: "",
          address: "",
        }
      }
      validationSchema={schema}
      onSubmit={(values) => {
        setStep2(values);
      }}
      enableReinitialize
    >
      {({ isSubmitting, setFieldValue, values }) => (
        <Form className="space-y-4">
          <div className="space-y-1">
            <Label>Nombre completo del contacto</Label>
            <Field as={Input} name="full_name" />
            <ErrorMessage name="full_name" component="p" className="text-sm text-red-500" />
          </div>

          <div className="space-y-1">
            <Label>Parentesco</Label>
            <Field name="relationship">
              {() => (
                <Select
                  value={values.relationship}
                  onValueChange={(v) => setFieldValue("relationship", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Madre</SelectItem>
                    <SelectItem value="father">Padre</SelectItem>
                    <SelectItem value="guardian">Acudiente</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Field>
            <ErrorMessage name="relationship" component="p" className="text-sm text-red-500" />
          </div>

          <div className="space-y-1">
            <Label>Documento (opcional)</Label>
            <Field as={Input} name="documento" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Email (opcional)</Label>
              <Field as={Input} type="email" name="email" />
              <ErrorMessage name="email" component="p" className="text-sm text-red-500" />
            </div>
            <div className="space-y-1">
              <Label>Dirección (opcional)</Label>
              <Field as={Input} name="address" />
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}