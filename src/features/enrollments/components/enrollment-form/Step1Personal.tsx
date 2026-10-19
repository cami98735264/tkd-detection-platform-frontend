// Step 1 of the enrollment wizard: athlete (link or register), program, health data.
import type { ChangeEvent } from "react";
import { CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import AsyncSelectField from "@/components/common/AsyncSelectField";
import { FormSelect } from "@/components/common/FormSelect";

import AthletePersonalDataSection from "@/features/athletes/components/sections/AthletePersonalDataSection";

import {
  type AthleteFieldErrors,
  type AthletePersonalDataState,
} from "@/features/athletes/components/sections/types";

import type { Athlete } from "@/types/entities";

import { BLOOD_TYPES, type AthleteMode, type EnrollmentExtras } from "./model";

export interface Step1Props {
  isEdit: boolean;
  athleteMode: AthleteMode;
  setAthleteMode: (m: AthleteMode) => void;
  linkedAthleteId: number | null;
  linkedAthlete: Athlete | null;
  onLinkedAthleteChange: (id: number | null) => void;
  personal: AthletePersonalDataState;
  onPersonalChange: (patch: Partial<AthletePersonalDataState>) => void;
  personalErrors: AthleteFieldErrors;
  sportsmanEmailExists: boolean;
  onLinkSportsmanEmail: () => void;
  extras: EnrollmentExtras;
  setExtras: (updater: EnrollmentExtras | ((prev: EnrollmentExtras) => EnrollmentExtras)) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  loadAthletes: (
    input: string,
    page: number,
  ) => Promise<{
    options: { value: number; label: string }[];
    hasMore: boolean;
  }>;
  loadPrograms: (
    input: string,
    page: number,
  ) => Promise<{
    options: { value: number; label: string }[];
    hasMore: boolean;
  }>;
  age: number | null;
}

export default function Step1Personal({
  isEdit,
  athleteMode,
  setAthleteMode,
  linkedAthleteId,
  linkedAthlete,
  onLinkedAthleteChange,
  personal,
  onPersonalChange,
  personalErrors,
  sportsmanEmailExists,
  onLinkSportsmanEmail,
  extras,
  setExtras,
  onFileChange,
  loadAthletes,
  loadPrograms,
  age,
}: Step1Props) {
  return (
    <div className="space-y-4">
      {!isEdit && (
        <Tabs value={athleteMode} onValueChange={(v) => setAthleteMode(v as AthleteMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Deportista existente</TabsTrigger>
            <TabsTrigger value="register">Registrar nuevo</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="pt-3 space-y-4">
            <div className="space-y-1.5">
              <Label>Deportista *</Label>
              <AsyncSelectField
                value={linkedAthleteId}
                onChange={onLinkedAthleteChange}
                loadOptions={loadAthletes}
                placeholder="Buscar deportista..."
              />
            </div>

            {linkedAthlete && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datos del Deportista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Nombre:</span>{" "}
                      {linkedAthlete.full_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fecha Nac.:</span>{" "}
                      {linkedAthlete.date_of_birth
                        ? new Date(linkedAthlete.date_of_birth).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                  {age !== null && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Edad:</span> {age} años
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cinturón:</span>{" "}
                        {linkedAthlete.belt_actual_name || "—"}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="register" className="pt-3">
            <AthletePersonalDataSection
              data={personal}
              onChange={onPersonalChange}
              errors={personalErrors}
              emailExistsHint={sportsmanEmailExists}
              onLinkExistingEmail={onLinkSportsmanEmail}
            />
          </TabsContent>
        </Tabs>
      )}

      {isEdit && linkedAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deportista</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{linkedAthlete.full_name}</CardContent>
        </Card>
      )}

      <div className="space-y-1.5">
        <Label>Programa *</Label>
        <AsyncSelectField
          value={extras.program_id}
          onChange={(v) => setExtras((x) => ({ ...x, program_id: v }))}
          loadOptions={loadPrograms}
          placeholder="Buscar programa..."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fecha Inicio *</Label>
          <Input
            type="date"
            value={extras.start_date}
            onChange={(e) => setExtras((x) => ({ ...x, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Fecha Fin</Label>
          <Input
            type="date"
            value={extras.end_date}
            onChange={(e) => setExtras((x) => ({ ...x, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de Sangre</Label>
        <FormSelect
          value={extras.blood_type}
          onValueChange={(v) => setExtras((x) => ({ ...x, blood_type: v }))}
          options={BLOOD_TYPES.map((t) => ({ value: t, label: t }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Certificado Médico (PDF/JPG/PNG, máx 5MB)</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={onFileChange}
            className="flex-1"
          />
          {extras.certificado_medico && (
            <span className="text-sm text-success">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notas</Label>
        <Textarea
          value={extras.notes}
          onChange={(e) => setExtras((x) => ({ ...x, notes: e.target.value }))}
          placeholder="Observaciones adicionales..."
        />
      </div>
    </div>
  );
}
