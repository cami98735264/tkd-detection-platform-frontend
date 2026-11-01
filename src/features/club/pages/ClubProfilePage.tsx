import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ImageOff, Save, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/common/PageHeader";
import { WEEKDAYS, toggleTrainingDay } from "@/features/athletes/lib/athleteResume";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { cn } from "@/lib/utils";
import type { ClubProfile } from "@/types/entities";

import { clubProfileApi } from "../api/clubProfileApi";
import {
  SIGNATURE_ACCEPT,
  buildClubProfilePayload,
  isClubProfileDirty,
  toClubProfileForm,
  validateClubProfileForm,
  validateSignatureFile,
  type ClubProfileFormErrors,
  type ClubProfileFormValues,
  type ClubProfileTextKey,
} from "../lib/clubProfile";

/** Authenticated blob preview of the stored signature (object URL revoked on change). */
function useSignaturePreview(profile: ClubProfile | null, version: number) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hasSignature = profile?.has_signature ?? false;
  const signatureUrl = profile?.signature_url ?? null;

  useEffect(() => {
    if (!hasSignature) {
      setSrc(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    clubProfileApi
      .fetchSignature(signatureUrl)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasSignature, signatureUrl, version]);

  return { src, failed };
}

/** Admin: official club data printed on constancias, hojas de vida and diplomas (B.2). */
export default function ClubProfilePage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [profile, setProfile] = useState<ClubProfile | null>(null);
  const [values, setValues] = useState<ClubProfileFormValues | null>(null);
  const [errors, setErrors] = useState<ClubProfileFormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureBusy, setSignatureBusy] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [signatureVersion, setSignatureVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = useSignaturePreview(profile, signatureVersion);

  useEffect(() => {
    clubProfileApi
      .get()
      .then((p) => {
        setProfile(p);
        setValues(toClubProfileForm(p));
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  const update = useCallback((patch: Partial<ClubProfileFormValues>) => {
    setValues((prev) => (prev ? { ...prev, ...patch } : prev));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as keyof ClubProfileFormValues];
      return next;
    });
  }, []);

  if (loading || !values || !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="Datos del club" eyebrow="Administración" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dirty = isClubProfileDirty(values, profile);

  const handleSave = async () => {
    const found = validateClubProfileForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const saved = await clubProfileApi.update(buildClubProfilePayload(values));
      setProfile(saved);
      setValues(toClubProfileForm(saved));
      showToast({ title: "Datos del club actualizados", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  /** Apply a signature change without discarding unsaved form edits. */
  const applySignatureResult = (saved: ClubProfile) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            has_signature: saved.has_signature,
            signature_url: saved.signature_url,
            updated_at: saved.updated_at,
          }
        : saved,
    );
    setSignatureVersion((v) => v + 1);
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    const problem = validateSignatureFile(file);
    setSignatureError(problem);
    if (problem) return;
    setSignatureBusy(true);
    try {
      applySignatureResult(await clubProfileApi.uploadSignature(file));
      showToast({ title: "Firma actualizada", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setSignatureBusy(false);
    }
  };

  const handleRemove = async () => {
    const ok = await confirm({
      title: "Quitar firma",
      description:
        "Las constancias se generarán sin la imagen de la firma hasta que subas una nueva. ¿Continuar?",
      variant: "warning",
    });
    if (!ok) return;
    setSignatureBusy(true);
    try {
      applySignatureResult(await clubProfileApi.removeSignature());
      showToast({ title: "Firma eliminada", variant: "success" });
    } catch (err) {
      handleError(err);
    } finally {
      setSignatureBusy(false);
    }
  };

  const field = (
    key: ClubProfileTextKey,
    label: string,
    extra: Record<string, unknown> = {},
  ): ReactNode => (
    <div className="space-y-1.5">
      <Label htmlFor={`club-${key}`}>{label}</Label>
      <Input
        id={`club-${key}`}
        value={values[key]}
        onChange={(e) => update({ [key]: e.target.value } as Partial<ClubProfileFormValues>)}
        {...extra}
      />
      {errors[key] && <p className="text-sm text-error">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datos del club"
        eyebrow="Administración"
        description="Información oficial que aparece en las constancias, hojas de vida y diplomas."
        actions={
          <Button onClick={() => void handleSave()} disabled={saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos institucionales</CardTitle>
            <CardDescription>Encabezado de los documentos generados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {field("name", "Nombre del club *")}
            {field("short_name", "Nombre corto")}
            {field("recognition", "Reconocimiento deportivo")}
            {field("resolution", "Resolución")}
            {field("league", "Liga")}
            {field("city", "Ciudad", { placeholder: "Espinal, Tolima" })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Representante legal y contacto</CardTitle>
            <CardDescription>Firma y datos de contacto de la constancia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              {field("legal_rep_title_prefix", "Título", { placeholder: "Lic." })}
              {field("legal_rep_name", "Nombre del representante *")}
            </div>
            {field("legal_rep_role", "Cargo")}
            <div className="grid gap-3 sm:grid-cols-2">
              {field("phone", "Teléfono", { type: "tel", inputMode: "tel" })}
              {field("email", "Correo", { type: "email", autoComplete: "off" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Firma del representante legal</CardTitle>
            <CardDescription>
              Imagen PNG o JPG de máximo 2 MB (fondo blanco o transparente).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-border bg-white p-3">
              {profile.has_signature && preview.src ? (
                <img
                  src={preview.src}
                  alt="Firma del representante legal"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : profile.has_signature && !preview.failed ? (
                <Skeleton className="h-20 w-48" />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageOff className="h-4 w-4" />
                  {profile.has_signature
                    ? "No se pudo cargar la vista previa."
                    : "Sin firma cargada."}
                </p>
              )}
            </div>
            {signatureError && <p className="text-sm text-error">{signatureError}</p>}
            <input
              ref={fileRef}
              type="file"
              accept={SIGNATURE_ACCEPT}
              className="hidden"
              data-testid="signature-input"
              onChange={(e) => void handleFile(e)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={signatureBusy}
              >
                <Upload className="h-4 w-4" />
                {profile.has_signature ? "Reemplazar firma" : "Subir firma"}
              </Button>
              {profile.has_signature && (
                <Button
                  variant="outline"
                  onClick={() => void handleRemove()}
                  disabled={signatureBusy}
                >
                  <Trash2 className="h-4 w-4" /> Quitar firma
                </Button>
              )}
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="club-include-signature">Incluir la firma en las constancias</Label>
                <p className="text-xs text-muted-foreground">
                  Si se desactiva, la constancia sale con la línea para firmar a mano.
                </p>
              </div>
              <Switch
                id="club-include-signature"
                checked={values.include_signature}
                onCheckedChange={(v) => update({ include_signature: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrenamientos por defecto</CardTitle>
            <CardDescription>
              Se usan en la constancia cuando el deportista no tiene días u horas propios ni un
              horario de programa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium" id="club-days-label">
                Días de entrenamiento
              </p>
              <div role="group" aria-labelledby="club-days-label" className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const checked = values.default_training_days.includes(day.value);
                  return (
                    <label
                      key={day.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-text",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--primary)]"
                        checked={checked}
                        onChange={(e) =>
                          update({
                            default_training_days: toggleTrainingDay(
                              values.default_training_days,
                              day.value,
                              e.target.checked,
                            ),
                          })
                        }
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="max-w-40 space-y-1.5">
              <Label htmlFor="club-default_session_hours">Horas por sesión</Label>
              <Input
                id="club-default_session_hours"
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0.5"
                max="24"
                value={values.default_session_hours}
                onChange={(e) => update({ default_session_hours: e.target.value })}
              />
              {errors.default_session_hours && (
                <p className="text-sm text-error">{errors.default_session_hours}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
