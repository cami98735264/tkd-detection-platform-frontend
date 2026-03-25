import { useEffect, useState } from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormModal from "@/components/common/FormModal";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { programsApi } from "@/features/programs/api/programsApi";
import { Plus, Trash2 } from "lucide-react";
import type { Evaluation, Athlete, Program } from "@/types/entities";

const createSchema = Yup.object({
  athlete: Yup.number().required("Selecciona un deportista"),
  program: Yup.mixed().nullable(),
  evaluated_at: Yup.string().required("La fecha es obligatoria"),
  result_summary: Yup.string().required("El resumen es obligatorio"),
  notes: Yup.string().nullable().defined(),
  metrics: Yup.array()
    .of(
      Yup.object({
        metric_name: Yup.string().required("Nombre requerido"),
        score: Yup.number()
          .min(0, "Mín. 0")
          .max(100, "Máx. 100")
          .required("Puntaje requerido"),
        notes: Yup.string().nullable().defined(),
      }),
    )
    .min(1, "Se necesita al menos una métrica"),
});

const editSchema = Yup.object({
  result_summary: Yup.string().required("El resumen es obligatorio"),
  notes: Yup.string().nullable().defined(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation?: Evaluation | null;
  onSubmit: (values: any) => Promise<void>;
}

export default function EvaluationFormModal({
  open,
  onOpenChange,
  evaluation,
  onSubmit,
}: Props) {
  const isEdit = !!evaluation;
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (open && !isEdit) {
      athletesApi.list(1).then((r) => setAthletes(r.results)).catch(() => {});
      programsApi.list(1).then((r) => setPrograms(r.results)).catch(() => {});
    }
  }, [open, isEdit]);

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar Evaluación" : "Nueva Evaluación"}
    >
      {!open ? null : isEdit ? (
        /* EDIT MODE — only result_summary and notes */
        <Formik
          initialValues={{
            result_summary: evaluation?.result_summary ?? "",
            notes: evaluation?.notes ?? "",
          }}
          enableReinitialize
          validationSchema={editSchema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit({
              result_summary: values.result_summary,
              notes: values.notes || null,
            });
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label>Resumen del resultado</Label>
                <Field as={Textarea} name="result_summary" rows={3} />
                <ErrorMessage
                  name="result_summary"
                  component="p"
                  className="text-sm text-red-500"
                />
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Field as={Textarea} name="notes" rows={2} />
              </div>
              <p className="text-xs text-muted-foreground">
                Las métricas no pueden ser modificadas después de la creación.
              </p>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Actualizar"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      ) : (
        /* CREATE MODE — full form with metrics */
        <Formik
          initialValues={{
            athlete: "" as any,
            program: "" as any,
            evaluated_at: new Date().toISOString().slice(0, 16),
            result_summary: "",
            notes: "",
            metrics: [{ metric_name: "", score: "" as any, notes: "" }],
          }}
          validationSchema={createSchema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit({
              athlete: Number(values.athlete),
              program: values.program ? Number(values.program) : null,
              evaluated_at: values.evaluated_at,
              result_summary: values.result_summary,
              notes: values.notes || null,
              metrics: values.metrics.map((m) => ({
                metric_name: m.metric_name,
                score: Number(m.score),
                notes: m.notes || null,
              })),
            });
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Deportista</Label>
                  <Field
                    as="select"
                    name="athlete"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                  </Field>
                  <ErrorMessage name="athlete" component="p" className="text-sm text-red-500" />
                </div>

                <div className="space-y-1">
                  <Label>Programa (opcional)</Label>
                  <Field
                    as="select"
                    name="program"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Ninguno</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Field>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Fecha de evaluación</Label>
                <Field as={Input} type="datetime-local" name="evaluated_at" />
                <ErrorMessage name="evaluated_at" component="p" className="text-sm text-red-500" />
              </div>

              <div className="space-y-1">
                <Label>Resumen del resultado</Label>
                <Field as={Textarea} name="result_summary" rows={2} />
                <ErrorMessage
                  name="result_summary"
                  component="p"
                  className="text-sm text-red-500"
                />
              </div>

              <div className="space-y-1">
                <Label>Notas</Label>
                <Field as={Textarea} name="notes" rows={2} />
              </div>

              {/* METRICS */}
              <FieldArray name="metrics">
                {({ push, remove }) => (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Métricas</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          push({ metric_name: "", score: "", notes: "" })
                        }
                      >
                        <Plus size={14} className="mr-1" /> Agregar
                      </Button>
                    </div>
                    <ErrorMessage name="metrics">{(msg) => typeof msg === "string" ? <p className="text-sm text-red-500">{msg}</p> : null}</ErrorMessage>
                    {(values.metrics ?? []).map((_, idx) => (
                      <div
                        key={idx}
                        className="grid gap-2 md:grid-cols-[1fr_80px_1fr_auto] items-start border p-3 rounded-md"
                      >
                        <div>
                          <Label className="text-xs">Nombre</Label>
                          <Field as={Input} name={`metrics.${idx}.metric_name`} />
                          <p className="text-xs text-red-500 min-h-[1rem]">
                            <ErrorMessage name={`metrics.${idx}.metric_name`} />
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Puntaje</Label>
                          <Field
                            as={Input}
                            type="number"
                            name={`metrics.${idx}.score`}
                            min={0}
                            max={100}
                          />
                          <p className="text-xs text-red-500 min-h-[1rem]">
                            <ErrorMessage name={`metrics.${idx}.score`} />
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs">Notas</Label>
                          <Field as={Input} name={`metrics.${idx}.notes`} />
                          <div className="min-h-[1rem]" />
                        </div>
                        {(values.metrics?.length ?? 0) > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => remove(idx)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </FieldArray>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Crear"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      )}
    </FormModal>
  );
}
