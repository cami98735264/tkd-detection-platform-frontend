import { useState } from "react";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import KickTypeCard from "./KickTypeCard";
import type { KickType } from "@/features/technical-evaluation/api/technicalEvaluationApi";

const KICK_TYPES: KickType[] = [
  "Ap Chagui",
  "Yop Chagui",
  "Dollyo Chagui",
  "Tuit Chagui",
  "An Tario Chagui",
  "Furio Chagui",
];

interface KickSelectionProps {
  onSelected: (kick: KickType) => void;
}

export default function KickSelection({ onSelected }: KickSelectionProps) {
  const [selected, setSelected] = useState<KickType | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Target className="h-5 w-5 text-primary" />
          Seleccionar patada
        </CardTitle>
        <p className="text-sm text-muted">
          Elige la técnica que vas a registrar para esta evaluación.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {KICK_TYPES.map((kick) => (
            <KickTypeCard
              key={kick}
              name={kick}
              selected={selected === kick}
              onClick={() => setSelected(kick)}
            />
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!selected}
          onClick={() => selected && onSelected(selected)}
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
}
