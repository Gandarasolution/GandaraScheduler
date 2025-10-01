/**
 * @fileoverview Hook personnalisé pour la gestion de l'historique des modifications (Undo/Redo)
 * 
 * Ce hook centralise la logique d'historique :
 * - Sauvegarde automatique des actions
 * - Fonction d'annulation (Ctrl+Z)
 * - Limitation de la taille de l'historique
 * - Types d'actions : create, update, delete, move, resize_split
 * 
 * @hook useAppointmentHistory
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useRef, useCallback } from 'react';
import { Appointment, HistoryAction } from '../types';

export interface AppointmentHistoryState {
  saveAppointmentState: (
    appointment: Appointment | null,
    type: 'create' | 'update' | 'delete' | 'move' | 'resize_split',
    previousAppointment?: Appointment,
    createdAppointments?: Appointment[]
  ) => void;
  undoLastAction: () => void;
  canUndo: boolean;
}

/**
 * Hook pour la gestion de l'historique des modifications d'appointments
 * @param appointments - Ref vers la liste des rendez-vous
 * @param onUpdate - Callback appelé après une modification pour mettre à jour l'affichage
 * @param onNotification - Callback pour les notifications
 * @param maxHistorySize - Taille maximale de l'historique (défaut: 50)
 * @returns État et fonctions de gestion de l'historique
 */
export const useAppointmentHistory = (
  appointments: React.MutableRefObject<Appointment[]>,
  onUpdate: () => void,
  onNotification?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void,
  maxHistorySize: number = 50
): AppointmentHistoryState => {
  const history = useRef<HistoryAction[]>([]);
  const timestampCounter = useRef(1000); // Compteur pour les timestamps stables
  const isInitializing = useRef(true); // Flag pour éviter d'enregistrer les actions lors de l'initialisation

  // Marquer la fin de l'initialisation après le premier rendu
  const markInitializationComplete = useCallback(() => {
    isInitializing.current = false;
  }, []);

  // Ajouter une action à l'historique
  const addToHistory = useCallback((action: HistoryAction) => {
    history.current.push(action);
    // Limiter la taille de l'historique
    if (history.current.length > maxHistorySize) {
      history.current.shift();
    }
  }, [maxHistorySize]);

  // Sauvegarder l'état d'un rendez-vous pour l'historique
  const saveAppointmentState = useCallback((
    appointment: Appointment | null,
    type: 'create' | 'update' | 'delete' | 'move' | 'resize_split',
    previousAppointment?: Appointment,
    createdAppointments?: Appointment[]
  ) => {
    if (!appointment || isInitializing.current) return; // Ne pas enregistrer pendant l'initialisation
        
    addToHistory({
      type,
      timestamp: ++timestampCounter.current, // Timestamp stable et croissant
      appointment: { ...appointment },
      previousAppointment: previousAppointment ? { ...previousAppointment } : undefined,
      createdAppointments: createdAppointments ? createdAppointments.map(app => ({ ...app })) : undefined,
      appointments: appointments.current.map(app => ({ ...app })) // Sauvegarde complète pour sécurité
    });
  }, [addToHistory, appointments]);

  // Annuler la dernière action
  const undoLastAction = useCallback(() => {
    if (history.current.length === 0) {
      onNotification?.('warning', 'Aucune action', 'Aucune action à annuler');
      return;
    }

    const lastAction = history.current.pop();
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'create':
        // Supprimer le rendez-vous créé
        if (lastAction.appointment) {
          appointments.current = appointments.current.filter(app => app.id !== lastAction.appointment!.id);
          onNotification?.('success', 'Annulation', 'Création annulée');
        }
        break;

      case 'delete':
        // Restaurer le rendez-vous supprimé
        if (lastAction.appointment) {
          appointments.current = [...appointments.current, lastAction.appointment];
          onNotification?.('success', 'Annulation', 'Suppression annulée');
        }
        break;

      case 'update':
        // Restaurer l'état précédent
        if (lastAction.previousAppointment && lastAction.appointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.appointment!.id ? lastAction.previousAppointment! : app
          );
          onNotification?.('success', 'Annulation', 'Modification annulée');
        }
        break;

      case 'move':
        // Restaurer la position précédente
        if (lastAction.previousAppointment && lastAction.appointment) {
          appointments.current = appointments.current.map(app =>
            app.id === lastAction.appointment!.id ? lastAction.previousAppointment! : app
          );
          onNotification?.('success', 'Annulation', 'Déplacement annulé');
        }
        break;

      case 'resize_split':
        // Cas complexe : restaurer l'état complet précédent
        if (lastAction.appointments) {
          appointments.current = [...lastAction.appointments];
          onNotification?.('success', 'Annulation', 'Division/redimensionnement annulé');
        }
        break;
    }

    // Forcer la mise à jour de l'affichage
    setTimeout(() => {
      onUpdate();
    }, 0);
  }, [appointments, onUpdate, onNotification]);

  const canUndo = history.current.length > 0;

  // Exposer la fonction pour marquer la fin de l'initialisation
  return {
    saveAppointmentState,
    undoLastAction,
    canUndo,
    markInitializationComplete
  } as AppointmentHistoryState & { markInitializationComplete: () => void };
};