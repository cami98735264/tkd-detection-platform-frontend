import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BannerOptions } from "../types";

interface Props extends BannerOptions {
  onClose: () => void;
}

const VARIANT_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
} as const;

export default function AppBanner({
  title,
  description,
  variant = "info",
  onClose,
}: Props) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <Alert variant={variant} className="relative pr-12">
        <Icon className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        {description && <AlertDescription>{description}</AlertDescription>}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="absolute right-2 top-2 h-7 w-7 text-muted hover:text-text"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
