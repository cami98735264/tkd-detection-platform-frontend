import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import EditionFormModal from "@/features/programs/components/EditionFormModal";
import { editionsApi } from "@/features/programs/api/editionsApi";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import { formatDateForDisplay } from "@/lib/dateUtils";
import type { Edition } from "@/types/entities";

const columns: Column<Edition>[] = [
  {
    key: "start_date",
    header: "Fecha inicio",
    render: (r) => formatDateForDisplay(r.start_date),
  },
  {
    key: "end_date",
    header: "Fecha fin",
    render: (r) => (r.end_date ? formatDateForDisplay(r.end_date) : "—"),
  },
  {
    key: "schedule",
    header: "Horarios",
    render: (r) => {
      if (!r.schedule) return "—";
      try {
        const entries = JSON.parse(r.schedule) as { days: string[]; startTime: string; endTime: string }[];
        return `${entries.length} horario(s)`;
      } catch {
        return "—";
      }
    },
  },
  {
    key: "active",
    header: "Estado",
    render: (r) => (
      <Badge variant={r.active ? "default" : "secondary"}>
        {r.active ? "Activo" : "Inactivo"}
      </Badge>
    ),
  },
];

export default function EditionsPage() {
  const { programId } = useParams<{ programId: string }>();
  const user = useAuthStore((s) => s.user);
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();
  const isAdmin = user?.role === "administrator";

  const [data, setData] = useState<Edition[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Edition | null>(null);

  const fetchData = useCallback(
    (p: number) => {
      if (!programId) return;
      setLoading(true);
      editionsApi
        .list(p, Number(programId))
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [programId],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const handleSubmit = async (values: {
    start_date: string;
    end_date: string | null;
    schedule: string | null;
    active: boolean;
  }) => {
    try {
      if (editing) {
        await editionsApi.update(editing.id, values);
        showToast({ title: "Edición actualizada", variant: "success" });
      } else {
        await editionsApi.create({ ...values, program: Number(programId) });
        showToast({ title: "Edición creada", variant: "success" });
      }
      setModalOpen(false);
      setEditing(null);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (edition: Edition) => {
    const ok = await confirm({
      title: "Eliminar edición",
      description: `¿Estás seguro de eliminar esta edición (${formatDateForDisplay(edition.start_date)})?`,
    });
    if (!ok) return;
    try {
      await editionsApi.delete(edition.id);
      showToast({ title: "Edición eliminada", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/programas">
            <Button variant="outline" size="icon">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Ediciones del Programa</h1>
        </div>
        {isAdmin && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus size={18} className="mr-2" /> Nueva Edición
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ediciones</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onEdit={
              isAdmin
                ? (row) => {
                    setEditing(row);
                    setModalOpen(true);
                  }
                : undefined
            }
            onDelete={isAdmin ? handleDelete : undefined}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <EditionFormModal
        open={modalOpen}
        onOpenChange={(v) => {
          setModalOpen(v);
          if (!v) setEditing(null);
        }}
        edition={editing}
        onSubmit={handleSubmit}
      />
    </div>
  );
}