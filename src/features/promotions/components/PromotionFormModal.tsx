import { useEffect, useState, type FormEvent } from "react";

import FormModal from "@/components/common/FormModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AthletePicker } from "@/features/athletes/components/AthletePicker";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { promotionsApi } from "../api/promotionsApi";
import type { BeltOption, BeltPromotion } from "../types";
import { BeltSelect } from "./BeltSelect";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  belts: BeltOption[];
  /**
   * Athletes the current user may register for (non-admin users with
   * `can_register`). When omitted, administrators search the roster.
   */
  athleteOptions?: { id: number; name: string }[];
  defaultAthleteId?: number | null;
  onSaved: (promotion: BeltPromotion) => void;
}

const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX_BYTES = 5 * 1024 * 1024;

/** Manual registration of an external/historic belt promotion + diploma scan. */
export default function PromotionFormModal({
  open,
  onOpenChange,
  belts,
  athleteOptions,
  defaultAthleteId,
  onSaved,
}: Props) {
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();
  const [athleteId, setAthleteId] = useState<number | null>(null);
  const [fromBelt, setFromBelt] = useState<number | null>(null);
  const [toBelt, setToBelt] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAthleteId(defaultAthleteId ?? athleteOptions?.[0]?.id ?? null);
    setFromBelt(null);
    setToBelt(null);
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setFile(null);
  }, [open, defaultAthleteId, athleteOptions]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!athleteId || !toBelt || !date) {
      showToast({ title: "Completa deportista, cinturón y fecha", variant: "warning" });
      return;
    }
    if (file && file.size > MAX_BYTES) {
      showToast({ title: "El archivo supera 5 MB", variant: "warning" });
      return;
    }
    setSaving(true);
    try {
      const saved = await promotionsApi.createPromotion({
        athlete: athleteId,
        from_belt: fromBelt,
        to_belt: toBelt,
        promotion_date: date,
        notes,
        diploma_file: file,
      });
      showToast({ title: "Ascenso registrado", variant: "success" });
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar ascenso y diploma"
      description="Registra un ascenso de cinturón (por ejemplo, un diploma anterior) y adjunta el escaneo del diploma."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {athleteOptions ? (
          <div className="space-y-1.5">
            <Label htmlFor="promo-athlete">Deportista</Label>
            <NativeSelect
              id="promo-athlete"
              value={athleteId ?? ""}
              onChange={(e) => setAthleteId(Number(e.target.value) || null)}
            >
              {athleteOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <AthletePicker value={athleteId} onChange={setAthleteId} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="promo-from">Cinturón anterior</Label>
            <BeltSelect
              id="promo-from"
              value={fromBelt}
              onChange={setFromBelt}
              belts={belts}
              emptyLabel="Sin especificar"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="promo-to">Cinturón obtenido</Label>
            <BeltSelect
              id="promo-to"
              value={toBelt}
              onChange={setToBelt}
              belts={belts}
              emptyLabel="Seleccionar…"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-date">Fecha del ascenso</Label>
          <Input
            id="promo-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-file">Diploma escaneado (PDF/JPG/PNG, máx. 5 MB)</Label>
          <Input
            id="promo-file"
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-notes">Notas</Label>
          <Textarea id="promo-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Registrar"}
          </Button>
        </div>
      </form>
    </FormModal>
  );
}
