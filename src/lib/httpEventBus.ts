import { useFeedbackStore } from "@/store/feedbackStore";

export type HttpEventType = "success" | "warning" | "error";

export interface HttpEvent {
  type: HttpEventType;
  status: number;
  message: string;
  code?: string;
  metadata?: unknown;
}

export function emitHttpEvent(event: HttpEvent) {
  const { setEvent } = useFeedbackStore.getState();

  setEvent({
    type: event.type,
    message: event.message,
    code: event.code,
    status: event.status,
    metadata: event.metadata,
  });
}