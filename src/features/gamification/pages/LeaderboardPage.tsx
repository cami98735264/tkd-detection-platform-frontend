import { useEffect, useState } from "react";
import { Flame, Medal, Trophy } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { cn } from "@/lib/utils";

import { gamificationApi } from "../api/gamificationApi";
import { categoryLabel, DEFAULT_CATEGORIES, PERIOD_LABEL } from "../lib/levels";
import type { CategoryOption, Leaderboard, LeaderboardPeriod } from "../types";

const PERIODS: LeaderboardPeriod[] = ["week", "month", "all"];
const MEDAL = ["text-warning", "text-muted", "text-primary"];

/** Ranking by category. Non-admins see their own category (server-enforced). */
export default function LeaderboardPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "administrator");
  const { handleError } = useApiErrorHandler();
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    gamificationApi.categories().then((c) => {
      setCategories(c);
      setCategory((prev) => prev || c[0]?.value || "");
    });
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && !category) return;
    let alive = true;
    setLoading(true);
    gamificationApi
      .leaderboard({ period, category: isAdmin ? category : undefined })
      .then((b) => {
        if (alive) setBoard(b);
      })
      .catch(handleError)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [period, category, isAdmin, handleError]);

  const rows = board?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gamificación"
        title="Clasificación"
        description={`Ranking por XP en la categoría ${categoryLabel(board?.category ?? (category || null), categories)}. Empates: racha actual y luego insignias.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p} value={p}>
                {PERIOD_LABEL[p]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {isAdmin && (
          <div className="sm:w-64">
            <Label htmlFor="lb-category" className="mb-1.5 block">
              Categoría
            </Label>
            <NativeSelect
              id="lb-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        )}
      </div>

      {loading && !board ? (
        <Skeleton className="h-64 w-full" />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="Sin datos de clasificación"
            description="Cuando los deportistas sumen XP en este periodo aparecerán aquí."
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y divide-divider">
              {rows.map((r) => (
                <li
                  key={r.athlete}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3",
                    r.is_me && "bg-primary/10 ring-1 ring-inset ring-primary/40",
                  )}
                  aria-current={r.is_me ? "true" : undefined}
                >
                  <span className="grid w-8 place-items-center font-display text-lg font-semibold tabular-nums text-text">
                    {r.rank <= 3 ? (
                      <Medal
                        className={cn("h-6 w-6", MEDAL[r.rank - 1])}
                        aria-label={`Puesto ${r.rank}`}
                      />
                    ) : (
                      r.rank
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-text">{r.athlete_name}</span>
                      {r.is_me && <Badge variant="default">Tú</Badge>}
                    </div>
                    <p className="text-xs text-muted">
                      Nivel {r.level} · {r.badges} insignias
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-sm text-muted sm:flex">
                    <Flame className="h-4 w-4 text-warning" />
                    {r.streak}
                  </span>
                  <span className="font-display text-lg font-semibold tabular-nums text-primary">
                    {r.xp} XP
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
