import { memo, useEffect } from "react";
import Modal from "./Modal";

// Modal d'alerte réutilisable
type AlertModalProps = {
  alertState: {
    isVisible: boolean;
    title: "Êtes-vous sûr de vouloir supprimer ce rendez-vous ?" | "Êtes-vous sûr de vouloir diviser ce rendez-vous ?" | string;
    onConfirm: () => void;
    fetchToLockAppointment?: () => Promise<any>;
  };
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  fetchToLockAppointment?: () => Promise<void>;
};

const AlertModal: React.FC<AlertModalProps> = ({
  alertState,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onClose,
  fetchToLockAppointment,
}) => {

  useEffect(() => {
    if (alertState.isVisible && fetchToLockAppointment) {
      fetchToLockAppointment().catch((error) => {
        console.error("Erreur lors du verrouillage du rendez-vous :", error);
      });
    }
  }, [alertState.isVisible, fetchToLockAppointment]);

  return (
    <Modal isOpen={alertState.isVisible} onClose={onClose} title={alertState.title} className="px-4 py-4">
      <div className="w-full py-2 bg-transparent cursor-default pointer-events-auto dark:bg-gray-800 relative rounded-xl mx-auto max-w-sm">
        {message && <div className="px-6 py-2 text-gray-700 dark:text-gray-200">{message}</div>}
        <div className="grid gap-2 grid-cols-2 px-6 py-2">
          <button
            className="cursor-pointer inline-flex items-center justify-center py-1 gap-1 font-medium rounded-lg border transition-colors outline-none focus:ring-offset-2 focus:ring-2 focus:ring-inset min-h-[2.25rem] px-4 text-sm text-gray-800 bg-white border-gray-300 hover:bg-gray-50 focus:ring-primary-600 focus:text-primary-600 focus:bg-primary-50 focus:border-primary-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:hover:border-gray-500 dark:text-gray-200 dark:focus:text-primary-400 dark:focus:border-primary-400 dark:focus:bg-gray-800"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            className="cursor-pointer inline-flex items-center justify-center py-1 gap-1 font-medium rounded-lg border transition-colors outline-none focus:ring-offset-2 focus:ring-2 focus:ring-inset min-h-[2.25rem] px-4 text-sm text-white shadow focus:ring-white border-transparent bg-red-600 hover:bg-red-500 focus:bg-red-700 focus:ring-offset-red-700"
            onClick={() => {
              alertState.onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default memo(AlertModal);