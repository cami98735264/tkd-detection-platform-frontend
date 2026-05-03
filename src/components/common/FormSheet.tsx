import { useEffect, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type FormSheetSize = "md" | "lg" | "xl";

interface FormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: FormSheetSize;
}

const DESKTOP_WIDTH: Record<FormSheetSize, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

const SHEET_WIDTH: Record<FormSheetSize, string> = {
  md: "sm:max-w-md w-full",
  lg: "sm:max-w-lg w-full",
  xl: "sm:max-w-xl w-full",
};

/**
 * Renders a Sheet (right-side drawer) on viewports < md, a Dialog on >= md.
 * The handoff happens at mount so transitions stay clean; resizes during the
 * lifetime of an open sheet do not swap variants.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "lg",
}: FormSheetProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            SHEET_WIDTH[size]
          )}
        >
          <SheetHeader className="border-b border-divider p-5 text-left">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          {footer && (
            <SheetFooter className="border-t border-divider p-5">{footer}</SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          DESKTOP_WIDTH[size]
        )}
      >
        <DialogHeader className="border-b border-divider p-6 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <DialogFooter className="border-t border-divider p-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
