import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

import { ModalOptions, ConfirmOptions, ToastOptions, AlertOptions, BannerOptions } from "./types";

import AppModal from "./components/AppModal";
import AppAlert from "./components/AppAlert";
import AppBanner from "./components/AppBanner";

function useHtmlTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(root.classList.contains("dark") ? "dark" : "light");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

import { onHttpError } from "@/lib/httpErrors";

import { FeedbackContext, type FeedbackContextType } from "./FeedbackContext";

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [banner, setBanner] = useState<BannerOptions | null>(null);
  const toasterTheme = useHtmlTheme();

  // 🔥 CONFIRM QUEUE
  const [confirmQueue, setConfirmQueue] = useState<
    {
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }[]
  >([]);

  const currentConfirm = confirmQueue[0];

  // Stable identities: consumers list these in hook dependency arrays.
  const openModal = useCallback((options: ModalOptions) => {
    setModal(options);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    toast[options.variant ?? "info"](options.title, {
      description: options.description,
      duration: options.duration ?? 3000,
    });
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options);
  }, []);

  const showBanner = useCallback((options: BannerOptions) => {
    setBanner(options);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmQueue((prev) => [...prev, { options, resolve }]);
    });
  }, []);

  // Global HTTP failures (offline, timeout, 5xx, 403, 429, expired session)
  // published by src/lib/http.ts. A fixed id per kind collapses a burst of
  // failing requests into a single toast instead of a stack of duplicates.
  useEffect(
    () =>
      onHttpError((event) => {
        const variant =
          event.kind === "forbidden" || event.kind === "throttled" ? "warning" : "error";
        toast[variant](event.title, {
          id: `http-${event.kind}`,
          description: event.message,
          duration: 5000,
        });
      }),
    [],
  );

  const contextValue = useMemo<FeedbackContextType>(
    () => ({ openModal, showToast, confirm, showAlert, showBanner }),
    [openModal, showToast, confirm, showAlert, showBanner],
  );

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
    <FeedbackContext.Provider value={contextValue}>
      {banner && <AppBanner {...banner} onClose={() => setBanner(null)} />}

      {children}

      {modal && <AppModal open={true} onOpenChange={() => setModal(null)} {...modal} />}

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
        theme={toasterTheme}
        toastOptions={{
          classNames: {
            toast: "bg-surface text-text border border-border shadow-overlay rounded-lg",
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
