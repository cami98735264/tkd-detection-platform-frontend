import { CheckCircle, UserCheck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import type { AthleteConsent } from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface Props {
  minors: AthleteConsent[];
  onGrant: (athleteId: number) => void;
  onRevoke: (athleteId: number) => void;
}

/** Parent view: linked minors with their video-consent state and toggles. */
export default function LinkedMinorsCard({ minors, onGrant, onRevoke }: Props) {
  return (
    <ScrollReveal>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold tracking-tight">
            Deportistas vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-divider">
            {minors.map((minor) => (
              <li
                key={minor.athlete_id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-text">{minor.athlete_name}</p>
                    <p className="text-xs text-faint">
                      {minor.consent_timestamp
                        ? `Autorizado el ${new Date(minor.consent_timestamp).toLocaleString()}`
                        : "Sin autorización"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {minor.consent_granted ? (
                    <>
                      <Badge variant="success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Autorizado
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRevoke(minor.athlete_id)}
                      >
                        Revocar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline-muted">
                        <XCircle className="mr-1 h-3 w-3" />
                        Sin autorizar
                      </Badge>
                      <Button size="sm" onClick={() => onGrant(minor.athlete_id)}>
                        Autorizar
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
