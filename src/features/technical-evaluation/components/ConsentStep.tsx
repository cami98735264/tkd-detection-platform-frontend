import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { technicalEvaluationApi } from "@/features/technical-evaluation/api/technicalEvaluationApi";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

interface ConsentStepProps {
  onConsented: () => void;
}

export default function ConsentStep({ onConsented }: ConsentStepProps) {
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const handleSubmit = async () => {
    if (!consent) return;
    setLoading(true);
    try {
      await technicalEvaluationApi.setConsent(true);
      showToast({ title: "Consentimiento registrado", variant: "success" });
      onConsented();
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Autorización para Grabación</CardTitle>
        <CardDescription>
          Para realizar la evaluación técnica de su hijo(a), necesitamos su autorización
          para grabar video durante la sesión de patadas. Los videos se utilizarán
          únicamente para análisis técnico y no se compartirán con terceros.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4 p-4 bg-surface-2 rounded-lg">
          <Switch checked={consent} onCheckedChange={setConsent} />
          <div>
            <p className="font-medium">Autorizo la grabación de video</p>
            <p className="text-sm text-muted-foreground">
              Acepto que Warriors TKD Espinal grabe sesiones de evaluación técnica
              de mi hijo(a) para análisis de rendimiento.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={!consent}
          onClick={handleSubmit}
        >
          {loading ? "Guardando..." : "Continuar"}
        </Button>
      </CardContent>
    </Card>
  );
}