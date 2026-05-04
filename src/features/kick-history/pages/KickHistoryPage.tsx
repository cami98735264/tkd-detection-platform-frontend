import EvaluationHistory from "@/features/technical-evaluation/components/EvaluationHistory";
import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KickHistoryPage() {
  return (
    <div className="space-y-6">
      <EvaluationHistory />
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link to="/dashboard/evaluacion-tecnica">
            <Camera className="h-4 w-4" />
            Nueva evaluación
          </Link>
        </Button>
      </div>
    </div>
  );
}
