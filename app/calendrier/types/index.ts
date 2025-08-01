export interface Groupe {
  id: number;
  name: string;  
}

export interface Employee {
  id: number; // ID unique de l'employé
  name: string;
  avatar?: string;
  groupId?: number; // Ajout de l'ID de l'équipe
  contrat: 'CDI' | 'CDD' | 'Intérimaire'; // Type de contrat
  pole: string; // Pôle auquel appartient l'employé
}

export interface Appointment {
  id: number;
  title: string;
  libelle?: string; // Libellé de l'événement affiché à l'écran
  description: string;
  startDate: Date;
  endDate: Date;
  image?: string;
  employeeId: number | string; // Lien vers l'employé
  type: "Chantier" | "Absence" | "Autre"; // Type de rendez-vous
}

export interface HalfDayInterval {
  name: 'morning' | 'afternoon' | 'day'; // Nom de l'intervalle
  startHour: number;
  endHour: number;
}

export interface Calendar {
  id: number;
  name: string;
  color?: string;
  // Tu peux ajouter d'autres propriétés (propriétaire, droits, etc.)
}

// Types pour le système de filtres
export type FilterType = 'equals' | 'contains' | 'in' | 'range' | 'date_range';

export interface Filter {
  id: string;
  field: string; // Le champ à filtrer (ex: 'contrat', 'groupId', 'type')
  type: FilterType;
  value: any; // La valeur du filtre
  label: string; // Libellé affiché à l'utilisateur
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
