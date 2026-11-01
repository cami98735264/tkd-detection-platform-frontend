import { useEffect, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/common/FormSelect";
import FormModal from "@/components/common/FormModal";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { ApiError } from "@/types/api";

import {
  athleteDocumentsApi,
  type AthleteDocument,
  type DocumentType,
} from "../api/athleteDocumentsApi";
import {
  DOC_TYPE_OPTIONS,
  DOCUMENT_ACCEPT,
  buildUploadPayload,
  emptyUploadForm,
  formatFileSize,
  validateUploadForm,
  type UploadFormErrors,
  type UploadFormValues,
} from "../lib/documents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: number;
  athleteName?: string;
  /** Pre-selected document type (e.g. from a checklist row). */
  defaultDocType?: DocumentType;
  onUploaded?: (doc: AthleteDocument) => void;
}

const SERVER_FIELDS: (keyof UploadFormValues)[] = [
  "doc_type",
  "file",
  "title",
  "insurer",
  "policy_number",
  "valid_from",
  "valid_until",
];

export default function UploadDocumentDialog({
  open,
  onOpenChange,
  athleteId,
  athleteName,
  defaultDocType,
  onUploaded,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [values, setValues] = useState<UploadFormValues>(() => emptyUploadForm(defaultDocType));
  const [errors, setErrors] = useState<UploadFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(emptyUploadForm(defaultDocType));
      setErrors({});
    }
  }, [open, defaultDocType]);

  const update = (patch: Partial<UploadFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof UploadFormValues)[]) delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validateUploadForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      const doc = await athleteDocumentsApi.upload(athleteId, buildUploadPayload(values));
      showToast({
        title: "Documento cargado",
        description: "Quedó pendiente de revisión.",
        variant: "success",
      });
      onUploaded?.(doc);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const serverErrors: UploadFormErrors = {};
        for (const key of SERVER_FIELDS) {
          const msg = err.fields[key]?.[0];
          if (msg) serverErrors[key] = msg;
        }
        setErrors(serverErrors);
      }
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isInsurance = values.doc_type === "sports_insurance";

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Subir documento"
      description={
        athleteName
          ? `Documento de ${athleteName}. Formatos PDF, JPG o PNG de máximo 5 MB.`
          : "Formatos PDF, JPG o PNG de máximo 5 MB."
      }
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="doc_type">Tipo de documento *</Label>
          <FormSelect
            id="doc_type"
            value={values.doc_type}
            onValueChange={(v) => update({ doc_type: v as DocumentType })}
            placeholder="Selecciona el tipo"
            options={DOC_TYPE_OPTIONS}
          />
          {errors.doc_type && <p className="text-sm text-error">{errors.doc_type}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc_title">Título (opcional)</Label>
          <Input
            id="doc_title"
            value={values.title}
            maxLength={200}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Ej. Certificado médico 2026"
          />
          {errors.title && <p className="text-sm text-error">{errors.title}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doc_file">Archivo *</Label>
          <Input
            id="doc_file"
            type="file"
            accept={DOCUMENT_ACCEPT}
            onChange={(e) => update({ file: e.target.files?.[0] ?? null })}
          />
          {values.file && !errors.file && (
            <p className="text-xs text-muted">
              {values.file.name} · {formatFileSize(values.file.size)}
            </p>
          )}
          {errors.file && <p className="text-sm text-error">{errors.file}</p>}
        </div>

        {isInsurance && (
          <fieldset className="space-y-3 rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted">
              Datos del seguro
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="insurer">Aseguradora</Label>
                <Input
                  id="insurer"
                  value={values.insurer}
                  onChange={(e) => update({ insurer: e.target.value })}
                />
                {errors.insurer && <p className="text-sm text-error">{errors.insurer}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="policy_number">Número de póliza</Label>
                <Input
                  id="policy_number"
                  value={values.policy_number}
                  onChange={(e) => update({ policy_number: e.target.value })}
                />
                {errors.policy_number && (
                  <p className="text-sm text-error">{errors.policy_number}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_from">Vigente desde</Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={values.valid_from}
                  onChange={(e) => update({ valid_from: e.target.value })}
                />
                {errors.valid_from && <p className="text-sm text-error">{errors.valid_from}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="valid_until">Vigente hasta</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={values.valid_until}
                  onChange={(e) => update({ valid_until: e.target.value })}
                />
                {errors.valid_until && <p className="text-sm text-error">{errors.valid_until}</p>}
              </div>
            </div>
          </fieldset>
        )}

        <div className="flex justify-end gap-2 border-t border-divider pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            <Upload className="h-4 w-4" />
            {submitting ? "Subiendo…" : "Subir documento"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
