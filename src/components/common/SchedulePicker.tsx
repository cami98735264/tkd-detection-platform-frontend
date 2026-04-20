import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ScheduleEntry {
  days: string[];
  startTime: string;
  endTime: string;
}

interface Props {
  value: ScheduleEntry[];
  onChange: (value: ScheduleEntry[]) => void;
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function SchedulePicker({ value, onChange }: Props) {
  const [selectedDays, setSelectedDays] = useState<string[]>(
    value.flatMap(e => e.days)
  );
  const [startTime, setStartTime] = useState(value[0]?.startTime ?? "18:00");
  const [endTime, setEndTime] = useState(value[0]?.endTime ?? "19:30");

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAdd = () => {
    if (!selectedDays.length) return;
    onChange([...value, { days: [...selectedDays], startTime, endTime }]);
  };

  const events = value.flatMap((entry, idx) =>
    entry.days.map(day => ({
      id: `${idx}-${day}`,
      daysOfWeek: [DAY_KEYS.indexOf(day) + 1],
      startTime: entry.startTime,
      endTime: entry.endTime,
      display: "time",
      color: "#16a34a",
    }))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {DAY_KEYS.map(day => (
          <Button
            key={day}
            type="button"
            variant={selectedDays.includes(day) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDay(day)}
            className={
              selectedDays.includes(day) ? "bg-green-600 hover:bg-green-700" : ""
            }
          >
            {DAY_LABELS[day]}
          </Button>
        ))}
      </div>
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <Label>Hora inicio</Label>
          <Input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Hora fin</Label>
          <Input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAdd}
          disabled={!selectedDays.length}
        >
          Agregar horario
        </Button>
      </div>
      {value.length > 0 && (
        <div className="border rounded-md p-3 space-y-2">
          {value.map((entry, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm">
                {entry.days.map(d => DAY_LABELS[d]).join(", ")} — {entry.startTime}{" "}
                a {entry.endTime}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="border rounded-md overflow-hidden">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,timeGridDay",
          }}
          events={events}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          weekends={false}
          editable={false}
        />
      </div>
    </div>
  );
}