import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { gamificationApi } from "../api/gamificationApi";
import { levelProgress } from "../lib/levels";
import type { GamificationProfile } from "../types";
import { ProgressBar } from "./ProgressBar";

/** Small Home card for sportsmen: level, XP progress and streak. */
export default function GamificationWidget() {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);

  useEffect(() => {
    let alive = true;
    gamificationApi
      .profile()
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!profile) return null;
  const lp = levelProgress(profile.level, profile.xp);

  return (
    <Link to="/dashboard/progreso" className="block" aria-label="Ver mi progreso">
      <Card className="transition-interactive hover:border-primary/40">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-text">
              <Trophy className="h-4 w-4 text-primary" />
              Nivel {profile.level.number} · {profile.level.name}
              <span className="text-muted">({profile.xp} XP)</span>
            </p>
            <ProgressBar percent={lp.percent} label="Progreso de nivel" />
          </div>
          <p className="flex items-center gap-2 font-display text-lg font-semibold text-text">
            <Flame
              className={profile.streak.current > 0 ? "h-5 w-5 text-warning" : "h-5 w-5 text-faint"}
            />
            {profile.streak.current} días de racha
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
