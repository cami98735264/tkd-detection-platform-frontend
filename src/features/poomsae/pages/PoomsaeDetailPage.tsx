import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Footprints,
  ListOrdered,
  Play,
  PlayCircle,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { poomsaeApi } from "../api/poomsaeApi";
import AttemptsHistory from "../components/AttemptsHistory";
import PoomsaeVideo, { type VideoRange } from "../components/PoomsaeVideo";
import MovementChecklist from "../components/MovementChecklist";
import PracticeFlow from "../components/PracticeFlow";
import { FULL_RECORD_SECONDS, movementsForSegment, normalizeMovements } from "../lib/sequence";
import { formatSeconds, SEGMENT_PASS_SCORE, segmentBest } from "../lib/video";
import type { PoomsaeDetail, PoomsaeMovement, PoomsaeSegment } from "../types";

/** One poomsae: reference video, segments with time jumps and practice. */
export default function PoomsaeDetailPage() {
  const { id } = useParams();
  const poomsaeId = Number(id);
  const [search] = useSearchParams();
  const role = useAuthStore((s) => s.user?.role);
  const isSportsman = role === "sportsman";
  const { handleError } = useApiErrorHandler();

  const initialAthlete = Number(search.get("athlete")) || null;
  const [athleteId, setAthleteId] = useState<number | null>(isSportsman ? null : initialAthlete);
  const [detail, setDetail] = useState<PoomsaeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<VideoRange | null>(null);
  const [practicing, setPracticing] = useState<PoomsaeSegment | null>(null);
  const [practicingFull, setPracticingFull] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [fetchedMovements, setFetchedMovements] = useState<PoomsaeMovement[]>([]);

  const load = useCallback(() => {
    if (!Number.isFinite(poomsaeId)) return;
    setLoading(true);
    poomsaeApi
      .get(poomsaeId, isSportsman ? undefined : athleteId)
      .then(setDetail)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [poomsaeId, isSportsman, athleteId, handleError]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const embeddedMovements = useMemo(() => normalizeMovements(detail?.movements), [detail]);
  const hasDetail = !!detail?.name;
  // Older detail payloads don't embed the script: fetch it once.
  useEffect(() => {
    if (!hasDetail || embeddedMovements.length > 0 || !Number.isFinite(poomsaeId)) return;
    let alive = true;
    poomsaeApi
      .movements(poomsaeId)
      .then((m) => {
        if (alive) setFetchedMovements(m);
      })
      .catch(() => {
        // The checklist is optional: practice still works without it.
      });
    return () => {
      alive = false;
    };
  }, [hasDetail, embeddedMovements.length, poomsaeId]);
  const movements = embeddedMovements.length > 0 ? embeddedMovements : fetchedMovements;

  const segments = [...(detail?.segments ?? [])].sort((a, b) => a.order - b.order);
  const jump = (s: PoomsaeSegment) =>
    setRange((prev) => ({
      start: s.video_start_s,
      end: s.video_end_s,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
  const needsAthlete = !isSportsman && athleteId == null;
  const certified = !!(detail?.certified || detail?.my_progress?.full_completed);
  const bestFull = detail?.my_progress?.best_full_score ?? null;
  // Stable range for the reference player (re-seeks only when the segment changes).
  const practiceRange = useMemo<VideoRange | null>(
    () =>
      practicing
        ? { start: practicing.video_start_s, end: practicing.video_end_s, nonce: practicing.id }
        : null,
    [practicing],
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard/poomsae">
            <ArrowLeft className="h-4 w-4" />
            Catálogo
          </Link>
        </Button>
      </div>

      {loading && !detail ? (
        <Skeleton className="h-72 w-full" />
      ) : !detail || !detail.name ? (
        <Card>
          <EmptyState icon={Footprints} title="Poomsae no encontrado" />
        </Card>
      ) : (
        <>
          <PageHeader
            eyebrow={detail.belt_name ? `Cinturón ${detail.belt_name}` : "Poomsae"}
            title={detail.name}
            description={detail.description}
          />
          {certified && (
            <Badge variant="highlight" className="gap-1">
              <Award className="h-3.5 w-3.5" aria-hidden="true" />
              Forma certificada
            </Badge>
          )}

          {!isSportsman && (
            <AthletePicker className="sm:w-80" value={athleteId} onChange={setAthleteId} />
          )}

          {practicingFull ? (
            needsAthlete ? (
              <Card>
                <EmptyState icon={Users} title="Selecciona primero un deportista" />
              </Card>
            ) : (
              <PracticeFlow
                key={`full-${athleteId}`}
                mode="full"
                targetId={detail.id}
                targetName={detail.name}
                athleteId={isSportsman ? null : athleteId}
                recordSeconds={FULL_RECORD_SECONDS}
                reference={
                  <div className="space-y-3">
                    <PoomsaeVideo poomsae={detail} segments={segments} />
                    <MovementChecklist movements={movements} />
                  </div>
                }
                onClose={() => setPracticingFull(false)}
                onFinished={() => setReloadKey((k) => k + 1)}
              />
            )
          ) : practicing ? (
            needsAthlete ? (
              <Card>
                <EmptyState icon={Users} title="Selecciona primero un deportista" />
              </Card>
            ) : (
              <PracticeFlow
                key={`${practicing.id}-${athleteId}`}
                mode="segment"
                targetId={practicing.id}
                targetName={practicing.name}
                athleteId={isSportsman ? null : athleteId}
                recordSeconds={Math.min(
                  30,
                  Math.max(
                    10,
                    Math.ceil(
                      ((practicing.video_end_s ?? 0) - (practicing.video_start_s ?? 0)) * 1.5,
                    ) || 15,
                  ),
                )}
                reference={
                  <div className="space-y-3">
                    <PoomsaeVideo poomsae={detail} range={practiceRange} />
                    {practicing.description && (
                      <p className="text-sm text-text">{practicing.description}</p>
                    )}
                    <MovementChecklist movements={movementsForSegment(movements, practicing)} />
                  </div>
                }
                onClose={() => setPracticing(null)}
                onFinished={() => setReloadKey((k) => k + 1)}
              />
            )
          ) : (
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
              <div className="space-y-4">
                <PoomsaeVideo poomsae={detail} range={range} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-primary" />
                        Forma completa
                      </span>
                      {certified ? (
                        <Badge variant="highlight">Forma certificada</Badge>
                      ) : bestFull != null ? (
                        <Badge variant="outline">Mejor: {Math.round(bestFull)}</Badge>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted">
                      Ejecuta el poomsae de principio a fin
                      {movements.length > 0 ? ` (${movements.length} movimientos)` : ""}. Se evalúan
                      el orden, los giros, los desplazamientos y cada técnica. Con{" "}
                      {SEGMENT_PASS_SCORE} puntos o más la forma queda certificada.
                    </p>
                    {bestFull != null && certified && (
                      <p className="text-xs text-muted">Mejor puntaje: {Math.round(bestFull)}</p>
                    )}
                    <Button onClick={() => setPracticingFull(true)}>
                      <Footprints className="h-4 w-4" />
                      Practicar forma completa
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListOrdered className="h-4 w-4 text-primary" />
                    Segmentos ({segments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {segments.length === 0 ? (
                    <p className="text-sm text-muted">Este poomsae aún no tiene segmentos.</p>
                  ) : (
                    <ol className="space-y-3">
                      {segments.map((s) => {
                        const best = segmentBest(s);
                        const passed = best != null && best >= SEGMENT_PASS_SCORE;
                        return (
                          <li key={s.id} className="space-y-2 rounded-lg border border-border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-text">
                                  {s.order}. {s.name}
                                </p>
                                {s.description && (
                                  <p className="text-xs text-muted">{s.description}</p>
                                )}
                                {s.techniques?.length > 0 && (
                                  <p className="mt-1 text-xs text-faint">
                                    {s.techniques.map((t) => t.name).join(" · ")}
                                  </p>
                                )}
                              </div>
                              {best != null && (
                                <Badge variant={passed ? "success" : "outline"}>
                                  {passed && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                  {Math.round(best)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {s.video_start_s != null && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => jump(s)}
                                  aria-label={`Ver segmento ${s.name}`}
                                >
                                  <Play className="h-4 w-4" />
                                  {formatSeconds(s.video_start_s)}–{formatSeconds(s.video_end_s)}
                                </Button>
                              )}
                              <Button size="sm" onClick={() => setPracticing(s)}>
                                <Footprints className="h-4 w-4" />
                                Practicar segmento
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!needsAthlete && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-text">Intentos recientes</h2>
              <AttemptsHistory athleteId={isSportsman ? null : athleteId} reloadKey={reloadKey} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
