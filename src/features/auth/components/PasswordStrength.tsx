import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordStrength } from "@/features/auth/lib/passwordPolicy";

const BAR_COLOR = ["bg-error", "bg-error", "bg-warning", "bg-warning", "bg-info", "bg-success"];
const LABEL = ["Muy débil", "Muy débil", "Débil", "Media", "Buena", "Fuerte"];

/** Live password-strength feedback: a bar + the per-rule checklist. */
export default function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const score = passwordStrength(value);
  const pct = (score / PASSWORD_RULES.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${BAR_COLOR[score]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{LABEL[score]}</span>
      </div>
      <ul className="space-y-0.5">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li
              key={rule.label}
              className={`flex items-center gap-1.5 text-xs ${
                ok ? "text-success" : "text-muted-foreground"
              }`}
            >
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
