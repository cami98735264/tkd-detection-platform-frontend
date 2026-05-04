import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import DataTable, { type Column } from "@/components/common/DataTable";
import Pagination from "@/components/common/Pagination";
import AssignAthleteModal from "@/features/parent/components/AssignAthleteModal";
import { parentAthletesApi, type ParentAthlete } from "@/features/parent/api/parentAthletesApi";
import { usersApi } from "@/features/users/api/usersApi";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";
import type { Athlete } from "@/types/entities";
import type { User } from "@/features/users/api/usersApi";

const RELATIONSHIP_LABELS: Record<string, string> = {
  mother: "Madre",
  father: "Padre",
  guardian: "Acudiente",
};

const columns: Column<ParentAthlete>[] = [
  {
    key: "parent_full_name",
    header: "Acudiente",
    render: (r) => (
      <div>
        <p className="font-medium">{r.parent_full_name}</p>
        <p className="text-xs text-muted-foreground">{r.parent_email}</p>
      </div>
    ),
  },
  {
    key: "athlete_full_name",
    header: "Deportista",
    render: (r) => (
      <div>
        <p className="font-medium">{r.athlete_full_name}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {r.athlete_belt ? <span>Cin: {r.athlete_belt}</span> : null}
          {r.athlete_belt ? <span>|</span> : null}
          <Badge variant={r.athlete_status === "active" ? "default" : "secondary"} className="text-xs">
            {r.athlete_status === "active" ? "Activo" : r.athlete_status}
          </Badge>
        </div>
      </div>
    ),
  },
  {
    key: "relationship",
    header: "Parentesco",
    render: (r) => (
      <Badge variant="outline">{RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}</Badge>
    ),
  },
];

export default function ParentAthletesPage() {
  const { handleError } = useApiErrorHandler();
  const { showToast, confirm } = useFeedback();

  const [data, setData] = useState<ParentAthlete[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // For the assign modal
  const [modalOpen, setModalOpen] = useState(false);
  const [parents, setParents] = useState<User[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const fetchData = useCallback(
    (p: number) => {
      setLoading(true);
      parentAthletesApi
        .list(p)
        .then((res) => {
          setData(res.results);
          setCount(res.count);
        })
        .catch(handleError)
        .finally(() => setLoading(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page],
  );

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  const openAssignModal = useCallback(() => {
    Promise.all([
      usersApi.list({ role: "parent" }),
      athletesApi.list(1, "", "active"),
    ])
      .then(([parentsRes, athletesRes]) => {
        setParents(parentsRes.results);
        setAthletes(athletesRes.results);
        setModalOpen(true);
      })
      .catch(handleError);
  }, [handleError]);

  const handleAssign = async (values: {
    parent_id: number;
    athlete_id: number;
    relationship: string;
  }) => {
    try {
      await parentAthletesApi.create({
        parent_id: values.parent_id,
        athlete_id: values.athlete_id,
        relationship: values.relationship as "mother" | "father" | "guardian",
      });
      showToast({ title: "Vínculo creado", variant: "success" });
      setModalOpen(false);
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  const handleDelete = async (link: ParentAthlete) => {
    const ok = await confirm({
      title: "Eliminar vínculo",
      description: `¿Eliminar el vínculo entre "${link.parent_full_name}" y "${link.athlete_full_name}"?`,
    });
    if (!ok) return;
    try {
      await parentAthletesApi.delete(link.id);
      showToast({ title: "Vínculo eliminado", variant: "success" });
      fetchData(page);
    } catch (err) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acudientes</h1>
          <p className="text-muted-foreground text-sm">
            Vincular deportistas a acudientes (padres/apoderados)
          </p>
        </div>
        <Button onClick={openAssignModal}>
          <UserPlus size={18} className="mr-2" /> Vincular Deportista
        </Button>
      </div>

      <Card>
        <CardContent className="p-2 sm:p-4">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            onDelete={handleDelete}
          />
          <Pagination count={count} page={page} onPageChange={setPage} />
        </CardContent>
      </Card>

      <AssignAthleteModal
        open={modalOpen}
        onOpenChange={(v) => setModalOpen(v)}
        parents={parents}
        athletes={athletes}
        onSubmit={handleAssign}
      />
    </div>
  );
}
