import { Appointment, Employee, Groupe } from './calendrier/types/index';


export const initialTeams: Groupe[] = [
    { name: 'Team A', id: 1 },
    { name: 'Team B', id: 2 },
    { name: 'Team C', id: 3 },
    { name: 'Team D', id: 4}
];

export const calendars = [
  { id: 1, name: "BOUTIQUE"},
  { id: 2, name: "CENTRELEC"},
  { id: 3, name: "CONFORT HABITAT"},
  { id: 4, name: "DIRECTION"}
];

export const initialEmployees: Employee[] = [
    { name: 'Nancy', id: 1, groupId: 1, contrat: 'CDI', avatarUrl: 'https://i.pravatar.cc/40?img=1', calendarId: 1 },
    { name: 'Steven', id: 2, groupId: 1, contrat: 'CDD',avatarUrl: 'https://i.pravatar.cc/40?img=2', calendarId: 1 },
    { name: 'Robert', id: 3, groupId: 2, contrat: 'Intérimaire', avatarUrl: 'https://i.pravatar.cc/40?img=3', calendarId: 2 },
    { name: 'Smith', id: 4, groupId: 2,  contrat: 'CDD', calendarId: 2 },
    { name: 'Michael', id: 5, groupId: 3, contrat: 'CDI', calendarId: 3 },
    { name: 'Root', id: 6, groupId: 3, contrat: 'CDI', calendarId: 3 },
    { name: 'Alice', id: 7, groupId: 1, contrat: 'Intérimaire', calendarId: 1 },
    { name: 'Lucas', id: 8, groupId: 2,  contrat: 'CDD', calendarId: 2 },
    { name: 'Emma', id: 9, groupId: 4,  contrat: 'CDD', calendarId: 4 },
    { name: 'Paul', id: 10, groupId: 4, contrat: 'Intérimaire', calendarId: 4 },
    { name: 'Sophie', id: 11, groupId: 1, contrat: 'CDD', calendarId: 1 },
    { name: 'Julien', id: 12, groupId: 2, contrat: 'Intérimaire', calendarId: 2 }
];

export const chantier = [
    { id: 1 , label: '1052 Logements Vesoul', imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 2 , label: 'Résidence Les Jardins de Paris',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 3 , label: 'Chantier Lycée Jean Moulin' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 4 , label: 'Rénovation Hôtel de Ville',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 5 , label: 'Extension Usine Renault Flins',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 6 , label: 'Construction EHPAD Les Lilas',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 7 , label: 'Réhabilitation Collège Victor Hugo' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 8 , label: 'Immeuble Le Belvédère Lyon' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 9 , label: 'Bâtiment Industriel Toulouse' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 10 , label: 'Résidence Étudiante Marseille' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'}
];

export const absences = [
    { id: 1, label: 'RTT' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 2, label: 'Maladie',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 3, label: 'Congés payés',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 4, label: 'Sans solde',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 5, label: 'Autre',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' }
]

export const autres = [
    { id: 1, label: 'Heures SUP',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 2, label: 'Formation',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png' },
    { id: 3, label: 'Réunion' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 4, label: 'Déplacement',imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'},
    { id: 5, label: 'Maintenance' ,imageUrl: 'https://cdn-icons-png.flaticon.com/512/46/46818.png'}
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
      type: 
      chantier.find(c => c.label === titles[idx % titles.length].label) ? 'Chantier' : 
      absences.find(a => a.label === titles[idx % titles.length].label) ? 'Absence' : 
      'Autre'
    };
  });
}


export const initialAppointments: Appointment[] = generateAppointments(initialEmployees);







export const drawerOptions = [
    { content: 'Chantier'},
    { content: 'Absences'},
    { content: 'Autres'}
]