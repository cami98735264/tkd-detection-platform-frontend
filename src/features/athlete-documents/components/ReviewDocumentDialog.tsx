import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import FormModal from "@/components/common/FormModal";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { athleteDocumentsApi, type AthleteDocument } from "../api/athleteDocumentsApi";
import { docTypeLabel } from "../lib/documents";

interface Props {
  document: AthleteDocument | null;
  onClose: () => void;
  onReviewed?: (doc: AthleteDocument) => void;
}

/** Admin review: approve or reject (rejections require a note for the family). */
export default function ReviewDocumentDialog({ document, onClose, onReviewed }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotes(document?.review_notes ?? "");
    setError(null);
  }, [document]);

  const submit = async (status: "approved" | "rejected") => {
    if (!document) return;
    if (status === "rejected" && !notes.trim()) {
      setError("Indica el motivo del rechazo.");
      return;
    }
    setBusy(true);
    try {
      const updated = await athleteDocumentsApi.review(document.id, {
        status,
        review_notes: notes.trim(),
      });
      showToast({
        title: status === "approved" ? "Documento aprobado" : "Documento rechazado",
        variant: status === "approved" ? "success" : "warning",
      });
      onReviewed?.(updated);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormModal
      open={document !== null}
      onOpenChange={(open) => !open && onClose()}
      title="Revisar documento"
      description={
        document
          ? `${document.doc_type_display || docTypeLabel(document.doc_type)}${
              document.athlete_name ? ` · ${document.athlete_name}` : ""
            }`
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="review_notes">Observaciones</Label>
          <Textarea
            id="review_notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setError(null);
            }}
            placeholder="Ej. El certificado no tiene firma del médico."
          />
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-divider pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void submit("rejected")}
            disabled={busy}
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button type="button" onClick={() => void submit("approved")} disabled={busy}>
            <CheckCircle2 className="h-4 w-4" />
            Aprobar
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
