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
  Id: number;
  /** Libellé du pôle d'activité (LibellePoleActivite) */
  Nom: string;
}

/**
 * Interface représentant une équipe
 * Correspond à la table Gandara_Equipe
 * @interface Equipe
 */
export interface Equipe {
  /** Identifiant unique de l'équipe (IdEquipe) */
  Id: number;
  /** Libellé de l'équipe (LibelleEquipe) */
  Nom: string;  
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

/**
 * Définition d'une étiquette
 */

export interface Tag {
  IdPlanningEtiquette: number;
  LibelleLongPlanningEtiquette: string;
  LibelleCourtPlanningEtiquette?: string; // Version courte pour les petits rendez-vous (2 jours ou moins)
}


export interface TagsManagerProps {
  /** Liste des étiquettes disponibles */
  tags: Tag[];
  /** Étiquette sélectionnée (optionnel) */
  selectedTag?: Tag;
  /** Callback pour sélection d'étiquette */
  onSelectTag?: (tag: Tag | undefined) => void;
  /** Callback pour ajout d'étiquette */
  onAddTag: (tag: Tag) => void;
  /** Callback pour suppression d'étiquette */
  onRemoveTag: (tagId: number) => void;
  /** Fonction pour vérifier si une étiquette es utilisée */
  isTagUsed?: (tagId: number) => { used: boolean; count: number };
  /** Mode d'affichage: 'compact' (liste seule) ou 'extended' (avec sélecteur) */
  variant?: 'compact' | 'extended';
  /** Titre de la section (pour mode extended) */
  title?: string;
  /** Placeholder pour la recherche/sélection */
  placeholder?: string;
}

export interface TagsManagerState {
  showCreation: boolean;
  newTag: Tag;
  duplicateError: boolean;
  longVersionError: boolean;
  deleteModal: {
    isOpen: boolean;
    tagId: number | null;
    tagName: string;
    affectedCount: number;
  };
}

export interface BaseItemCategory{
  id: number;
  name: string;
}

interface BaseItem {
  IdPlanningRessource: number;
  LibellePlanningRessource: string;
  CouleurFondPlanningRessource: string;
  CouleurBordurePlanningRessource: string;
  CouleurTextePlanningRessource: string;
  CodePlanningRessource: string;
  IdImage?: number;
  defaultDescription?: string;
  Etiquettes?: Tag[];
  isManual?: boolean;
}

export interface ChantierItem extends BaseItem {
  Type: "Projet";
  identifiant: string;
  poleActivite: string;
  libelle: string;
  etat: string;
  ChargeAffaire: string;
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
  Actif: boolean;
  category: BaseItemCategory["name"];
}

export interface AbsenceItem extends CommonPaieAttributs {
  Type: "Paie";
}

export interface AutreItem extends CommonPaieAttributs {
  Type: "Rubrique Perso";
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
  IdPlanningEvenement: number;
  /** Description spécifique du rendez-vous */
  AnnotationPlanningEvenement: string;
  /** Date et heure de début du rendez-vous */
  DebutPlanningEvenement: number;
  /** Date et heure de fin du rendez-vous */
  FinPlanningEvenement: number;
  /** ID de l'employé assigné au rendez-vous */
  IdEmploye: User["IdPersonnel"];
  /** ID de l'événement auquel ce RDV est lié */
  IdPlanningRessource: Item["IdPlanningRessource"];
  /** Étiquette sélectionnée pour ce rendez-vous (optionnel) */
  Etiquette?: Tag;
  /** Indice de priorité pour le chevauchement (nombre plus élevé = au-dessus de la pile) */
  PlanningEvenementPriorite?: number;
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
  ChampsPremierGroupePlanningVue?: GroupingLevel;
  /** Deuxième niveau de groupement */
  ChampsDeuxiemeGroupePlanningVue?: GroupingLevel;
}


export interface CalendarConfig {
  IdPlanningVue: number;
  LibellePlanningVue: string;
  /** Image associée à la vue */
  IdPlanningImage?: number;
  /** Description de la vue */
  DescriptionPlanningVue?: string;

  /** Configuration des niveaux de groupement (équipe et pole) */
  Group?: GroupingLevels;
  /** Filtres structurés par catégories */
  filterCategories?: FilterCategories;
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
  IdPersonnel: number;
  /** Nom de l'utilisateur */
  Nom: string;
  /** Prénom de l'utilisateur */
  Prenom: string;
  /** Code de contrat de l'utilisateur (ex: CDI, CDD, etc.) */
  Code?: string;
  /** Référence au pôle d'activité (relation) */
  PoleActivite?: PoleActivite;
  /** Type de l'utilisateur (employé ou intérimaire) */
  Type: 'Salarie' | 'Interim';
  /** Référence à l'équipe (relation) */
  Equipe?: Equipe;
  /** Rôle de l'utilisateur dans l'application */
  role?: UserRole;
  /** Thème préféré de l'utilisateur */
  theme?: string;
  /** Image de profil de l'utilisateur */
  IdImage?: number;
  /** Email de l'utilisateur */
  Email?: string;
  /** Statut actif de l'utilisateur (défaut: true) */
  Actif?: boolean;
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