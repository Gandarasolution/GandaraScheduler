import { Appointment, Employee, Groupe } from './calendrier/types/index';


export const initialTeams: Groupe[] = [
    { name: 'Team A', id: 1, color: '#df5286' },
    { name: 'Team B', id: 2, color: '#7fa900' },
    { name: 'Team C', id: 3, color: '#ea7a57' },
    { name: 'Team D', id: 4, color: '#5978ee' }
];

export const initialEmployees: Employee[] = [
    { name: 'Nancy', id: 1, groupId: 1, contrat: 'CDI', avatarUrl: 'https://i.pravatar.cc/40?img=1' },
    { name: 'Steven', id: 2, groupId: 1, contrat: 'CDD',avatarUrl: 'https://i.pravatar.cc/40?img=2' },
    { name: 'Robert', id: 3, groupId: 2, contrat: 'Intérimaire', avatarUrl: 'https://i.pravatar.cc/40?img=3' },
    { name: 'Smith', id: 4, groupId: 2,  contrat: 'CDD' },
    { name: 'Michael', id: 5, groupId: 3, contrat: 'CDI' },
    { name: 'Root', id: 6, groupId: 3, contrat: 'CDI' },
    { name: 'Alice', id: 7, groupId: 1, contrat: 'Intérimaire'  },
    { name: 'Lucas', id: 8, groupId: 2,  contrat: 'CDD' },
    { name: 'Emma', id: 9, groupId: 4,  contrat: 'CDD' },
    { name: 'Paul', id: 10, groupId: 4, contrat: 'Intérimaire' },
    { name: 'Sophie', id: 11, groupId: 1, contrat: 'CDD'  },
    { name: 'Julien', id: 12, groupId: 2, contrat: 'Intérimaire' }
];

export const chantier = [
    { id: 1 , label: '1052 Logements Vesoul', imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 2 , label: 'Résidence Les Jardins de Paris',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 3 , label: 'Chantier Lycée Jean Moulin' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 4 , label: 'Rénovation Hôtel de Ville',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 5 , label: 'Extension Usine Renault Flins',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 6 , label: 'Construction EHPAD Les Lilas',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 7 , label: 'Réhabilitation Collège Victor Hugo' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 8 , label: 'Immeuble Le Belvédère Lyon' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 9 , label: 'Bâtiment Industriel Toulouse' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' },
    { id: 10 , label: 'Résidence Étudiante Marseille' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Chantier' }
];

export const absences = [
    { id: 1, label: 'RTT' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Absence' },
    { id: 2, label: 'Maladie',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Absence' },
    { id: 3, label: 'Congés payés',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Absence' },
    { id: 4, label: 'Sans solde',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Absence' },
    { id: 5, label: 'Autre',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Absence' }
]

export const autres = [
    { id: 1, label: 'Heures SUP',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 2, label: 'Formation',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 3, label: 'Réunion' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Autre' },
    { id: 4, label: 'Déplacement',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Autre' },
    { id: 5, label: 'Maintenance' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png', type: 'Autre' }
]

function generateAppointments(employees: Employee[]): Appointment[] {
  const baseDate = new Date(2025, 5, 24); // 24 juin 2025
  const titles = [
    chantier[0],
    absences[0],
    autres[0],
    chantier[1],
    absences[1],
    autres[1],
    autres[2],
    autres[3],
    autres[4]
  ];

  return employees.map((emp, idx) => {
    const dayOffset = idx % 7; // Un rendez-vous par jour sur une semaine
    return {
      id: idx + 1,
      title: titles[idx % titles.length].label,
      description: `Rendez-vous pour ${emp.name}`,
      startDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset, 0, 0),
      endDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset, 12, 0),
      imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png',
      employeeId: emp.id,
      type: titles[idx % titles.length].type as 'Chantier' | 'Absence' | 'Autre'
    };
  });
}


export const initialAppointments: Appointment[] = generateAppointments(initialEmployees);







export const drawerOptions = [
    { content: 'Chantier'},
    { content: 'Absences'},
    { content: 'Autres'}
]