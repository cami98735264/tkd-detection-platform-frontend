import { Flame, Lock, Sparkles, Target } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { challengePercent, levelProgress, METRIC_LABEL, SOURCE_LABEL } from "../lib/levels";
import type { GamificationProfile } from "../types";
import { BadgeIcon } from "./BadgeIcon";
import { ProgressBar } from "./ProgressBar";

/** Level, streak, badges, challenges and recent XP of one athlete. */
export default function ProgressOverview({ profile }: { profile: GamificationProfile }) {
  const lp = levelProgress(profile.level, profile.xp);
  const { streak } = profile;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface-2">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Nivel {profile.level.number}
                </p>
                <p className="font-display text-3xl font-semibold tracking-tight text-text">
                  {profile.level.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-semibold tabular-nums text-text">
                  {profile.xp}
                </p>
                <p className="text-xs text-muted">XP totales</p>
              </div>
            </div>
            <ProgressBar percent={lp.percent} label="Progreso de nivel" />
            <p className="text-sm text-muted">
              {lp.isMax
                ? "¡Alcanzaste el nivel máximo!"
                : `Te faltan ${lp.remaining} XP para el siguiente nivel (${lp.percent} %).`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full items-center gap-4 p-6">
            <span
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-full",
                streak.current > 0 ? "bg-warning/20 text-warning" : "bg-surface-2 text-faint",
              )}
            >
              <Flame className="h-8 w-8" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-3xl font-semibold tabular-nums text-text">
                {streak.current} {streak.current === 1 ? "día" : "días"}
              </p>
              <p className="text-sm text-muted">Racha actual · mejor: {streak.best}</p>
              <p className="mt-1 text-xs text-faint">
                {streak.active_today
                  ? "¡Ya entrenaste hoy!"
                  : "Registra actividad hoy para mantener la racha."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Retos activos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.active_challenges.length === 0 ? (
            <p className="text-sm text-muted">No hay retos activos en este momento.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {profile.active_challenges.map((c) => (
                <li key={c.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-text">{c.title}</p>
                    {c.completed ? (
                      <Badge variant="success">Completado</Badge>
                    ) : (
                      <Badge variant="tonal">+{c.xp_reward} XP</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    {METRIC_LABEL[c.metric] ?? c.metric}: {c.value} / {c.target_value}
                    {c.end_date ? ` · hasta ${c.end_date}` : ""}
                  </p>
                  <ProgressBar
                    percent={challengePercent(c.value, c.target_value)}
                    label={`Progreso del reto ${c.title}`}
                    barClassName={c.completed ? "bg-success" : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Insignias ({profile.badges.length}/
            {profile.badges.length + profile.locked_badges.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.badges.length + profile.locked_badges.length === 0 ? (
            <EmptyState icon={Sparkles} title="Sin insignias todavía" />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {profile.badges.map((b) => (
                <li
                  key={b.code}
                  className="flex flex-col items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center"
                  title={b.description}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                    <BadgeIcon icon={b.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-medium text-text">{b.name}</span>
                  {b.earned_at && (
                    <span className="text-[11px] text-faint">
                      {new Date(b.earned_at).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
              {profile.locked_badges.map((b) => (
                <li
                  key={b.code}
                  className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-3 text-center opacity-60"
                  title={b.description}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-faint">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-muted">{b.name}</span>
                  <span className="text-[11px] text-faint">{b.description}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.recent_events.length === 0 ? (
            <p className="text-sm text-muted">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="divide-y divide-divider">
              {profile.recent_events.map((e, i) => (
                <li key={`${e.date}-${i}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                      {e.description || SOURCE_LABEL[e.source] || e.source}
                    </p>
                    <p className="text-xs text-faint">
                      {e.date} · {SOURCE_LABEL[e.source] ?? e.source}
                    </p>
                  </div>
                  <span className="font-display font-semibold tabular-nums text-primary">
                    +{e.points} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
