import { Appointment, Employee, Groupe } from './calendrier/types/index';
import iconeChantier from './calendrier/image/Icones/Evenement_Chantier.svg'
import iconeAbsenceValide from './calendrier/image/Icones/Evenement_Congés_Valide.svg'
import iconeAbsenceNonValide from './calendrier/image/Icones/Evenement_Congés_Non_Valide.svg'

export const initialTeams: Groupe[] = [
    { name: 'Team A', id: 1 },
    { name: 'Team B', id: 2 },
    { name: 'Team C', id: 3 },
    { name: 'Team D', id: 4}
];


export const initialEmployees: Employee[] = [
    { name: 'Nancy', id: 1, groupId: 1, contrat: 'CDI', avatar: 'https://i.pravatar.cc/40?img=1', pole: 'Technique'},
    { name: 'Steven', id: 2, groupId: 1, contrat: 'CDD',avatar: 'https://i.pravatar.cc/40?img=2', pole: 'Technique'},
    { name: 'Robert', id: 3, groupId: 2, contrat: 'Intérimaire', avatar: 'https://i.pravatar.cc/40?img=3', pole: 'Commercial'},
    { name: 'Smith', id: 4, groupId: 2,  contrat: 'CDD', pole: 'Commercial'},
    { name: 'Michael', id: 5, groupId: 3, contrat: 'CDI', pole: 'Administrative'},
    { name: 'Root', id: 6, groupId: 3, contrat: 'CDI', pole: 'Administrative'},
    { name: 'Alice', id: 7, groupId: 1, contrat: 'Intérimaire', pole: 'Technique'},
    { name: 'Lucas', id: 8, groupId: 2,  contrat: 'CDD', pole: 'Commercial'},
    { name: 'Emma', id: 9, groupId: 4,  contrat: 'CDD', pole: 'RH'},
    { name: 'Paul', id: 10, groupId: 4, contrat: 'Intérimaire', pole: 'RH'},
    { name: 'Sophie', id: 11, groupId: 1, contrat: 'CDD', pole: 'Technique'},
    { name: 'Julien', id: 12, groupId: 2, contrat: 'Intérimaire', pole: 'Commercial'}
];

export const chantier = [
    { id: 1 , label: '1052 Logements Vesoul', image: iconeChantier.src },
    { id: 2 , label: 'Résidence Les Jardins de Paris', image: iconeChantier.src},
    { id: 3 , label: 'Chantier Lycée Jean Moulin' , image: iconeChantier.src},
    { id: 4 , label: 'Rénovation Hôtel de Ville', image: iconeChantier.src},
    { id: 5 , label: 'Extension Usine Renault Flins', image: iconeChantier.src},
    { id: 6 , label: 'Construction EHPAD Les Lilas', image: iconeChantier.src},
    { id: 7 , label: 'Réhabilitation Collège Victor Hugo' , image: iconeChantier.src},
    { id: 8 , label: 'Immeuble Le Belvédère Lyon' , image: iconeChantier.src},
    { id: 9 , label: 'Bâtiment Industriel Toulouse' , image: iconeChantier.src},
    { id: 10 , label: 'Résidence Étudiante Marseille' , image: iconeChantier.src}
];

export const absences = [
    { id: 1, label: 'RTT' , image: iconeAbsenceValide.src },
    { id: 2, label: 'Maladie', image: iconeAbsenceValide.src },
    { id: 3, label: 'Congés payés', image: iconeAbsenceValide.src },
    { id: 4, label: 'Sans solde', image: iconeAbsenceNonValide.src },
    { id: 5, label: 'Autre', image: iconeAbsenceNonValide.src }
]

export const autres = [
    { id: 1, label: 'Heures SUP',image: iconeChantier.src },
    { id: 2, label: 'Formation',image: iconeChantier.src },
    { id: 3, label: 'Réunion' ,image: iconeChantier.src},
    { id: 4, label: 'Déplacement',image: iconeChantier.src},
    { id: 5, label: 'Maintenance' ,image: iconeChantier.src}
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
      libelle: titles[idx % titles.length].label,
      description: `Rendez-vous pour ${emp.name}`,
      startDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset, 0, 0),
      endDate: new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset, 12, 0),
      image: titles[idx % titles.length].image,
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