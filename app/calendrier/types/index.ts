/**
 * @fileoverview Types et interfaces TypeScript pour l'application Gandara Scheduler
 * Ce fichier contient toutes les définitions de types utilisées dans l'application
 * de gestion d'agenda timeline.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

/**
 * Interface représentant un groupe/équipe d'employés
 * @interface Groupe
 */
export interface Groupe {
  /** Identifiant unique du groupe */
  id: number;
  /** Nom d'affichage du groupe */
  name: string;  
}

/**
 * Interface représentant un employé de l'entreprise
 * @interface Employee
 */
export interface Employee {
  /** Identifiant unique de l'employé */
  id: number;
  /** Nom complet de l'employé */
  name: string;
  /** URL de l'avatar de l'employé (optionnel) */
  avatar?: string;
  /** ID de l'équipe à laquelle appartient l'employé (optionnel) */
  groupId?: number;
  /** Type de contrat de l'employé */
  type: 'employee' | 'interim';
  /** Pôle auquel appartient l'employé (Technique, Commercial, etc.) */
  pole: string;
}

/**
 * Interface représentant un type d'événement/modèle de rendez-vous
 * Cette interface contient les attributs communs partagés par tous les RDV du même type
 * @interface EventType
 */
export interface EventType {
  /** Identifiant unique du type d'événement */
  id: number;
  /** Nom du type d'événement */
  name: string;
  /** Libellé affiché dans les formulaires et listes */
  label: string;
  /** Catégorie du type d'événement */
  category: "Chantier" | "Absence" | "Autre";
  /** URL de l'icône associée au type d'événement */
  image: string;
  /** Couleur de fond pour tous les RDV de ce type (format hex) */
  color: string;
  /** Couleur de bordure pour tous les RDV de ce type (format hex) */
  borderColor: string;
  /** Couleur du texte pour tous les RDV de ce type (format hex) */
  textColor: string;
  /** Description par défaut pour ce type d'événement (optionnel) */
  defaultDescription?: string;
}

/**
 * Interface représentant un rendez-vous/événement dans le calendrier
 * Simplifié pour ne contenir que les attributs spécifiques à chaque instance
 * @interface Appointment
 */
export interface Appointment {
  /** Identifiant unique du rendez-vous */
  id: number;
  /** Description spécifique du rendez-vous */
  description: string;
  /** Date et heure de début du rendez-vous */
  startDate: Date;
  /** Date et heure de fin du rendez-vous */
  endDate: Date;
  /** ID de l'employé assigné au rendez-vous */
  employeeId: number | string;
  /** ID du type d'événement auquel ce RDV est lié */
  eventTypeId: number;
}

/**
 * Interface représentant un intervalle de demi-journée
 * @interface HalfDayInterval
 */
export interface HalfDayInterval {
  /** Nom de l'intervalle (matin, après-midi ou journée complète) */
  name: 'morning' | 'afternoon' | 'day';
  /** Heure de début de l'intervalle */
  startHour: number;
  /** Heure de fin de l'intervalle */
  endHour: number;
}

/**
 * Interface représentant un calendrier
 * @interface Calendar
 */
export interface Calendar {
  /** Identifiant unique du calendrier */
  id: number;
  /** Nom du calendrier */
  name: string;
  /** Couleur associée au calendrier (optionnel) */
  color?: string;
}

/**
 * Types disponibles pour le système de filtres
 * @type FilterType
 */
export type FilterType = 'equals' | 'contains' | 'in' | 'range' | 'date_range';

/**
 * Interface représentant un filtre de recherche
 * @interface Filter
 */
export interface Filter {
  /** Identifiant unique du filtre */
  id: string;
  /** Champ à filtrer (ex: 'contrat', 'groupId', 'type') */
  field: string;
  /** Type de filtre à appliquer */
  type: FilterType;
  /** Valeur du filtre */
  value: any;
  /** Libellé affiché à l'utilisateur */
  label: string;
}

/**
 * Interface représentant un projet de chantier
 * @interface Chantier
 */
export interface Chantier {
  /** Identifiant unique du chantier */
  id: number;
  /** Libellé descriptif du chantier */
  label: string;
  /** URL de l'icône du chantier */
  image: string;
}

/**
 * Interface représentant un type d'absence
 * @interface Absence
 */
export interface Absence {
  /** Identifiant unique du type d'absence */
  id: number;
  /** Libellé descriptif de l'absence */
  label: string;
  /** URL de l'icône de l'absence */
  image: string;
}

/**
 * Interface représentant un autre type d'événement
 * @interface Autre
 */
export interface Autre {
  /** Identifiant unique de l'événement */
  id: number;
  /** Libellé descriptif de l'événement */
  label: string;
  image: string;
}

export type DimensionType = 'employee' | 'group' | 'contract' | 'type' | 'pole';

export interface CalendarConfig {
  id: number;
  name: string;
  dimension: DimensionType; // Ce qui s'affiche dans la colonne de gauche
  filters: Filter[]; // Les filtres appliqués
  color?: string;
}

// Interface pour les éléments de la dimension (ce qui s'affiche en colonne)
export interface DimensionItem {
  id: string | number;
  name: string;
  avatar?: string;
  groupId?: number;
  data?: any; // Données additionnelles spécifiques à la dimension
}

// --- HISTORIQUE POUR CTRL+Z ---
export interface HistoryAction {
  type: 'create' | 'update' | 'delete' | 'move' | 'resize_split';
  timestamp: number;
  appointment?: Appointment;
  previousAppointment?: Appointment; // Pour les updates et moves
  appointments?: Appointment[]; // Pour une sauvegarde complète
  createdAppointments?: Appointment[]; // Pour les RDV créés lors d'un resize split
} 


export interface EventTemplate {
  id: number;
  label: string;
  image: string;
}