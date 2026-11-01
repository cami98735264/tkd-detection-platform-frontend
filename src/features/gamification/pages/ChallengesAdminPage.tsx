import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, Medal, Pencil, Plus, Target, Trash2 } from "lucide-react";

import DataTable, { type Column, type RowAction } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { gamificationApi } from "../api/gamificationApi";
import ChallengeFormModal from "../components/ChallengeFormModal";
import { categoryLabel, DEFAULT_CATEGORIES, METRIC_LABEL } from "../lib/levels";
import type { CategoryOption, Challenge } from "../types";

/** Maestro: CRUD of challenges + weekly generation. */
export default function ChallengesAdminPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const [rows, setRows] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    gamificationApi
      .challenges()
      .then(setRows)
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  useEffect(() => {
    load();
    gamificationApi.categories().then(setCategories);
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const created = await gamificationApi.generateWeekly();
      showToast({
        title: "Retos semanales generados",
        description:
          created.length > 0
            ? `${created.length} reto(s) para esta semana.`
            : "Los retos de esta semana ya existían.",
        variant: "success",
      });
      load();
    } catch (err) {
      handleError(err);
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (c: Challenge) => {
    const ok = await confirm({ title: "Eliminar reto", description: `¿Eliminar «${c.title}»?` });
    if (!ok) return;
    try {
      await gamificationApi.deleteChallenge(c.id);
      showToast({ title: "Reto eliminado", variant: "success" });
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const columns: Column<Challenge>[] = [
    {
      key: "title",
      header: "Reto",
      render: (r) => (
        <div>
          <p className="font-medium text-text">{r.title}</p>
          {r.kick_type && <p className="text-xs text-muted">{r.kick_type}</p>}
        </div>
      ),
    },
    {
      key: "kind",
      header: "Tipo",
      render: (r) => <Badge variant="outline">{r.kind === "kick" ? "Patada" : "Semanal"}</Badge>,
    },
    {
      key: "metric",
      header: "Meta",
      hideOnMobile: true,
      render: (r) => `${METRIC_LABEL[r.metric] ?? r.metric}: ${r.target_value}`,
    },
    {
      key: "dates",
      header: "Vigencia",
      hideOnMobile: true,
      render: (r) => `${r.start_date} → ${r.end_date}`,
    },
    {
      key: "category",
      header: "Categoría",
      hideOnMobile: true,
      render: (r) => (r.category ? categoryLabel(r.category, categories) : "Todas"),
    },
    { key: "xp_reward", header: "XP", align: "right" },
    {
      key: "active",
      header: "Estado",
      render: (r) =>
        r.active ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="outline-muted">Inactivo</Badge>
        ),
    },
  ];

  const actions: RowAction<Challenge>[] = [
    {
      id: "edit",
      label: "Editar",
      icon: Pencil,
      variant: "ghost",
      onClick: (r) => {
        setEditing(r);
        setModalOpen(true);
      },
    },
    { id: "delete", label: "Eliminar", icon: Trash2, variant: "destructive", onClick: remove },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gamificación"
        title="Retos"
        description="Crea retos semanales o de patadas para motivar a los deportistas."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/dashboard/clasificacion">
                <Medal className="h-4 w-4" />
                Clasificaciones
              </Link>
            </Button>
            <Button variant="tonal" onClick={() => void generate()} disabled={generating}>
              <CalendarPlus className="h-4 w-4" />
              Generar retos semanales
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo reto
            </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.id}
        rowActions={actions}
        empty={{
          icon: Target,
          title: "Sin retos",
          description: "Crea un reto o genera el conjunto semanal por defecto.",
        }}
      />
      <ChallengeFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        challenge={editing}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
