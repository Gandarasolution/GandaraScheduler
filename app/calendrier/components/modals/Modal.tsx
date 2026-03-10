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

import { useEffect, memo, useState, createContext, useContext } from "react";

/**
 * Contexte pour permettre aux composants enfants de demander la fermeture du modal
 */
interface ModalContextType {
    /** 
     * Gère la fermeture du modal avec confirmation et sauvegarde automatique
     * - Si pas de modifications ou pas de confirmation requise : ferme directement
     * - Sinon : demande "Voulez-vous sauvegarder ?"
     *   - Oui : appelle onSave puis ferme
     *   - Non : ferme sans sauvegarder
     *   - Annuler : ne fait rien
     */
    handleCloseWithSave: () => Promise<void>;
    /** 
     * Permet aux composants enfants d'enregistrer leur propre gestionnaire de sauvegarde
     * Ce gestionnaire sera appelé lorsque l'utilisateur confirme vouloir sauvegarder
     */
    registerSaveHandler: (handler: (() => void | Promise<void>) | null) => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

/**
 * Hook pour accéder au contexte Modal depuis les composants enfants
 * Utilisation simplifiée : appelez handleCloseWithSave() sur un bouton "Fermer"
 * La logique de confirmation et sauvegarde est gérée automatiquement
 */
export const useModalContext = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModalContext must be used within Modal');
    }
    return context;
};

/**
 * Interface définissant les propriétés du composant Modal
 * @interface ModalProps
 */
interface ModalProps {
    /** Contrôle la visibilité de la modal */
    isOpen: boolean;
    /** Callback appelé lors de la fermeture */
    onClose: () => void;
    /** Callback appelé pour sauvegarder les modifications (si l'utilisateur choisit "Oui") */
    onSave?: () => void | Promise<void>;
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
    /** Active la confirmation lors de la fermeture (Escape, overlay, boutons) */
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
    onSave,
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
    const [childSaveHandler, setChildSaveHandler] = useState<(() => void | Promise<void>) | null>(null);
    
    /**
     * Permet aux composants enfants d'enregistrer leur gestionnaire de sauvegarde
     */
    const registerSaveHandler = (handler: (() => void | Promise<void>) | null) => {
        setChildSaveHandler(() => handler);
    };
    
    /**
     * Fonction centralisée pour gérer la fermeture avec sauvegarde
     * Gère automatiquement : confirmation, sauvegarde, fermeture
     */
    const handleCloseWithSave = async () => {
        if (showConfirm) return;

        const shouldConfirm = confirmCloseOnOverlay && (hasUnsavedChanges ?? true);

        if (!shouldConfirm) {
            // Pas de confirmation nécessaire, ferme directement
            onClose();
            return;
        }

        // Afficher la confirmation
        setShowConfirm(true);
    };
    
    // ===== GESTION DES ÉVÉNEMENTS CLAVIER =====
    
    /**
     * Hook pour gérer la fermeture par touche Escape
     * Ajoute et nettoie automatiquement l'event listener
     */
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {            
            if (event.key === 'Escape') {
                handleCloseWithSave();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose, confirmCloseOnOverlay, showConfirm, hasUnsavedChanges]);
    
    const handleOverlayClick = () => {
        handleCloseWithSave();
    };

    /**
     * L'utilisateur a choisi "Oui" - Sauvegarder
     */
    const handleSaveAndClose = async () => {
        setShowConfirm(false);
        
        // Priorité 1: Utiliser le gestionnaire de sauvegarde enregistré par le composant enfant
        // Priorité 2: Utiliser la prop onSave du Modal (pour compatibilité avec repeat/extend)
        const saveHandler = childSaveHandler || onSave;
        
        if (saveHandler) {
            try {
                await saveHandler();
            } catch (error) {
                console.error('Erreur lors de la sauvegarde:', error);
                // La modal reste ouverte en cas d'erreur
                return;
            }
        }
        
        // Fermer la modal après sauvegarde
        onClose();
    };

    /**
     * L'utilisateur a choisi "Non" - Fermer sans sauvegarder
     */
    const handleCloseWithoutSaving = () => {
        setShowConfirm(false);
        onClose();
    };

    /**
     * L'utilisateur a annulé - Ne rien faire
     */
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
                        <div className="absolute top-3 right-3 cursor-pointer">
                            <button onClick={handleCancelClose}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" className="bi bi-x text-gray-500 group-hover:text-red-500 transition" viewBox="0 0 16 16">
                                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                                </svg>
                            </button>
                        </div>
                        <h3 className="text-lg font-bold mb-2 text-gray-800">Sauvegarder les modifications ?</h3>
                        <p className="text-gray-600 mb-6 text-sm">Voulez-vous sauvegarder vos modifications avant de fermer ?</p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={handleCloseWithoutSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                            >
                                Non
                            </button>
                            <button 
                                onClick={handleSaveAndClose}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#009580] hover:bg-[#008070] rounded-lg transition-colors shadow-sm"
                            >
                                Oui
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
                            onClick={handleCloseWithSave}
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
                    <ModalContext.Provider value={{ handleCloseWithSave, registerSaveHandler }}>
                        {children}
                    </ModalContext.Provider>
                </div>
            </div>
            {/* Animations (à ajouter dans votre CSS si non présentes) */}
        </div>
    );
};

export default memo(Modal);