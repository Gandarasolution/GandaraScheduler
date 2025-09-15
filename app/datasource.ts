/**
 * @fileoverview Source de données pour l'application Gandara Scheduler
 * 
 * Ce fichier contient toutes les données d'échantillon utilisées pour populer
 * l'application calendrier. Il génère automatiquement des rendez-vous réalistes
 * pour tester et démontrer les fonctionnalités de l'application.
 * 
 * Contenu :
 * - 35 employés répartis en 8 équipes
 * - 20 projets de chantiers variés
 * - 12 types d'absences
 * - 15 autres événements (réunions, formations...)
 * - 28 icônes catégorisées
 * - Génération automatique de rendez-vous avec logique métier
 * 
 * Fonctionnalités de génération :
 * - Évite les créations de RDV le week-end
 * - Durées adaptées selon le type d'événement
 * - Projets d'équipe collaboratifs
 * - Distribution géographique réaliste
 * - Couleurs et icônes appropriées
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { Appointment, Employee, Groupe, EventTemplate } from './calendrier/types/index';

// ===== IMPORT DES ICÔNES =====

// Icônes principales pour les types d'événements
import iconeChantier from './calendrier/image/Icones/Evenement_Chantier.svg'
import iconeAbsenceValide from './calendrier/image/Icones/Evenement_Congés_Valide.svg'
import iconeAbsenceNonValide from './calendrier/image/Icones/Evenement_Congés_Non_Valide.svg'

// Bibliothèque d'icônes spécialisées (28 icônes métiers)
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

// ===== CONFIGURATION DES ÉQUIPES =====

/**
 * Configuration des équipes de l'entreprise
 * Structure organisationnelle en 8 équipes dirigées par des chefs d'équipe
 */
export const initialTeams: Groupe[] = [
    { name: 'Equipe Grégory', id: 1 },    // Équipe technique principale
    { name: 'Equipe Alexandre', id: 2 },  // Équipe technique secondaire
    { name: 'Equipe Lucas', id: 3 },      // Équipe commerciale
    { name: 'Equipe Romain', id: 4},      // Équipe commerciale terrain
    { name: 'Equipe Marine', id: 5},      // Équipe technique spécialisée
    { name: 'Equipe Pierre', id: 6},      // Équipe commerciale développement
    { name: 'Equipe Sylvie', id: 7},      // Équipe administrative
    { name: 'Equipe Thomas', id: 8}       // Équipe technique innovation
];

// ===== EMPLOYÉS DE L'ENTREPRISE =====

/**
 * Base de données des employés (35 au total)
 * Répartition par pôles :
 * - Technique : 15 employés (ingénieurs, techniciens, chefs de chantier)
 * - Commercial : 8 employés (commerciaux terrain, développeurs affaires)
 * - Administrative : 6 employés (gestionnaires, comptables, assistants)
 * - RH : 5 employés (recrutement, formation, gestion sociale)
 * - Statuts : CDI et Intérim pour flexibilité
 */
