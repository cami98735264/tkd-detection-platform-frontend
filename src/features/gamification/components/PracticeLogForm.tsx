import { useState, type FormEvent } from "react";
import { Dumbbell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { gamificationApi } from "../api/gamificationApi";

const ACTIVITIES = [
  "Poomsae",
  "Patadas",
  "Técnica de manos",
  "Acondicionamiento físico",
  "Flexibilidad",
  "Combate (kyorugi)",
  "Otra",
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

interface Props {
  /** Required for parents/admins; omitted for the sportsman's own log. */
  athleteId?: number | null;
  onLogged: () => void;
}

/** Quick "Registrar práctica" form (max one per day, up to 7 days back). */
export default function PracticeLogForm({ athleteId, onLogged }: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const today = new Date();
  const minDate = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  const [date, setDate] = useState(iso(today));
  const [minutes, setMinutes] = useState(30);
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await gamificationApi.logPractice({
        ...(athleteId ? { athlete: athleteId } : {}),
        date,
        minutes,
        activity,
        notes,
      });
      showToast({ title: "Práctica registrada", description: "+10 XP", variant: "success" });
      setNotes("");
      onLogged();
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Dumbbell className="h-4 w-4 text-primary" />
          Registrar práctica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={submit}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_8rem_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="practice-date">Fecha</Label>
            <Input
              id="practice-date"
              type="date"
              value={date}
              min={iso(minDate)}
              max={iso(today)}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-activity">Actividad</Label>
            <NativeSelect
              id="practice-activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              {ACTIVITIES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="practice-minutes">Minutos</Label>
            <Input
              id="practice-minutes"
              type="number"
              min={5}
              max={600}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Registrar"}
          </Button>
          <div className="space-y-1.5 sm:col-span-4">
            <Label htmlFor="practice-notes">Notas (opcional)</Label>
            <Input id="practice-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </form>
        <p className="mt-2 text-xs text-faint">
          Una práctica por día; puedes registrar hasta 7 días atrás.
        </p>
      </CardContent>
    </Card>
  );
}
