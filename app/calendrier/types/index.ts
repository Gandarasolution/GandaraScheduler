/**
 * @fileoverview Types et interfaces TypeScript pour l'application Gandara Scheduler
 * Ce fichier contient toutes les définitions de types utilisées dans l'application
 * de gestion d'agenda timeline.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

/**
 * Interface représentant un pôle d'activité
 * Correspond à la table Gandara_PoleActivite
 * @interface PoleActivite
 */
export interface PoleActivite {
  /** Identifiant unique du pôle (IdPoleActivite) */
  id: number;
  /** Libellé du pôle d'activité (LibellePoleActivite) */
  name: string;
}

/**
 * Interface représentant une équipe
 * Correspond à la table Gandara_Equipe
 * @interface Equipe
 */
export interface Equipe {
  /** Identifiant unique de l'équipe (IdEquipe) */
  id: number;
  /** Libellé de l'équipe (LibelleEquipe) */
  name: string;  
}

/** @deprecated Utiliser Equipe à la place */
export type Groupe = Equipe;

/** @deprecated Utiliser PoleActivite à la place */
export type poleActivite = PoleActivite;



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
  shortName?: string; // Version courte pour les petits rendez-vous (2 jours ou moins)
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
  employee: User;
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
type FilterType = 'equals' | 'contains' | 'in' | 'range' | 'date_range';

/**
 * Interface représentant un filtre de recherche
 * @interface Filter
 */
export interface Filter {
  /** Champ à filtrer (ex: 'contrat', 'groupId', 'type') */
  field: string;
  /** Type de filtre à appliquer */
  type: FilterType;
  /** Valeur du filtre */
  value: any;
}

/**
 * Catégories de filtres structurées
 * @interface FilterCategories
 */
export interface FilterCategories {
  /** Filtres appliqués au personnel (pole, équipe, contrat, etc.) */
  personnel: Filter[];
  /** Filtres appliqués aux événements (chantier, social, etc.) */
  evenements: {filters: Filter[], selectedRdvTypes: string[]} | []; // Types de RDV sélectionnés (Chantier, Absence, Autre)
}

/**
 * Niveaux de groupement disponibles
 * @type GroupingLevel
 */
export type GroupingLevel = 'equipe' | 'pole';

/**
 * Configuration des niveaux de groupement
 * @interface GroupingLevels
 */
export interface GroupingLevels {
  /** Premier niveau de groupement */
  level1?: GroupingLevel;
  /** Deuxième niveau de groupement */
  level2?: GroupingLevel;
}


export interface CalendarConfig {
  id: number;
  name: string;
  /** Image associée à la vue */
  image?: Image;
  /** Description de la vue */
  description?: string;
  /** Configuration des niveaux de groupement (équipe et pole) */
  groupingLevels?: GroupingLevels;
  /** Filtres structurés par catégories */
  filterCategories?: FilterCategories;
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

/**
 * Rôles disponibles dans l'application
 * @type UserRole
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

/**
 * Permissions pour les actions sur les rubriques sociales
 * @interface SocialPermissions
 */
export interface SocialPermissions {
  /** Peut voir les rubriques sociales */
  canView: boolean;
  /** Peut créer des événements de rubriques sociales */
  canCreate: boolean;
  /** Peut éditer les événements de rubriques sociales */
  canEdit: boolean;
  /** Peut supprimer les événements de rubriques sociales */
  canDelete: boolean;
}

/**
 * Permissions pour les actions sur les chantiers
 * @interface ChantierPermissions
 */
export interface ChantierPermissions {
  /** Peut voir les chantiers */
  canView: boolean;
  /** Peut créer des chantiers */
  canCreate: boolean;
  /** Peut éditer les chantiers */
  canEdit: boolean;
  /** Peut supprimer les chantiers */
  canDelete: boolean;
}

/**
 * Structure complète des permissions utilisateur
 * @interface UserPermissions
 */
export interface UserPermissions {
  /** Permissions sur les rubriques sociales */
  social: SocialPermissions;
  /** Permissions sur les chantiers */
  chantier: ChantierPermissions;
  /** Peut voir tous les calendriers */
  canViewAllCalendars: boolean;
  /** Peut éditer son propre calendrier */
  canEditOwnCalendar: boolean;
  /** Peut éditer tous les calendriers */
  canEditAllCalendars: boolean;
  /** Peut accéder à la vue rubrique sociale (paie) */
  canAccessSocialView: boolean;
  /** Peut accéder à la vue événements manuels */
  canAccessManualEventsView: boolean;
}

/**
 * Interface représentant un utilisateur
 * Correspond à la table Gandara_Utilisateur
 * @interface User
 */
export interface User{
  /** Identifiant unique de l'utilisateur (IdPersonnel) */
  id: number;
  /** Nom de l'utilisateur */
  nom: string;
  /** Prénom de l'utilisateur */
  prenom: string;
  /** Code de contrat de l'utilisateur (ex: CDI, CDD, etc.) */
  code?: string;
  /** Référence au pôle d'activité (relation) */
  poleActivite?: PoleActivite;
  /** Type de l'utilisateur (employé ou intérimaire) */
  type: 'employee' | 'interim';
  /** Référence à l'équipe (relation) */
  equipe?: Equipe;
  /** Rôle de l'utilisateur dans l'application */
  role?: UserRole;
  /** Thème préféré de l'utilisateur */
  theme?: string;
  /** Image de profil de l'utilisateur */
  image?: Image;
  /** Email de l'utilisateur */
  email?: string;
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

/**
 * Permissions spécifiques pour une rubrique sociale par employé
 * @interface SocialItemPermission
 */
export interface SocialItemPermission {
  /** ID de l'employé */
  userId: number;
  /** ID de la rubrique sociale (absence ou autre) */
  itemId: number;
  /** L'employé peut voir cette rubrique */
  canView: boolean;
  /** L'employé peut créer des entrées pour cette rubrique */
  canCreate: boolean;
  /** L'employé peut modifier des entrées pour cette rubrique */
  canEdit: boolean;
  /** L'employé peut supprimer des entrées pour cette rubrique */
  canDelete: boolean;
}