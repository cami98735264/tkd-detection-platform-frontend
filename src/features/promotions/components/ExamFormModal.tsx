import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import FormModal from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { cn } from "@/lib/utils";

import { promotionsApi } from "../api/promotionsApi";
import { previewExam } from "../lib/examScore";
import type {
  AdminChecks,
  BeltOption,
  ExamCriteria,
  PromotionExam,
  PromotionExamPayload,
  TechnicalScore,
} from "../types";
import { BeltSelect } from "./BeltSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: PromotionExam | null;
  criteria: ExamCriteria | null;
  belts: BeltOption[];
  /** Pre-selected athlete for a new exam. */
  defaultAthleteId?: number | null;
  onSaved: (exam: PromotionExam) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Create / edit a belt promotion exam: technical criteria with weights, the
 * administrative checks and a live preview of what "finalizar" would decide.
 */
export default function ExamFormModal({
  open,
  onOpenChange,
  exam,
  criteria,
  belts,
  defaultAthleteId,
  onSaved,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const isEdit = !!exam;

  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [fromBelt, setFromBelt] = useState<number | null>(null);
  const [toBelt, setToBelt] = useState<number | null>(null);
  const [examDate, setExamDate] = useState(today());
  const [passing, setPassing] = useState(70);
  const [scores, setScores] = useState<TechnicalScore[]>([]);
  const [checks, setChecks] = useState<AdminChecks>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setAthleteId(exam?.athlete ?? defaultAthleteId ?? null);
    setFromBelt(exam?.from_belt ?? null);
    setToBelt(exam?.to_belt ?? null);
    setExamDate(exam?.exam_date ?? today());
    setPassing(exam?.passing_score ?? criteria?.passing_score ?? 70);
    setScores(
      exam?.technical_scores?.length
        ? exam.technical_scores.map((s) => ({ ...s, notes: s.notes ?? "" }))
        : (criteria?.criteria ?? []).map((c) => ({
            criterion: c.criterion,
            weight: c.weight ?? 1,
            score: 0,
            notes: "",
          })),
    );
    setChecks(exam?.admin_checks ?? {});
    setTouched(new Set());
    setNotes(exam?.notes ?? "");
  }, [open, exam, criteria, defaultAthleteId]);

  const checkDefs = useMemo(() => criteria?.admin_checks ?? [], [criteria]);
  const preview = previewExam(scores, passing, checks, checkDefs);

  const updateScore = (idx: number, patch: Partial<TechnicalScore>) =>
    setScores((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const toggleCheck = (key: string, value: boolean) => {
    setChecks((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!athleteId || !toBelt) {
      showToast({ title: "Selecciona el deportista y el cinturón a obtener", variant: "warning" });
      return;
    }
    // On create the server pre-computes documents/attendance: only send the
    // checks the maestro set explicitly so the automatic values are kept.
    const sentChecks: AdminChecks = isEdit
      ? checks
      : Object.fromEntries(Object.entries(checks).filter(([k]) => touched.has(k)));
    const payload: PromotionExamPayload = {
      athlete: athleteId,
      from_belt: fromBelt,
      to_belt: toBelt,
      exam_date: examDate,
      passing_score: passing,
      technical_scores: scores
        .filter((s) => s.criterion.trim())
        .map((s) => ({ ...s, score: Number(s.score), weight: Number(s.weight) })),
      admin_checks: sentChecks,
      notes,
    };
    setSaving(true);
    try {
      const saved = exam
        ? await promotionsApi.updateExam(exam.id, payload)
        : await promotionsApi.createExam(payload);
      showToast({ title: exam ? "Examen actualizado" : "Examen creado", variant: "success" });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Editar examen de ascenso" : "Nuevo examen de ascenso"}
      description="Califica cada criterio técnico (0–100) y verifica los requisitos administrativos."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {isEdit ? (
          <p className="text-sm">
            <span className="text-muted">Deportista: </span>
            <span className="font-medium text-text">
              {exam?.athlete_name ?? `#${exam?.athlete}`}
            </span>
          </p>
        ) : (
          <AthletePicker value={athleteId} onChange={setAthleteId} />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam-from">Cinturón actual</Label>
            <BeltSelect
              id="exam-from"
              value={fromBelt}
              onChange={setFromBelt}
              belts={belts}
              emptyLabel="El actual del deportista"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-to">Cinturón a obtener</Label>
            <BeltSelect
              id="exam-to"
              value={toBelt}
              onChange={setToBelt}
              belts={belts}
              emptyLabel="Seleccionar…"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-date">Fecha del examen</Label>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-text">Criterios técnicos</legend>
          <div className="hidden grid-cols-[1fr_5rem_4.5rem_2.5rem] gap-2 text-xs text-muted sm:grid">
            <span>Criterio</span>
            <span>Nota</span>
            <span>Peso</span>
            <span />
          </div>
          {scores.map((s, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_5rem_4.5rem_2.5rem] items-center gap-2">
              <Input
                aria-label={`Criterio ${idx + 1}`}
                value={s.criterion}
                onChange={(e) => updateScore(idx, { criterion: e.target.value })}
              />
              <Input
                aria-label={`Nota ${s.criterion || idx + 1}`}
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={s.score}
                onChange={(e) => updateScore(idx, { score: Number(e.target.value) })}
              />
              <Input
                aria-label={`Peso ${s.criterion || idx + 1}`}
                type="number"
                min={0}
                step="0.5"
                value={s.weight}
                onChange={(e) => updateScore(idx, { weight: Number(e.target.value) })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar criterio"
                onClick={() => setScores((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setScores((prev) => [...prev, { criterion: "", score: 0, weight: 1, notes: "" }])
            }
          >
            <Plus className="h-4 w-4" />
            Agregar criterio
          </Button>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-text">
            Requisitos administrativos
          </legend>
          {!isEdit && (
            <p className="text-xs text-muted">
              Documentos y asistencia se calculan automáticamente al crear el examen; marca una
              casilla solo si quieres fijar el valor manualmente.
            </p>
          )}
          {checkDefs.map((def) => (
            <label key={def.key} className="flex items-center gap-2 text-sm text-text">
              <Checkbox
                checked={!!checks[def.key]}
                onCheckedChange={(v) => toggleCheck(def.key, v === true)}
                aria-label={def.label}
              />
              {def.label}
            </label>
          ))}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="exam-passing">Nota mínima para aprobar</Label>
            <Input
              id="exam-passing"
              type="number"
              min={0}
              max={100}
              value={passing}
              onChange={(e) => setPassing(Number(e.target.value))}
            />
          </div>
          <div
            className={cn(
              "rounded-md border p-3 text-sm",
              preview.outcome === "approved"
                ? "border-success/40 bg-success/10"
                : "border-warning/40 bg-warning/10",
            )}
            data-testid="exam-preview"
          >
            <p className="text-muted">Promedio ponderado</p>
            <p className="font-display text-2xl font-semibold tabular-nums text-text">
              {preview.score ?? "—"}
            </p>
            <p className="text-xs text-muted">
              {preview.outcome === "approved"
                ? "Con estos datos el examen quedaría aprobado."
                : !preview.passesScore
                  ? `No alcanza la nota mínima (${passing}).`
                  : "Faltan requisitos administrativos."}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-notes">Observaciones</Label>
          <Textarea id="exam-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar examen"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
