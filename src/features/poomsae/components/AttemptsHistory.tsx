import { useCallback, useEffect, useState } from "react";
import { Eye, History } from "lucide-react";

import DataTable, { type Column, type RowAction } from "@/components/common/DataTable";
import FormModal from "@/components/common/FormModal";
import Pagination from "@/components/common/Pagination";
import { Badge } from "@/components/ui/badge";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { poomsaeApi } from "../api/poomsaeApi";
import type { PoomsaeAttempt } from "../types";
import AttemptResult from "./AttemptResult";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  completed: { label: "Completado", variant: "success" },
  processing: { label: "Procesando", variant: "warning" },
  failed: { label: "Fallido", variant: "destructive" },
};

const columns: Column<PoomsaeAttempt>[] = [
  {
    key: "created_at",
    header: "Fecha",
    render: (r) => new Date(r.created_at).toLocaleString(),
  },
  {
    key: "target",
    header: "Práctica",
    render: (r) => (
      <span className="text-text">
        {r.mode === "full"
          ? `${r.poomsae_name || "Poomsae"} · Forma completa`
          : r.mode === "segment"
            ? [r.poomsae_name, r.segment_name].filter(Boolean).join(" · ") || "Segmento"
            : r.technique_name || "Técnica"}
      </span>
    ),
  },
  {
    key: "athlete_name",
    header: "Deportista",
    hideOnMobile: true,
    render: (r) => r.athlete_name ?? "—",
  },
  {
    key: "status",
    header: "Estado",
    render: (r) => {
      const s = STATUS[r.status] ?? STATUS.processing;
      return <Badge variant={s.variant}>{s.label}</Badge>;
    },
  },
  {
    key: "score",
    header: "Puntaje",
    align: "right",
    render: (r) => (r.score != null ? Math.round(r.score) : "—"),
  },
];

interface Props {
  athleteId: number | null;
  segmentId?: number | null;
  reloadKey?: number;
}

export default function AttemptsHistory({ athleteId, segmentId, reloadKey }: Props) {
  const { handleError } = useApiErrorHandler();
  const [rows, setRows] = useState<PoomsaeAttempt[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PoomsaeAttempt | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    poomsaeApi
      .listAttempts({ athleteId, segment: segmentId, page })
      .then((res) => {
        setRows(res?.results ?? []);
        setCount(res?.count ?? 0);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [athleteId, segmentId, page, handleError]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const actions: RowAction<PoomsaeAttempt>[] = [
    {
      id: "view",
      label: "Ver resultado",
      icon: Eye,
      variant: "outline",
      show: (r) => r.status !== "processing",
      onClick: setViewing,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        rowKey={(r) => r.id}
        rowActions={actions}
        empty={{
          icon: History,
          title: "Sin intentos",
          description: "Practica un segmento o una técnica para ver aquí tus resultados.",
        }}
      />
      <Pagination count={count} page={page} onPageChange={setPage} />
      <FormModal
        open={!!viewing}
        onOpenChange={(v) => {
          if (!v) setViewing(null);
        }}
        title="Resultado del intento"
      >
        {viewing && <AttemptResult attempt={viewing} />}
      </FormModal>
    </>
  );
}
