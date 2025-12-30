/**
 * @fileoverview Constantes globales de l'application Gandara Scheduler
 * 
 * Ce fichier centralise toutes les constantes utilisées dans l'application
 * pour faciliter la maintenance et assurer la cohérence visuelle.
 * 
 * Contenu :
 * - Dimensions de la grille calendrier
 * - Intervalles horaires configurables
 * - Palettes de couleurs
 * - Marges et espacements
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { HalfDayInterval } from "../types";

export const HOUR_MS = 3600000;
export const DAY_MS = 86400000;

// ===== DIMENSIONS DE LA GRILLE =====

/** Largeur d'une cellule de jour dans la grille (en pixels) */
export const CELL_WIDTH = 45;

/** Hauteur d'une cellule dans la grille (en pixels) */
export const CELL_HEIGHT = 40;

/** Marge entre les groupes d'employés (en pixels) */
export const MARGIN_BETWEEN_TEAMS = 20;

/** Padding vertical du header de groupe (en pixels) */
export const EMPLOYEE_GROUP_HEADER_PADDING_Y = 8;

/** Padding bas du contenu de groupe (en pixels) */
export const EMPLOYEE_GROUP_CONTENT_PADDING_BOTTOM = 8;

/** Hauteur du contenu du header (texte/icone) */
export const EMPLOYEE_GROUP_HEADER_CONTENT_HEIGHT = 24;

/** Taille bordure (en pixels) pour le container de chaque groupe */
export const EMPLOYEE_GROUP_CONTAINER_BORDER_SIZE = 1;

/** Hauteur totale du header de groupe */
export const EMPLOYEE_GROUP_HEADER_HEIGHT = EMPLOYEE_GROUP_HEADER_CONTENT_HEIGHT + (EMPLOYEE_GROUP_HEADER_PADDING_Y * 2);

/**Hauteur cellules jour */
export const TIMELINE_HEADERITEMS_CELL_HEIGHT = 50;

/**Hauteur des cellules mois */
export const TIMELINE_HEADERGROUPS_CELL_HEIGHT = 40;

/**Padding container pour la timeline/tableau des chantiers/rubrique sociale/liste employé */
export const CONTAINER_PADDING = 16;

// ===== INTERVALLES HORAIRES =====

/**
 * Configuration des intervalles demi-journée
 * Permet l'affichage matin/après-midi dans les cellules
 */
export const HALF_DAY_INTERVALS: HalfDayInterval[] = [
  { name: "morning", startHour: 0, endHour: 12},
  { name: "afternoon", startHour: 12, endHour: 24 },
];

/**
 * Configuration pour l'affichage journée complète
 * Mode par défaut pour la vue calendrier
 */
export const DAY_INTERVALS: HalfDayInterval[] = [
  { name: "day", startHour: 0, endHour: 24 },
];

// ===== PALETTE DE COULEURS TAILWIND =====

/**
 * Classes CSS Tailwind pour les couleurs de fond des rendez-vous
 * Utilisées pour la variation visuelle dans l'interface
 */
export const colors: string[] = [
  "bg-blue-400",
  "bg-emerald-400 ",
  "bg-amber-400 ",
  "bg-rose-400 ",
  "bg-purple-400",
  "bg-pink-400 ",
  "bg-gray-400",
  "bg-sky-400 ",
  "bg-orange-400 ",
  "bg-teal-400",
];

export const DAYS_TO_ADD = 30;
export const THRESHOLD_MAX = 80;
export const THRESHOLD_MIN = 20;
export const WINDOW_SIZE = 90;

// ===== CALCULS MÉTIER =====

/** Nombre d'heures par jour de travail (facilement modifiable) */
export const HOURS_PER_DAY = 8;
