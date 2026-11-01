import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ClipboardCheck,
  ListOrdered,
  Save,
  SearchCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Video,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { poomsaeApi } from "../api/poomsaeApi";
import {
  formatMegabytes,
  MISMATCH_KIND_LABEL,
  movementPatch,
  normalizeMovements,
  REFERENCE_MAX_VIDEO_BYTES,
  referenceVideoSrc,
  STEP_LABEL,
  toMovementDraft,
  TURN_OPTIONS,
  turnLabel,
  validateVideoFile,
  type MovementDraft,
} from "../lib/sequence";
import type {
  Poomsae,
  PoomsaeAttempt,
  PoomsaeDetail,
  ScriptCheckResult,
  PoomsaeMovement,
  Technique,
  TechniqueElement,
  VideoSource,
} from "../types";

const SOURCE_LABEL: Record<VideoSource, string> = {
  club: "Video del club",
  youtube: "YouTube",
  external: "Enlace externo",
};

interface VideoForm {
  video_source: VideoSource;
  video_url: string;
  video_credit: string;
  video_license_note: string;
}

const toVideoForm = (p: Poomsae): VideoForm => ({
  video_source: (p.video_source as VideoSource) || "youtube",
  video_url: p.video_url ?? "",
  video_credit: p.video_credit ?? "",
  video_license_note: p.video_license_note ?? "",
});

