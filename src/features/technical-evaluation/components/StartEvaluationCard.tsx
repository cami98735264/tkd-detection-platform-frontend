import { Camera, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import type { AthleteConsent } from "@/features/technical-evaluation/api/technicalEvaluationApi";

interface Props {
  /** Linked minors whose parent consent is granted. */
  minors: AthleteConsent[];
  onSelect: (minor: AthleteConsent) => void;
}

/** Parent view: pick an authorized minor to start a technical evaluation. */
export default function StartEvaluationCard({ minors, onSelect }: Props) {
  return (
    <ScrollReveal>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-semibold tracking-tight">
            Iniciar evaluación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {minors.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="Falta autorización"
              description="Autoriza al menos a un deportista vinculado para comenzar una evaluación técnica."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {minors.map((minor) => (
                <button
                  key={minor.athlete_id}
                  type="button"
                  onClick={() => onSelect(minor)}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-interactive hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary transition-interactive group-hover:bg-primary/15">
                    <Camera className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-text">{minor.athlete_name}</p>
                    <p className="text-xs text-muted">Iniciar evaluación</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ScrollReveal>
  );
}
