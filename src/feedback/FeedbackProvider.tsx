import { createContext, useState } from "react";
import { Toaster, toast } from "sonner";

import {
  ModalOptions,
  ConfirmOptions,
  ToastOptions,
  AlertOptions,
  BannerOptions,
} from "./types";

import AppModal from "./components/AppModal";
import AppAlert from "./components/AppAlert";
import AppBanner from "./components/AppBanner";

interface FeedbackContextType {
  openModal: (options: ModalOptions) => void;
  showToast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => void;
  showBanner: (options: BannerOptions) => void;
}

export const FeedbackContext =
  createContext<FeedbackContextType | null>(null);

export function FeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [banner, setBanner] = useState<BannerOptions | null>(null);

  // 🔥 CONFIRM QUEUE
  const [confirmQueue, setConfirmQueue] = useState<
    {
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }[]
  >([]);

  const currentConfirm = confirmQueue[0];

  const openModal = (options: ModalOptions) => {
    setModal(options);
  };

  const showToast = (options: ToastOptions) => {
    toast[options.variant ?? "info"](options.title, {
      description: options.description,
      duration: options.duration ?? 3000,
    });
  };

  const showAlert = (options: AlertOptions) => {
    setAlert(options);
  };

  const showBanner = (options: BannerOptions) => {
    setBanner(options);
  };

  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmQueue((prev) => [...prev, { options, resolve }]);
    });
  };

  const handleConfirm = () => {
    if (!currentConfirm) return;
    currentConfirm.resolve(true);
    setConfirmQueue((prev) => prev.slice(1));
  };

  const handleCancel = () => {
    if (!currentConfirm) return;
    currentConfirm.resolve(false);
    setConfirmQueue((prev) => prev.slice(1));
  };

  return (
    <FeedbackContext.Provider
      value={{
        openModal,
        showToast,
        confirm,
        showAlert,
        showBanner,
      }}
    >
      {banner && (
        <AppBanner
          {...banner}
          onClose={() => setBanner(null)}
        />
      )}

      {children}

      {modal && (
        <AppModal
          open={true}
          onOpenChange={() => setModal(null)}
          {...modal}
        />
      )}

      {alert && (
        <AppModal
          open={true}
          onOpenChange={() => setAlert(null)}
          title={alert.title}
          description={alert.description}
        />
      )}

      {currentConfirm && (
        <AppAlert
          open={true}
          title={currentConfirm.options.title}
          description={currentConfirm.options.description}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <Toaster
        position="top-right"
        theme="system"
        toastOptions={{
          classNames: {
            toast:
              "bg-surface text-text border border-border shadow-overlay rounded-lg",
            title: "font-medium text-text",
            description: "text-muted text-sm",
            actionButton: "bg-primary text-primary-foreground",
            cancelButton: "bg-surface-2 text-text",
            success: "[&_[data-icon]]:text-success",
            error: "[&_[data-icon]]:text-error",
            warning: "[&_[data-icon]]:text-warning",
            info: "[&_[data-icon]]:text-primary",
          },
        }}
      />
    </FeedbackContext.Provider>
  );
}