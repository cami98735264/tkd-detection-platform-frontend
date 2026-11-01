import { useState } from "react";
import { FileUser } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { athleteDocumentsApi } from "../api/athleteDocumentsApi";

interface Props {
  athleteId: number;
  athleteName?: string;
  variant?: ButtonProps["variant"];
}

/** "Descargar hoja de vida" — the athlete's sports CV PDF (Req 5). */
export default function ResumeDownloadButton({
  athleteId,
  athleteName,
  variant = "highlight",
}: Props) {
  const { handleError } = useApiErrorHandler();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await athleteDocumentsApi.downloadResume(athleteId, athleteName);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} onClick={() => void handleClick()} disabled={busy}>
      <FileUser className="h-4 w-4" />
      {busy ? "Generando…" : "Descargar hoja de vida"}
    </Button>
  );
}
