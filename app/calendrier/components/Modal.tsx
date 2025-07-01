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
        <div className={`modal ${isOpen ? '' : 'hidden'}`}>
            <div className="modal-content">
                <div className="modal-header flex justify-between items-center">
                    <h2>{title}</h2>
                    <button onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;