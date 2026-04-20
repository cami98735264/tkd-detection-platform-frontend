import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FormModal from "@/components/common/FormModal";
import { itemTypesApi, type ItemType } from "../api/itemTypesApi";
import type { InventoryItem } from "../api/inventoryApi";

const ITEM_TYPE_FALLBACK = [
  "Casco",
  "Protector de pecho",
  "Tatami",
  "Pad de patadas",
  "Palchagui",
  "Otro",
];

const schema = Yup.object({
  name: Yup.string().required("El nombre es obligatorio"),
  quantity: Yup.number().min(0, "Mínimo 0").required("La cantidad es obligatoria"),
  description: Yup.string().required("La descripción es obligatoria"),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSubmit: (values: { name: string; quantity: number; description: string }) => Promise<void>;
}

export default function InventoryFormModal({ open, onOpenChange, item, onSubmit }: Props) {
  const isEdit = !!item;
  const [customName, setCustomName] = useState("");
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);

  useEffect(() => {
    if (open) {
      itemTypesApi.list(1).then((res) => {
        setItemTypes(res.results);
      }).catch(() => {
        // fallback to static list on error
      });
    }
  }, [open]);

  const showFallback = itemTypes.length === 0;
  const itemTypeOptions = showFallback
    ? ITEM_TYPE_FALLBACK
    : [...itemTypes.map((t) => t.name), "Otro"];

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar Ítem" : "Nuevo Ítem"}>
      {!open ? null : (
        <Formik
          initialValues={{
            name: item?.name ?? "",
            quantity: item?.quantity ?? 0,
            description: item?.description ?? "",
          }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={async (values, { setSubmitting }) => {
            await onSubmit(values);
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label>Nombre del ítem</Label>
                <Field
                  as="select"
                  name="name"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setFieldValue("name", e.target.value);
                    if (e.target.value !== "Otro") {
                      setCustomName("");
                    }
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {itemTypeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Field>
                <ErrorMessage name="name" component="p" className="text-sm text-red-500" />
              </div>

              {values.name === "Otro" && (
                <div className="space-y-1">
                  <Label>Nombre personalizado</Label>
                  <Input
                    value={customName}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setFieldValue("name", e.target.value);
                    }}
                    placeholder="Escribe el nombre del ítem"
                  />
                  <ErrorMessage name="name" component="p" className="text-sm text-red-500" />
                </div>
              )}

              <div className="space-y-1">
                <Label>Cantidad</Label>
                <Field as={Input} type="number" name="quantity" min="0" />
                <ErrorMessage name="quantity" component="p" className="text-sm text-red-500" />
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Field as={Input} name="description" />
                <ErrorMessage name="description" component="p" className="text-sm text-red-500" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
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