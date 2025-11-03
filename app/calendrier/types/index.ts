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

export type poleActivite = {
  id: number;
  name: string;
};

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
  type: 'employee' | 'interim' | 'chargeAffaire' | 'chefChantier';
  /** Pôle auquel appartient l'employé (Technique, Commercial, etc.) */
  pole?: string;
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
interface BaseEvent {
  id: number;
  label: string;
  color: string;
  borderColor: string;
  textColor: string;
  image?: string;
  defaultDescription?: string;
  category?: string;
}

export interface ChantierEvent extends BaseEvent {
  type: "chantier";
  attributs: {
    code: string;
    identifiant: string;
    poleActivite: string;
    libelle: string;
    etat: string;
    chargeAffaire: string;
    chefChantier: string;
    dateOS: string;
    dateFin: string;
    TM: string;
    HR: string;
    SH: string;
    DPF: string;
    RPF: string;
    AP: string;
    SP: string;
  };
  location?: string;
  client?: string;
}

// Interface commune pour les attributs partagés entre Absence et Autre
interface CommonPaieAttributs extends BaseEvent {
  verrou: string;
  code: string;
  actif: string;
}

export interface AbsenceEvent extends CommonPaieAttributs {
  type: "absence";
}

export interface AutreEvent extends CommonPaieAttributs {
  type: "autre";
}


export type Evenement = ChantierEvent | AbsenceEvent | AutreEvent;

export type Image = {
  id: number;
  image: string;
  name: string;
};

/**
 * Interface représentant un rendez-vous/événement dans le calendrier
 * Simplifié pour ne contenir que les attributs spécifiques à chaque instance
 * @interface Appointment
 */
export interface Appointment{
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
  /** Type de rendez-vous */
  type: 'chantier' | 'absence' | 'autre';
  /** ID de l'événement auquel ce RDV est lié */
  EventId: number;
 
}


export type DimensionType = 'employee' | 'group' | 'contract' | 'type' | 'pole';

export interface CalendarConfig {
  id: number;
  name: string;
  dimension: DimensionType; // Ce qui s'affiche dans la colonne de gauche
  filters: Filter[]; // Les filtres appliqués
  selectedRdvTypes: string[]; // Types de RDV sélectionnés (Chantier, Absence, Autre)
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