import { useState } from "react";
import { FileBadge } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";

import { athleteDocumentsApi } from "../api/athleteDocumentsApi";

interface Props {
  athleteId: number;
  athleteName?: string;
  variant?: ButtonProps["variant"];
}

/** "Descargar constancia" — the club's official membership letter (Addendum B.4). */
export default function ConstanciaDownloadButton({
  athleteId,
  athleteName,
  variant = "outline",
}: Props) {
  const { handleError } = useApiErrorHandler();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await athleteDocumentsApi.downloadConstancia(athleteId, athleteName);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} onClick={() => void handleClick()} disabled={busy}>
      <FileBadge className="h-4 w-4" />
      {busy ? "Generando…" : "Descargar constancia"}
    </Button>
  );
}
