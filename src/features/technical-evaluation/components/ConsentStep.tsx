import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Autorización para grabación
        </CardTitle>
        <p className="text-sm text-muted">
          Para realizar la evaluación técnica necesitamos tu autorización para
          grabar video durante la sesión de patadas. Los videos se utilizan
          únicamente para análisis técnico y no se comparten con terceros.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <label className="flex cursor-pointer items-start gap-4 rounded-lg border border-border bg-surface-2 p-4 transition-interactive hover:border-primary/40">
          <Switch checked={consent} onCheckedChange={setConsent} />
          <div className="min-w-0">
            <p className="font-medium text-text">
              Autorizo la grabación de video
            </p>
            <p className="mt-1 text-sm text-muted">
              Acepto que Warriors TKD Espinal grabe sesiones de evaluación
              técnica para análisis de rendimiento.
            </p>
          </div>
        </label>

        <Button
          className="w-full"
          disabled={!consent || loading}
          onClick={handleSubmit}
        >
          {loading ? "Guardando…" : "Continuar"}
        </Button>
      </CardContent>
    </Card>
  );
}
