import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";

import DataTable, { type Column, type RowAction } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { promotionsApi } from "../api/promotionsApi";
import type { BeltOption, ExamCriteria, ExamResult, PromotionExam } from "../types";
import ExamFormModal from "./ExamFormModal";
import { ExamResultBadge } from "./ExamResultBadge";

interface Props {
  belts: BeltOption[];
  /** Called after a finalize created a promotion (refresh the diplomas tab). */
  onPromotionCreated: () => void;
}

const columns: Column<PromotionExam>[] = [
  {
    key: "athlete_name",
    header: "Deportista",
    render: (r) => (
      <span className="font-medium text-text">{r.athlete_name ?? `#${r.athlete}`}</span>
    ),
  },
  {
    key: "belts",
    header: "Cinturón",
    render: (r) => (
      <span className="text-sm">
        {r.from_belt_name ?? "—"} → <span className="font-medium">{r.to_belt_name ?? "—"}</span>
      </span>
    ),
  },
  { key: "exam_date", header: "Fecha", hideOnMobile: true },
  {
    key: "technical_score",
    header: "Nota técnica",
    align: "right",
    render: (r) =>
      r.technical_score != null ? `${r.technical_score} / ${r.passing_score}` : "Sin finalizar",
  },
  { key: "result", header: "Resultado", render: (r) => <ExamResultBadge result={r.result} /> },
];

export default function ExamsPanel({ belts, onPromotionCreated }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [result, setResult] = useState<ExamResult | "">("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PromotionExam[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState<ExamCriteria | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionExam | null>(null);

  useEffect(() => {
    promotionsApi
      .criteria()
      .then((c) =>
        setCriteria({
          criteria: Array.isArray(c?.criteria) ? c.criteria : [],
          passing_score: c?.passing_score ?? 70,
          admin_checks: Array.isArray(c?.admin_checks) ? c.admin_checks : [],
        }),
      )
      .catch(handleError);
  }, [handleError]);

  const load = useCallback(() => {
    setLoading(true);
    promotionsApi
      .listExams({ athleteId, result, page })
      .then((res) => {
        setRows(res?.results ?? []);
        setCount(res?.count ?? 0);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [athleteId, result, page, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  const finalize = async (exam: PromotionExam) => {
    const ok = await confirm({
      title: "Finalizar examen",
      description:
        "Se calculará la nota técnica. Si alcanza la nota mínima y cumple todos los requisitos administrativos, el deportista asciende de cinturón. ¿Continuar?",
    });
    if (!ok) return;
    try {
      const res = await promotionsApi.finalizeExam(exam.id);
      if (res.exam?.result === "approved") {
        showToast({
          title: "Examen aprobado",
          description: res.promotion
            ? `Ascenso registrado (${res.promotion.diploma_number}). Autoriza el diploma en la pestaña «Ascensos y diplomas».`
            : undefined,
          variant: "success",
        });
        onPromotionCreated();
      } else {
        showToast({
          title: "Examen no aprobado",
          description: `Nota técnica: ${res.exam?.technical_score ?? "—"}.`,
          variant: "warning",
        });
      }
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const remove = async (exam: PromotionExam) => {
    const ok = await confirm({ title: "Eliminar examen", description: "¿Eliminar este examen?" });
    if (!ok) return;
    try {
      await promotionsApi.deleteExam(exam.id);
      showToast({ title: "Examen eliminado", variant: "success" });
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const actions: RowAction<PromotionExam>[] = [
    {
      id: "finalize",
      label: "Finalizar",
      icon: CheckCircle2,
      variant: "tonal",
      show: (r) => r.result === "pending",
      onClick: finalize,
    },
    {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      variant: "ghost",
      show: (r) => r.result === "pending",
      onClick: (r) => {
        setEditing(r);
        setModalOpen(true);
      },
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
        <div className="sm:w-48">
          <Label htmlFor="exam-result-filter" className="mb-1.5 block">
            Resultado
          </Label>
          <NativeSelect
            id="exam-result-filter"
            value={result}
            onChange={(e) => {
              setResult(e.target.value as ExamResult | "");
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">No aprobados</option>
          </NativeSelect>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          {athleteId != null && (
            <Button variant="outline" onClick={() => setAthleteId(null)}>
              Ver todos
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo examen
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.id}
        rowActions={actions}
        empty={{
          icon: ClipboardCheck,
          title: "Sin exámenes de ascenso",
          description:
            "Crea un examen para evaluar a un deportista que aspira a un nuevo cinturón.",
        }}
      />
      <Pagination count={count} page={page} onPageChange={setPage} />

      <ExamFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        exam={editing}
        criteria={criteria}
        belts={belts}
        defaultAthleteId={athleteId}
        onSaved={() => load()}
      />
    </div>
  );
}
