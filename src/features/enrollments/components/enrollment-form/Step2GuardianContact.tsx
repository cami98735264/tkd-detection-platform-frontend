import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { EnrollmentExtras } from "./model";

interface Props {
  extras: EnrollmentExtras;
  setExtras: (updater: (prev: EnrollmentExtras) => EnrollmentExtras) => void;
}

/** Step 2 (minors): guardian contact data stored with the enrollment. */
export default function Step2GuardianContact({ extras, setExtras }: Props) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Datos de contacto adicionales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="guardian_documento">Documento</Label>
            <Input
              id="guardian_documento"
              value={extras.guardian_documento}
              onChange={(e) => setExtras((x) => ({ ...x, guardian_documento: e.target.value }))}
              placeholder="Número de documento"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="guardian_address">Dirección</Label>
            <Input
              id="guardian_address"
              value={extras.guardian_address}
              onChange={(e) => setExtras((x) => ({ ...x, guardian_address: e.target.value }))}
              placeholder="Dirección de contacto"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
