import { Appointment, Employee, Groupe, EventTemplate } from './calendrier/types/index';
import iconeChantier from './calendrier/image/Icones/Evenement_Chantier.svg'
import iconeAbsenceValide from './calendrier/image/Icones/Evenement_Congés_Valide.svg'
import iconeAbsenceNonValide from './calendrier/image/Icones/Evenement_Congés_Non_Valide.svg'

// Import des icônes de la bibliothèque d'événements
import brushPaint from './calendrier/image/Icones/Evenement_Bibliotheque/brush paint.svg'
import caliper from './calendrier/image/Icones/Evenement_Bibliotheque/caliper.svg'
import faucet from './calendrier/image/Icones/Evenement_Bibliotheque/faucet.svg'
import googleEyeProtector from './calendrier/image/Icones/Evenement_Bibliotheque/google eye protector.svg'
import mechanic from './calendrier/image/Icones/Evenement_Bibliotheque/Mechanic.svg'
import paint from './calendrier/image/Icones/Evenement_Bibliotheque/Paint.svg'
import parquet from './calendrier/image/Icones/Evenement_Bibliotheque/parquet.svg'
import pliers from './calendrier/image/Icones/Evenement_Bibliotheque/Pliers.svg'
import plumbing from './calendrier/image/Icones/Evenement_Bibliotheque/Plumbing.svg'
import roboticArm from './calendrier/image/Icones/Evenement_Bibliotheque/Robotic arm.svg'
import rollPaint from './calendrier/image/Icones/Evenement_Bibliotheque/roll paint.svg'
import saw from './calendrier/image/Icones/Evenement_Bibliotheque/Saw.svg'
import screw from './calendrier/image/Icones/Evenement_Bibliotheque/Screw.svg'
import shovel from './calendrier/image/Icones/Evenement_Bibliotheque/Shovel.svg'
import steamroller from './calendrier/image/Icones/Evenement_Bibliotheque/Steamroller.svg'
import toolbox from './calendrier/image/Icones/Evenement_Bibliotheque/Toolbox.svg'
import trowel from './calendrier/image/Icones/Evenement_Bibliotheque/Trowel.svg'
import truck from './calendrier/image/Icones/Evenement_Bibliotheque/Truck.svg'
import underConstructionSign from './calendrier/image/Icones/Evenement_Bibliotheque/Under construction sign.svg'
import vestProtect from './calendrier/image/Icones/Evenement_Bibliotheque/Vest protect.svg'
import wallBrick from './calendrier/image/Icones/Evenement_Bibliotheque/Wall brick.svg'
import wheelbarrow from './calendrier/image/Icones/Evenement_Bibliotheque/Wheelbarrow.svg'
import woodenLogging from './calendrier/image/Icones/Evenement_Bibliotheque/Wooden logging.svg'
import wrenchPipe from './calendrier/image/Icones/Evenement_Bibliotheque/wrench pipe.svg'
import wrench from './calendrier/image/Icones/Evenement_Bibliotheque/wrench.svg'

export const initialTeams: Groupe[] = [
    { name: 'Equipe Grégory', id: 1 },
    { name: 'Equipe Alexandre', id: 2 },
    { name: 'Equipe Lucas', id: 3 },
    { name: 'Equipe Romain', id: 4}
];


export const initialEmployees: Employee[] = [
    { name: 'Grégory ANDRE', id: 1, groupId: 1, type: 'employee', avatar: 'https://i.pravatar.cc/40?img=1', pole: 'Technique'},
    { name: 'Alexandre BARRET', id: 2, groupId: 1, type: 'employee', avatar: 'https://i.pravatar.cc/40?img=2', pole: 'Technique'},
    { name: 'Lucas BOURKIN', id: 3, groupId: 2, type: 'interim', avatar: 'https://i.pravatar.cc/40?img=3', pole: 'Commercial'},
    { name: 'Romain ZERR', id: 4, groupId: 2,  type: 'employee', pole: 'Commercial'},
    { name: 'Fabrice DACHAUD', id: 5, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Sébastien GERMAIN', id: 6, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Eric MALIVERNAY', id: 7, groupId: 1, type: 'interim', pole: 'Technique'},
    { name: 'Lucas', id: 8, groupId: 2,  type: 'employee', pole: 'Commercial'},
    { name: 'Emma', id: 9, groupId: 4,  type: 'employee', pole: 'RH'},
    { name: 'Paul', id: 10, groupId: 4, type: 'interim', pole: 'RH'},
    { name: 'Sophie', id: 11, groupId: 1, type: 'employee', pole: 'Technique'},
    { name: 'Julien', id: 12, groupId: 2, type: 'interim', pole: 'Commercial'}
];

