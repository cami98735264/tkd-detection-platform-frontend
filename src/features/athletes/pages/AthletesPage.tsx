import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import AthleteFormModal from "@/features/athletes/components/AthleteFormModal";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete } from "@/types/entities";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "child", label: "Niño" },
  { value: "youth", label: "Juvenil" },
  { value: "adult", label: "Adulto" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

const columns: Column<Athlete>[] = [
  { key: "full_name", header: "Nombre" },
  { key: "date_of_birth", header: "Fecha Nac.", render: (r) => r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString() : "—" },
  { key: "category", header: "Categoría", render: (r) => r.category ?? "—" },
  {
    key: "status",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.status === "active" ? "default" : "secondary"}>
        {r.status === "active" ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
  { key: "created_at", header: "F. Ingreso", render: (r) => new Date(r.created_at).toLocaleDateString() },
];

export default function AthletesPage() {
  const { can } = usePermissions();
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const isAdmin = can("edit", "athletes");
  const canCreate = can("create", "athletes");

  const [data, setData] = useState<Athlete[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Dashboard cards
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      athletesApi
        .list(p)
        .then((res) => {
          let results = res.results;
          if (statusFilter) results = results.filter((a) => a.status === statusFilter);
          if (categoryFilter) results = results.filter((a) => a.category === categoryFilter);
          setData(results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    [handleError, statusFilter, categoryFilter],
  );

  useEffect(() => {
    // Fetch dashboard stats
    athletesApi.list(1).then((res) => {
      setTotalCount(res.count);
      setActiveCount(res.results.filter((a) => a.status === "active").length);
      setInactiveCount(res.results.filter((a) => a.status === "inactive").length);
    }).catch(handleError);
  }, [handleError]);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: {
    full_name: string;
    date_of_birth: string | null;
    category: string | null;
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
      fetchData(page);
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
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Deportistas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deportistas</h1>
        {canCreate && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => { setEditing(null); setModalOpen(true); }}
          >
            <Plus size={18} className="mr-2" /> Nuevo
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de deportistas</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={isAdmin ? (row) => { setEditing(row); setModalOpen(true); } : undefined}
            onDelete={isAdmin ? handleInactivate : undefined}
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