/** Club-hosted video: preview, upload/replace, remove (C.5). */
function ReferenceVideoCard({
  detail,
  onChanged,
}: {
  detail: PoomsaeDetail;
  onChanged: (d: PoomsaeDetail | null) => void;
}) {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = referenceVideoSrc(detail);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const problem = validateVideoFile(file, REFERENCE_MAX_VIDEO_BYTES);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      onChanged(await poomsaeApi.uploadReferenceVideo(detail.id, file));
      showToast({ title: "Video de referencia actualizado", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    const ok = await confirm({
      title: "¿Eliminar el video de referencia?",
      description: "Los deportistas volverán a ver el video de YouTube, si está configurado.",
      variant: "warning",
    });
    if (!ok) return;
    setBusy(true);
    try {
      onChanged(await poomsaeApi.removeReferenceVideo(detail.id));
      showToast({ title: "Video de referencia eliminado", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4 text-primary" />
          Video de referencia del club
        </CardTitle>
        <CardDescription>
          Se reproduce dentro de la plataforma (privado, solo usuarios autenticados) y tiene
          prioridad sobre YouTube. MP4, WebM o MOV de hasta{" "}
          {formatMegabytes(REFERENCE_MAX_VIDEO_BYTES)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {src ? (
          <div className="space-y-2">
            <video
              src={src}
              controls
              controlsList="nodownload"
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-lg border border-border bg-black"
              aria-label={`Video de referencia subido: ${detail.name}`}
            />
            <p className="text-xs text-muted">
              {detail.reference_video_type || "video"}
              {detail.reference_video_size != null &&
                ` · ${formatMegabytes(detail.reference_video_size)}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Este poomsae no tiene un video subido por el club.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <label
            className={
              "inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text hover:bg-surface-2" +
              (busy ? " pointer-events-none opacity-50" : "")
            }
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {src ? "Reemplazar video" : "Subir video"}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="sr-only"
              aria-label="Archivo del video de referencia"
              disabled={busy}
              onChange={(e) => void handleFile(e)}
            />
          </label>
          {src && (
            <Button variant="outline" onClick={() => void handleRemove()} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Eliminar video
            </Button>
          )}
        </div>
        {busy && <p className="text-sm text-muted">Procesando… no cierres esta página.</p>}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/** YouTube / external URL + credit + licence fields. */
function ExternalVideoCard({
  detail,
  onChanged,
}: {
  detail: PoomsaeDetail;
  onChanged: (d: PoomsaeDetail | null) => void;
}) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [form, setForm] = useState<VideoForm>(() => toVideoForm(detail));
  const [saving, setSaving] = useState(false);
  const initial = toVideoForm(detail);
  const dirty = (Object.keys(form) as (keyof VideoForm)[]).some((k) => form[k] !== initial[k]);
  const urlInvalid = form.video_url.trim() !== "" && !/^https?:\/\//i.test(form.video_url.trim());

  const save = async () => {
    if (urlInvalid) return;
    setSaving(true);
    try {
      const saved = await poomsaeApi.updatePoomsae(detail.id, {
        video_source: form.video_source,
        video_url: form.video_url.trim(),
        video_credit: form.video_credit.trim(),
        video_license_note: form.video_license_note.trim(),
      });
      onChanged(saved);
      showToast({ title: "Datos del video guardados", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof VideoForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Video externo y créditos</CardTitle>
        <CardDescription>
          Usa solo videos oficiales o con permiso del autor. YouTube se inserta con
          youtube-nocookie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="video_source">Fuente</Label>
            <NativeSelect
              id="video_source"
              value={form.video_source}
              onChange={(e) => field("video_source", e.target.value)}
            >
              {(Object.keys(SOURCE_LABEL) as VideoSource[]).map((k) => (
                <option key={k} value={k}>
                  {SOURCE_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video_url">URL del video</Label>
            <Input
              id="video_url"
              value={form.video_url}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => field("video_url", e.target.value)}
              aria-invalid={urlInvalid}
            />
            {urlInvalid && (
              <p className="text-xs text-error">La URL debe empezar por http:// o https://</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video_credit">Crédito (autor o canal)</Label>
            <Input
              id="video_credit"
              value={form.video_credit}
              onChange={(e) => field("video_credit", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="video_license_note">Nota de licencia</Label>
            <Input
              id="video_license_note"
              value={form.video_license_note}
              onChange={(e) => field("video_license_note", e.target.value)}
            />
          </div>
        </div>
        <Button onClick={() => void save()} disabled={!dirty || saving || urlInvalid}>
          <Save className="h-4 w-4" />
          Guardar
        </Button>
      </CardContent>
    </Card>
  );
}

function techniqueOptions(techniques: Technique[], elements: TechniqueElement[]) {
  return techniques.filter((t) => elements.includes(t.element));
}

/** One editable row of the movement script. */
function MovementRow({
  movement,
  techniques,
  onSaved,
}: {
  movement: PoomsaeMovement;
  techniques: Technique[];
  onSaved: (m: PoomsaeMovement) => void;
}) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [draft, setDraft] = useState<MovementDraft>(() => toMovementDraft(movement));
  const [saving, setSaving] = useState(false);
  const patch = movementPatch(movement, draft);
  const dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof MovementDraft>(key: K, value: MovementDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const turns = TURN_OPTIONS.includes(draft.turn_deg)
    ? TURN_OPTIONS
    : [...TURN_OPTIONS, draft.turn_deg];
  const fkSelect = (
    key: "stance" | "hand" | "kick",
    elements: TechniqueElement[],
    fallbackName: string | null,
  ) => {
    const options = techniqueOptions(techniques, elements);
    const value = draft[key];
    return (
      <NativeSelect
        className="h-9 min-w-[9rem] text-xs"
        aria-label={`${key === "stance" ? "Posición" : key === "hand" ? "Técnica de mano" : "Patada"} del movimiento ${movement.number}`}
        value={value == null ? "" : String(value)}
        onChange={(e) => set(key, e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">—</option>
        {value != null && !options.some((t) => t.id === value) && (
          <option value={value}>{fallbackName ?? `#${value}`}</option>
        )}
        {options.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </NativeSelect>
    );
  };

  const save = async () => {
    if (movement.id == null || !dirty) return;
    setSaving(true);
    try {
      const saved = await poomsaeApi.updateMovement(movement.id, patch);
      const next = saved ?? { ...movement, ...draft };
      onSaved(next);
      setDraft(toMovementDraft(next));
      showToast({ title: `Movimiento ${movement.number} guardado`, variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr id={`movimiento-${movement.number}`} className="border-b border-divider align-top">
      <td className="px-2 py-2 text-sm font-semibold tabular-nums text-text">{movement.number}</td>
      <td className="px-2 py-2">
        <Input
          id={`movimiento-${movement.number}-nombre`}
          className="h-9 min-w-[12rem] text-xs"
          aria-label={`Nombre del movimiento ${movement.number}`}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </td>
      <td className="px-2 py-2">{fkSelect("stance", ["stance"], movement.stance_name)}</td>
      <td className="px-2 py-2">
        {fkSelect("hand", ["block", "hand_attack"], movement.hand_name)}
      </td>
      <td className="px-2 py-2">{fkSelect("kick", ["kick"], movement.kick_name)}</td>
      <td className="px-2 py-2">
        <NativeSelect
          className="h-9 min-w-[8rem] text-xs"
          aria-label={`Giro del movimiento ${movement.number}`}
          value={String(draft.turn_deg)}
          onChange={(e) => set("turn_deg", Number(e.target.value))}
        >
          {turns.map((t) => (
            <option key={t} value={t}>
              {turnLabel(t)}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-2 py-2">
        <NativeSelect
          className="h-9 min-w-[7rem] text-xs"
          aria-label={`Desplazamiento del movimiento ${movement.number}`}
          value={draft.step ?? ""}
          onChange={(e) => set("step", e.target.value || null)}
        >
          <option value="">—</option>
          {Object.entries(STEP_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          aria-label={`Kihap en el movimiento ${movement.number}`}
          checked={draft.kihap}
          onChange={(e) => set("kihap", e.target.checked)}
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          aria-label={`Mantener posición en el movimiento ${movement.number}`}
          checked={draft.hold}
          onChange={(e) => set("hold", e.target.checked)}
        />
      </td>
      <td className="px-2 py-2">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty || saving || movement.id == null}
          onClick={() => void save()}
          aria-label={`Guardar movimiento ${movement.number}`}
        >
          <Save className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

function MovementScriptCard({
  poomsaeId,
  techniques,
}: {
  poomsaeId: number;
  techniques: Technique[];
}) {
  const { handleError } = useApiErrorHandler();
  const [movements, setMovements] = useState<PoomsaeMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    poomsaeApi
      .movements(poomsaeId)
      .then((m) => {
        if (alive) setMovements(m);
      })
      .catch(handleError)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [poomsaeId, handleError]);

  const onSaved = useCallback(
    (m: PoomsaeMovement) =>
      setMovements((prev) => prev.map((x) => (x.number === m.number ? { ...x, ...m } : x))),
    [],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListOrdered className="h-4 w-4 text-primary" />
          Guion de movimientos ({movements.length})
        </CardTitle>
        <CardDescription>
          Numeración Kukkiwon. El giro es el cambio de orientación respecto al movimiento anterior
          (positivo = izquierda). Los cambios se aplican a los próximos análisis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : movements.length === 0 ? (
          <p className="text-sm text-muted">Este poomsae aún no tiene guion de movimientos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th className="px-2 py-2 font-medium">N.º</th>
                  <th className="px-2 py-2 font-medium">Nombre</th>
                  <th className="px-2 py-2 font-medium">Posición</th>
                  <th className="px-2 py-2 font-medium">Mano</th>
                  <th className="px-2 py-2 font-medium">Patada</th>
                  <th className="px-2 py-2 font-medium">Giro</th>
                  <th className="px-2 py-2 font-medium">Paso</th>
                  <th className="px-2 py-2 text-center font-medium">Kihap</th>
                  <th className="px-2 py-2 text-center font-medium">Pausa</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <MovementRow
                    key={`${m.number}-${m.id}`}
                    movement={m}
                    techniques={techniques}
                    onSaved={onSaved}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** "Guion revisado por el maestro" toggle + notes (C.9). */
function ScriptReviewCard({
  detail,
  onChanged,
}: {
  detail: PoomsaeDetail;
  onChanged: (d: PoomsaeDetail | null) => void;
}) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [reviewed, setReviewed] = useState(detail.script_reviewed === true);
  const [notes, setNotes] = useState(detail.script_notes ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    reviewed !== (detail.script_reviewed === true) || notes !== (detail.script_notes ?? "");

  const save = async () => {
    setSaving(true);
    try {
      const saved = await poomsaeApi.reviewScript(detail.id, { reviewed, notes: notes.trim() });
      onChanged(
        saved && saved.name
          ? saved
          : { ...detail, script_reviewed: reviewed, script_notes: notes.trim() },
      );
      showToast({
        title: reviewed ? "Guion marcado como revisado" : "Guion marcado como provisional",
        variant: "success",
      });
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Revisión del guion
          </span>
          {detail.script_reviewed ? (
            <Badge variant="success">Revisado</Badge>
          ) : (
            <Badge variant="outline-muted">Guion provisional</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Mientras el guion no esté revisado, los deportistas ven sus resultados como provisionales.
          {detail.script_reviewed && (detail.script_reviewed_by_name || detail.script_reviewed_at)
            ? ` Revisado${detail.script_reviewed_by_name ? ` por ${detail.script_reviewed_by_name}` : ""}${
                detail.script_reviewed_at
                  ? ` el ${new Date(detail.script_reviewed_at).toLocaleDateString()}`
                  : ""
              }.`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          Guion revisado por el maestro
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="script_notes">Notas del guion</Label>
          <Textarea
            id="script_notes"
            rows={3}
            value={notes}
            placeholder="Fuentes consultadas, dudas, correcciones pendientes…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          <Save className="h-4 w-4" />
          Guardar revisión
        </Button>
      </CardContent>
    </Card>
  );
}

const ATTEMPT_PAGES = 3;

function describeValue(v: string | number | null) {
  return v == null || v === "" ? "—" : String(v);
}

/** Jump to (and focus) a movement row of the script table. */
function focusMovement(number: number) {
  const row = document.getElementById(`movimiento-${number}`);
  row?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  document.getElementById(`movimiento-${number}-nombre`)?.focus();
}

/** "Verificar guion con mi grabación" (C.9): compare with one of my attempts. */
function ScriptCheckCard({ detail }: { detail: PoomsaeDetail }) {
  const { handleError } = useApiErrorHandler();
  const userId = useAuthStore((st) => st.user?.id ?? null);
  const [attempts, setAttempts] = useState<PoomsaeAttempt[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [result, setResult] = useState<ScriptCheckResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const all: PoomsaeAttempt[] = [];
      for (let page = 1; page <= ATTEMPT_PAGES; page += 1) {
        const res = await poomsaeApi.listAttempts({
          poomsae: detail.id,
          status: "completed",
          page,
        });
        const rows = Array.isArray(res?.results) ? res.results : [];
        all.push(...rows);
        if (!res?.next || rows.length === 0) break;
      }
      if (!alive) return;
      const mine = all.filter(
        (a) =>
          a.status === "completed" &&
          (a.mode === "segment" || a.mode === "full") &&
          userId != null &&
          a.user === userId,
      );
      setAttempts(mine);
      setAttemptId((cur) => cur ?? mine[0]?.id ?? null);
    })().catch(handleError);
    return () => {
      alive = false;
    };
  }, [detail.id, userId, handleError]);

  const run = async () => {
    if (attemptId == null) return;
    setBusy(true);
    try {
      setResult(await poomsaeApi.scriptCheck(detail.id, attemptId));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SearchCheck className="h-4 w-4 text-primary" />
          Verificar guion con mi grabación
        </CardTitle>
        <CardDescription>
          Elige un intento tuyo ejecutando la forma correctamente: se comparará con el guion para
          encontrar giros, pasos o técnicas que no coinciden. No se cambia nada automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {attempts.length === 0 ? (
          <p className="text-sm text-muted">
            No tienes intentos completados de este poomsae (segmento o forma completa). Grábate
            desde la página del poomsae y vuelve aquí.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem] flex-1 space-y-1.5">
              <Label htmlFor="script-check-attempt">Intento de referencia</Label>
              <NativeSelect
                id="script-check-attempt"
                value={attemptId ?? ""}
                onChange={(e) => {
                  setAttemptId(Number(e.target.value) || null);
                  setResult(null);
                }}
              >
                {attempts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.mode === "full" ? "Forma completa" : a.segment_name || "Segmento"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString()} ·{" "}
                    {a.score != null ? Math.round(a.score) : "—"}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button onClick={() => void run()} disabled={busy || attemptId == null}>
              <SearchCheck className="h-4 w-4" />
              Verificar guion
            </Button>
          </div>
        )}

        {result &&
          (result.mismatches.length === 0 ? (
            <p className="text-sm text-success">
              El guion coincide con tu grabación: no se encontraron diferencias.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text">
                Diferencias encontradas ({result.mismatches.length})
              </p>
              <ul className="divide-y divide-divider rounded-md border border-border">
                {result.mismatches.map((m, i) => (
                  <li key={`${m.number}-${m.kind}-${i}`} className="space-y-1 px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text">
                        {m.number}. {m.name}
                      </span>
                      <Badge variant="warning">{MISMATCH_KIND_LABEL[m.kind] ?? m.kind}</Badge>
                    </div>
                    <p className="text-xs text-muted">
                      Guion: {describeValue(m.expected)} · Medido: {describeValue(m.measured)}
                    </p>
                    {m.suggestion && <p className="text-text">{m.suggestion}</p>}
                    <a
                      href={`#movimiento-${m.number}`}
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        focusMovement(m.number);
                      }}
                    >
                      Editar movimiento {m.number}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

/** Admin (maestro): reference videos and movement scripts of each poomsae (C.7). */
export default function PoomsaeAdminPage() {
  const { handleError } = useApiErrorHandler();
  const [list, setList] = useState<Poomsae[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<PoomsaeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    Promise.all([poomsaeApi.list(), poomsaeApi.techniques()])
      .then(([p, t]) => {
        const sorted = [...p].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setList(sorted);
        setTechniques(t);
        setSelected((cur) => cur ?? sorted[0]?.id ?? null);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  useEffect(() => {
    if (selected == null) {
      setDetail(null);
      return;
    }
    let alive = true;
    poomsaeApi
      .get(selected)
      .then((d) => {
        if (alive) setDetail(d && d.name ? d : null);
      })
      .catch(handleError);
    return () => {
      alive = false;
    };
  }, [selected, handleError]);

  const onChanged = useCallback((d: PoomsaeDetail | null) => {
    if (d && d.name) setDetail((prev) => ({ ...(prev ?? d), ...d }));
    setVersion((v) => v + 1);
  }, []);

  const embedded = useMemo(() => normalizeMovements(detail?.movements).length, [detail]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Poomsae"
        description="Videos de referencia, guion de movimientos y su revisión por el maestro."
        actions={
          <Button asChild variant="outline">
            <Link to="/dashboard/poomsae-admin/calibracion">
              <SlidersHorizontal className="h-4 w-4" />
              Calibración de técnicas
            </Link>
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No hay poomsae registrados" />
        </Card>
      ) : (
        <>
          <div className="space-y-1.5 sm:w-80">
            <Label htmlFor="poomsae-select">Poomsae</Label>
            <NativeSelect
              id="poomsae-select"
              value={selected ?? ""}
              onChange={(e) => setSelected(Number(e.target.value) || null)}
            >
              {list.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.active === false ? " (inactivo)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          {!detail ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                {detail.belt_name && <Badge variant="tonal">{detail.belt_name}</Badge>}
                <span>{detail.segments?.length ?? 0} segmentos</span>
                {embedded > 0 && <span>· {embedded} movimientos</span>}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ReferenceVideoCard
                  key={`ref-${detail.id}-${version}`}
                  detail={detail}
                  onChanged={onChanged}
                />
                <ExternalVideoCard
                  key={`ext-${detail.id}-${version}`}
                  detail={detail}
                  onChanged={onChanged}
                />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <ScriptReviewCard
                  key={`rev-${detail.id}-${version}`}
                  detail={detail}
                  onChanged={onChanged}
                />
                <ScriptCheckCard key={`chk-${detail.id}`} detail={detail} />
              </div>
              <MovementScriptCard
                key={`mov-${detail.id}`}
                poomsaeId={detail.id}
                techniques={techniques}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
