import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { ModalOptions } from "../types";

interface Props extends ModalOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AppModal({
  open,
  onOpenChange,
  title,
  description,
  content,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        {...(!description && { "aria-describedby": undefined })}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        {content}
      </DialogContent>
    </Dialog>
  );
}