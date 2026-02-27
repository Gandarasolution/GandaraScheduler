/**
 * @fileoverview Composant Modal réutilisable
 * 
 * Composant modal générique avec design harmonisé pour l'application.
 * Fournit une interface modale standard avec gestion des interactions clavier,
 * overlay cliquable et style cohérent avec le thème Gandara Scheduler.
 * 
 * Fonctionnalités :
 * - Fermeture par touche Escape
 * - Fermeture par clic sur l'overlay
 * - Bouton de fermeture optionnel
 * - Titre personnalisable
 * - Coins arrondis configurables
 * - Design responsive
 * 
 * @component Modal
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useEffect, memo, useState } from "react";

/**
 * Interface définissant les propriétés du composant Modal
 * @interface ModalProps
 */
interface ModalProps {
    /** Contrôle la visibilité de la modal */
    isOpen: boolean;
    /** Callback appelé lors de la fermeture */
    onClose: () => void;
    /** Contenu à afficher dans la modal */
    children: React.ReactNode;
    /** Affiche ou masque l'overlay (défaut: true) */
    isOverlayVisible?: boolean;
    /** Titre optionnel affiché en en-tête */
    title?: string;
    /** Masque le bouton de fermeture si true */
    whithoutCloseButton?: boolean;
    /** Taille des coins arrondis (défaut: "2xl") */
    roundedSize?: string;
    /** Classe CSS additionnelle pour le contenu */
    classNameContent?: string;
    /** Classe CSS additionnelle pour la modal */
    className?: string;
    /** Active la confirmation lors du clic sur l'overlay */
    confirmCloseOnOverlay?: boolean;
    /** Indique si des modifications non sauvegardées sont présentes (pour conditionner la confirmation) */
    hasUnsavedChanges?: boolean;
}

/**
 * Composant Modal - Fenêtre de dialogue modale centrée
 * 
 * Utilise le thème couleur #009580 pour la cohérence visuelle.
 * Gère automatiquement la fermeture par Escape et les interactions utilisateur.
 * 
 * @param {ModalProps} props - Propriétés du composant
 * @returns {JSX.Element|null} Modal ou null si fermée
 * 
 * @example
 * <Modal 
 *   isOpen={showModal} 
 *   onClose={() => setShowModal(false)}
 *   title="Nouveau rendez-vous"
 * >
 *   <AppointmentForm onSave={handleSave} />
 * </Modal>
 */
const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    children,
    isOverlayVisible = true, 
    title, 
    whithoutCloseButton = false, 
    roundedSize = "2xl",
    classNameContent = "",
    className = "",
    confirmCloseOnOverlay = false,
    hasUnsavedChanges
}) => {
    const [showConfirm, setShowConfirm] = useState(false);
    
    // ===== GESTION DES ÉVÉNEMENTS CLAVIER =====
    
    /**
     * Hook pour gérer la fermeture par touche Escape
     * Ajoute et nettoie automatiquement l'event listener
     */
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {            
            if (event.key === 'Escape') {
                if (showConfirm) return;

                const shouldConfirm = confirmCloseOnOverlay && (hasUnsavedChanges ?? true);

                if (shouldConfirm) {
                    setShowConfirm(true);
                } else {
                    onClose();
                }
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, confirmCloseOnOverlay, showConfirm, hasUnsavedChanges]);
    
    const handleOverlayClick = () => {
        const shouldConfirm = confirmCloseOnOverlay && (hasUnsavedChanges ?? true);

        if (shouldConfirm) {
            setShowConfirm(true);
        } else {
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setShowConfirm(false);
        onClose();
    };

    const handleCancelClose = () => {
        setShowConfirm(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal">
            {/* Overlay */}
            {isOverlayVisible && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-40 transition-opacity animate-fadeIn overlay" 
                    onClick={handleOverlayClick} 
                />
            )}
            
            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fadeIn">
                    {/* Overlay spécifique pour la confirmation (empêche de cliquer ailleurs) */}
                    <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px]" onClick={handleCancelClose}></div>
                    
                    <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full mx-4 animate-zoomIn relative z-10">
                        <h3 className="text-lg font-bold mb-2 text-gray-800">Fermer la fenêtre ?</h3>
                        <p className="text-gray-600 mb-6 text-sm">Vos modifications en cours pourraient être perdues.</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleCancelClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleConfirmClose}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal content */}
            <div className={`text-primary relative bg-secondary-bg rounded-${roundedSize} shadow-2xl  mx-4 p-0 animate-zoomIn border border-default z-10 modal-content ${className}`}>
                <div className="flex justify-between items-center px-4 pt-3 pb-2 modal-header">
                    <h2 className="text-xl font-bold ">{title}</h2>

                    {!whithoutCloseButton && (
                        <button
                            onClick={onClose}
                            className="cursor-pointer ml-4 p-2 rounded-full hover:bg-gray-100 focus:bg-gray-200 transition group"
                            aria-label="Fermer la fenêtre modale"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-x text-gray-500 group-hover:text-red-500 transition" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                            </svg>
                        </button>
                    )}
                </div>
                <div className={`modal-body rounded-2xl scrollbar-hide ${classNameContent}`}>
                    {children}
                </div>
            </div>
            {/* Animations (à ajouter dans votre CSS si non présentes) */}
        </div>
    );
};

export default memo(Modal);