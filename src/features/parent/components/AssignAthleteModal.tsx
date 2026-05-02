import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import type { Athlete } from "@/types/entities";
import type { User } from "@/features/users/api/usersApi";

const RELATIONSHIP_OPTIONS = [
  { value: "mother", label: "Madre" },
  { value: "father", label: "Padre" },
  { value: "guardian", label: "Acudiente" },
];

const schema = Yup.object({
  parent_id: Yup.number().required("El acudiente es obligatorio"),
  athlete_id: Yup.number().required("El deportista es obligatorio"),
  relationship: Yup.string().required("El parentesco es obligatorio"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parents: User[];
  athletes: Athlete[];
  onSubmit: (values: {
    parent_id: number;
    athlete_id: number;
    relationship: string;
  }) => Promise<void>;
}

export default function AssignAthleteModal({
  open,
  onOpenChange,
  parents,
  athletes,
  onSubmit,
}: Props) {
  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Vincular Deportista a Acudiente"
    >
      {!open ? null : (
        <Formik
          initialValues={{
            parent_id: "",
            athlete_id: "",
            relationship: "",
          }}
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            await onSubmit({
              parent_id: Number(values.parent_id),
              athlete_id: Number(values.athlete_id),
              relationship: values.relationship,
            });
            setSubmitting(false);
            resetForm();
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label>Acudiente</Label>
                <Field as="select" name="parent_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar acudiente</option>
                  {parents.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.full_name} ({p.email})
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="parent_id" component="p" className="text-sm text-red-500" />
              </div>

              <div className="space-y-1">
                <Label>Deportista</Label>
                <Field as="select" name="athlete_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Seleccionar deportista</option>
                  {athletes.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.full_name} {a.belt_actual_name ? `(${a.belt_actual_name})` : ""}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="athlete_id" component="p" className="text-sm text-red-500" />
              </div>

              <div className="space-y-1">
                <Label>Parentesco</Label>
                <Field
                  as="select"
                  name="relationship"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar parentesco</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="relationship" component="p" className="text-sm text-red-500" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
                  {isSubmitting ? "Guardando..." : "Vincular"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </FormModal>
  );
}