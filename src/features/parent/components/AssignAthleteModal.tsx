import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import { FormikSelect } from "@/components/common/FormSelect";
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
                <FormikSelect
                  name="parent_id"
                  placeholder="Seleccionar acudiente"
                  options={parents.map((p) => ({
                    value: String(p.id),
                    label: `${p.full_name} (${p.email})`,
                  }))}
                />
                <ErrorMessage name="parent_id" component="p" className="text-sm text-error" />
              </div>

              <div className="space-y-1">
                <Label>Deportista</Label>
                <FormikSelect
                  name="athlete_id"
                  placeholder="Seleccionar deportista"
                  options={athletes.map((a) => ({
                    value: String(a.id),
                    label: `${a.full_name}${a.belt_actual_name ? ` (${a.belt_actual_name})` : ""}`,
                  }))}
                />
                <ErrorMessage name="athlete_id" component="p" className="text-sm text-error" />
              </div>

              <div className="space-y-1">
                <Label>Parentesco</Label>
                <FormikSelect
                  name="relationship"
                  placeholder="Seleccionar parentesco"
                  options={RELATIONSHIP_OPTIONS}
                />
                <ErrorMessage name="relationship" component="p" className="text-sm text-error" />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
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