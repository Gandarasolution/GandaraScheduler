import { useEffect } from "react";

/**
 * Props du composant Modal
 * Affiche une fenêtre modale avec un titre, un bouton de fermeture et du contenu.
 * Se ferme avec la touche Escape ou le bouton.
 */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
}

/**
 * Composant Modal
 * Affiche une boîte de dialogue modale centrée à l'écran.
 */
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal">
            {/* Overlay */}
            <div className="fixed inset-0 bg-black bg-opacity-40 transition-opacity animate-fadeIn overlay" onClick={onClose} />
            {/* Modal content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-0 animate-zoomIn border border-gray-200 z-10 modal-content">
                <div className="flex justify-between items-center px-6 pt-6 pb-2 border-b border-gray-100 modal-header">
                    <h2 className="text-xl font-bold text-blue-700">{title}</h2>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 rounded-full hover:bg-gray-100 focus:bg-gray-200 transition group"
                        aria-label="Fermer la fenêtre modale"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-x text-gray-500 group-hover:text-red-500 transition" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                        </svg>
                    </button>
                </div>
                <div className="px-6 py-6 max-h-[80vh] overflow-y-auto  modal-body rounded-2xl scrollbar-hide">
                    {children}
                </div>
            </div>
            {/* Animations (à ajouter dans votre CSS si non présentes) */}
        </div>
    );
};

export default Modal;