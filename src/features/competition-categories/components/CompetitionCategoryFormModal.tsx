import { useCallback } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import AsyncSelectField from "@/components/common/AsyncSelectField";
import { beltsApi } from "@/features/evaluations/api/beltsApi";
import type { CompetitionCategory } from "@/types/entities";

const schema = Yup.object({
  nombre: Yup.string().required("El nombre es obligatorio"),
  edad_min: Yup.number().required("Edad mínima requerida").min(0),
  edad_max: Yup.number().required("Edad máxima requerida").min(Yup.ref("edad_min")),
  belt_from: Yup.number().required("Cinturón inicial requerido"),
  belt_to: Yup.number().required("Cinturón final requerido"),
  peso_min: Yup.number().required("Peso mínimo requerido").min(0),
  peso_max: Yup.number().required("Peso máximo requerido").min(Yup.ref("peso_min")),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CompetitionCategory | null;
  onSubmit: (values: {
    nombre: string;
    edad_min: number;
    edad_max: number;
    belt_from: number;
    belt_to: number;
    peso_min: number;
    peso_max: number;
  }) => Promise<void>;
}

export default function CompetitionCategoryFormModal({
  open,
  onOpenChange,
  category,
  onSubmit,
}: Props) {
  const isEdit = !!category;

  const loadBelts = useCallback(
    (input: string, page: number) =>
      beltsApi.list(page, input).then((res) => ({
        options: res.results.map((b) => ({ value: b.id, label: `${b.nombre} (Grado ${b.grado})` })),
        hasMore: res.next !== null,
      })),
    []
  );

  const generateName = (values: {
    edad_min?: number;
    edad_max?: number;
    belt_from_name?: string;
    belt_to_name?: string;
    peso_min?: number;
    peso_max?: number;
  }) => {
    const age = `${values.edad_min || ""}-${values.edad_max || ""}`;
    const weight = `${values.peso_min || ""}-${values.peso_max || ""}kg`;
    const belt = `${values.belt_from_name || ""}-${values.belt_to_name || ""}`;
    return `${age}a ${belt} ${weight}`.trim();
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Categoría" : "Nueva Categoría"}
    >
      {!open ? null : (
        <Formik
          initialValues={{
            nombre: category?.nombre || "",
            edad_min: category?.edad_min || "",
            edad_max: category?.edad_max || "",
            belt_from: category?.belt_from || null,
            belt_to: category?.belt_to || null,
            peso_min: category?.peso_min || "",
            peso_max: category?.peso_max || "",
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit({
              nombre: generateName(values),
              edad_min: Number(values.edad_min),
              edad_max: Number(values.edad_max),
              belt_from: values.belt_from!,
              belt_to: values.belt_to!,
              peso_min: Number(values.peso_min),
              peso_max: Number(values.peso_max),
            });
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Edad mínima</Label>
                  <Field as={Input} type="number" name="edad_min" min={0} />
                  <ErrorMessage name="edad_min" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Edad máxima</Label>
                  <Field as={Input} type="number" name="edad_max" min={0} />
                  <ErrorMessage name="edad_max" component="p" className="text-sm text-red-500" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Cinturón desde</Label>
                  <AsyncSelectField
                    name="belt_from"
                    value={values.belt_from}
                    onChange={(val) => setFieldValue("belt_from", val)}
                    loadOptions={loadBelts}
                    placeholder="Buscar cinturón..."
                  />
                  <ErrorMessage name="belt_from" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Cinturón hasta</Label>
                  <AsyncSelectField
                    name="belt_to"
                    value={values.belt_to}
                    onChange={(val) => setFieldValue("belt_to", val)}
                    loadOptions={loadBelts}
                    placeholder="Buscar cinturón..."
                  />
                  <ErrorMessage name="belt_to" component="p" className="text-sm text-red-500" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Peso mínimo (kg)</Label>
                  <Field as={Input} type="number" name="peso_min" min={0} step={0.01} />
                  <ErrorMessage name="peso_min" component="p" className="text-sm text-red-500" />
                </div>
                <div className="space-y-1">
                  <Label>Peso máximo (kg)</Label>
                  <Field as={Input} type="number" name="peso_max" min={0} step={0.01} />
                  <ErrorMessage name="peso_max" component="p" className="text-sm text-red-500" />
                </div>
              </div>

              {values.edad_min && values.edad_max && values.peso_min && values.peso_max && (
                <div className="rounded-md bg-green-50 p-3 border border-green-200">
                  <Label className="text-green-800">Nombre generado:</Label>
                  <p className="text-sm font-medium text-green-900 mt-1">
                    {generateName(values)}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : isEdit ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </FormModal>
  );
}