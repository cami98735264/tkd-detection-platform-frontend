import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { FormSelect } from "@/components/common/FormSelect";
import { PageHeader } from "@/components/common/PageHeader";
import { parentAthletesApi, type ParentChild } from "@/features/parent/api/parentAthletesApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import AthleteRecordsView from "../components/AthleteRecordsView";
import ConstanciaDownloadButton from "../components/ConstanciaDownloadButton";
import ResumeDownloadButton from "../components/ResumeDownloadButton";

/** Parent: documents, certificates and CV of each linked child. */
export default function ParentDocumentsPage() {
  const { handleError } = useApiErrorHandler();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("athlete");
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parentAthletesApi
      .getChildren()
      .then((list) => {
        const valid = Array.isArray(list) ? list.filter((c) => c.athlete?.id) : [];
        setChildren(valid);
        const preferred = valid.find((c) => String(c.athlete.id) === requested) ?? valid[0];
        if (preferred) setSelected(String(preferred.athlete.id));
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError, requested]);

  const child = children.find((c) => String(c.athlete.id) === selected);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos de mis hijos"
        eyebrow="Acudiente"
        description="Carga los documentos requeridos por el club y descarga constancias y hojas de vida deportivas."
        actions={
          child ? (
            <>
              <ConstanciaDownloadButton
                athleteId={child.athlete.id}
                athleteName={child.athlete.full_name}
              />
              <ResumeDownloadButton
                athleteId={child.athlete.id}
                athleteName={child.athlete.full_name}
              />
            </>
          ) : undefined
        }
      />
      {loading ? (
        <Skeleton className="h-56 w-full" />
      ) : children.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Aún no tienes deportistas vinculados"
            description="Contacta a la administración para vincular a tus hijos a tu cuenta."
          />
        </Card>
      ) : (
        <>
          {children.length > 1 && (
            <div className="max-w-sm space-y-1.5">
              <Label htmlFor="child-select">Deportista</Label>
              <FormSelect
                id="child-select"
                value={selected}
                onValueChange={setSelected}
                options={children.map((c) => ({
                  value: String(c.athlete.id),
                  label: c.athlete.full_name,
                }))}
              />
            </div>
          )}
          {child && (
            <AthleteRecordsView
              key={child.athlete.id}
              athleteId={child.athlete.id}
              athleteName={child.athlete.full_name}
            />
          )}
        </>
      )}
    </div>
  );
}
