import { useEffect, useState, type FormEvent } from "react";

import FormModal from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { gamificationApi } from "../api/gamificationApi";
import { METRIC_LABEL } from "../lib/levels";
import type {
  CategoryOption,
  Challenge,
  ChallengeKind,
  ChallengeMetric,
  ChallengePayload,
} from "../types";

/** TechEvalSession kick types (see technicalEvaluationApi.KickType). */
const KICK_TYPES = [
  "Ap Chagui",
  "Yop Chagui",
  "Dollyo Chagui",
  "Tuit Chagui",
  "An Tario Chagui",
  "Furio Chagui",
] as const;

const KICK_METRICS: ChallengeMetric[] = ["sessions", "min_score"];
const ALL_METRICS = Object.keys(METRIC_LABEL) as ChallengeMetric[];

const iso = (d: Date) => d.toISOString().slice(0, 10);

function blank(): ChallengePayload {
  const start = new Date();
  const end = new Date(start.getTime() + 6 * 24 * 3600 * 1000);
  return {
    title: "",
    description: "",
    kind: "weekly",
    kick_type: null,
    metric: "practice_days",
    target_value: 3,
    start_date: iso(start),
    end_date: iso(end),
    category: null,
    xp_reward: 50,
    active: true,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
  categories: CategoryOption[];
  onSaved: () => void;
}

export default function ChallengeFormModal({
  open,
  onOpenChange,
  challenge,
  categories,
  onSaved,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [form, setForm] = useState<ChallengePayload>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (challenge) {
      const { id: _id, my_progress: _p, ...rest } = challenge;
      setForm(rest);
    } else {
      setForm(blank());
    }
  }, [open, challenge]);

  const set = <K extends keyof ChallengePayload>(key: K, value: ChallengePayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setKind = (kind: ChallengeKind) =>
    setForm((f) => ({
      ...f,
      kind,
      kick_type: kind === "kick" ? (f.kick_type ?? KICK_TYPES[0]) : null,
      metric: kind === "kick" && !KICK_METRICS.includes(f.metric) ? "sessions" : f.metric,
    }));

  const metrics = form.kind === "kick" ? KICK_METRICS : ALL_METRICS;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.kind === "kick" && !form.kick_type) {
      showToast({ title: "Los retos de patada requieren el tipo de patada", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (challenge) await gamificationApi.updateChallenge(challenge.id, form);
      else await gamificationApi.createChallenge(form);
      showToast({ title: challenge ? "Reto actualizado" : "Reto creado", variant: "success" });
      onSaved();
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
      title={challenge ? "Editar reto" : "Nuevo reto"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="ch-title">Título</Label>
          <Input
            id="ch-title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ch-desc">Descripción</Label>
          <Textarea
            id="ch-desc"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ch-kind">Tipo</Label>
            <NativeSelect
              id="ch-kind"
              value={form.kind}
              onChange={(e) => setKind(e.target.value as ChallengeKind)}
            >
              <option value="weekly">Semanal</option>
              <option value="kick">Patada</option>
            </NativeSelect>
          </div>
          {form.kind === "kick" && (
            <div className="space-y-1.5">
              <Label htmlFor="ch-kick">Tipo de patada</Label>
              <NativeSelect
                id="ch-kick"
                value={form.kick_type ?? ""}
                onChange={(e) => set("kick_type", e.target.value || null)}
                required
              >
                {KICK_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ch-metric">Métrica</Label>
            <NativeSelect
              id="ch-metric"
              value={form.metric}
              onChange={(e) => set("metric", e.target.value as ChallengeMetric)}
            >
              {metrics.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABEL[m]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-target">Meta</Label>
            <Input
              id="ch-target"
              type="number"
              min={1}
              value={form.target_value}
              onChange={(e) => set("target_value", Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-start">Inicio</Label>
            <Input
              id="ch-start"
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-end">Fin</Label>
            <Input
              id="ch-end"
              type="date"
              value={form.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-category">Categoría</Label>
            <NativeSelect
              id="ch-category"
              value={form.category ?? ""}
              onChange={(e) => set("category", e.target.value || null)}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-xp">Recompensa (XP)</Label>
            <Input
              id="ch-xp"
              type="number"
              min={0}
              value={form.xp_reward}
              onChange={(e) => set("xp_reward", Number(e.target.value))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.active} onCheckedChange={(v) => set("active", v === true)} />
          Activo
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
