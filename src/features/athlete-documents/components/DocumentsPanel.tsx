import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  FileWarning,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { formatDateForDisplay } from "@/lib/dateUtils";

import {
  athleteDocumentsApi,
  type AthleteDocument,
  type ChecklistItem,
  type DocumentType,
} from "../api/athleteDocumentsApi";
import {
  STATUS_LABELS,
  deriveChecklist,
  docTypeLabel,
  formatFileSize,
  isReviewable,
  statusTone,
} from "../lib/documents";
import ReviewDocumentDialog from "./ReviewDocumentDialog";
import UploadDocumentDialog from "./UploadDocumentDialog";

interface Props {
  athleteId: number;
  athleteName?: string;
  /** Administrators approve/reject documents. */
  canReview?: boolean;
}

/**
 * Athlete documents (Req 4 + 5): required-documents checklist, upload,
 * download, delete (while allowed) and admin review. Used by the admin
 * athlete detail, the sportsman's own area and the parent's child view.
 */
export default function DocumentsPanel({ athleteId, athleteName, canReview = false }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [documents, setDocuments] = useState<AthleteDocument[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<DocumentType | undefined>(undefined);
  const [reviewing, setReviewing] = useState<AthleteDocument | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, check] = await Promise.all([
        athleteDocumentsApi.list(athleteId),
        athleteDocumentsApi.checklist(athleteId).catch(() => null),
      ]);
      setDocuments(docs);
      const items = check && check.items.length > 0 ? check.items : deriveChecklist(docs);
      setChecklist(items);
      setComplete(
        check && check.items.length > 0
          ? check.complete
          : items.every((i) => !i.required || i.status === "approved"),
      );
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [athleteId, handleError]);

  useEffect(() => {
    void load();
  }, [load]);

  const openUpload = (docType?: DocumentType) => {
    setUploadType(docType);
    setUploadOpen(true);
  };

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusyId(key);
    try {
      await action();
    } catch (err) {
      handleError(err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: AthleteDocument) => {
    const ok = await confirm({
      title: "Eliminar documento",
      description: `¿Eliminar "${doc.title || doc.original_filename || docTypeLabel(doc.doc_type)}"? Esta acción no se puede deshacer.`,
      variant: "warning",
    });
    if (!ok) return;
    await run(`del-${String(doc.id)}`, async () => {
      await athleteDocumentsApi.remove(doc.id);
      showToast({ title: "Documento eliminado", variant: "success" });
      await load();
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Documentos requeridos
            </CardTitle>
            <p className="mt-1 text-sm text-muted">
              Certificado médico, seguro deportivo y carta de exoneración firmada.
            </p>
          </div>
          {!loading &&
            (complete ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Documentación completa
              </Badge>
            ) : (
              <Badge variant="highlight">Documentación pendiente</Badge>
            ))}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="grid gap-3 md:grid-cols-3" aria-label="Lista de chequeo de documentos">
              {checklist.map((item) => (
                <li
                  key={item.doc_type}
                  className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3"
                >
                  <p className="text-sm font-medium text-text">
                    {item.label || docTypeLabel(item.doc_type)}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusTone(item.status)}>{STATUS_LABELS[item.status]}</Badge>
                    {(item.status === "missing" || item.status === "rejected") && (
                      <Button
                        size="sm"
                        variant="tonal"
                        onClick={() => openUpload(item.doc_type)}
                        aria-label={`Subir ${docTypeLabel(item.doc_type)}`}
                      >
                        <Upload className="h-3.5 w-3.5" /> Subir
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Documentos cargados
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busyId === "waiver"}
              onClick={() =>
                void run("waiver", () => athleteDocumentsApi.downloadWaiverTemplate(athleteId))
              }
            >
              <Download className="h-4 w-4" />
              {busyId === "waiver" ? "Descargando…" : "Formato carta de exoneración"}
            </Button>
            <Button size="sm" onClick={() => openUpload()}>
              <Upload className="h-4 w-4" />
              Subir documento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileWarning}
              title="Aún no hay documentos"
              description="Sube el certificado médico, el comprobante del seguro deportivo y la carta de exoneración firmada."
            />
          ) : (
            <ul className="divide-y divide-divider">
              {documents.map((doc) => {
                const key = String(doc.id);
                return (
                  <li
                    key={key}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-text">
                          {doc.doc_type_display || docTypeLabel(doc.doc_type)}
                        </p>
                        <Badge variant={statusTone(doc.status)}>
                          {doc.source === "enrollment"
                            ? "Desde inscripción"
                            : doc.status_display || STATUS_LABELS[doc.status]}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted">
                        {doc.title || doc.original_filename || "Archivo"}
                        {doc.size ? ` · ${formatFileSize(doc.size)}` : ""}
                      </p>
                      {doc.doc_type === "sports_insurance" &&
                        (doc.insurer || doc.policy_number || doc.valid_until) && (
                          <p className="text-xs text-muted">
                            {[
                              doc.insurer && `Aseguradora: ${doc.insurer}`,
                              doc.policy_number && `Póliza: ${doc.policy_number}`,
                              (doc.valid_from || doc.valid_until) &&
                                `Vigencia: ${formatDateForDisplay(doc.valid_from) || "—"} a ${
                                  formatDateForDisplay(doc.valid_until) || "—"
                                }`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      <p className="text-xs text-faint">
                        {doc.created_at ? `Cargado el ${formatDateForDisplay(doc.created_at)}` : ""}
                        {doc.uploaded_by_name ? ` por ${doc.uploaded_by_name}` : ""}
                      </p>
                      {doc.review_notes && (
                        <p className="text-xs text-text">
                          <span className="font-medium">Observaciones:</span> {doc.review_notes}
                          {doc.reviewed_by_name ? ` (${doc.reviewed_by_name})` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === `dl-${key}`}
                        onClick={() =>
                          void run(`dl-${key}`, () => athleteDocumentsApi.download(doc))
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        {busyId === `dl-${key}` ? "Descargando…" : "Descargar"}
                      </Button>
                      {canReview && isReviewable(doc) && (
                        <Button variant="tonal" size="sm" onClick={() => setReviewing(doc)}>
                          <ShieldCheck className="h-3.5 w-3.5" /> Revisar
                        </Button>
                      )}
                      {doc.can_delete && isReviewable(doc) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error"
                          disabled={busyId === `del-${key}`}
                          onClick={() => void handleDelete(doc)}
                          aria-label="Eliminar documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        athleteId={athleteId}
        athleteName={athleteName}
        defaultDocType={uploadType}
        onUploaded={() => void load()}
      />
      <ReviewDocumentDialog
        document={reviewing}
        onClose={() => setReviewing(null)}
        onReviewed={() => void load()}
      />
    </div>
  );
}
