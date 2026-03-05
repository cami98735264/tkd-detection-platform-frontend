import { Button } from "@/components/ui/button";
import { useFeedback } from "./useFeedback";

export default function FeedbackLab() {
  const {
    openModal,
    showToast,
    confirm,
    showAlert,
    showBanner,
  } = useFeedback();

  return (
    <div className="p-10 space-y-4">

      {/* TOAST */}
      <Button
        onClick={() =>
          showToast({
            title: "Guardado correctamente",
            description: "El registro fue almacenado",
            variant: "success",
          })
        }
      >
        Toast Success
      </Button>

      {/* MODAL */}
      <Button
        onClick={() =>
          openModal({
            title: "Modal informativo",
            description: "Contenido dinámico aquí",
            content: <div className="mt-4">Formulario o componente</div>,
          })
        }
      >
        Open Modal
      </Button>

      {/* ALERT FORMAL */}
      <Button
        variant="secondary"
        onClick={() =>
          showAlert({
            title: "Información importante",
            description: "Este es un mensaje informativo del sistema",
            variant: "info",
          })
        }
      >
        Show Alert
      </Button>

      {/* CONFIRM ASYNC NORMAL */}
      <Button
        variant="destructive"
        onClick={async () => {
          const confirmed = await confirm({
            title: "¿Eliminar usuario?",
            description: "Esta acción es irreversible",
          });

          if (confirmed) {
            showToast({
              title: "Usuario eliminado",
              variant: "success",
            });
          }
        }}
      >
        Confirm Async
      </Button>

      {/* TEST QUEUE DE CONFIRMACIONES */}
      <Button
        variant="outline"
        onClick={async () => {
          await confirm({ title: "Confirm 1" });
          await confirm({ title: "Confirm 2" });
          await confirm({ title: "Confirm 3" });
        }}
      >
        Test Confirm Queue
      </Button>

      {/* BANNER */}
      <Button
        onClick={() =>
          showBanner({
            title: "Mantenimiento programado",
            description: "El sistema estará inactivo esta noche",
            variant: "warning",
          })
        }
      >
        Show Banner
      </Button>

    </div>
  );
}