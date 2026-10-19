// Step 3 of the enrollment wizard: consents and summary.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import { Label } from "@/components/ui/label";

import { type ParentAccountState } from "@/features/athletes/components/sections/types";

import { type EnrollmentExtras } from "./model";

export interface Step3Props {
  athleteName: string;
  extras: EnrollmentExtras;
  setExtras: (updater: EnrollmentExtras | ((prev: EnrollmentExtras) => EnrollmentExtras)) => void;
  isMinor: boolean;
  parent: ParentAccountState;
}

export default function Step3Consents({
  athleteName,
  extras,
  setExtras,
  isMinor,
  parent,
}: Step3Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de la Inscripción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Deportista:</span> {athleteName}
            </div>
            <div>
              <span className="text-muted-foreground">Tipo Sangre:</span> {extras.blood_type || "—"}
            </div>
          </div>
          {isMinor && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Acudiente:</span>{" "}
                {parent.parent_mode === "create" ? parent.parent_full_name : "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Parentesco:</span>{" "}
                {parent.parent_relationship || "—"}
              </div>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Fecha Inicio:</span> {extras.start_date}
          </div>
          <div>
            <span className="text-muted-foreground">Certificado Médico:</span>{" "}
            {extras.certificado_medico?.name || "No adjuntado"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimientos *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConsentCheckbox
            id="confirmacion_precision"
            label="Confirmo que todos los datos proporcionados son exactos y verídicos"
            checked={extras.confirmacion_precision}
            onChange={(v) => setExtras((x) => ({ ...x, confirmacion_precision: v }))}
          />
          <ConsentCheckbox
            id="acepta_datos"
            label="Autorizo el tratamiento de mis datos personales según la política de privacidad"
            checked={extras.acepta_datos}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_datos: v }))}
          />
          <ConsentCheckbox
            id="acepta_terminos"
            label="Acepto los términos y condiciones del club"
            checked={extras.acepta_terminos}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_terminos: v }))}
          />
          <ConsentCheckbox
            id="acepta_imagenes"
            label="Autorizo el uso de imágenes/fotografías para fines promocionales del club"
            checked={extras.acepta_imagenes}
            onChange={(v) => setExtras((x) => ({ ...x, acepta_imagenes: v }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentCheckbox({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label} *
      </Label>
    </div>
  );
}
