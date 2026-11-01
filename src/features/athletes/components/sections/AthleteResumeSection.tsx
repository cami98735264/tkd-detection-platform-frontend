// "Hoja de vida" block of the athlete form (contract Addendum B.3): the data
// printed on the club's official CV model. Every field is optional.
import { useId, useState, type ReactNode } from "react";
import { ChevronDown, FileUser } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  ID_DOCUMENT_TYPE_OPTIONS,
  RH_FACTOR_OPTIONS,
  WEEKDAYS,
  toggleTrainingDay,
  validateAthleteResume,
  type AthleteResumeErrors,
  type AthleteResumeState,
  type AthleteResumeTextField,
  type Option,
} from "@/features/athletes/lib/athleteResume";

interface Props {
  data: AthleteResumeState;
  onChange: (patch: Partial<AthleteResumeState>) => void;
  /** Field errors from the latest API response. */
  errors?: AthleteResumeErrors;
  /** Shown in the empty "Número de documento" (e.g. the sportsman profile's documento). */
  documentPlaceholder?: string | null;
  /** Start expanded (e.g. when editing an athlete that already has data). */
  defaultOpen?: boolean;
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-primary">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default function AthleteResumeSection({
  data,
  onChange,
  errors,
  documentPlaceholder,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const contentId = `${uid}-content`;
  const fid = (name: string) => `${uid}-${name}`;
  const localErrors = validateAthleteResume(data);
  const errorOf = (field: keyof AthleteResumeState) => errors?.[field] ?? localErrors[field];

  const text = (
    field: AthleteResumeTextField,
    label: string,
    extra: Record<string, unknown> = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={fid(field)}>{label}</Label>
      <Input
        id={fid(field)}
        value={data[field]}
        onChange={(e) => onChange({ [field]: e.target.value } as Partial<AthleteResumeState>)}
        {...extra}
      />
      {errorOf(field) && <p className="text-sm text-error">{errorOf(field)}</p>}
    </div>
  );

  const select = (field: AthleteResumeTextField, label: string, options: readonly Option[]) => (
    <div className="space-y-1.5">
      <Label htmlFor={fid(field)}>{label}</Label>
      <NativeSelect
        id={fid(field)}
        value={data[field]}
        onChange={(e) => onChange({ [field]: e.target.value } as Partial<AthleteResumeState>)}
      >
        <option value="">Sin especificar</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
      {errorOf(field) && <p className="text-sm text-error">{errorOf(field)}</p>}
    </div>
  );

  return (
    <section className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-3 text-left sm:p-4"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <FileUser className="h-4 w-4 text-primary" />
          <span>
            <span className="block text-sm font-medium text-text">Hoja de vida</span>
            <span className="block text-xs text-muted-foreground">
              Datos para la hoja de vida y la constancia del club (opcionales).
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div id={contentId} className="space-y-4 border-t border-divider p-3 sm:p-4">
          <Block title="Identificación">
            <div className="grid gap-3 sm:grid-cols-2">
              {select("document_type", "Tipo de documento", ID_DOCUMENT_TYPE_OPTIONS)}
              {text("document_number", "Número de documento", {
                inputMode: "numeric",
                autoComplete: "off",
                placeholder: documentPlaceholder || "Ej. 1104954182",
              })}
              {select("gender", "Género", GENDER_OPTIONS)}
              {text("civil_status", "Estado civil", { placeholder: "Soltero(a)" })}
            </div>
            {text("birth_place", "Lugar de nacimiento", { placeholder: "Espinal, Tolima" })}
          </Block>

          <Block title="Salud">
            <div className="grid gap-3 sm:grid-cols-3">
              {text("eps", "Seguro E.P.S.")}
              {select("blood_group", "Grupo sanguíneo", BLOOD_GROUP_OPTIONS)}
              {select("rh_factor", "Factor RH", RH_FACTOR_OPTIONS)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fid("allergies")}>Enfermedad o alergia a</Label>
              <Textarea
                id={fid("allergies")}
                rows={2}
                value={data.allergies}
                onChange={(e) => onChange({ allergies: e.target.value })}
                placeholder="Ninguna"
              />
            </div>
          </Block>

          <Block title="Contacto">
            <div className="grid gap-3 sm:grid-cols-2">
              {text("address", "Dirección residencial", { autoComplete: "street-address" })}
              {text("phone", "Teléfono", { type: "tel", inputMode: "tel" })}
            </div>
          </Block>

          <Block title="Padres">
            <div className="grid gap-3 sm:grid-cols-3">
              {text("mother_name", "Nombre de la madre")}
              {text("mother_occupation", "Ocupación de la madre")}
              {text("mother_phone", "Teléfono de la madre", { type: "tel", inputMode: "tel" })}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {text("father_name", "Nombre del padre")}
              {text("father_occupation", "Ocupación del padre")}
              {text("father_phone", "Teléfono del padre", { type: "tel", inputMode: "tel" })}
            </div>
          </Block>

          <Block title="Información técnica">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={fid("join_date")}>Fecha de ingreso al club</Label>
                <Input
                  id={fid("join_date")}
                  type="date"
                  value={data.join_date}
                  onChange={(e) => onChange({ join_date: e.target.value })}
                />
                {errorOf("join_date") && (
                  <p className="text-sm text-error">{errorOf("join_date")}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fid("session_hours")}>Horas por sesión</Label>
                <Input
                  id={fid("session_hours")}
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={data.session_hours}
                  onChange={(e) => onChange({ session_hours: e.target.value })}
                  placeholder="2"
                />
                {errorOf("session_hours") && (
                  <p className="text-sm text-error">{errorOf("session_hours")}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium" id={fid("training_days")}>
                Días de entrenamiento
              </p>
              <div
                role="group"
                aria-labelledby={fid("training_days")}
                className="flex flex-wrap gap-2"
              >
                {WEEKDAYS.map((day) => {
                  const checked = data.training_days.includes(day.value);
                  return (
                    <label
                      key={day.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                        checked
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-text",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--primary)]"
                        checked={checked}
                        onChange={(e) =>
                          onChange({
                            training_days: toggleTrainingDay(
                              data.training_days,
                              day.value,
                              e.target.checked,
                            ),
                          })
                        }
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Si no se marcan, se usan los del horario de su programa o los del club.
              </p>
            </div>
          </Block>
        </div>
      )}
    </section>
  );
}
