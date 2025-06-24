export interface Groupe {
  id: number;
  name: string;
  color: string; // Couleur de l'équipe
  
}

export interface Employee {
  id: number; // ID unique de l'employé
  name: string;
  avatarUrl?: string;
  groupId: number; // Ajout de l'ID de l'équipe
  contrat: 'CDI' | 'CDD' | 'Intérimaire'; // Type de contrat
}

export interface Appointment {
  id: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  imageUrl?: string;
  employeeId: number | string; // Lien vers l'employé
}

export interface HalfDayInterval {
  name: 'morning' | 'afternoon';
  startHour: number;
  endHour: number;
}