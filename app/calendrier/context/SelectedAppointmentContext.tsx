/**
 * @fileoverview Context pour la gestion de la sélection de rendez-vous
 * 
 * Ce contexte gère l'état global de sélection des rendez-vous dans l'application.
 * Il permet de suivre quel rendez-vous est actuellement sélectionné et de
 * synchroniser cette information entre tous les composants qui en ont besoin.
 * 
 * Utilisations principales :
 * - Mise en surbrillance du rendez-vous sélectionné
 * - Affichage d'informations détaillées
 * - Actions contextuelles (édition, suppression)
 * - Coordination avec d'autres systèmes de sélection
 * 
 * @context SelectedAppointmentContext
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { createContext, useContext } from "react";
import { Appointment } from "../types";

/**
 * Interface du contexte de sélection de rendez-vous
 * @interface SelectedAppointmentContextType
 */
interface SelectedAppointmentContextType {
  /** Rendez-vous actuellement sélectionné (null si aucun) */
  selectedAppointment: Appointment | null;
  /** Fonction pour modifier la sélection */
  setSelectedAppointment: (appointment: Appointment | null) => void;
}

/**
 * Context React pour la gestion de la sélection de rendez-vous
 * Fournit l'état et les actions pour gérer la sélection globale
 */
export const SelectedAppointmentContext = createContext<SelectedAppointmentContextType>({
  selectedAppointment: null,
  setSelectedAppointment: () => {}
});

/**
 * Hook personnalisé pour utiliser le contexte de sélection de rendez-vous
 * 
 * @returns {SelectedAppointmentContextType} État et actions de sélection
 * @throws {Error} Si utilisé en dehors du provider
 * 
 * @example
 * const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
 * 
 * // Sélectionner un rendez-vous
 * setSelectedAppointment(appointment);
 * 
 * // Désélectionner
 * setSelectedAppointment(null);
 */
export const useSelectedAppointment = () => useContext(SelectedAppointmentContext);