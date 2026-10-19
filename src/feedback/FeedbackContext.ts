import { createContext } from "react";

import type {
  AlertOptions,
  BannerOptions,
  ConfirmOptions,
  ModalOptions,
  ToastOptions,
} from "./types";

export interface FeedbackContextType {
  openModal: (options: ModalOptions) => void;
  showToast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => void;
  showBanner: (options: BannerOptions) => void;
}

export const FeedbackContext = createContext<FeedbackContextType | null>(null);
