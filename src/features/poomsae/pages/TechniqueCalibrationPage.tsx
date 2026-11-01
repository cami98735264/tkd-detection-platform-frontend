import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, History, RotateCcw, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { poomsaeApi } from "../api/poomsaeApi";
import {
  attemptUsesTechnique,
  formatPassRate,
  formatRange,
  formatValue,
  TOLERANCE_OPTIONS,
} from "../lib/calibration";
import { groupByElement } from "../lib/video";
import type {
  CalibrationProposal,
  CalibrationTolerance,
  CriterionStats,
  PoomsaeAttempt,
  Technique,
  TechniqueCalibration,
  TechniqueStats,
} from "../types";

/** Pages of completed attempts scanned for reference recordings. */
const MAX_ATTEMPT_PAGES = 5;

const MODE_LABEL: Record<string, string> = {
  technique: "Técnica",
  segment: "Segmento",
  full: "Forma completa",
};

/** Current range vs the measured p10–p90 band and median. */
function RangeBar({ c }: { c: CriterionStats }) {
  const values = [c.min, c.max, c.p10, c.p90, c.p50].filter((v): v is number => v != null);
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pos = (v: number) => `${((v - lo) / span) * 100}%`;
  const width = (a: number, b: number) => `${(Math.abs(b - a) / span) * 100}%`;
  return (
    <div className="relative h-3 w-full min-w-[8rem] rounded-full bg-surface-2" aria-hidden="true">
      {c.min != null && c.max != null && (
        <div
          className="absolute inset-y-0 rounded-full bg-primary/25"
          style={{ left: pos(c.min), width: width(c.min, c.max) }}
        />
      )}
      {c.p10 != null && c.p90 != null && (
        <div
          className="absolute inset-y-1 rounded-full bg-highlight"
          style={{ left: pos(c.p10), width: width(c.p10, c.p90) }}
        />
      )}
      {c.p50 != null && (
        <div className="absolute inset-y-0 w-0.5 bg-text" style={{ left: pos(c.p50) }} />
      )}
    </div>
  );
}