export const chantier: EventTemplate[] = [
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

export const absences: EventTemplate[] = [
    { id: 1, label: 'RTT' , image: iconeAbsenceValide.src },
    { id: 2, label: 'Maladie', image: iconeAbsenceValide.src },
    { id: 3, label: 'Congés payés', image: iconeAbsenceValide.src },
    { id: 4, label: 'Sans solde', image: iconeAbsenceNonValide.src },
    { id: 5, label: 'Autre', image: iconeAbsenceNonValide.src }
]

export const autres: EventTemplate[] = [
    { id: 1, label: 'Heures SUP',image: iconeChantier.src },
    { id: 2, label: 'Formation',image: iconeChantier.src },
    { id: 3, label: 'Réunion' ,image: iconeChantier.src},
    { id: 4, label: 'Déplacement',image: iconeChantier.src},
    { id: 5, label: 'Maintenance' ,image: iconeChantier.src}
]


export const colors: { color: string, name: string }[] = [
  { color: "#3953aaff", name: "Bleu" },
  { color: "#059669", name: "Vert" },
  { color: "#ffab2a", name: "Orange" },
  { color: "#C026D3", name: "Violet" },
  { color: "#6B21A8", name: "Indigo" },
  { color: "#EC4899", name: "Rose" },
  { color: "#f75151", name: "Rouge" },
  { color: "#0EA5E9", name: "Cyan" },
  { color: "#F97316", name: "Orange foncé" },
  { color: "#34D399", name: "Lime" },
];

function generateAppointments(employees: Employee[]): Appointment[] {
  const baseDate = new Date(2025, 7, 6); // 6 août 2025 (aujourd'hui)
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

  // Durées possibles en jours
  const durations = [2, 3, 4];

  return employees.map((emp, idx) => {
    const dayOffset = idx % 14; // Étalement sur 2 semaines pour éviter trop de superposition
    const duration = durations[idx % durations.length]; // Alternance des durées 2, 3, 4 jours

    const startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + dayOffset, 0, 0); // Commence à 0h
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration); // Ajouter la durée en jours
    endDate.setHours(0, 0); // Termine à 0h le dernier jour

    return {
      id: idx + 1,
      title: titles[idx % titles.length].label,
      libelle: titles[idx % titles.length].label,
      description: `Rendez-vous de ${duration} jours pour ${emp.name}`,
      startDate: startDate,
      endDate: endDate,
      image: titles[idx % titles.length].image,
      employeeId: emp.id,
      type: 
      chantier.find(c => c.label === titles[idx % titles.length].label) ? 'Chantier' : 
      absences.find(a => a.label === titles[idx % titles.length].label) ? 'Absence' : 
      'Autre',
      color: colors[idx % colors.length].color, // Assigner une couleur unique à chaque rendez-vous
      textColor: '#FFFFFF' // Couleur du texte (blanc)
    };
  });
}


export const initialAppointments: Appointment[] = generateAppointments(initialEmployees);







export const drawerOptions = [
    { content: 'Chantier'},
    { content: 'Absences'},
    { content: 'Autres'}
]


export const images = [
  { id: 1, name: 'Pinceau peinture', image: brushPaint.src, category: 'Peinture' },
  { id: 2, name: 'Compas', image: caliper.src, category: 'Mesure' },
  { id: 3, name: 'Robinet', image: faucet.src, category: 'Plomberie' },
  { id: 4, name: 'Lunettes de protection', image: googleEyeProtector.src, category: 'Sécurité' },
  { id: 5, name: 'Mécanicien', image: mechanic.src, category: 'Métier' },
  { id: 6, name: 'Peinture', image: paint.src, category: 'Peinture' },
  { id: 7, name: 'Parquet', image: parquet.src, category: 'Revêtement' },
  { id: 8, name: 'Pinces', image: pliers.src, category: 'Outils' },
  { id: 9, name: 'Plomberie', image: plumbing.src, category: 'Plomberie' },
  { id: 10, name: 'Bras robotique', image: roboticArm.src, category: 'Technologie' },
  { id: 11, name: 'Rouleau peinture', image: rollPaint.src, category: 'Peinture' },
  { id: 12, name: 'Scie', image: saw.src, category: 'Outils' },
  { id: 13, name: 'Vis', image: screw.src, category: 'Fixation' },
  { id: 14, name: 'Pelle', image: shovel.src, category: 'Terrassement' },
  { id: 15, name: 'Rouleau compresseur', image: steamroller.src, category: 'Engins' },
  { id: 16, name: 'Boîte à outils', image: toolbox.src, category: 'Outils' },
  { id: 17, name: 'Truelle', image: trowel.src, category: 'Maçonnerie' },
  { id: 18, name: 'Camion', image: truck.src, category: 'Transport' },
  { id: 19, name: 'Panneau chantier', image: underConstructionSign.src, category: 'Signalisation' },
  { id: 20, name: 'Gilet de sécurité', image: vestProtect.src, category: 'Sécurité' },
  { id: 21, name: 'Mur en briques', image: wallBrick.src, category: 'Maçonnerie' },
  { id: 22, name: 'Brouette', image: wheelbarrow.src, category: 'Transport' },
  { id: 23, name: 'Bois/Sciage', image: woodenLogging.src, category: 'Bois' },
  { id: 24, name: 'Clé à pipe', image: wrenchPipe.src, category: 'Plomberie' },
  { id: 25, name: 'Clé', image: wrench.src, category: 'Outils' },
  { id: 26, name: 'Icone Chantier', image: iconeChantier.src, category: 'Chantier' },
  { id: 27, name: 'Icone Absence', image: iconeAbsenceValide.src, category: 'Absence' },
  { id: 28, name: 'Icone Absence Non Validée', image: iconeAbsenceNonValide.src, category: 'Autre' }
]