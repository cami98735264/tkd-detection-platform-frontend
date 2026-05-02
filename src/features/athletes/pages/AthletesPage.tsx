import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import AthleteFormModal from "@/features/athletes/components/AthleteFormModal";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { categoriesApi } from "@/features/categories/api/categoriesApi";
import { parentAthletesApi } from "@/features/athletes/api/parentAthletesApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete, CompetitionCategory } from "@/types/entities";
import type { ParentChild } from "@/features/athletes/api/parentAthletesApi";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const adminColumns: Column<Athlete>[] = [
  { key: "id", header: "ID" },
  { key: "full_name", header: "Nombre" },
  { key: "date_of_birth", header: "Fecha Nac.", render: (r) => r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : "—" },
  { key: "categoria_competencia_name", header: "Categoría", render: (r) => r.categoria_competencia_name ?? "—" },
  {
    key: "status",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.status === "active" ? "default" : "secondary"}>
        {r.status === "active" ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  { key: "belt_actual_name", header: "Cinturón", render: (r) => r.belt_actual_name ?? "—" },
  { key: "created_at", header: "F. Ingreso", render: (r) => new Date(r.created_at).toLocaleDateString() },
];

const parentColumns: Column<ParentChild>[] = [
  {
    key: "athlete",
    header: "Nombre",
    render: (r) => r.athlete.full_name,
  },
  {
    key: "date_of_birth",
    header: "Fecha Nac.",
    render: (r) =>
      r.athlete.date_of_birth
        ? new Date(r.athlete.date_of_birth).toLocaleDateString()
        : "—",
  },
  {
    key: "categoria_competencia",
    header: "Categoría",
    render: (r) => r.athlete.categoria_competencia_name ?? "—",
  },
  {
    key: "belt_actual",
    header: "Cinturón",
    render: (r) => r.athlete.belt_actual_name ?? "—",
  },
  {
    key: "status",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.athlete.status === "active" ? "default" : "secondary"}>
        {r.athlete.status === "active" ? "Activo" : "Inactivo"}
      </Badge>
    ),
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

  // Admin state
  const [data, setData] = useState<Athlete[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<CompetitionCategory[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Parent state
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);

  // Debug
  console.log("[AthletesPage] isParent:", isParent, "children:", children, "childrenLoading:", childrenLoading);

  // Categories - load once
  useEffect(() => {
    categoriesApi.list(1).then((res) => setCategoryOptions(res.results)).catch(() => {});
  }, []);

  // Stats - load once on mount (admin only)
  useEffect(() => {
    if (!isAdminUser || statsLoaded) return;
    setStatsLoaded(true);
    athletesApi.list(1, "", "").then((res) => {
      setTotalCount(res.count);
      setActiveCount(res.results.filter((a) => a.status === "active").length);
      setInactiveCount(res.results.filter((a) => a.status === "inactive").length);
    }).catch(() => {});
  }, [isAdminUser, statsLoaded]);

  // Athletes table - load when page/filters change (admin only)
  useEffect(() => {
    if (!isAdminUser) return;
    let cancelled = false;
    setLoading(true);
    athletesApi.list(page, "", statusFilter || "")
      .then((res) => {
        if (cancelled) return;
        const results = categoryFilter
          ? res.results.filter((a) => String(a.categoria_competencia) === categoryFilter)
          : res.results;
        setData(results);
        setCount(res.count);
      })
      .catch((err) => { handleError(err); })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminUser, page, statusFilter, categoryFilter]);

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

  const handleSubmit = async (values: {
    full_name: string;
    date_of_birth: string | null;
    categoria_competencia: number | null;
    status: string;
  }) => {
    try {
      if (editing) {
        await athletesApi.update(editing.id, values);
        showToast({ title: "Deportista actualizado", variant: "success" });
      } else {
        await athletesApi.create(values);
        showToast({ title: "Deportista creado", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      setPage(1);
    } catch (err) {
      handleError(err);
    }
  };

  const handleInactivate = async (athlete: Athlete) => {
    const newStatus = athlete.status === "active" ? "inactive" : "active";
    const action = newStatus === "inactive" ? "inactivar" : "activar";
    const ok = await confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} deportista`,
      description: `¿Estás seguro de ${action} a ${athlete.full_name}?`,
    });
    if (!ok) return;
    try {
      await athletesApi.update(athlete.id, { ...athlete, status: newStatus });
      showToast({ title: `Deportista ${action === "inactivar" ? "inactivado" : "activado"}`, variant: "success" });
      setPage(1);
    } catch (err) {
      handleError(err);
    }
  };

  // Parent view — always show, loading state only affects table content
  if (isParent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Deportistas</h1>
          <p className="text-muted-foreground">
            Deportistas vinculados a tu cuenta
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de deportistas</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={parentColumns}
              data={children}
              loading={childrenLoading}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deportistas</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{activeCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos</CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold text-muted-foreground">{inactiveCount}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            >
              <option value="">Todas las categorías</option>
              {categoryOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.nombre}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deportistas</h1>
        {canCreate && (
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus size={18} className="mr-2" /> Nuevo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Lista de deportistas</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={adminColumns}
            data={data}
            loading={loading}
            onEdit={isAdminUser ? (row) => { setEditing(row); setModalOpen(true); } : undefined}
            onDelete={isAdminUser ? handleInactivate : undefined}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AthleteFormModal
        open={modalOpen}
        onOpenChange={(v) => { setModalOpen(v); if (!v) setEditing(null); }}
        athlete={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
