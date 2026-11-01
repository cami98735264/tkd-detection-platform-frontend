import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  ListOrdered,
  Save,
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
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { poomsaeApi } from "../api/poomsaeApi";
import {
  formatMegabytes,
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
  PoomsaeDetail,
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
    <tr className="border-b border-divider align-top">
      <td className="px-2 py-2 text-sm font-semibold tabular-nums text-text">{movement.number}</td>
      <td className="px-2 py-2">
        <Input
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
        description="Videos de referencia y guion de movimientos de cada forma."
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
