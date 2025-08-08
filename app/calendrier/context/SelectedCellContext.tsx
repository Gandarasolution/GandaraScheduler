/**
 * @fileoverview Context pour la gestion de la sélection de cellules
 * 
 * Ce contexte gère l'état global de sélection des cellules dans la grille calendrier.
 * Il permet de suivre quelle cellule (intersection employé/date) est actuellement
 * sélectionnée et de coordonner les actions qui en dépendent.
 * 
 * Utilisations principales :
 * - Création de nouveaux rendez-vous par clic sur cellule
 * - Mise en surbrillance de la cellule active
 * - Navigation clavier dans la grille
 * - Actions contextuelles sur les créneaux libres
 * - Coordination avec le système de drag & drop
 * 
 * @context SelectedCellContext
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { createContext, useContext } from "react";

/**
 * Interface représentant une cellule sélectionnée dans la grille
 * @interface SelectedCell
 */
interface SelectedCell {
  /** ID de l'employé concerné */
  employeeId: number;
  /** Date de la cellule */
  date: Date;
}

/**
 * Interface du contexte de sélection de cellules
 * @interface SelectedCellContextType
 */
interface SelectedCellContextType {
  /** Cellule actuellement sélectionnée (null si aucune) */
  selectedCell: SelectedCell | null;
  /** Fonction pour modifier la sélection de cellule */
  setSelectedCell: (cell: SelectedCell | null) => void;
}

/**
 * Context React pour la gestion de la sélection de cellules
 * Fournit l'état et les actions pour gérer la sélection dans la grille
 */
export const SelectedCellContext = createContext<SelectedCellContextType>({
  selectedCell: null,
  setSelectedCell: () => {}
});

/**
 * Hook personnalisé pour utiliser le contexte de sélection de cellules
 * 
 * @returns {SelectedCellContextType} État et actions de sélection de cellules
 * @throws {Error} Si utilisé en dehors du provider
 * 
 * @example
 * const { selectedCell, setSelectedCell } = useSelectedCell();
 * 
 * // Sélectionner une cellule
 * setSelectedCell({ employeeId: 1, date: new Date() });
 * 
 * // Désélectionner
 * setSelectedCell(null);
 */
export const useSelectedCell = () => useContext(SelectedCellContext);