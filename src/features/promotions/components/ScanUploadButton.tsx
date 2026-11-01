import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useApiErrorHandler } from "@/feedback/useApiErrorHandler";
import { useFeedback } from "@/feedback/useFeedback";

import { promotionsApi } from "../api/promotionsApi";
import type { BeltPromotion } from "../types";

interface Props {
  promotion: BeltPromotion;
  onUploaded: (p: BeltPromotion) => void;
  size?: "sm" | "default";
}

/** Hidden file input + button: uploads a diploma scan for one promotion. */
export function ScanUploadButton({ promotion, onUploaded, size = "sm" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { handleError } = useApiErrorHandler();
  const { showToast } = useFeedback();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast({ title: "El archivo supera 5 MB", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const updated = await promotionsApi.uploadScan(promotion.id, file);
      showToast({ title: "Diploma escaneado cargado", variant: "success" });
      onUploaded(updated);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        aria-label={`Subir escaneo del diploma ${promotion.diploma_number}`}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <Button
        size={size}
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {busy ? "Subiendo…" : promotion.has_file ? "Reemplazar escaneo" : "Subir escaneo"}
      </Button>
    </>
  );
}
