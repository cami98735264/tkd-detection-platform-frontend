import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, ShieldCheck, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import { StatsRow } from "@/components/common/StatsRow";
import type { Column, RowAction } from "@/components/common/DataTable";

import AthleteFormSheet from "@/features/athletes/components/AthleteFormSheet";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { categoriesApi } from "@/features/categories/api/categoriesApi";
import { parentAthletesApi } from "@/features/athletes/api/parentAthletesApi";
import type { ParentChild } from "@/features/athletes/api/parentAthletesApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete, CompetitionCategory } from "@/types/entities";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function StatusBadge({ status }: { status: Athlete["status"] | "active" | "inactive" }) {
  return status === "active" ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="outline-muted">Inactivo</Badge>
  );
}

const adminColumns: Column<Athlete>[] = [
  { key: "id", header: "ID", className: "w-16 text-faint", hideOnMobile: true },
  { key: "full_name", header: "Nombre", render: (r) => <span className="font-medium text-text">{r.full_name}</span> },
  {
    key: "date_of_birth",
    header: "Fecha nac.",
    hideOnMobile: true,
    render: (r) => formatDate(r.date_of_birth),
  },
  {
    key: "categoria_competencia_name",
    header: "Categoría",
    render: (r) => r.categoria_competencia_name ?? "—",
  },
  {
    key: "belt_actual_name",
    header: "Cinturón",
    hideOnMobile: true,
    render: (r) => r.belt_actual_name ?? "—",
  },
  {
    key: "status",
    header: "Estado",
    render: (r) => <StatusBadge status={r.status} />,
  },
  {
    key: "created_at",
    header: "Ingreso",
    hideOnMobile: true,
    render: (r) => formatDate(r.created_at),
  },
];

const parentColumns: Column<ParentChild>[] = [
  {
    key: "athlete",
    header: "Nombre",
    render: (r) => <span className="font-medium text-text">{r.athlete.full_name}</span>,
  },
  {
    key: "date_of_birth",
    header: "Fecha nac.",
    hideOnMobile: true,
    render: (r) => formatDate(r.athlete.date_of_birth),
  },
  {
    key: "categoria_competencia",
    header: "Categoría",
    render: (r) => r.athlete.categoria_competencia_name ?? "—",
  },
  {
    key: "belt_actual",
    header: "Cinturón",
    hideOnMobile: true,
    render: (r) => r.athlete.belt_actual_name ?? "—",
  },
  {
    key: "status",
    header: "Estado",
    render: (r) => <StatusBadge status={r.athlete.status} />,
  },
  {
    key: "relationship",
    header: "Parentesco",
    render: (r) => <Badge variant="outline">{r.relationship}</Badge>,
  },
];

