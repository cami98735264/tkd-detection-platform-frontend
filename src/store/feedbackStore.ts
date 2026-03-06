import { create } from "zustand";

export type FeedbackType = "success" | "warning" | "error";

export interface FeedbackEvent {
  type: FeedbackType;
  message: string;
  code?: string;
  status?: number;
  metadata?: unknown;
}

interface FeedbackState {
  event: FeedbackEvent | null;
  setEvent: (event: FeedbackEvent) => void;
  clearEvent: () => void;
}

export const useFeedbackStore = create<FeedbackState>((set) => ({
  event: null,

  setEvent: (event) =>
    set({
      event,
    }),

  clearEvent: () =>
    set({
      event: null,
    }),
}));