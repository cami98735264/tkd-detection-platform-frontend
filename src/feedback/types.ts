import { ReactNode } from "react";

export type FeedbackVariant = "success" | "error" | "warning" | "info";

export interface ModalOptions {
  title: string;
  description?: string;
  content?: ReactNode;
  variant?: FeedbackVariant;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  variant?: FeedbackVariant;
}

export interface AlertOptions {
  title: string;
  description?: string;
  variant?: FeedbackVariant;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: FeedbackVariant;
  duration?: number;
}

export interface BannerOptions {
  title: string;
  description?: string;
  variant?: FeedbackVariant;
}