function StatsCard({ stats, loading }: { stats: TechniqueStats | null; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estadísticas de los intentos</CardTitle>
        <CardDescription>
          Rango actual (verde) frente al intervalo p10–p90 medido (amarillo) y la mediana.
          {stats && ` Basado en ${stats.attempts} intentos completados.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : !stats || stats.criteria.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay datos medidos para esta técnica.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">Criterio</th>
                  <th className="px-2 py-2 font-medium">Rango actual</th>
                  <th className="px-2 py-2 font-medium">n</th>
                  <th className="px-2 py-2 font-medium">p10</th>
                  <th className="px-2 py-2 font-medium">p50</th>
                  <th className="px-2 py-2 font-medium">p90</th>
                  <th className="px-2 py-2 font-medium">Cumplen</th>
                  <th className="px-2 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {stats.criteria.map((c) => (
                  <tr key={c.key} className="border-b border-divider">
                    <td className="px-2 py-2 text-text">{c.label}</td>
                    <td className="px-2 py-2 tabular-nums">{formatRange(c.min, c.max, c.unit)}</td>
                    <td className="px-2 py-2 tabular-nums">{c.n}</td>
                    <td className="px-2 py-2 tabular-nums">{formatValue(c.p10, c.unit)}</td>
                    <td className="px-2 py-2 tabular-nums">{formatValue(c.p50, c.unit)}</td>
                    <td className="px-2 py-2 tabular-nums">{formatValue(c.p90, c.unit)}</td>
                    <td className="px-2 py-2 tabular-nums">{formatPassRate(c.pass_rate)}</td>
                    <td className="px-2 py-2">
                      <RangeBar c={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Admin (maestro): calibrate a technique's criteria from reference attempts (C.4). */
export default function TechniqueCalibrationPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [techniqueId, setTechniqueId] = useState<number | null>(null);
  const [since, setSince] = useState("");
  const [stats, setStats] = useState<TechniqueStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [attempts, setAttempts] = useState<PoomsaeAttempt[]>([]);
  const [onlyMine, setOnlyMine] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [tolerance, setTolerance] = useState<CalibrationTolerance>("normal");
  const [proposal, setProposal] = useState<CalibrationProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<TechniqueCalibration[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const technique = techniques.find((t) => t.id === techniqueId) ?? null;

  useEffect(() => {
    poomsaeApi.techniques().then(setTechniques).catch(handleError);
  }, [handleError]);

  // Completed attempts (any mode); filtered client-side per technique/author.
  useEffect(() => {
    let alive = true;
    (async () => {
      const all: PoomsaeAttempt[] = [];
      for (let page = 1; page <= MAX_ATTEMPT_PAGES; page += 1) {
        const res = await poomsaeApi.listAttempts({ status: "completed", page });
        const rows = Array.isArray(res?.results) ? res.results : [];
        all.push(...rows);
        if (!res?.next || rows.length === 0) break;
      }
      if (alive) setAttempts(all);
    })().catch(handleError);
    return () => {
      alive = false;
    };
  }, [handleError, reloadKey]);

  useEffect(() => {
    if (techniqueId == null) {
      setStats(null);
      setHistory([]);
      return;
    }
    let alive = true;
    setStatsLoading(true);
    poomsaeApi
      .techniqueStats(techniqueId, since || null)
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(handleError)
      .finally(() => {
        if (alive) setStatsLoading(false);
      });
    poomsaeApi
      .calibrations(techniqueId)
      .then((h) => {
        if (alive) setHistory(h);
      })
      .catch(handleError);
    return () => {
      alive = false;
    };
  }, [techniqueId, since, handleError, reloadKey]);

  const candidates = useMemo(() => {
    if (!technique) return [];
    return attempts.filter(
      (a) =>
        a.status === "completed" &&
        attemptUsesTechnique(a, technique) &&
        (!onlyMine || (userId != null && a.user === userId)),
    );
  }, [attempts, technique, onlyMine, userId]);

  const chooseTechnique = (id: number | null) => {
    setTechniqueId(id);
    setSelectedIds([]);
    setProposal(null);
  };

  const toggle = (id: number) => {
    setProposal(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const run = async (apply: boolean) => {
    if (!technique || selectedIds.length === 0) return;
    if (apply) {
      const ok = await confirm({
        title: `¿Aplicar la calibración a ${technique.name}?`,
        description:
          "Los nuevos rangos se usarán en los próximos análisis. Podrás revertirla desde el historial.",
        variant: "warning",
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await poomsaeApi.calibrate(technique.id, {
        attempt_ids: selectedIds,
        tolerance,
        apply,
      });
      setProposal(res);
      if (apply) {
        showToast({ title: "Calibración aplicada", variant: "success" });
        setReloadKey((k) => k + 1);
        poomsaeApi.techniques().then(setTechniques).catch(handleError);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const revert = useCallback(
    async (c: TechniqueCalibration) => {
      if (techniqueId == null) return;
      const ok = await confirm({
        title: "¿Revertir esta calibración?",
        description: "Se restaurarán los criterios que había antes de aplicarla.",
        variant: "warning",
      });
      if (!ok) return;
      try {
        await poomsaeApi.revertCalibration(techniqueId, c.id);
        showToast({ title: "Calibración revertida", variant: "success" });
        setProposal(null);
        setReloadKey((k) => k + 1);
      } catch (err) {
        handleError(err);
      }
    },
    [techniqueId, confirm, showToast, handleError],
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/poomsae-admin">
            <ArrowLeft className="h-4 w-4" />
            Administración de poomsae
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow="Administración"
        title="Calibración de técnicas"
        description="Ajusta los rangos de cada criterio a partir de tus propias ejecuciones de referencia."
      />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,12rem)]">
        <div className="space-y-1.5">
          <Label htmlFor="technique-select">Técnica</Label>
          <NativeSelect
            id="technique-select"
            value={techniqueId ?? ""}
            onChange={(e) => chooseTechnique(Number(e.target.value) || null)}
          >
            <option value="">Selecciona una técnica…</option>
            {groupByElement(techniques).map((g) => (
              <optgroup key={g.element} label={g.label}>
                {g.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stats-since">Desde (opcional)</Label>
          <Input
            id="stats-since"
            type="date"
            value={since}
            onChange={(e) => setSince(e.target.value)}
          />
        </div>
      </div>

      {!technique ? (
        <Card>
          <EmptyState
            icon={SlidersHorizontal}
            title="Elige una técnica"
            description="Verás cómo se comportan sus criterios en los intentos registrados."
          />
        </Card>
      ) : (
        <>
          <StatsCard stats={stats} loading={statsLoading} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intentos de referencia</CardTitle>
              <CardDescription>
                Selecciona ejecuciones correctas (idealmente grabadas por ti) que incluyan{" "}
                {technique.name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                />
                Solo intentos grabados por mí
              </label>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">
                  No hay intentos completados que incluyan esta técnica
                  {onlyMine ? " grabados por ti" : ""}. Practica la técnica desde el catálogo de
                  poomsae y vuelve aquí.
                </p>
              ) : (
                <ul className="max-h-80 divide-y divide-divider overflow-y-auto rounded-md border border-border">
                  {candidates.map((a) => (
                    <li key={a.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedIds.includes(a.id)}
                          onChange={() => toggle(a.id)}
                          aria-label={`Usar el intento ${a.id}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-text">
                            {MODE_LABEL[a.mode] ?? a.mode}
                            {a.mode === "technique"
                              ? ""
                              : ` · ${[a.poomsae_name, a.segment_name].filter(Boolean).join(" · ")}`}
                          </span>
                          <span className="block text-xs text-muted">
                            {new Date(a.created_at).toLocaleString()}
                            {a.athlete_name ? ` · ${a.athlete_name}` : ""}
                          </span>
                        </span>
                        <span className="tabular-nums text-muted">
                          {a.score != null ? Math.round(a.score) : "—"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tolerance-select">Tolerancia</Label>
                  <NativeSelect
                    id="tolerance-select"
                    className="w-44"
                    value={tolerance}
                    onChange={(e) => {
                      setTolerance(e.target.value as CalibrationTolerance);
                      setProposal(null);
                    }}
                  >
                    {TOLERANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <Button
                  variant="outline"
                  disabled={busy || selectedIds.length === 0}
                  onClick={() => void run(false)}
                >
                  Previsualizar propuesta
                </Button>
                <Button
                  disabled={busy || selectedIds.length === 0 || !proposal || proposal.applied}
                  onClick={() => void run(true)}
                >
                  <Check className="h-4 w-4" />
                  Aplicar calibración
                </Button>
                <span className="text-xs text-muted">{selectedIds.length} seleccionados</span>
              </div>

              {proposal && (
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-text">
                    Propuesta
                    {proposal.applied && <Badge variant="success">Aplicada</Badge>}
                  </p>
                  {proposal.proposed.length === 0 ? (
                    <p className="text-sm text-muted">
                      Los intentos elegidos no aportan medidas para esta técnica.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[32rem] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs text-muted">
                            <th className="px-2 py-2 font-medium">Criterio</th>
                            <th className="px-2 py-2 font-medium">Actual</th>
                            <th className="px-2 py-2 font-medium">Propuesto</th>
                            <th className="px-2 py-2 font-medium">Muestras</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.proposed.map((p) => (
                            <tr key={p.key} className="border-b border-divider">
                              <td className="px-2 py-2 text-text">{p.label}</td>
                              <td className="px-2 py-2 tabular-nums">
                                {formatRange(p.current[0], p.current[1], p.unit)}
                              </td>
                              <td className="px-2 py-2 font-medium tabular-nums text-text">
                                {formatRange(p.proposed[0], p.proposed[1], p.unit)}
                              </td>
                              <td className="px-2 py-2 tabular-nums">{p.samples}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Historial de calibraciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted">Esta técnica no se ha calibrado todavía.</p>
              ) : (
                <ul className="divide-y divide-divider rounded-md border border-border">
                  {history.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="text-text">
                          {c.created_at ? new Date(c.created_at).toLocaleString() : "—"}
                          {c.created_by_name ? ` · ${c.created_by_name}` : ""}
                        </span>
                        <span className="block text-xs text-muted">
                          {c.attempt_ids.length} intentos ·{" "}
                          {c.new_criteria
                            .map(
                              (n) =>
                                `${n.label}: ${formatRange(n.min ?? null, n.max ?? null, n.unit)}`,
                            )
                            .join(" · ") || "sin detalle"}
                        </span>
                      </div>
                      {c.reverted ? (
                        <Badge variant="outline-muted">Revertida</Badge>
                      ) : c.is_revert ? (
                        <Badge variant="outline-muted">Reversión</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => void revert(c)}>
                          <RotateCcw className="h-4 w-4" />
                          Revertir
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
