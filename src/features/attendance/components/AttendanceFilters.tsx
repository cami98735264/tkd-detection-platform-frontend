import { useEffect } from "react";
import { useParentChildrenStore } from "@/features/athletes/store/parentChildrenStore";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "weekly" | "monthly" | "yearly";

interface AttendanceFiltersProps {
  athleteId: number | null;
  viewMode: ViewMode;
  startDate: string;
  endDate: string;
  onAthleteChange: (id: number | null) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function AttendanceFilters({
  athleteId,
  viewMode,
  startDate,
  endDate,
  onAthleteChange,
  onViewModeChange,
  onStartDateChange,
  onEndDateChange,
}: AttendanceFiltersProps) {
  const { children, fetchChildren } = useParentChildrenStore();
  const { hasRole } = usePermissions();
  const isParent = hasRole(["parent"]);

  useEffect(() => {
    if (isParent) fetchChildren();
  }, [isParent, fetchChildren]);

  const updateRange = (mode: ViewMode) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (mode) {
      case "weekly":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "yearly":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }

    onStartDateChange(start.toISOString().split("T")[0]);
    onEndDateChange(end.toISOString().split("T")[0]);
    onViewModeChange(mode);
  };

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {children.length > 0 && (
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Atleta</label>
          <Select
            value={athleteId ? String(athleteId) : "all"}
            onValueChange={(v) => onAthleteChange(v === "all" ? null : Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {children.map((c) => (
                <SelectItem key={c.athlete_id} value={String(c.athlete_id)}>
                  {c.athlete.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-1 block">Periodo</label>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "weekly" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRange("weekly")}
          >
            Semanal
          </Button>
          <Button
            variant={viewMode === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRange("monthly")}
          >
            Mensual
          </Button>
          <Button
            variant={viewMode === "yearly" ? "default" : "outline"}
            size="sm"
            onClick={() => updateRange("yearly")}
          >
            Anual
          </Button>
        </div>
      </div>
    </div>
  );
}