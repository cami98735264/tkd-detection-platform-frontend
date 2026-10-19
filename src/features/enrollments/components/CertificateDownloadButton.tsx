import { useState } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { downloadFile } from "@/lib/download";
import type { Enrollment } from "@/types/entities";

import { certificateFilename, certificateUrl } from "../lib/certificate";

interface Props {
  enrollment: Enrollment;
  label?: string;
}

/**
 * Downloads the enrollment's medical certificate through the authenticated
 * API (blob fetch with cookies). Renders a dash when there is no certificate.
 */
export default function CertificateDownloadButton({ enrollment, label = "Descargar" }: Props) {
  const { handleError } = useApiErrorHandler();
  const [busy, setBusy] = useState(false);
  const url = certificateUrl(enrollment);

  if (!url) return <span className="text-faint">—</span>;

  const handleClick = async () => {
    setBusy(true);
    try {
      await downloadFile(url, certificateFilename(enrollment));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={() => void handleClick()} disabled={busy}>
      <FileText className="h-3.5 w-3.5" />
      {busy ? "Descargando…" : label}
    </Button>
  );
}
