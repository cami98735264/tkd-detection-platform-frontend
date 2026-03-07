import { createContext, useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import AppModal from "./components/AppModal";
import AppAlert from "./components/AppAlert";
import AppBanner from "./components/AppBanner";
import { useFeedbackStore } from "@/store/feedbackStore";
import { ModalOptions, ConfirmOptions, ToastOptions, AlertOptions, BannerOptions } from "./types";

interface FeedbackContextType {
  openModal: (options: ModalOptions) => void;
  showToast: (options: ToastOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showAlert: (options: AlertOptions) => void;
  showBanner: (options: BannerOptions) => void;
}

export const FeedbackContext = createContext<FeedbackContextType | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [banner, setBanner] = useState<BannerOptions | null>(null);
  const [confirmQueue, setConfirmQueue] = useState<
    { options: ConfirmOptions; resolve: (value: boolean) => void }[]
  >([]);
  const currentConfirm = confirmQueue[0];

  const event = useFeedbackStore((s) => s.event);
  const clearEvent = useFeedbackStore((s) => s.clearEvent);

  const openModal = (options: ModalOptions) => setModal(options);
  const showToast = (options: ToastOptions) =>
    toast[options.variant ?? "info"](options.title, { description: options.description, duration: options.duration ?? 3000 });
  const showAlert = (options: AlertOptions) => setAlert(options);
  const showBanner = (options: BannerOptions) => setBanner(options);
  const confirm = (options: ConfirmOptions) =>
    new Promise<boolean>((resolve) => setConfirmQueue((prev) => [...prev, { options, resolve }]));

  const handleConfirm = () => {
    currentConfirm?.resolve(true);
    setConfirmQueue((prev) => prev.slice(1));
  };

  const handleCancel = () => {
    currentConfirm?.resolve(false);
    setConfirmQueue((prev) => prev.slice(1));
  };

  useEffect(() => {
    if (!event) return;
    if (event.type === "success") showToast({ title: "Operación exitosa", description: event.message, variant: "success" });
    if (event.type === "warning") showToast({ title: "Advertencia", description: event.message, variant: "warning" });
    if (event.type === "error") showToast({ title: "Error", description: event.message, variant: "error" });
    clearEvent();
  }, [event]);

  return (
    <FeedbackContext.Provider value={{ openModal, showToast, confirm, showAlert, showBanner }}>
      {banner && <AppBanner {...banner} onClose={() => setBanner(null)} />}
      {children}
      {modal && <AppModal open onOpenChange={() => setModal(null)} {...modal} />}
      {alert && <AppModal open onOpenChange={() => setAlert(null)} title={alert.title} description={alert.description} />}
      {currentConfirm && (
        <AppAlert
          open
          title={currentConfirm.options.title}
          description={currentConfirm.options.description}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
      <Toaster richColors position="top-right" />
    </FeedbackContext.Provider>
  );
}