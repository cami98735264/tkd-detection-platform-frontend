import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, PlusCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column, RowAction } from "@/components/common/DataTable";
import { ListPageTemplate } from "@/components/common/ListPageTemplate";
import EvaluationResultsView from "./EvaluationResults";
import {
  technicalEvaluationApi,
  type EvaluationSession,
} from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

const PAGE_SIZE = 10;

interface EvaluationHistoryProps {
  athleteId?: number;
  childName?: string;
  eyebrow?: string;
  onStartNew?: () => void;
}

const columns: Column<EvaluationSession>[] = [
  {
    key: "kick_type",
    header: "Patada",
    render: (r) => <span className="font-medium text-text">{r.kick_type}</span>,
  },
  {
    key: "created_at",
    header: "Fecha",
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
  {
    key: "overall_score",
    header: "Puntuación",
    render: (r) =>
      r.results ? (
        <ScoreBadge score={r.results.overall_score} />
      ) : (
        <Badge variant="outline-muted">—</Badge>
      ),
  },
  {
    key: "angle",
    header: "Ángulo",
    hideOnMobile: true,
    render: (r) =>
      r.results ? (
        <span className="text-muted">{r.results.angle}°</span>
      ) : (
        <span className="text-faint">—</span>
      ),
  },
  {
    key: "height",
    header: "Altura",
    hideOnMobile: true,
    render: (r) =>
      r.results ? (
        <span className="text-muted">{r.results.height} cm</span>
      ) : (
        <span className="text-faint">—</span>
      ),
  },
  {
    key: "speed",
    header: "Velocidad",
    hideOnMobile: true,
    render: (r) =>
      r.results ? (
        <span className="text-muted">{r.results.speed} m/s</span>
      ) : (
        <span className="text-faint">—</span>
      ),
  },
  {
    key: "stability",
    header: "Estabilidad",
    hideOnMobile: true,
    render: (r) =>
      r.results ? (
        <span className="text-muted">{r.results.stability}%</span>
      ) : (
        <span className="text-faint">—</span>
      ),
  },
];

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 80 ? "success" : score >= 60 ? "warning" : "destructive";
  return (
    <Badge variant={tone} className="font-semibold">
      {score}/100
    </Badge>
  );
}

export default function EvaluationHistory({
  athleteId,
  childName,
  eyebrow,
  onStartNew,
}: EvaluationHistoryProps) {
  const { handleError } = useApiErrorHandler();
  const { confirm } = useFeedback();

  const [allSessions, setAllSessions] = useState<EvaluationSession[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<EvaluationSession | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback((_page: number) => {
    setLoading(true);
    technicalEvaluationApi
      .listSessions(athleteId)
      .then((sessions) => {
        setAllSessions(sessions);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [athleteId, handleError]);

  const fetchSessionDetail = useCallback(
    (id: number) => {
      technicalEvaluationApi
        .getSession(id)
        .then((session) => {
          setSelectedSession(session);
        })
        .catch(handleError);
    },
    [handleError],
  );

  const handleDelete = useCallback(
    async (session: EvaluationSession) => {
      const ok = await confirm({
        title: "Eliminar evaluación",
        description: `¿Eliminar la evaluación de "${session.kick_type}" del ${new Date(session.created_at).toLocaleDateString()}? Esta acción no se puede deshacer.`,
      });
      if (!ok) return;
      try {
        await technicalEvaluationApi.deleteSession(session.id);
        fetchAll(page);
      } catch (err) {
        handleError(err);
      }
    },
    [confirm, handleError, fetchAll, page],
  );

  useEffect(() => {
    fetchAll(page);
  }, [page, fetchAll]);

  useEffect(() => {
    if (selectedSessionId !== null) {
      fetchSessionDetail(selectedSessionId);
    }
  }, [selectedSessionId, fetchSessionDetail]);

  useEffect(() => {
    if (selectedSession?.results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSession]);

  const totalCount = allSessions.length;
  const startIndex = (page - 1) * PAGE_SIZE;
  const data = allSessions.slice(startIndex, startIndex + PAGE_SIZE);

  const actions: RowAction<EvaluationSession>[] = [
    {
      id: "viewResults",
      label: "Ver resultados",
      icon: ClipboardCheck,
      variant: "outline",
      onClick: (row) => {
        setSelectedSessionId(row.id);
        fetchSessionDetail(row.id);
      },
      show: (row) => row.results !== null,
    },
    {
      id: "delete",
      label: "Eliminar",
      icon: Trash2,
      variant: "ghost",
      onClick: handleDelete,
      show: () => true,
    },
  ];

  const handleCloseResults = () => {
    setSelectedSessionId(null);
    setSelectedSession(null);
  };

  const title = childName
    ? `Historial de ${childName}`
    : "Mi historial de evaluaciones";

  const description = childName
    ? "Evolución de las patadas registradas."
    : "Historial de tus evaluaciones técnicas registradas.";

  return (
    <>
      <ListPageTemplate
        title={title}
        description={description}
        eyebrow={eyebrow}
        columns={columns}
        data={data}
        loading={loading}
        rowKey={(r) => r.id}
        rowActions={actions}
        pagination={{ count: totalCount, page, onChange: setPage, pageSize: PAGE_SIZE }}
        primaryAction={
          onStartNew ? (
            <Button size="sm" onClick={onStartNew}>
              <PlusCircle className="h-4 w-4" />
              Nueva evaluación
            </Button>
          ) : undefined
        }
        empty={{
          icon: ClipboardCheck,
          title: "Sin evaluaciones",
          description: childName
            ? "Este deportista aún no tiene evaluaciones técnicas registradas."
            : "Aún no tienes evaluaciones técnicas registradas. ¡Inicia tu primera!",
        }}
      />

      {selectedSession?.results && (
        <div ref={resultsRef} className="mt-6">
          <EvaluationResultsView results={selectedSession.results} onClose={handleCloseResults} />
        </div>
      )}
    </>
  );
}
