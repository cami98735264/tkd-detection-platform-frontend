import { useCallback, useEffect } from "react";

import AsyncSelectField from "@/components/common/AsyncSelectField";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { athletesApi } from "@/features/athletes/api/athletesApi";
import { useParentChildrenStore } from "@/features/athletes/store/parentChildrenStore";
import { useAuthStore } from "@/features/auth/store/authStore";

interface Props {
  value: number | null;
  onChange: (athleteId: number | null) => void;
  label?: string;
  /** Pre-select the first linked child for parents (default true). */
  autoSelectFirstChild?: boolean;
  className?: string;
}

/**
 * "Which athlete?" selector shared by the promotions, gamification and poomsae
 * pages. Sportsmen never pick (the API defaults to their own record, so this
 * renders nothing); parents choose among their linked children; administrators
 * search the whole roster.
 */
export function AthletePicker({
  value,
  onChange,
  label = "Deportista",
  autoSelectFirstChild = true,
  className,
}: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const children = useParentChildrenStore((s) => s.children);
  const fetchChildren = useParentChildrenStore((s) => s.fetchChildren);

  useEffect(() => {
    if (role === "parent") void fetchChildren();
  }, [role, fetchChildren]);

  useEffect(() => {
    if (role !== "parent" || !autoSelectFirstChild || value != null) return;
    if (children.length > 0) onChange(children[0].athlete_id);
  }, [role, autoSelectFirstChild, value, children, onChange]);

  const loadAthletes = useCallback(
    (input: string, page: number) =>
      athletesApi.list(page, input).then((res) => ({
        options: (res?.results ?? []).map((a) => ({ value: a.id, label: a.full_name })),
        hasMore: !!res?.next,
      })),
    [],
  );

  if (role === "parent") {
    return (
      <div className={className}>
        <Label htmlFor="athlete-picker" className="mb-1.5 block">
          {label}
        </Label>
        <NativeSelect
          id="athlete-picker"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        >
          {children.length === 0 && <option value="">Sin deportistas vinculados</option>}
          {children.map((c) => (
            <option key={c.athlete_id} value={c.athlete_id}>
              {c.athlete?.full_name ?? `Deportista ${c.athlete_id}`}
            </option>
          ))}
        </NativeSelect>
      </div>
    );
  }

  if (role === "administrator") {
    return (
      <div className={className}>
        <Label className="mb-1.5 block">{label}</Label>
        <AsyncSelectField
          value={value}
          onChange={onChange}
          loadOptions={loadAthletes}
          placeholder="Buscar deportista..."
        />
      </div>
    );
  }

  return null;
}
