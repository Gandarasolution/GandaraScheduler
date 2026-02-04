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
  /** Prénom de l'employé */
  firstName: string;
  /** Code unique de l'employé */
  code: string;
  /** URL de l'avatar de l'employé (optionnel) */
  image?: Image;
  /** ID de l'équipe à laquelle appartient l'employé (optionnel) */
  group?: Groupe;
  /** Type de contrat de l'employé */
  type: 'employee' | 'interim';
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

export interface Tags {
  id: number;
  name: string;
}

export interface BaseItemCategory{
  id: number;
  name: string;
}

interface BaseItem {
  id: number;
  label: string;
  color: string;
  borderColor: string;
  textColor: string;
  code: string;
  image?: Image;
  defaultDescription?: string;
  tags?: Tags[];
  isManual?: boolean;
}

export interface ChantierItem extends BaseItem {
  type: "chantier";
  identifiant: string;
  poleActivite: string;
  libelle: string;
  etat: string;
  chargeAffaire: string;
  chefChantier: string;
  dateOS: string;
  dateFin: string;
  TM: number;
  HR: number;
  SH: number;
  DPF: number;
  RPF: number;
  AP: number;
  SP: number;
}

// Interface commune pour les attributs partagés entre Absence et Autre
export interface CommonPaieAttributs extends BaseItem {
  verrou: boolean;
  actif: boolean;
  category: BaseItemCategory["name"];

}

export interface AbsenceItem extends CommonPaieAttributs {
  type: "absence";
}

export interface AutreItem extends CommonPaieAttributs {
  type: "autre";
}

export type SocialItem = AbsenceItem | AutreItem;
export type Item = ChantierItem | SocialItem;

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
  startDate: number;
  /** Date et heure de fin du rendez-vous */
  endDate: number;
  /** ID de l'employé assigné au rendez-vous */
  employeeId: number;
  /** Type de rendez-vous */
  type: 'chantier' | 'absence' | 'autre';
  /** ID de l'événement auquel ce RDV est lié */
  EventId: number;
  /** Étiquette sélectionnée pour ce rendez-vous (optionnel) */
  tag?: Tags;
  /** Indice de priorité pour le chevauchement (nombre plus élevé = au-dessus de la pile) */
  priority?: number;
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

export interface User{
  id: number;
  name: string;
  role: 'admin' | 'user';
  theme: string;
  image?: string;
  employeeId?: number | null; // ID de l'employé associé (si existe)
  email?: string; // Email de l'utilisateur
}


export interface MockNotification {
  id: string;
  userId: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}