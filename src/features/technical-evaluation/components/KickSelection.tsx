import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <CardTitle>Seleccionar Patada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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