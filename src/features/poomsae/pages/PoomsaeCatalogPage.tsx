import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, Dumbbell, Footprints, PlayCircle, Users } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ProgressBar } from "@/features/gamification/components/ProgressBar";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { poomsaeApi } from "../api/poomsaeApi";
import AttemptsHistory from "../components/AttemptsHistory";
import PracticeFlow from "../components/PracticeFlow";
import TechniqueReference from "../components/TechniqueReference";
import { isScriptProvisional } from "../lib/sequence";
import { groupByElement } from "../lib/video";
import type { Poomsae, Technique } from "../types";

/** Poomsae catalogue, fundamentals practice and attempts history. */
export default function PoomsaeCatalogPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isSportsman = role === "sportsman";
  const { handleError } = useApiErrorHandler();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [poomsae, setPoomsae] = useState<Poomsae[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [practicing, setPracticing] = useState<Technique | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([poomsaeApi.list(), poomsaeApi.techniques()])
      .then(([p, t]) => {
        setPoomsae([...p].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        setTechniques(t);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  useEffect(() => {
    load();
  }, [load]);

  const needsAthlete = !isSportsman && athleteId == null;
  const detailLink = (id: number) =>
    `/dashboard/poomsae/${id}${!isSportsman && athleteId ? `?athlete=${athleteId}` : ""}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aprendizaje"
        title="Poomsae"
        description="Aprende las formas Taegeuk por segmentos, practica los fundamentos y recibe retroalimentación automática con la cámara."
      />

      {!isSportsman && (
        <AthletePicker
          className="sm:w-80"
          value={athleteId}
          onChange={setAthleteId}
          label={role === "parent" ? "Practicar con" : "Deportista"}
        />
      )}

      <Tabs defaultValue="poomsae">
        <TabsList className="flex-wrap">
          <TabsTrigger value="poomsae">Poomsae</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="poomsae" className="pt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-44 w-full" />
              ))}
            </div>
          ) : poomsae.length === 0 ? (
            <Card>
              <EmptyState icon={BookOpen} title="Aún no hay poomsae publicados" />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {poomsae.map((p) => {
                const prog = p.my_progress;
                const total = prog?.segments_total || p.segments_count || 0;
                const doneSegs = prog?.segments_completed ?? 0;
                const pct = total > 0 ? (doneSegs / total) * 100 : 0;
                return (
                  <Card key={p.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-lg font-semibold text-text">{p.name}</p>
                          {p.korean_name && <p className="text-xs text-muted">{p.korean_name}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {p.belt_name && <Badge variant="tonal">{p.belt_name}</Badge>}
                          {isScriptProvisional(p) && (
                            <Badge
                              variant="outline-muted"
                              title="El maestro aún no ha revisado el guion de movimientos; los resultados son provisionales."
                            >
                              Guion provisional
                            </Badge>
                          )}
                          {prog?.full_completed && (
                            <Badge variant="highlight" className="gap-1">
                              <Award className="h-3 w-3" aria-hidden="true" />
                              Forma certificada
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted">{p.description}</p>
                      <div className="mt-auto space-y-1.5">
                        <div className="flex justify-between text-xs text-muted">
                          <span>
                            {doneSegs}/{total} segmentos superados
                          </span>
                          {prog?.best_score != null && (
                            <span>Mejor: {Math.round(prog.best_score)}</span>
                          )}
                        </div>
                        <ProgressBar percent={pct} label={`Progreso en ${p.name}`} />
                        <p className="text-xs text-muted">
                          Forma completa:{" "}
                          <span className="tabular-nums text-text">
                            {prog?.best_full_score != null
                              ? Math.round(prog.best_full_score)
                              : "sin intentos"}
                          </span>
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link to={detailLink(p.id)}>
                          <PlayCircle className="h-4 w-4" />
                          Abrir
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fundamentals" className="pt-4">
          {practicing ? (
            needsAthlete ? (
              <Card>
                <EmptyState icon={Users} title="Selecciona primero un deportista" />
              </Card>
            ) : (
              <PracticeFlow
                key={`${practicing.id}-${athleteId}`}
                mode="technique"
                targetId={practicing.id}
                targetName={practicing.name}
                reference={<TechniqueReference technique={practicing} />}
                athleteId={isSportsman ? null : athleteId}
                recordSeconds={8}
                onClose={() => setPracticing(null)}
                onFinished={() => setHistoryKey((k) => k + 1)}
              />
            )
          ) : techniques.length === 0 && !loading ? (
            <Card>
              <EmptyState icon={Dumbbell} title="Sin técnicas publicadas" />
            </Card>
          ) : (
            <div className="space-y-6">
              {groupByElement(techniques).map((group) => (
                <section key={group.element} className="space-y-3">
                  <h2 className="font-display text-lg font-semibold text-text">{group.label}</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((t) => (
                      <Card key={t.id}>
                        <CardContent className="flex h-full flex-col gap-2 p-4">
                          <p className="font-medium text-text">{t.name}</p>
                          {t.korean_name && <p className="text-xs text-muted">{t.korean_name}</p>}
                          {t.description && (
                            <p className="line-clamp-2 text-sm text-muted">{t.description}</p>
                          )}
                          <Button
                            size="sm"
                            className="mt-auto"
                            onClick={() => setPracticing(t)}
                            aria-label={`Practicar ${t.name}`}
                          >
                            <Footprints className="h-4 w-4" />
                            Practicar
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          {needsAthlete && role === "parent" ? (
            <Card>
              <EmptyState icon={Users} title="Selecciona un deportista" />
            </Card>
          ) : (
            <AttemptsHistory athleteId={isSportsman ? null : athleteId} reloadKey={historyKey} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