export const initialEmployees: Employee[] = [
    // ===== ÉQUIPE TECHNIQUE (15 employés) =====
    // Spécialisés dans les travaux de construction, rénovation et maintenance
    { name: 'Grégory ANDRE', id: 1, groupId: 1, type: 'employee', avatar: 'https://i.pravatar.cc/40?img=1', pole: 'Technique'},
    { name: 'Alexandre BARRET', id: 2, groupId: 1, type: 'employee', avatar: 'https://i.pravatar.cc/40?img=2', pole: 'Technique'},
    { name: 'Eric MALIVERNAY', id: 7, groupId: 1, type: 'interim', pole: 'Technique'},
    { name: 'Sophie MARTIN', id: 11, groupId: 1, type: 'employee', pole: 'Technique'},
    { name: 'Antoine DUBOIS', id: 13, groupId: 1, type: 'interim', pole: 'Technique'},
    { name: 'Marie LEROY', id: 14, groupId: 1, type: 'employee', pole: 'Technique'},
    { name: 'Vincent MOREAU', id: 15, groupId: 1, type: 'employee', pole: 'Technique'},
    { name: 'Céline GARCIA', id: 16, groupId: 1, type: 'interim', pole: 'Technique'},
    
    // Équipe Commercial
    { name: 'Lucas BOURKIN', id: 3, groupId: 2, type: 'interim', avatar: 'https://i.pravatar.cc/40?img=3', pole: 'Commercial'},
    { name: 'Romain ZERR', id: 4, groupId: 2,  type: 'employee', pole: 'Commercial'},
    { name: 'Lucas BERNARD', id: 8, groupId: 2,  type: 'employee', pole: 'Commercial'},
    { name: 'Julien PETIT', id: 12, groupId: 2, type: 'interim', pole: 'Commercial'},
    { name: 'Nathalie ROBERT', id: 17, groupId: 2, type: 'employee', pole: 'Commercial'},
    { name: 'David RICHARD', id: 18, groupId: 2, type: 'employee', pole: 'Commercial'},
    { name: 'Isabelle DURAND', id: 19, groupId: 2, type: 'interim', pole: 'Commercial'},
    { name: 'Stéphane LEFEBVRE', id: 20, groupId: 2, type: 'employee', pole: 'Commercial'},
    
    // Équipe Administrative
    { name: 'Fabrice DACHAUD', id: 5, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Sébastien GERMAIN', id: 6, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Caroline SIMON', id: 21, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Philippe MICHEL', id: 22, groupId: 3, type: 'interim', pole: 'Administrative'},
    { name: 'Valérie LAURENT', id: 23, groupId: 3, type: 'employee', pole: 'Administrative'},
    { name: 'Patrick LEFRANC', id: 24, groupId: 3, type: 'employee', pole: 'Administrative'},
    
    // Équipe RH
    { name: 'Emma ROUSSEAU', id: 9, groupId: 4,  type: 'employee', pole: 'RH'},
    { name: 'Paul VINCENT', id: 10, groupId: 4, type: 'interim', pole: 'RH'},
    { name: 'Sandrine THOMAS', id: 25, groupId: 4, type: 'employee', pole: 'RH'},
    { name: 'Christophe BONNET', id: 26, groupId: 4, type: 'employee', pole: 'RH'},
    { name: 'Sylvie FRANCOIS', id: 27, groupId: 4, type: 'interim', pole: 'RH'},
    
    // Nouvelles équipes
    { name: 'Marine GIRARD', id: 28, groupId: 5, type: 'employee', pole: 'Technique'},
    { name: 'Pierre ANDRE', id: 29, groupId: 6, type: 'employee', pole: 'Commercial'},
    { name: 'Sylvie NICOLAS', id: 30, groupId: 7, type: 'employee', pole: 'Administrative'},
    { name: 'Thomas MOREL', id: 31, groupId: 8, type: 'employee', pole: 'Technique'},
    { name: 'Julie FOURNIER', id: 32, groupId: 5, type: 'interim', pole: 'Technique'},
    { name: 'Olivier MORETTI', id: 33, groupId: 6, type: 'employee', pole: 'Commercial'},
    { name: 'Patricia ROUSSEL', id: 34, groupId: 7, type: 'employee', pole: 'Administrative'},
    { name: 'Frédéric GERARD', id: 35, groupId: 8, type: 'interim', pole: 'Technique'}
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
    { id: 10 , label: 'Résidence Étudiante Marseille' , image: iconeChantier.src},
    { id: 11 , label: 'Villa Moderne Cannes', image: iconeChantier.src},
    { id: 12 , label: 'Centre Commercial Avignon', image: iconeChantier.src},
    { id: 13 , label: 'Piscine Municipale Nice', image: iconeChantier.src},
    { id: 14 , label: 'Rénovation Théâtre Antique', image: iconeChantier.src},
    { id: 15 , label: 'Parking Souterrain Montpellier', image: iconeChantier.src},
    { id: 16 , label: 'Bureaux Tech Park Sophia', image: iconeChantier.src},
    { id: 17 , label: 'Clinique Sainte-Marie Toulon', image: iconeChantier.src},
    { id: 18 , label: 'Stade Municipal Perpignan', image: iconeChantier.src},
    { id: 19 , label: 'Médiathèque Nîmes Centre', image: iconeChantier.src},
    { id: 20 , label: 'Hôtel 4 étoiles Saint-Tropez', image: iconeChantier.src}
];

export const absences: EventTemplate[] = [
    { id: 1, label: 'RTT' , image: iconeAbsenceValide.src },
    { id: 2, label: 'Maladie', image: iconeAbsenceValide.src },
    { id: 3, label: 'Congés payés', image: iconeAbsenceValide.src },
    { id: 4, label: 'Sans solde', image: iconeAbsenceNonValide.src },
    { id: 5, label: 'Autre', image: iconeAbsenceNonValide.src },
    { id: 6, label: 'Congé maternité', image: iconeAbsenceValide.src },
    { id: 7, label: 'Congé paternité', image: iconeAbsenceValide.src },
    { id: 8, label: 'Formation obligatoire', image: iconeAbsenceValide.src },
    { id: 9, label: 'Visite médicale', image: iconeAbsenceValide.src },
    { id: 10, label: 'Accident travail', image: iconeAbsenceValide.src },
    { id: 11, label: 'Congé exceptionnel', image: iconeAbsenceValide.src },
    { id: 12, label: 'Récupération heures', image: iconeAbsenceValide.src }
];

export const autres: EventTemplate[] = [
    { id: 1, label: 'Heures SUP',image: iconeChantier.src },
    { id: 2, label: 'Formation',image: iconeChantier.src },
    { id: 3, label: 'Réunion' ,image: iconeChantier.src},
    { id: 4, label: 'Déplacement',image: iconeChantier.src},
    { id: 5, label: 'Maintenance' ,image: iconeChantier.src},
    { id: 6, label: 'Rendez-vous client',image: iconeChantier.src},
    { id: 7, label: 'Devis sur site',image: iconeChantier.src},
    { id: 8, label: 'Livraison matériel',image: iconeChantier.src},
    { id: 9, label: 'Contrôle qualité',image: iconeChantier.src},
    { id: 10, label: 'Audit sécurité',image: iconeChantier.src},
    { id: 11, label: 'Prospection',image: iconeChantier.src},
    { id: 12, label: 'Documentation',image: iconeChantier.src},
    { id: 13, label: 'Coordination équipes',image: iconeChantier.src},
    { id: 14, label: 'Présentation projet',image: iconeChantier.src},
    { id: 15, label: 'Réception travaux',image: iconeChantier.src}
];

// ===== PALETTE DE COULEURS =====

/**
 * Palette de 10 couleurs avec noms français pour les rendez-vous
 * Couleurs optimisées pour le contraste et l'accessibilité
 */
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

// ===== GÉNÉRATEUR DE RENDEZ-VOUS =====

/**
 * Générateur de rendez-vous sans superposition
 * Garantit qu'aucun rendez-vous ne se chevauche pour chaque employé
 * @param employees - Liste des employés à planifier
 * @returns Tableau de rendez-vous générés
 */
function generateAppointments(employees: Employee[]): Appointment[] {
  const appointments: Appointment[] = [];
  let appointmentId = 1;
  const baseDate = new Date();
  

  // Fonction utilitaire pour obtenir une date de semaine aléatoire
  const getRandomWeekDate = (baseDate: Date, maxDays: number): Date => {
    let randomDate: Date;
    do {
      const randomDays = Math.floor(Math.random() * maxDays);
      randomDate = new Date(baseDate);
      randomDate.setDate(baseDate.getDate() + randomDays);
    } while (randomDate.getDay() === 0 || randomDate.getDay() === 6); // Éviter week-ends
    return randomDate;
  };

  // Fonction pour vérifier si deux périodes se chevauchent
  const isOverlapping = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return !(end1 < start2 || start1 > end2);
  };

  // Générer des rendez-vous pour chaque employé
  employees.forEach((employee) => {
    const employeeAppointments: { start: Date; end: Date }[] = [];
    
    // Chaque employé aura 2 à 4 rendez-vous
    const numberOfAppointments = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numberOfAppointments; i++) {
      let attempts = 0;
      let isValid = false;
      let startDate: Date = new Date();
      let endDate: Date = new Date();
      let eventTemplate: any = chantier[0]; // Valeur par défaut
      let type: "Chantier" | "Absence" | "Autre" = 'Chantier';
      let duration: number = 1;
      
      // Essayer de trouver un créneau libre jusqu'à 100 tentatives
      while (!isValid && attempts < 100) {
        attempts++;
        
        // Choisir le type d'événement
        const rand = Math.random();
        if (rand < 0.6) { // 60% chantiers
          eventTemplate = chantier[Math.floor(Math.random() * chantier.length)];
          type = 'Chantier';
          duration = Math.floor(Math.random() * 3) + 3; // 3 à 5 jours
        } else if (rand < 0.8) { // 20% absences
          eventTemplate = absences[Math.floor(Math.random() * absences.length)];
          type = 'Absence';
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
        } else { // 20% autres
          eventTemplate = autres[Math.floor(Math.random() * autres.length)];
          type = 'Autre';
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
        }
        
        // Générer date de début aléatoire (dans les 60 prochains jours)
        startDate = getRandomWeekDate(baseDate, 60);
        startDate.setHours(0, 0, 0, 0);
        
        // Calculer date de fin
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + duration - 1);
        endDate.setHours(23, 59, 59, 999);
        
        // Ajuster si ça tombe sur un week-end
        while (endDate.getDay() === 0 || endDate.getDay() === 6) {
          endDate.setDate(endDate.getDate() - 1);
        }
        
        // Vérifier qu'il n'y a pas de chevauchement avec les rendez-vous existants de cet employé
        isValid = !employeeAppointments.some(existing => 
          isOverlapping(startDate, endDate, existing.start, existing.end)
        );
      }
      
      // Si on a trouvé un créneau valide, créer le rendez-vous
      if (isValid) {
        employeeAppointments.push({ start: new Date(startDate), end: new Date(endDate) });
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        appointments.push({
          id: appointmentId++,
          title: eventTemplate.label,
          libelle: eventTemplate.label,
          description: `${type} de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`,
          startDate: startDate,
          endDate: endDate,
          image: eventTemplate.image,
          employeeId: employee.id,
          type: type,
          color: color.color,
          borderColor: color.color,
          textColor: '#FFFFFF'
        });
      }
    }
  });
  
  return appointments;
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