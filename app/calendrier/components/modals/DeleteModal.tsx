/**
 * @fileoverview Composant DeleteModal - Modal de confirmation de suppression générique et réutilisable
 * 
 * Ce composant permet de gérer différents scénarios de suppression avec des configurations personnalisables :
 * - Suppression simple avec confirmation
 * - Suppression avec avertissement (élément utilisé/lié)
 * - Suppression avec option alternative (désactivation)
 * 
 * @component DeleteModal
 * @author Gandara Solutions
 * @version 1.0.0
 */

"use client";
import React, { memo } from 'react';
import Modal from './Modal';

/**
 * Configuration pour un bouton d'action
 */
export interface ActionButton {
  /** Libellé du bouton */
  label: string;
  /** Callback à exécuter lors du clic */
  onClick: () => void;
  /** Style du bouton: 'primary' (rouge), 'secondary' (orange), 'cancel' (gris) */
  variant: 'primary' | 'secondary' | 'cancel';
  /** Icône SVG (path d seulement) */
  icon?: string;
  /** Demander une confirmation supplémentaire via window.confirm */
  requiresConfirm?: boolean;
  /** Message de confirmation si requiresConfirm est true */
  confirmMessage?: string;
}

/**
 * Configuration pour un message d'information/avertissement
 */
export interface InfoMessage {
  /** Texte du message */
  text: string;
  /** Style: 'info' (bleu), 'warning' (orange), 'error' (rouge) */
  type: 'info' | 'warning' | 'error';
}

/**
 * Configuration d'un scénario de suppression
 */
export interface DeleteScenario {
  /** Titre principal du scénario */
  title: string;
  /** Description principale */
  description: string | React.ReactNode;
  /** Description secondaire (optionnelle, en italique) */
  secondaryDescription?: string;
  /** Couleur de l'icône: 'red', 'orange', 'gray', 'blue' */
  iconColor: 'red' | 'orange' | 'gray' | 'blue';
  /** Type d'icône: 'trash', 'warning', 'info' */
  iconType: 'trash' | 'warning' | 'info';
  /** Messages d'information/avertissement additionnels */
  infoMessages?: InfoMessage[];
  /** Boutons d'action pour ce scénario */
  actions: ActionButton[];
}

/**
 * Props du composant DeleteModal
 */
export interface DeleteModalProps {
  /** Indique si la modal est ouverte */
  isOpen: boolean;
  /** Callback appelé lors de la fermeture de la modal */
  onClose: () => void;
  /** Titre de la modal */
  title: string;
  /** Scénario de suppression à afficher */
  scenario: DeleteScenario;
  /** Largeur de la modal en pixels (défaut: 400) */
  width?: number;
  /** Taille des coins arrondis (défaut: "2xl") */
  roundedSize?: string;
}

/**
 * Composant DeleteModal - Modal de confirmation de suppression générique
 * 
 * Permet de créer des modals de confirmation personnalisées pour tout type de suppression.
 * 
 * @example
 * // Suppression simple
 * <DeleteModal
 *   isOpen={true}
 *   onClose={handleClose}
 *   title="Supprimer l'élément"
 *   scenario={{
 *     title: "Confirmer la suppression",
 *     description: "Voulez-vous vraiment supprimer cet élément ?",
 *     iconColor: "red",
 *     iconType: "trash",
 *     actions: [
 *       { label: "Supprimer", onClick: handleDelete, variant: "primary" },
 *       { label: "Annuler", onClick: handleClose, variant: "cancel" }
 *     ]
 *   }}
 * />
 * 
 * @example
 * // Suppression avec avertissement et option alternative
 * <DeleteModal
 *   isOpen={true}
 *   onClose={handleClose}
 *   title="Supprimer la rubrique"
 *   scenario={{
 *     title: "Élément utilisé",
 *     description: "Cet élément est actuellement utilisé.",
 *     iconColor: "orange",
 *     iconType: "warning",
 *     infoMessages: [
 *       { text: "💡 Recommandation : Désactivez plutôt que supprimer.", type: "info" }
 *     ],
 *     actions: [
 *       { label: "Désactiver", onClick: handleDeactivate, variant: "secondary" },
 *       { label: "Supprimer tout", onClick: handleForceDelete, variant: "primary", requiresConfirm: true },
 *       { label: "Annuler", onClick: handleClose, variant: "cancel" }
 *     ]
 *   }}
 * />
 */
const DeleteModal: React.FC<DeleteModalProps> = memo(({ 
  isOpen, 
  onClose, 
  title, 
  scenario,
  width = 400,
  roundedSize = "2xl"
}) => {
  // Mapping des couleurs d'icône
  const iconColorClasses = {
    red: 'text-red-500',
    orange: 'text-orange-500',
    gray: 'text-gray-500',
    blue: 'text-blue-500'
  };

  // Mapping des icônes SVG
  const icons = {
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    warning: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  };

  // Mapping des styles de messages info
  const infoMessageStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  // Mapping des styles de boutons
  const buttonStyles = {
    primary: 'bg-red-500 text-white hover:bg-red-600',
    secondary: 'bg-orange-500 text-white hover:bg-orange-600',
    cancel: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
  };

  // Icônes pour les boutons
  const buttonIcons = {
    trash: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    pause: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
  };

  const handleActionClick = (action: ActionButton) => {
    if (action.requiresConfirm && action.confirmMessage) {
      if (window.confirm(action.confirmMessage)) {
        action.onClick();
      }
    } else {
      action.onClick();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      roundedSize={roundedSize}
      classNameContent="px-6 py-4"
    >
      <div className="flex flex-col gap-6 poppins" style={{ width: `${width}px` }}>
        {/* En-tête avec icône et titre */}
        <div className="flex items-start gap-3">
          <svg 
            className={`w-6 h-6 ${iconColorClasses[scenario.iconColor]} flex-shrink-0 mt-0.5`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={icons[scenario.iconType]}
            />
          </svg>
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-gray-800">
              {scenario.title}
            </p>
            <div className="text-sm text-gray-600">
              {scenario.description}
            </div>
            {scenario.secondaryDescription && (
              <p className="text-xs text-gray-500 italic">
                {scenario.secondaryDescription}
              </p>
            )}
          </div>
        </div>

        {/* Messages d'information additionnels */}
        {scenario.infoMessages && scenario.infoMessages.map((message, index) => (
          <div 
            key={index}
            className={`border rounded-xl p-4 ${infoMessageStyles[message.type]}`}
          >
            <p className="text-sm">
              {message.text}
            </p>
          </div>
        ))}

        {/* Boutons d'action */}
        <div className={`flex ${scenario.actions.length > 2 ? 'flex-col' : 'flex-row'} gap-3`}>
          {scenario.actions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`
                ${scenario.actions.length > 2 ? 'w-full' : 'flex-1'} 
                px-4 py-3 rounded-xl transition-colors font-medium
                flex items-center justify-center gap-2
                ${buttonStyles[action.variant]}
              `}
            >
              {action.icon && (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              )}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
});

DeleteModal.displayName = 'DeleteModal';

export default DeleteModal;