export default function AthletesPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const { isAdmin, hasRole, can } = usePermissions();
  const isAdminUser = isAdmin();
  const isParent = hasRole(["parent"]);
  const canCreate = can("create", "athletes");

  const [data, setData] = useState<Athlete[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryOptions, setCategoryOptions] = useState<CompetitionCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);

  // Categories — load once
  useEffect(() => {
    categoriesApi
      .list(1)
      .then((res) => setCategoryOptions(res.results))
      .catch(() => {});
  }, []);

  const refreshStats = useCallback(() => {
    if (!isAdminUser) return;
    athletesApi.list(1, "", "", false, 100).then((res) => {
      setStats({
        total: res.count,
        active: res.results.filter((a) => a.status === "active").length,
        inactive: res.results.filter((a) => a.status === "inactive").length,
      });
    }).catch(() => {});
  }, [isAdminUser]);

  const fetchData = useCallback(() => {
    if (!isAdminUser) return;
    let cancelled = false;
    setLoading(true);
    const status = statusFilter === "all" ? "" : statusFilter;
    athletesApi
      .list(page, "", status)
      .then((res) => {
        if (cancelled) return;
        const results =
          categoryFilter !== "all"
            ? res.results.filter((a) => String(a.categoria_competencia) === categoryFilter)
            : res.results;
        setData(results);
        setCount(res.count);
      })
      .catch((err) => handleError(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
  }, [isAdminUser, page, statusFilter, categoryFilter, handleError]);

  // Stats — load on mount (admin only)
  useEffect(() => {
    if (!isAdminUser) return;
    refreshStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminUser, refreshStats]);

  // Athletes table — load when page/filters change (admin only)
  useEffect(() => {
    if (!isAdminUser) return;
    fetchData();
  }, [isAdminUser, fetchData]);

  // Fetch children for parent
  useEffect(() => {
    if (!isParent) return;
    setChildrenLoading(true);
    parentAthletesApi
      .getChildren()
      .then(setChildren)
      .catch(handleError)
      .finally(() => setChildrenLoading(false));
  }, [isParent]);

  const handleFormSuccess = () => {
    setEditing(null);
    setPage(1);
    refreshStats();
    fetchData();
  };

  const handleToggleStatus = async (athlete: Athlete) => {
    const newStatus = athlete.status === "active" ? "inactive" : "active";
    const verb = newStatus === "inactive" ? "inactivar" : "activar";
    const ok = await confirm({
      title: `${verb.charAt(0).toUpperCase() + verb.slice(1)} deportista`,
      description: `¿Estás seguro de ${verb} a ${athlete.full_name}?`,
    });
    if (!ok) return;
    try {
      await athletesApi.update(athlete.id, { ...athlete, status: newStatus });
      showToast({
        title: `Deportista ${verb === "inactivar" ? "inactivado" : "activado"}`,
        variant: "success",
      });
      setPage(1);
      refreshStats();
      fetchData();
    } catch (err) {
      handleError(err);
    }
  };

  const adminActions = useMemo<RowAction<Athlete>[]>(() => {
    const actions: RowAction<Athlete>[] = [];
    if (isAdminUser) {
      actions.push({
        id: "edit",
        label: "Editar",
        icon: Pencil,
        variant: "ghost",
        onClick: (row) => {
          setEditing(row);
          setModalOpen(true);
        },
      });
      actions.push({
        id: "toggle",
        label: "Cambiar estado",
        icon: ShieldCheck,
        variant: "ghost",
        onClick: handleToggleStatus,
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminUser]);

  /* ------------------------------ Parent view ----------------------------- */
  if (isParent) {
    return (
      <ListPageTemplate
        title="Deportistas"
        description="Deportistas vinculados a tu cuenta."
        eyebrow="Acudiente"
        columns={parentColumns}
        data={children}
        loading={childrenLoading}
        rowKey={(r) => r.athlete.id}
        mobileCard={(r) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-text">{r.athlete.full_name}</p>
              <StatusBadge status={r.athlete.status} />
            </div>
            <p className="text-xs text-muted">
              {r.athlete.categoria_competencia_name ?? "Sin categoría"}
              {r.athlete.belt_actual_name ? ` · ${r.athlete.belt_actual_name}` : ""}
            </p>
            <p className="text-xs text-faint">{r.relationship}</p>
          </div>
        )}
        empty={{
          icon: Users,
          title: "Aún no tienes deportistas vinculados",
          description: "Contacta a la administración para vincular a tus hijos a tu cuenta.",
        }}
      />
    );
  }

  /* ------------------------------- Admin view ----------------------------- */
  return (
    <ListPageTemplate
      title="Deportistas"
      description="Gestiona el roster de la academia: alta, edición y estado de cada deportista."
      eyebrow="Operación"
      primaryAction={
        canCreate ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo deportista
          </Button>
        ) : undefined
      }
      stats={
        <StatsRow
          columns={3}
          items={[
            {
              label: "Total",
              value: stats.total,
              icon: Users,
              tone: "default",
            },
            {
              label: "Activos",
              value: stats.active,
              icon: ShieldCheck,
              tone: "success",
            },
            {
              label: "Inactivos",
              value: stats.inactive,
              icon: CalendarDays,
              tone: "warning",
            },
          ]}
        />
      }
      filters={
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="filter-status" className="text-xs uppercase tracking-wider text-muted">
              Estado
            </Label>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-category" className="text-xs uppercase tracking-wider text-muted">
              Categoría
            </Label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger id="filter-category">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoryOptions.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>
                    {o.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      columns={adminColumns}
      data={data}
      loading={loading}
      rowKey={(r) => r.id}
      rowActions={adminActions}
      mobileCard={(r) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-text">{r.full_name}</p>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-xs text-muted">
            {r.categoria_competencia_name ?? "Sin categoría"}
            {r.belt_actual_name ? ` · ${r.belt_actual_name}` : ""}
          </p>
          <p className="text-xs text-faint">
            {formatDate(r.date_of_birth)} · ID #{r.id}
          </p>
        </div>
      )}
      empty={{
        icon: Trophy,
        title: "Aún no hay deportistas",
        description: "Crea el primer deportista para comenzar a llevar el roster de la academia.",
        action: canCreate ? (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear deportista
          </Button>
        ) : undefined,
      }}
      pagination={{
        count,
        page,
        onChange: setPage,
      }}
      formSheet={
        <AthleteFormSheet
          open={modalOpen}
          onOpenChange={(v) => {
            setModalOpen(v);
            if (!v) setEditing(null);
          }}
          athlete={editing}
          onSuccess={handleFormSuccess}
        />
      }
    />
  );
}
