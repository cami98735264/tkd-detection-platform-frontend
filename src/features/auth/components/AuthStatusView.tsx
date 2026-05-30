import type { ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

type Tone = "success" | "error" | "warning" | "loading";

interface Props {
  tone: Tone;
  title: string;
  message?: ReactNode;
  /** Action buttons / links rendered below the message. */
  children?: ReactNode;
}

const TONES: Record<Tone, { Icon: typeof CheckCircle2; cls: string; spin?: boolean }> = {
  success: { Icon: CheckCircle2, cls: "bg-success/10 text-success" },
  error: { Icon: XCircle, cls: "bg-error/10 text-error" },
  warning: { Icon: AlertTriangle, cls: "bg-warning/10 text-warning" },
  loading: { Icon: Loader2, cls: "bg-muted text-muted-foreground", spin: true },
};

/**
 * Centered icon + title + message + actions, used by the token-driven auth
 * pages (reset / verify / email-change / invitation) to render every UX state
 * (loading, success, token expired/invalid/revoked, error) consistently.
 */
export default function AuthStatusView({ tone, title, message, children }: Props) {
  const { Icon, cls, spin } = TONES[tone];
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className={`rounded-full p-3 ${cls}`}>
          <Icon className={`h-8 w-8 ${spin ? "animate-spin" : ""}`} aria-hidden />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}
      </div>
      {children ? <div className="space-y-3">{children}</div> : null}
    </div>
  );
}
