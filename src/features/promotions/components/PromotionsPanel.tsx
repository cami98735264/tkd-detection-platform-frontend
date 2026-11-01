import { useCallback, useEffect, useState } from "react";
import { Award, Download, FileText, Plus, Trash2 } from "lucide-react";

import DataTable, { type Column, type RowAction } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { downloadFile } from "@/lib/download";

import { promotionsApi } from "../api/promotionsApi";
import type { BeltOption, BeltPromotion } from "../types";
import { ExamResultBadge } from "./ExamResultBadge";
import PromotionFormModal from "./PromotionFormModal";
import { ScanUploadButton } from "./ScanUploadButton";

interface Props {
  belts: BeltOption[];
  /** Bumped by the parent to force a reload (e.g. after an exam finalize). */
  reloadKey: number;
}

export default function PromotionsPanel({ belts, reloadKey }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<BeltPromotion[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    promotionsApi
      .listPromotions({ athleteId, page })
      .then((res) => {
        setRows(res?.results ?? []);
        setCount(res?.count ?? 0);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [athleteId, page, handleError]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const replace = (p: BeltPromotion) =>
    setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, ...p } : r)));

  const toggleAuthorized = async (p: BeltPromotion, authorized: boolean) => {
    try {
      const updated = await promotionsApi.authorize(p.id, authorized);
      replace(updated ?? { ...p, diploma_authorized: authorized });
      showToast({
        title: authorized ? "Diploma autorizado" : "Autorización retirada",
        variant: "success",
      });
    } catch (err) {
      handleError(err);
    }
  };

  const download = (url: string, name: string) =>
    downloadFile(url, name).catch((err: unknown) => handleError(err));

  const remove = async (p: BeltPromotion) => {
    const ok = await confirm({
      title: "Eliminar ascenso",
      description: `¿Eliminar el registro ${p.diploma_number}?`,
    });
    if (!ok) return;
    try {
      await promotionsApi.deletePromotion(p.id);
      showToast({ title: "Ascenso eliminado", variant: "success" });
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const columns: Column<BeltPromotion>[] = [
    {
      key: "athlete_name",
      header: "Deportista",
      render: (r) => <span className="font-medium text-text">{r.athlete_name}</span>,
    },
    {
      key: "belts",
      header: "Ascenso",
      render: (r) => (
        <span className="text-sm">
          {r.from_belt_name ?? "—"} → <span className="font-medium">{r.to_belt_name}</span>
        </span>
      ),
    },
    { key: "promotion_date", header: "Fecha", hideOnMobile: true },
    {
      key: "diploma_number",
      header: "Diploma",
      hideOnMobile: true,
      render: (r) => <span className="font-mono text-xs">{r.diploma_number}</span>,
    },
    {
      key: "origin",
      header: "Origen",
      hideOnMobile: true,
      render: (r) =>
        r.exam ? (
          <ExamResultBadge result={r.exam_result ?? "approved"} />
        ) : (
          <Badge variant="outline-muted">Manual</Badge>
        ),
    },
    {
      key: "authorized",
      header: "Diploma autorizado",
      render: (r) => (
        <Switch
          checked={r.diploma_authorized}
          onCheckedChange={(v) => void toggleAuthorized(r, v)}
          aria-label={`Autorizar diploma ${r.diploma_number}`}
        />
      ),
    },
    {
      key: "scan",
      header: "Escaneo",
      render: (r) => <ScanUploadButton promotion={r} onUploaded={replace} />,
    },
  ];

  const actions: RowAction<BeltPromotion>[] = [
    {
      id: "diploma",
      label: "Descargar diploma",
      icon: Award,
      variant: "tonal",
      show: (r) => r.diploma_authorized,
      onClick: (r) => void download(promotionsApi.diplomaUrl(r), `${r.diploma_number}.pdf`),
    },
    {
      id: "scan",
      label: "Descargar escaneo",
      icon: FileText,
      variant: "outline",
      show: (r) => r.has_file,
      onClick: (r) =>
        void download(
          promotionsApi.scanUrl(r),
          r.diploma_original_filename || `${r.diploma_number}-escaneo`,
        ),
    },
    { id: "delete", label: "Eliminar", icon: Trash2, variant: "destructive", onClick: remove },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <AthletePicker
          className="sm:w-72"
          value={athleteId}
          onChange={(v) => {
            setAthleteId(v);
            setPage(1);
          }}
          label="Filtrar por deportista"
        />
        <div className="flex gap-2 sm:ml-auto">
          {athleteId != null && (
            <Button variant="outline" onClick={() => setAthleteId(null)}>
              Ver todos
            </Button>
          )}
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Registrar ascenso
          </Button>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted">
        <Download className="h-3.5 w-3.5" />
        Solo los diplomas autorizados pueden generarse. Autorizar requiere un examen aprobado o un
        registro manual hecho por el maestro.
      </p>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.id}
        rowActions={actions}
        empty={{
          icon: Award,
          title: "Sin ascensos registrados",
          description:
            "Los exámenes aprobados y los diplomas registrados manualmente aparecerán aquí.",
        }}
      />
      <Pagination count={count} page={page} onPageChange={setPage} />
      <PromotionFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        belts={belts}
        defaultAthleteId={athleteId}
        onSaved={() => load()}
      />
    </div>
  );
}
