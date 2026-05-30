import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "@/features/auth/api/authApi";
import { tokenRejectionState, type TokenRejection } from "@/types/api";
import { AuthShell } from "@/features/auth/components/AuthShell";
import AuthStatusView from "@/features/auth/components/AuthStatusView";
import { TOKEN_REJECTION_COPY } from "@/features/auth/lib/tokenCopy";
import { Button } from "@/components/ui/button";

type Phase = "confirming" | "success" | "rejected" | "error" | "needs-token";

export default function ConfirmEmailChange() {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>(uid && token ? "confirming" : "needs-token");
  const [rejection, setRejection] = useState<TokenRejection | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (!uid || !token || ran.current) return;
    ran.current = true;
    authApi
      .confirmEmailChange({ uid, token })
      .then((res) => {
        setNewEmail(res.email);
        setPhase("success");
      })
      .catch((err) => {
        const rej = tokenRejectionState(err);
        if (rej) {
          setRejection(rej);
          setPhase("rejected");
        } else {
          setPhase("error");
        }
      });
  }, [uid, token]);

  return (
    <AuthShell>
      {phase === "confirming" ? (
        <AuthStatusView tone="loading" title="Confirmando el cambio de correo..." />
      ) : phase === "success" ? (
        <AuthStatusView
          tone="success"
          title="Correo actualizado"
          message={
            <>
              Tu nuevo correo {newEmail ? <strong>{newEmail}</strong> : null} quedó
              confirmado. Por seguridad cerramos todas tus sesiones; vuelve a
              iniciar sesión.
            </>
          }
        >
          <Button asChild className="w-full">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </AuthStatusView>
      ) : phase === "rejected" && rejection ? (
        <AuthStatusView
          tone="warning"
          title={TOKEN_REJECTION_COPY[rejection].title}
          message={TOKEN_REJECTION_COPY[rejection].message}
        >
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard/profile">Ir a mi perfil</Link>
          </Button>
        </AuthStatusView>
      ) : phase === "needs-token" ? (
        <AuthStatusView
          tone="warning"
          title="Enlace incompleto"
          message="El enlace de confirmación está incompleto. Vuelve a solicitar el cambio desde tu perfil."
        >
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard/profile">Ir a mi perfil</Link>
          </Button>
        </AuthStatusView>
      ) : (
        <AuthStatusView
          tone="error"
          title="No pudimos confirmar el cambio"
          message="Ocurrió un error. Vuelve a solicitar el cambio de correo desde tu perfil."
        >
          <Button asChild variant="outline" className="w-full">
            <Link to="/dashboard/profile">Ir a mi perfil</Link>
          </Button>
        </AuthStatusView>
      )}
    </AuthShell>
  );
}
