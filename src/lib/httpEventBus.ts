import { useFeedbackStore } from "@/store/feedbackStore";
import { FeedbackEvent } from "@/store/feedbackStore";

export function emitHttpEvent(event: FeedbackEvent) {
  const setEvent = useFeedbackStore.getState().setEvent;
  setEvent(event);
}