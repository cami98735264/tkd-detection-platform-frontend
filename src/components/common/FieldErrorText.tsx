import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  children?: ReactNode;
  className?: string;
}

export function FieldErrorText({ children, className }: Props) {
  return (
    <p
      role="alert"
      className={cn(
        "animate-slide-down-fade text-sm text-error",
        className,
      )}
    >
      {children}
    </p>
  );
}
