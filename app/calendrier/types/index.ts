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
