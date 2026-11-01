import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Download, FileText, Lock, Plus } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { downloadFile } from "@/lib/download";

import { promotionsApi } from "../api/promotionsApi";
import PromotionFormModal from "../components/PromotionFormModal";
import { ScanUploadButton } from "../components/ScanUploadButton";
import { useBelts } from "../hooks/useBelts";
import type { BeltPromotion, MyDiplomaPermission } from "../types";

/** Sportsman ("Mis diplomas") and parent ("Diplomas de mis hijos") view. */
export default function MyDiplomasPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isParent = role === "parent";
  const { handleError } = useApiErrorHandler();
  const belts = useBelts();

  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [promotions, setPromotions] = useState<BeltPromotion[]>([]);
  const [perms, setPerms] = useState<MyDiplomaPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    promotionsApi
      .myPermissions()
      .then(setPerms)
      .catch(() => setPerms([]));
  }, []);

  const load = useCallback(() => {
    if (isParent && athleteId == null) {
      setPromotions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    promotionsApi
      .listPromotions({ athleteId: isParent ? athleteId : undefined })
      .then((res) => setPromotions(res?.results ?? []))
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [isParent, athleteId, handleError]);

  useEffect(() => {
    load();
  }, [load]);

  // The permission that applies to what is on screen.
  const permission = useMemo(() => {
    if (isParent) return perms.find((p) => p.athlete === athleteId) ?? null;
    return perms[0] ?? null;
  }, [perms, isParent, athleteId]);
  const canRegister = !!permission?.can_register;
  const registerOptions = useMemo(
    () => perms.filter((p) => p.can_register).map((p) => ({ id: p.athlete, name: p.athlete_name })),
    [perms],
  );

  const replace = (p: BeltPromotion) =>
    setPromotions((prev) => prev.map((r) => (r.id === p.id ? { ...r, ...p } : r)));

  const download = (url: string, name: string) =>
    downloadFile(url, name).catch((err: unknown) => handleError(err));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isParent ? "Acudiente" : "Mi progreso"}
        title={isParent ? "Diplomas de mis hijos" : "Mis diplomas"}
        description="Ascensos de cinturón registrados y sus diplomas digitales."
        actions={
          canRegister ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar diploma
            </Button>
          ) : undefined
        }
      />

      {isParent && <AthletePicker className="sm:w-80" value={athleteId} onChange={setAthleteId} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-36 w-full" />
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <EmptyState
            icon={Award}
            title="Sin ascensos registrados"
            description="Cuando el maestro registre un ascenso de cinturón aparecerá aquí con su diploma."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {promotions.map((p) => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted">
                      {p.from_belt_name ? `${p.from_belt_name} →` : "Ascenso a"}
                    </p>
                    <p className="font-display text-xl font-semibold text-text">{p.to_belt_name}</p>
                    <p className="text-sm text-muted">
                      {p.promotion_date} ·{" "}
                      <span className="font-mono text-xs">{p.diploma_number}</span>
                    </p>
                    {isParent && <p className="text-xs text-faint">{p.athlete_name}</p>}
                  </div>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Award className="h-5 w-5" />
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.diploma_authorized ? (
                    <Badge variant="success">Diploma autorizado</Badge>
                  ) : (
                    <Badge variant="warning">Pendiente de autorización</Badge>
                  )}
                  {p.has_file && <Badge variant="outline">Escaneo cargado</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.can_download_diploma && p.diploma_url ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        void download(promotionsApi.diplomaUrl(p), `${p.diploma_number}.pdf`)
                      }
                    >
                      <Download className="h-4 w-4" />
                      Descargar diploma
                    </Button>
                  ) : (
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <Lock className="h-3.5 w-3.5" />
                      La descarga del diploma requiere autorización del maestro.
                    </p>
                  )}
                  {p.has_file && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void download(
                          promotionsApi.scanUrl(p),
                          p.diploma_original_filename || `${p.diploma_number}-escaneo`,
                        )
                      }
                    >
                      <FileText className="h-4 w-4" />
                      Ver escaneo
                    </Button>
                  )}
                  {p.can_edit && <ScanUploadButton promotion={p} onUploaded={replace} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canRegister && (
        <PromotionFormModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          belts={belts}
          athleteOptions={registerOptions}
          defaultAthleteId={permission?.athlete ?? null}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
