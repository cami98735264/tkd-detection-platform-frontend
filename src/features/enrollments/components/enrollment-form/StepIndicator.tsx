import { CheckCircle2 } from "lucide-react";

import type { STEPS } from "./model";

interface Props {
  steps: ReadonlyArray<(typeof STEPS)[number]>;
  current: number;
}

/** Numbered progress indicator of the enrollment wizard. */
export default function StepIndicator({ steps, current }: Props) {
  return (
    <div className="flex items-center justify-center py-4 mt-4">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
              current > s.id
                ? "bg-primary text-primary-foreground"
                : current === s.id
                  ? "bg-primary/10 text-primary border border-primary"
                  : "bg-surface-2 text-faint border border-border"
            }`}
          >
            {current > s.id ? <CheckCircle2 size={16} /> : s.id}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-1 ${current > s.id ? "bg-primary" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
