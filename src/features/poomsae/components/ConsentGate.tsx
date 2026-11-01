import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ConsentStep from "@/features/technical-evaluation/components/ConsentStep";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { useRecordingConsent } from "../hooks/useRecordingConsent";

/** Renders `children` only once video-recording consent is in place. */
export default function ConsentGate({
  athleteId,
  children,
}: {
  athleteId: number | null;
  children: ReactNode;
}) {
  const { state, grantForChild, markGranted } = useRecordingConsent(athleteId);
  const { handleError } = useApiErrorHandler();

  if (state === "loading") return <Skeleton className="h-40 w-full" />;
  if (state === "granted") return <>{children}</>;
  if (state === "needs_self") return <ConsentStep onConsented={markGranted} />;
  if (state === "needs_parent") {
    return (
      <Card>
        <EmptyState
          icon={ShieldAlert}
          title="Consentimiento parental requerido"
          description="Como eres menor de edad, tu acudiente debe autorizar la grabación de video desde su cuenta (sección «Evaluación técnica» o «Poomsae»)."
        />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title="Autorización de grabación pendiente"
        description="Para grabar a este deportista necesitamos tu autorización. Los videos se usan solo para el análisis técnico y no se comparten con terceros."
        action={
          <Button onClick={() => void grantForChild().catch(handleError)}>
            Autorizo la grabación de video
          </Button>
        }
      />
    </Card>
  );
}
