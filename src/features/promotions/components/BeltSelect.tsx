import { NativeSelect } from "@/components/ui/native-select";

import type { BeltOption } from "../types";

interface Props {
  id: string;
  value: number | null;
  onChange: (value: number | null) => void;
  belts: BeltOption[];
  emptyLabel: string;
  required?: boolean;
}

export function BeltSelect({ id, value, onChange, belts, emptyLabel, required }: Props) {
  return (
    <NativeSelect
      id={id}
      value={value ?? ""}
      required={required}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">{emptyLabel}</option>
      {belts.map((b) => (
        <option key={b.id} value={b.id}>
          {b.nombre}
        </option>
      ))}
    </NativeSelect>
  );
}
