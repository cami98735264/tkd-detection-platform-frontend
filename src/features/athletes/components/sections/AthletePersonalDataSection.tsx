import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AsyncSelectField from "@/components/common/AsyncSelectField";
import { FormSelect } from "@/components/common/FormSelect";

import { categoriesApi } from "@/features/categories/api/categoriesApi";
import { beltsApi, type Belt } from "@/features/evaluations/api/beltsApi";
import { usersApi } from "@/features/users/api/usersApi";
import type { CompetitionCategory } from "@/types/entities";

import {
  STATUS_OPTIONS,
  calculateAge,
  type AccountMode,
  type AthletePersonalDataState,
} from "./types";

export interface AthletePersonalErrors {
  full_name?: string;
  date_of_birth?: string;
  sportsman_email?: string;
  sportsman_password?: string;
  sportsman_user_id?: string;
}

interface Props {
  data: AthletePersonalDataState;
  onChange: (patch: Partial<AthletePersonalDataState>) => void;
  /** When true, hide the sportsman-account section (used in edit mode). */
  hideAccountSection?: boolean;
  /** When true, render the status selector. Defaults to true. */
  showStatus?: boolean;
  /** Field-level errors from the latest API response. */
  errors?: AthletePersonalErrors;
  /**
   * Set when the entered sportsman email already belongs to a User. Renders
   * an inline action that lets the caller switch to the link-existing tab and
   * pre-select the matching user.
   */
  emailExistsHint?: boolean;
  onLinkExistingEmail?: () => void;
}

export default function AthletePersonalDataSection({
  data,
  onChange,
  hideAccountSection = false,
  showStatus = true,
  errors,
  emailExistsHint = false,
  onLinkExistingEmail,
}: Props) {
  const [belts, setBelts] = useState<Belt[]>([]);
  const [categories, setCategories] = useState<CompetitionCategory[]>([]);

  useEffect(() => {
    beltsApi.list(1).then((res) => setBelts(res.results)).catch(() => {});
    categoriesApi
      .list(1)
      .then((res) => setCategories(res.results))
      .catch(() => {});
  }, []);

  const loadSportsmanUsers = useCallback((input: string, page: number) => {
    return usersApi
      .list({ page, search: input, role: "sportsman", withoutAthlete: true })
      .then((res) => ({
        options: res.results.map((u) => ({
          value: u.id,
          label: `${u.full_name} (${u.email})`,
        })),
        hasMore: res.next !== null,
      }));
  }, []);

  const age = calculateAge(data.date_of_birth);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Nombre completo *</Label>
        <Input
          id="full_name"
          value={data.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          placeholder="Nombre y apellido"
        />
        {errors?.full_name && (
          <p className="text-sm text-error">{errors.full_name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="date_of_birth">Fecha de nacimiento *</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={data.date_of_birth}
            onChange={(e) => onChange({ date_of_birth: e.target.value })}
          />
          {age !== null && (
            <p className="text-xs text-muted-foreground">
              Edad: {age} años {age < 18 ? "(menor de edad)" : ""}
            </p>
          )}
          {errors?.date_of_birth && (
            <p className="text-sm text-error">{errors.date_of_birth}</p>
          )}
        </div>
        {showStatus && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Estado</Label>
            <FormSelect
              id="status"
              value={data.status}
              onValueChange={(v) => onChange({ status: v })}
              options={STATUS_OPTIONS}
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="belt_actual">Cinturón</Label>
          <FormSelect
            id="belt_actual"
            value={data.belt_actual}
            onValueChange={(v) => onChange({ belt_actual: v })}
            placeholder="Sin cinturón"
            options={belts.map((b) => ({
              value: String(b.id),
              label: b.nombre,
            }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoria_competencia">Categoría de competencia</Label>
          <FormSelect
            id="categoria_competencia"
            value={data.categoria_competencia}
            onValueChange={(v) => onChange({ categoria_competencia: v })}
            placeholder="Sin categoría"
            options={categories.map((c) => ({
              value: String(c.id),
              label: c.nombre,
            }))}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="height_cm">Altura (cm)</Label>
          <Input
            id="height_cm"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="300"
            value={data.height_cm}
            onChange={(e) => onChange({ height_cm: e.target.value })}
            placeholder="170"
          />
        </div>
      </div>

      {!hideAccountSection && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div>
              <p className="font-medium text-sm">Cuenta del deportista *</p>
              <p className="text-xs text-muted-foreground">
                Vincula una cuenta existente o crea una nueva para el deportista.
              </p>
            </div>

            <Tabs
              value={data.sportsman_mode}
              onValueChange={(v) => onChange({ sportsman_mode: v as AccountMode })}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link">Cuenta existente</TabsTrigger>
                <TabsTrigger value="create">Crear cuenta nueva</TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="pt-2">
                <AsyncSelectField
                  value={data.sportsman_user_id}
                  onChange={(v) => onChange({ sportsman_user_id: v })}
                  loadOptions={loadSportsmanUsers}
                  placeholder="Buscar deportista por nombre o correo..."
                />
                {errors?.sportsman_user_id && (
                  <p className="text-sm text-error mt-1">{errors.sportsman_user_id}</p>
                )}
              </TabsContent>

              <TabsContent value="create" className="pt-2 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sportsman_email">Email *</Label>
                  <Input
                    id="sportsman_email"
                    type="email"
                    value={data.sportsman_email}
                    onChange={(e) => onChange({ sportsman_email: e.target.value })}
                    placeholder="email@ejemplo.com"
                    autoComplete="off"
                  />
                  {errors?.sportsman_email && (
                    <p className="text-sm text-error">{errors.sportsman_email}</p>
                  )}
                  {emailExistsHint && onLinkExistingEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={onLinkExistingEmail}
                    >
                      <Link2 size={14} className="mr-1" /> Vincular cuenta existente
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sportsman_password">Contraseña *</Label>
                  <Input
                    id="sportsman_password"
                    type="password"
                    value={data.sportsman_password}
                    onChange={(e) => onChange({ sportsman_password: e.target.value })}
                    placeholder="Min. 8 caracteres con mayús., minús., dígito y símbolo"
                    autoComplete="new-password"
                  />
                  {errors?.sportsman_password && (
                    <p className="text-sm text-error">{errors.sportsman_password}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
