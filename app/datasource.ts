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


import { Appointment, Employee, Groupe, Item, Image, poleActivite, AbsenceItem} from './calendrier/types/index';

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
import iconesAbsences from './calendrier/image/Icones/Paie/Absence.svg';
import iconesRepas from './calendrier/image/Icones/Paie/Repas.svg';
import iconesPrime from './calendrier/image/Icones/Paie/Prime.svg';
import iconesHeurSup from './calendrier/image/Icones/Paie/HeuresSupplementaires.svg';
import iconesCongesPayes from './calendrier/image/Icones/Paie/CongesPayes.svg';
import iconesSalaire from './calendrier/image/Icones/Paie/Salaire.svg';

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

const PA: poleActivite[] = [
  { id: 1, name: 'Technique' },
  { id: 2, name: 'Commercial' },
  { id: 3, name: 'Administrative' },
  { id: 4, name: 'RH' },
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
const initialEmployees = [
    // ===== ÉQUIPE TECHNIQUE (15 employés) =====
    // Spécialisés dans les travaux de construction, rénovation et maintenance
    { name: 'ANDRE', firstName: 'Grégory', id: 1, groupId: 1, type: 'employee', image: 35, pole: 'Technique', code: 'EMP-001'},
    { name: 'BARRET', firstName: 'Alexandre', id: 2, groupId: 1, type: 'employee', image: 36, pole: 'Technique', code: 'EMP-002'},
    { name: 'MALIVERNAY', firstName: 'Eric', id: 7, groupId: 1, type: 'interim', pole: 'Technique', code: 'EMP-007'},
    { name: 'MARTIN', firstName: 'Sophie', id: 11, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-011'},
    { name: 'DUBOIS', firstName: 'Antoine', id: 13, groupId: 1, type: 'interim', pole: 'Technique', code: 'EMP-013'},
    { name: 'LEROY', firstName: 'Marie', id: 14, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-014'},
    { name: 'MOREAU', firstName: 'Vincent', id: 15, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-015'},
    { name: 'GARCIA', firstName: 'Céline', id: 16, groupId: 1, type: 'interim', pole: 'Technique', code: 'EMP-016'},
    
    // Équipe Commercial
    { name: 'BOURDIN', firstName: 'Lucas', id: 3, groupId: 2, type: 'interim', image: 37, pole: 'Commercial', code: 'EMP-003'},
    { name: 'ZERR', firstName: 'Romain', id: 4, groupId: 2,  type: 'employee', pole: 'Commercial' , code: 'EMP-004'},
    { name: 'BERNARD', firstName: 'Lucas', id: 8, groupId: 2,  type: 'employee', pole: 'Commercial' , code: 'EMP-008'},
    { name: 'PETIT', firstName: 'Julien', id: 12, groupId: 2, type: 'interim', pole: 'Commercial' , code: 'EMP-012'},
    { name: 'ROBERT', firstName: 'Nathalie', id: 17, groupId: 2, type: 'employee', pole: 'Commercial' , code: 'EMP-017'},
    { name: 'RICHARD', firstName: 'David', id: 18, groupId: 2, type: 'employee', pole: 'Commercial' , code: 'EMP-018'},
    { name: 'DURAND', firstName: 'Isabelle', id: 19, groupId: 2, type: 'interim', pole: 'Commercial' , code: 'EMP-019'},
    { name: 'LEFEBVRE', firstName: 'Stéphane', id: 20, groupId: 2, type: 'employee', pole: 'Commercial' , code: 'EMP-020'},
    
    // Équipe Administrative
    { name: 'DACHAUD', firstName: 'Fabrice', id: 5, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-005' },
    { name: 'GERMAIN', firstName: 'Sébastien', id: 6, groupId: 3, type: 'employee', pole: 'Administrative' , code: 'EMP-006'},
    { name: 'SIMON', firstName: 'Caroline', id: 21, groupId: 3, type: 'employee', pole: 'Administrative' , code: 'EMP-021'},
    { name: 'MICHEL', firstName: 'Philippe', id: 22, groupId: 3, type: 'interim', pole: 'Administrative' , code: 'EMP-022'},
    { name: 'LAURENT', firstName: 'Valérie', id: 23, groupId: 3, type: 'employee', pole: 'Administrative' , code: 'EMP-023'},
    { name: 'LEFRANC', firstName: 'Patrick', id: 24, groupId: 3, type: 'employee', pole: 'Administrative'   , code: 'EMP-024'},
    
    // Équipe RH
    { name: 'ROUSSEAU', firstName: 'Emma', id: 9, groupId: 4,  type: 'employee', pole: 'RH', code: 'EMP-009'},
    { name: 'VINCENT', firstName: 'Paul', id: 10, groupId: 4, type: 'interim', pole: 'RH' , code: 'EMP-010'},
    { name: 'THOMAS', firstName: 'Sandrine', id: 25, groupId: 4, type: 'employee', pole: 'RH' , code: 'EMP-025'},
    { name: 'BONNET', firstName: 'Christophe', id: 26, groupId: 4, type: 'employee', pole: 'RH' , code: 'EMP-026'},
    { name: 'FRANCOIS', firstName: 'Sylvie', id: 27, groupId: 4, type: 'interim', pole: 'RH' , code: 'EMP-027'},
    
    // Nouvelles équipes
    { name: 'GIRARD', firstName: 'Marine', id: 28, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-028'},
    { name: 'ANDRE', firstName: 'Pierre', id: 29, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-029'},
    { name: 'NICOLAS', firstName: 'Sylvie', id: 30, groupId: 7, type: 'employee', pole: 'Administrative' , code: 'EMP-030'},
    { name: 'MOREL', firstName: 'Thomas', id: 31, groupId: 8, type: 'employee', pole: 'Technique' , code: 'EMP-031'},
    { name: 'FOURNIER', firstName: 'Julie', id: 32, groupId: 5, type: 'interim', pole: 'Technique' , code: 'EMP-032'},
    { name: 'MORETTI', firstName: 'Olivier', id: 33, groupId: 6, type: 'employee', pole: 'Commercial' , code: 'EMP-033'},
    { name: 'ROUSSEL', firstName: 'Patricia', id: 34, groupId: 7, type: 'employee', pole: 'Administrative' , code: 'EMP-034'},
    { name: 'GERARD', firstName: 'Frédéric', id: 35, groupId: 8, type: 'interim', pole: 'Technique' , code: 'EMP-035'},


    { name: 'GERARD', firstName: 'Frédéric', id: 44, type: 'employee', pole: 'Commercial', code: 'EMP-044'},
    { name: 'DUPONT', firstName: 'Jean', id: 36, type: 'employee', pole: 'Commercial' , code: 'EMP-036'},
    { name: 'DUBOIS', firstName: 'Marie', id: 37, type: 'employee', pole: 'Commercial', code: 'EMP-037' },
    { name: 'MOREAU', firstName: 'Luc', id: 38, type: 'employee', pole: 'Commercial' , code: 'EMP-038'},
    { name: 'LEROY', firstName: 'Sophie', id: 39, type: 'employee', pole: 'Commercial' , code: 'EMP-039'},
    { name: 'ROUSSEAU', firstName: 'Marc', id: 40, type: 'employee', pole: 'Commercial' , code: 'EMP-040'},
    { name: 'GARCIA', firstName: 'Céline', id: 41, type: 'employee', pole: 'Commercial' , code: 'EMP-041'},
    { name: 'MALIVERNAY', firstName: 'Eric', id: 42, type: 'employee', pole: 'Commercial' , code: 'EMP-042'},
    { name: 'MARTIN', firstName: 'Sophie', id: 43, type: 'employee', pole: 'Commercial' , code: 'EMP-043'},

    { name: 'FAURE', firstName: 'Julien', id: 45, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-045' },
    { name: 'BLANC', firstName: 'Benoît', id: 46, groupId: 1, type: 'interim', pole: 'Technique', code: 'EMP-046' },
    { name: 'PONT', firstName: 'Aurélie', id: 47, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-047' },
    { name: 'GUERIN', firstName: 'Lucas', id: 48, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-048' },
    { name: 'MULLER', firstName: 'Kevin', id: 49, groupId: 5, type: 'interim', pole: 'Technique', code: 'EMP-049' },
    { name: 'SCHMITT', firstName: 'Sarah', id: 50, groupId: 8, type: 'employee', pole: 'Technique', code: 'EMP-050' },
    { name: 'LEMAIRE', firstName: 'Thomas', id: 51, groupId: 8, type: 'employee', pole: 'Technique', code: 'EMP-051' },
    { name: 'ROBIN', firstName: 'Emma', id: 52, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-052' },
    { name: 'PICARD', firstName: 'Nicolas', id: 53, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-053' },
    { name: 'RIVIERE', firstName: 'Laura', id: 54, groupId: 2, type: 'employee', pole: 'Commercial', code: 'EMP-054' },
    { name: 'MARCHAND', firstName: 'Antoine', id: 55, groupId: 2, type: 'interim', pole: 'Commercial', code: 'EMP-055' },
    { name: 'DUPUIS', firstName: 'Chloé', id: 56, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-056' },
    { name: 'LAMBERT', firstName: 'Juliette', id: 57, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-057' },
    { name: 'CLEMENT', firstName: 'Julien', id: 58, groupId: 4, type: 'employee', pole: 'RH', code: 'EMP-058' },
    { name: 'GUILLAUME', firstName: 'Sophie', id: 59, groupId: 4, type: 'interim', pole: 'RH', code: 'EMP-059' },
    { name: 'LEDUC', firstName: 'Mathieu', id: 60, groupId: 4, type: 'employee', pole: 'RH', code: 'EMP-060' },
    { name: 'FERNANDEZ', firstName: 'Isabelle', id: 61, groupId: 7, type: 'employee', pole: 'Administrative', code: 'EMP-061' },
    { name: 'MARTINEZ', firstName: 'Sébastien', id: 62, groupId: 7, type: 'employee', pole: 'Administrative', code: 'EMP-062' },
    { name: 'DAVID', firstName: 'Céline', id: 63, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-063' },
    { name: 'JACQUET', firstName: 'Vincent', id: 64, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-064' },
    { name: 'LOPEZ', firstName: 'Amélie', id: 65, groupId: 8, type: 'interim', pole: 'Technique', code: 'EMP-065' },
    { name: 'FOUCAULT', firstName: 'Cédric', id: 66, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-066' },
    { name: 'MARTY', firstName: 'Aline', id: 67, groupId: 2, type: 'employee', pole: 'Commercial', code: 'EMP-067' },
    { name: 'LEBLANC', firstName: 'Bruno', id: 68, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-068' },
    { name: 'GARNIER', firstName: 'Catherine', id: 69, groupId: 4, type: 'interim', pole: 'RH', code: 'EMP-069' },
    { name: 'CARTER', firstName: 'David', id: 70, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-070' },
    { name: 'WILLIAMS', firstName: 'Laura', id: 71, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-071' },
    { name: 'JONES', firstName: 'Kevin', id: 72, groupId: 7, type: 'employee', pole: 'Administrative', code: 'EMP-072' },
    { name: 'BROWN', firstName: 'Sophie', id: 73, groupId: 8, type: 'interim', pole: 'Technique', code: 'EMP-073' },
    { name: 'DAVIS', firstName: 'Thomas', id: 74, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-074' },
    { name: 'MILLER', firstName: 'Emma', id: 75, groupId: 2, type: 'employee', pole: 'Commercial', code: 'EMP-075' },
    { name: 'WILSON', firstName: 'Lucas', id: 76, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-076' },
    { name: 'MOORE', firstName: 'Chloé', id: 77, groupId: 4, type: 'interim', pole: 'RH', code: 'EMP-077' },
    { name: 'TAYLOR', firstName: 'Antoine', id: 78, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-078' },
    { name: 'ANDERSON', firstName: 'Julie', id: 79, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-079' },
    { name: 'THOMAS', firstName: 'Nicolas', id: 80, groupId: 7, type: 'employee', pole: 'Administrative', code: 'EMP-080' },
    { name: 'JACKSON', firstName: 'Isabelle', id: 81, groupId: 8, type: 'interim', pole: 'Technique', code: 'EMP-081' },
    { name: 'WHITE', firstName: 'David', id: 82, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-082' },
    { name: 'HARRIS', firstName: 'Sophie', id: 83, groupId: 2, type: 'employee', pole: 'Commercial', code: 'EMP-083' },
    { name: 'SANCHEZ', firstName: 'Julien', id: 84, groupId: 3, type: 'employee', pole: 'Administrative', code: 'EMP-084' },
    { name: 'CLARK', firstName: 'Emma', id: 85, groupId: 4, type: 'interim', pole: 'RH', code: 'EMP-085' },
    { name: 'RAMIREZ', firstName: 'Lucas', id: 86, groupId: 5, type: 'employee', pole: 'Technique', code: 'EMP-086' },
    { name: 'LEWIS', firstName: 'Laura', id: 87, groupId: 6, type: 'employee', pole: 'Commercial', code: 'EMP-087' },
    { name: 'ROBINSON', firstName: 'Kevin', id: 88, groupId: 7, type: 'employee', pole: 'Administrative', code: 'EMP-088' },
    { name: 'WALKER', firstName: 'Sophie', id: 89, groupId: 8, type: 'interim', pole: 'Technique', code: 'EMP-089' },
    { name: 'YOUNG', firstName: 'Thomas', id: 90, groupId: 1, type: 'employee', pole: 'Technique', code: 'EMP-090' },
    { id: 91, name: 'HERNANDEZ', firstName: 'Chloé', type: 'employee', pole: 'Commercial', code: 'EMP-091' },
    { id: 92, name: 'KING', firstName: 'Antoine', type: 'employee', pole: 'Commercial', code: 'EMP-092' },
    { id: 93, name: 'WRIGHT', firstName: 'Julie', type: 'employee', pole: 'Commercial', code: 'EMP-093' },
    { id: 94, name: 'LOPEZ', firstName: 'Nicolas', type: 'employee', pole: 'Commercial', code: 'EMP-094' },
    { id: 95, name: 'HILL', firstName: 'Isabelle', type: 'employee', pole: 'Commercial', code: 'EMP-095' },
    { id: 96, name: 'SCOTT', firstName: 'David', type: 'employee', pole: 'Commercial', code: 'EMP-096' },
    { id: 97, name: 'GREEN', firstName: 'Sophie', type: 'employee', pole: 'Commercial', code: 'EMP-097' },
    { id: 98, name: 'ADAMS', firstName: 'Julien', type: 'employee', pole: 'Commercial', code: 'EMP-098' },
    { id: 99, name: 'BAKER', firstName: 'Emma', type: 'employee', pole: 'Commercial', code: 'EMP-099' },
    { id: 100, name: 'GONZALEZ', firstName: 'Lucas', type: 'employee', pole: 'Commercial', code: 'EMP-100' },
    { name: 'LEE', firstName: 'Laura', id: 101, type: 'employee', pole: 'Commercial', code: 'EMP-101' },
    { name: 'HARRISON', firstName: 'Kevin', id: 102, type: 'employee', pole: 'Commercial', code: 'EMP-102' },
    { name: 'SULLIVAN', firstName: 'Sophie', id: 103, type: 'employee', pole: 'Commercial', code: 'EMP-103' },
    { name: 'MURPHY', firstName: 'Antoine', id: 104, type: 'employee', pole: 'Commercial', code: 'EMP-104' },
    { name: 'COOK', firstName: 'Julie', id: 105, type: 'employee', pole: 'Commercial', code: 'EMP-105' },
    { name: 'ROGERS', firstName: 'Nicolas', id: 106, type: 'employee', pole: 'Commercial', code: 'EMP-106' },
    { name: 'REED', firstName: 'Isabelle', id: 107, type: 'employee', pole: 'Commercial', code: 'EMP-107' },
    { name: 'COOPER', firstName: 'David', id: 108, type: 'employee', pole: 'Commercial', code: 'EMP-108' },
    { name: 'MORGAN', firstName: 'Sophie', id: 109, type: 'employee', pole: 'Commercial', code: 'EMP-109' },
    { name: 'BELL', firstName: 'Julien', id: 110, type: 'employee', pole: 'Commercial', code: 'EMP-110' }
];


const Evenements = [
    // Nouveaux événements
    {
      id: 1,
      label: '1052 Logements Vesoul',
      image: 26,
      color: '#FF6B6B',
      borderColor: '#FF5252',
      textColor: '#FFFFFF',
      location: 'Vesoul',
      client: 'Ville de Vesoul',
      type: 'chantier',
      poleActivite: 1,
      // Informations Générales
      code: 'CHT-001',
      identifiant: 'VES-2024-001',
      libelle: '1052 Logements Vesoul',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '15/01/2024',
      dateFin: '15/07/2025',
      // Analyse Chantier
      TM: 2500,        // Temps Marché
      HR: 1625,        // Heures Réalisées (65% de 2500h)
      SH: 875,         // Solde Heure (2500h - 1625h)
      DPF: 0,        // Durée Planifiée Future
      RPF: 0,          // Réalisé - Planif Future
      AP: 0,          // Avancement prévisionnel
      SP: 0           // Solde Prévisionnel
    },
    {
      id: 2,
      label: 'Résidence Les Jardins de Paris',
      image: 26,
      color: '#4ECDC4',
      borderColor: '#3FBDB6',
      textColor: '#FFFFFF',
      location: 'Paris 15ème',
      client: 'SCI Jardins de Paris',
      type: 'chantier',
     
        // Informations Générales
        poleActivite: 2,
        code: 'CHT-002',
        identifiant: 'PAR-2024-002',
        libelle: 'Résidence Les Jardins de Paris',
        etat: 'Planifié',
        chargeAffaire: 37,
        chefChantier: 38,
        dateOS: '01/03/2024',
        dateFin: '01/03/2026',
        // Analyse Chantier
        TM: 5800,        // Temps Marché
        HR: 580,         // Heures Réalisées (10% de 5800h)
        SH: 5220,        // Solde Heure (5800h - 580h)
        DPF: 0,       // Durée Planifiée Future
        RPF: 0,          // Réalisé - Planif Future
        AP: 0,          // Avancement prévisionnel
        SP: 0           // Solde Prévisionnel
  
    },
    {
      id: 3,
      label: 'Chantier Lycée Jean Moulin',
      image: 26,
      color: '#FFD700',
      borderColor: '#FFC300',
      textColor: '#000000',
      type: 'chantier',
     
        // Informations Générales
        poleActivite: 2,
        code: 'CHT-003',
        identifiant: 'REI-2024-003',
        libelle: 'Chantier Lycée Jean Moulin',
        etat: 'En cours',
        chargeAffaire: 39,
        chefChantier: 40,
        dateOS: '10/09/2023',
        dateFin: '10/12/2024',
        // Analyse Chantier
        TM: 3200,        // Temps Marché
        HR: 1280,        // Heures Réalisées (40% de 3200h)
        SH: 1920,        // Solde Heure (3200h - 1280h)
        DPF: 0,       // Durée Planifiée Future
        RPF: 0,          // Réalisé - Planif Future
        AP: 0,          // Avancement prévisionnel
        SP: 0           // Solde Prévisionnel
 
    },
    // Chantiers existants avec données enrichies
    {
      id: 4,
      label: 'Rénovation Hôtel de Ville',
      image: 26,
      color: '#A3A3A3',
      borderColor: '#737373',
      textColor: '#FFFFFF',
      type: 'chantier',
     
        poleActivite: 3,
        code: 'CHT-004',
        identifiant: 'HDV-2024-004',
        libelle: 'Rénovation Hôtel de Ville',
        etat: 'En cours',
        chargeAffaire: 36,
        chefChantier: 42,
        dateOS: '05/02/2024',
        dateFin: '05/11/2024',
        TM: 1800,
        HR: 1350,
        SH: 450,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
     
    },
    {
      id: 5,
      label: 'Extension Usine Renault Flins',
      image: 26,
      color: '#FFB300',
      borderColor: '#FF9800',
      textColor: '#000000',
      type: 'chantier',
     
        poleActivite: 3,
        code: 'CHT-005',
        identifiant: 'REN-2024-005',
        libelle: 'Extension Usine Renault Flins',
        etat: 'Planifié',
        chargeAffaire: 36,
        chefChantier: 38,
        dateOS: '15/04/2024',
        dateFin: '15/12/2025',
        TM: 8500,
        HR: 425,
        SH: 8075,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
   
    },
    {
      id: 6,
      label: 'Construction EHPAD Les Lilas',
      image: 26,
      color: '#8BC34A',
      borderColor: '#689F38',
      textColor: '#FFFFFF',
      type: 'chantier',
     
        poleActivite: 1,
        code: 'CHT-006',
        identifiant: 'LIL-2024-006',
        libelle: 'Construction EHPAD Les Lilas',
        etat: 'En cours',
        chargeAffaire: 41,
        chefChantier: 42,
        dateOS: '01/01/2024',
        dateFin: '01/08/2025',
        TM: 4200,
        HR: 2310,
        SH: 1890,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0

    },
    {
      id: 7,
      label: 'Réhabilitation Collège Victor Hugo',
      image: 26,
      color: '#90CAF9',
      borderColor: '#1976D2',
      textColor: '#000000',
      type: 'chantier',
     
        poleActivite: 2,
        code: 'CHT-007',
        identifiant: 'VHU-2024-007',
        libelle: 'Réhabilitation Collège Victor Hugo',
        etat: 'Terminé',
        chargeAffaire: 41,
        chefChantier: 42,
        dateOS: '01/06/2023',
        dateFin: '01/02/2024',
        TM: 2100,
        HR: 2100,
        SH: 0,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
  
    },
    {
      id: 8,
      label: 'Immeuble Le Belvédère Lyon',
      image: 26,
      color: '#F06292',
      borderColor: '#C2185B',
      textColor: '#FFFFFF',
      type: 'chantier',
     
        poleActivite: 1,
        code: 'CHT-008',
        identifiant: 'BEL-2024-008',
        libelle: 'Immeuble Le Belvédère Lyon',
        etat: 'En cours',
        chargeAffaire: 39,
        chefChantier: 40,
        dateOS: '01/05/2024',
        dateFin: '01/10/2025',
        TM: 6800,
        HR: 1700,
        SH: 5100,
        DPF: 0,
        RPF: 0,
        AP: 0,
    },
    {
      id: 9,
      label: 'Bâtiment Industriel Toulouse',
      image: 26,
      color: '#FFD54F',
      borderColor: '#FFA000',
      textColor: '#000000',
      type: 'chantier',
     
        poleActivite: 1,
        code: 'CHT-009',
        identifiant: 'TOU-2024-009',
        libelle: 'Bâtiment Industriel Toulouse',
        etat: 'Suspendu',
        chargeAffaire: 36,
        chefChantier: 40,
        dateOS: '01/03/2024',
        dateFin: '01/01/2025',
        TM: 3500,
        HR: 525,
        SH: 2975,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0

    },
    {
      id: 10,
      label: 'Résidence Étudiante Marseille',
      image: 26,
      color: '#4DD0E1',
      borderColor: '#00838F',
      textColor: '#000000',
      type: 'chantier',
     
        poleActivite: 1,
        code: 'CHT-010',
        identifiant: 'MAR-2024-010',
        libelle: 'Résidence Étudiante Marseille',
        etat: 'Planifié',
        chargeAffaire: 37,
        chefChantier: 38,
        dateOS: '01/06/2024',
        dateFin: '01/12/2025',
        TM: 4100,
        HR: 0,
        SH: 4100,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
 
    },
    {
      id: 11,
      label: 'Centre Aquatique Bordeaux',
      image: 26,
      color: '#BA68C8',
      borderColor: '#7B1FA2',
      textColor: '#FFFFFF',
      type: 'chantier',
     
        code: 'CHT-011',
        identifiant: 'BOR-2024-011',
        libelle: 'Centre Aquatique Bordeaux',
        etat: 'En cours',
        chargeAffaire: 41,
        poleActivite: 1,
        chefChantier: 42,
        dateOS: '01/02/2024',
        dateFin: '01/01/2025',
        TM: 3800,
        HR: 2280,
        SH: 1520,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
    },
    {
      id: 12,
      label: 'Rénovation Gare SNCF Strasbourg',
      image: 26,
      color: '#AED581',
      borderColor: '#689F38',
      textColor: '#000000',
      type: 'chantier',
     
        code: 'CHT-012',
        identifiant: 'STR-2024-012',
        libelle: 'Rénovation Gare SNCF Strasbourg',
        etat: 'En cours',
        chargeAffaire: 36,
        poleActivite: 1,
        chefChantier: 42,
        dateOS: '15/03/2024',
        dateFin: '15/09/2024',
        TM: 2200,
        HR: 1980,
        SH: 220,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
    },
    {
      id: 13,
      label: 'Complexe Sportif Montpellier',
      image: 26,
      color: '#FF8A65',
      borderColor: '#D84315',
      textColor: '#000000',
      type: 'chantier',
     
        code: 'CHT-013',
        identifiant: 'MTP-2024-013',
        libelle: 'Complexe Sportif Montpellier',
        etat: 'Planifié',
        chargeAffaire: 36,
        poleActivite: 1,
        chefChantier: 38,
        dateOS: '01/08/2024',
        dateFin: '01/06/2025',
        TM: 4500,
        HR: 0,
        SH: 4500,
        DPF: 0,
        RPF: 0,
        AP: 0,
        SP: 0
    },
    { 
      id: 14, 
      label: 'Congés payés', 
      image: 27,
      type: 'absence',
      color: '#22C55E',
      borderColor: '#16A34A',
      textColor: '#FFFFFF',
      defaultDescription: 'Congés payés',
      category: 'Congés',
      verrou: true,
      code: 'CP-2024',
      actif: false,
    },
    { 
      id: 15, 
      label: 'Arrêt maladie', 
      image: 28,
      type: 'absence',
      color: '#EF4444',
      borderColor: '#DC2626',
      textColor: '#FFFFFF',
      defaultDescription: 'Arrêt maladie',
      category: 'Maladie',
      verrou: false,
      code: 'AM-2024',
      actif: true,
    },
    { 
      id: 16, 
      label: 'Formation', 
      image: 27,
      type: 'absence',
      color: '#3B82F6',
      borderColor: '#2563EB',
      textColor: '#FFFFFF',
      defaultDescription: 'Formation professionnelle',
      category: 'Formation',
      verrou: false,
      code: 'FOR-2024',
      actif: true,
    },
    { 
      id: 17, 
      label: 'RTT', 
      image: 27,
      type: 'absence',
      color: '#8B5CF6',
      borderColor: '#7C3AED',
      textColor: '#FFFFFF',
      defaultDescription: 'Réduction du temps de travail',
      category: 'RTT',
      verrou: false,
      code: 'RTT-2024',
      actif: false,
    },
    { 
      id: 18, 
      label: 'Congé sans solde', 
      image: 28,
      type: 'absence',
      color: '#F59E0B',
      borderColor: '#D97706',
      textColor: '#FFFFFF',
      defaultDescription: 'Congé sans solde',
      category: 'Congés',
      verrou: true,
      code: 'CSS-2024',
      actif: true,
    },
    { 
      id: 19, 
      label: 'Réunion équipe', 
      image:5,
      type: 'autre',
      color: '#06B6D4',
      borderColor: '#0891B2',
      textColor: '#FFFFFF',
      defaultDescription: 'Réunion d\'équipe',
      category: 'Réunion',
      verrou: false,
      code: 'REU-2024',
      actif: true,
    },
    { 
      id: 20, 
      label: 'Rendez-vous client', 
      image: 16,
      color: '#EC4899',
      type: 'autre',
      borderColor: '#DB2777',
      textColor: '#FFFFFF',
      defaultDescription: 'Rendez-vous avec le client',
      category: 'Commercial',
      verrou: false,
      code: 'RDC-2024',
      actif: true,
    },
    { 
      id: 21, 
      label: 'Visite technique', 
      image: 4,
      color: '#F97316',
      borderColor: '#EA580C',
      type: 'autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Visite technique sur site',
      category: 'Technique',
      verrou: false,
      code: 'VTS-2024',
      actif: true,
    },
    { 
      id: 22, 
      label: 'Réunion sécurité', 
      image:20,
      color: '#DC2626',
      borderColor: '#B91C1C',
      type: 'autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Réunion sécurité',
      category: 'Sécurité',
      verrou: false,
      code: 'RES-2024',
      actif: true,
    },
    { 
      id: 23, 
      label: 'Formation technique', 
      image: 25,
      color: '#7C3AED',
      borderColor: '#6D28D9',
      type: 'autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Formation technique',
      category: 'Formation',
      verrou: false,
      code: 'FT-2024',
      actif: true,
    },
      {
    id: 24,
    label: 'Résidence Les Tilleuls Nantes',
    image: 26,
    color: '#4CAF50',
    borderColor: '#388E3C',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-024',
      identifiant: 'NAN-2024-024',
      libelle: 'Résidence Les Tilleuls Nantes',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 38,
      dateOS: '01/03/2024',
      dateFin: '01/11/2025',
      TM: 3400,
      HR: 1360,
      SH: 2040,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 25,
    label: 'Bureaux Innovants Lille',
    image: 26,
    color: '#2196F3',
    borderColor: '#1976D2',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-025',
      identifiant: 'LIL-2024-025',
      libelle: 'Bureaux Innovants Lille',
      etat: 'Planifié',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '15/06/2024',
      dateFin: '15/09/2025',
      TM: 5200,
      HR: 0,
      SH: 5200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 26,
    label: 'Hôpital Saint-Charles Dijon',
    image: 26,
    color: '#E91E63',
    borderColor: '#C2185B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-026',
      identifiant: 'DIJ-2024-026',
      libelle: 'Hôpital Saint-Charles Dijon',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/02/2024',
      dateFin: '01/03/2026',
      TM: 7600,
      HR: 3800,
      SH: 3800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0

  },
  {
    id: 27,
    label: 'Résidence Étudiante Toulouse II',
    image: 26,
    color: '#00BCD4',
    borderColor: '#0097A7',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-027',
      identifiant: 'TOU-2024-027',
      libelle: 'Résidence Étudiante Toulouse II',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/09/2024',
      dateFin: '01/06/2026',
      TM: 4100,
      HR: 0,
      SH: 4100,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0

  },
  {
    id: 28,
    label: 'Centre Logistique Lyon Est',
    image: 26,
    color: '#9C27B0',
    borderColor: '#7B1FA2',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-028',
      identifiant: 'LYO-2024-028',
      libelle: 'Centre Logistique Lyon Est',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '15/03/2024',
      dateFin: '15/07/2025',
      TM: 6200,
      HR: 3720,
      SH: 2480,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
 
  },
  {
    id: 29,
    label: 'Complexe Sportif Brest',
    image: 26,
    color: '#FF9800',
    borderColor: '#F57C00',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-029',
      identifiant: 'BRE-2024-029',
      libelle: 'Complexe Sportif Brest',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/05/2024',
      dateFin: '01/11/2025',
      TM: 4500,
      HR: 2250,
      SH: 2250,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 30,
    label: 'Résidence Les Oliviers Nice',
    image: 26,
    color: '#CDDC39',
    borderColor: '#9E9D24',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-030',
      identifiant: 'NIC-2024-030',
      libelle: 'Résidence Les Oliviers Nice',
      etat: 'Planifié',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/10/2024',
      dateFin: '01/07/2026',
      TM: 5300,
      HR: 0,
      SH: 5300,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  
  },
  {
    id: 31,
    label: 'Centre Culturel Bordeaux Sud',
    image: 26,
    color: '#03A9F4',
    borderColor: '#0288D1',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-031',
      identifiant: 'BOR-2024-031',
      libelle: 'Centre Culturel Bordeaux Sud',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/04/2024',
      dateFin: '01/10/2025',
      TM: 4000,
      HR: 1800,
      SH: 2200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 32,
    label: 'Bâtiment Administratif Reims',
    image: 26,
    color: '#8BC34A',
    borderColor: '#558B2F',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-032',
      identifiant: 'REI-2024-032',
      libelle: 'Bâtiment Administratif Reims',
      etat: 'Terminé',
      chargeAffaire: 36,
      chefChantier: 38,
      dateOS: '01/02/2023',
      dateFin: '01/05/2024',
      TM: 3100,
      HR: 3100,
      SH: 0,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 33,
    label: 'Usine Agroalimentaire Le Mans',
    image: 26,
    color: '#FF5722',
    borderColor: '#E64A19',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-033',
      identifiant: 'LEM-2024-033',
      libelle: 'Usine Agroalimentaire Le Mans',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '15/01/2024',
      dateFin: '15/06/2025',
      TM: 5400,
      HR: 2700,
      SH: 2700,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
    {
    id: 34,
    label: 'Rénovation École Primaire Nancy',
    image: 26,
    color: '#FFC107',
    borderColor: '#FFA000',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-034',
      identifiant: 'NAN-2024-034',
      libelle: 'Rénovation École Primaire Nancy',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/04/2024',
      dateFin: '01/02/2025',
      TM: 2800,
      HR: 1820,
      SH: 980,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 35,
    label: 'Extension Mairie Rouen',
    image: 26,
    color: '#9E9E9E',
    borderColor: '#616161',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-035',
      identifiant: 'ROU-2024-035',
      libelle: 'Extension Mairie Rouen',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/09/2024',
      dateFin: '01/06/2026',
      TM: 3900,
      HR: 0,
      SH: 3900,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 36,
    label: 'Immeuble Horizon Marseille',
    image: 26,
    color: '#4DB6AC',
    borderColor: '#00796B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-036',
      identifiant: 'MAR-2024-036',
      libelle: 'Immeuble Horizon Marseille',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '15/03/2024',
      dateFin: '15/12/2025',
      TM: 5800,
      HR: 2320,
      SH: 3480,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
   
  },
  {
    id: 37,
    label: 'Centre de Recyclage Clermont-Ferrand',
    image: 26,
    color: '#8E24AA',
    borderColor: '#6A1B9A',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-037',
      identifiant: 'CLE-2024-037',
      libelle: 'Centre de Recyclage Clermont-Ferrand',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/10/2024',
      dateFin: '01/06/2026',
      TM: 4600,
      HR: 0,
      SH: 4600,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
 
  },
  {
    id: 38,
    label: 'Bâtiment Pôle Emploi Rennes',
    image: 26,
    color: '#81C784',
    borderColor: '#388E3C',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-038',
      identifiant: 'REN-2024-038',
      libelle: 'Bâtiment Pôle Emploi Rennes',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/02/2025',
      TM: 2900,
      HR: 2100,
      SH: 800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  
  },
  {
    id: 39,
    label: 'Parking Souterrain Strasbourg',
    image: 26,
    color: '#03A9F4',
    borderColor: '#0288D1',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-039',
      identifiant: 'STR-2024-039',
      libelle: 'Parking Souterrain Strasbourg',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/08/2024',
      dateFin: '01/04/2026',
      TM: 6300,
      HR: 0,
      SH: 6300,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
 
  },
  {
    id: 40,
    label: 'Rénovation Musée de Caen',
    image: 26,
    color: '#F06292',
    borderColor: '#C2185B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-040',
      identifiant: 'CAE-2024-040',
      libelle: 'Rénovation Musée de Caen',
      etat: 'En cours',
      chargeAffaire: 40,
      chefChantier: 42,
      dateOS: '01/02/2024',
      dateFin: '01/12/2025',
      TM: 3100,
      HR: 1550,
      SH: 1550,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
 
  },
  {
    id: 41,
    label: 'Hôtel du Parc Avignon',
    image: 26,
    color: '#FF7043',
    borderColor: '#E64A19',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-041',
      identifiant: 'AVI-2024-041',
      libelle: 'Hôtel du Parc Avignon',
      etat: 'Planifié',
      chargeAffaire: 37,
      chefChantier: 42,
      dateOS: '15/05/2024',
      dateFin: '15/02/2026',
      TM: 3800,
      HR: 0,
      SH: 3800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 42,
    label: 'Résidence Les Pins Annecy',
    image: 26,
    color: '#AED581',
    borderColor: '#689F38',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-042',
      identifiant: 'ANN-2024-042',
      libelle: 'Résidence Les Pins Annecy',
      etat: 'En cours',
      chargeAffaire: 37,
      chefChantier: 42,
      dateOS: '01/01/2024',
      dateFin: '01/10/2025',
      TM: 4800,
      HR: 1920,
      SH: 2880,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 43,
    label: 'Centre Commercial Nancy Sud',
    image: 26,
    color: '#BA68C8',
    borderColor: '#7B1FA2',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-043',
      identifiant: 'NAN-2024-043',
      libelle: 'Centre Commercial Nancy Sud',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '15/02/2024',
      dateFin: '15/08/2025',
      TM: 7200,
      HR: 3600,
      SH: 3600,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
    {
    id: 44,
    label: 'Résidence Océane La Rochelle',
    image: 26,
    color: '#00ACC1',
    borderColor: '#00838F',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-044',
      identifiant: 'LAR-2024-044',
      libelle: 'Résidence Océane La Rochelle',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/09/2024',
      dateFin: '01/05/2026',
      TM: 4200,
      HR: 0,
      SH: 4200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 45,
    label: 'Centre Hospitalier Metz Nord',
    image: 26,
    color: '#EF5350',
    borderColor: '#C62828',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-045',
      identifiant: 'MET-2024-045',
      libelle: 'Centre Hospitalier Metz Nord',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/11/2025',
      TM: 6900,
      HR: 3100,
      SH: 3800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 46,
    label: 'Campus Universitaire Grenoble',
    image: 26,
    color: '#43A047',
    borderColor: '#2E7D32',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-046',
      identifiant: 'GRE-2024-046',
      libelle: 'Campus Universitaire Grenoble',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/04/2024',
      dateFin: '01/12/2025',
      TM: 5700,
      HR: 2600,
      SH: 3100,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 47,
    label: 'Résidence étudiante Poitiers',
    image: 26,
    color: '#FFB300',
    borderColor: '#F57C00',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-047',
      identifiant: 'POI-2024-047',
      libelle: 'Résidence étudiante Poitiers',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/06/2024',
      dateFin: '01/03/2026',
      TM: 3900,
      HR: 0,
      SH: 3900,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 48,
    label: 'Centre Aquatique Tours',
    image: 26,
    color: '#1E88E5',
    borderColor: '#1565C0',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-048',
      identifiant: 'TOU-2024-048',
      libelle: 'Centre Aquatique Tours',
      etat: 'En cours',
      chargeAffaire: 40,
      chefChantier: 42,
      dateOS: '15/02/2024',
      dateFin: '15/08/2025',
      TM: 5100,
      HR: 2550,
      SH: 2550,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 49,
    label: 'Résidence Séniors Montpellier',
    image: 26,
    color: '#AB47BC',
    borderColor: '#8E24AA',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-049',
      identifiant: 'MON-2024-049',
      libelle: 'Résidence Séniors Montpellier',
      etat: 'Planifié',
      chargeAffaire: 37,
      chefChantier: 42,
      dateOS: '01/07/2024',
      dateFin: '01/04/2026',
      TM: 4800,
      HR: 0,
      SH: 4800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 50,
    label: 'Halle Polyvalente Orléans',
    image: 26,
    color: '#26A69A',
    borderColor: '#00796B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-050',
      identifiant: 'ORL-2024-050',
      libelle: 'Halle Polyvalente Orléans',
      etat: 'En cours',
      chargeAffaire: 37,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/10/2025',
      TM: 3600,
      HR: 1800,
      SH: 1800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 51,
    label: 'Rénovation Château Blois',
    image: 26,
    color: '#C0CA33',
    borderColor: '#9E9D24',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-051',
      identifiant: 'BLO-2024-051',
      libelle: 'Rénovation Château Blois',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/01/2024',
      dateFin: '01/12/2025',
      TM: 4400,
      HR: 3080,
      SH: 1320,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 52,
    label: 'Immeuble Haussmann Paris 8e',
    image: 26,
    color: '#FBC02D',
    borderColor: '#F57F17',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-052',
      identifiant: 'PAR-2024-052',
      libelle: 'Immeuble Haussmann Paris 8e',
      etat: 'Terminé',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/01/2023',
      dateFin: '01/04/2024',
      TM: 3800,
      HR: 3800,
      SH: 0,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
    
  },
  {
    id: 53,
    label: 'Résidence Les Jardins Angers',
    image: 26,
    color: '#64B5F6',
    borderColor: '#1976D2',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-053',
      identifiant: 'ANG-2024-053',
      libelle: 'Résidence Les Jardins Angers',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/09/2024',
      dateFin: '01/05/2026',
      TM: 5000,
      HR: 0,
      SH: 5000,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
    {
    id: 54,
    label: 'Centre de Conférences Nice',
    image: 26,
    color: '#FF7043',
    borderColor: '#E64A19',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-054',
      identifiant: 'NIC-2024-054',
      libelle: 'Centre de Conférences Nice',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/09/2025',
      TM: 6400,
      HR: 3200,
      SH: 3200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 55,
    label: 'Usine Agroalimentaire Rennes',
    image: 26,
    color: '#26C6DA',
    borderColor: '#0097A7',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-055',
      identifiant: 'REN-2024-055',
      libelle: 'Usine Agroalimentaire Rennes',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/07/2024',
      dateFin: '01/05/2026',
      TM: 7200,
      HR: 0,
      SH: 7200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: ''
  },
  {
    id: 56,
    label: 'Centre Culturel Dijon',
    image: 26,
    color: '#9CCC65',
    borderColor: '#689F38',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-056',
      identifiant: 'DIJ-2024-056',
      libelle: 'Centre Culturel Dijon',
      etat: 'En cours',
      chargeAffaire: 40,
      chefChantier: 42,
      dateOS: '15/02/2024',
      dateFin: '15/12/2025',
      TM: 5300,
      HR: 2120,
      SH: 3180,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
 
  },
  {
    id: 57,
    label: 'Résidence Les Pins Perpignan',
    image: 26,
    color: '#F06292',
    borderColor: '#C2185B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-057',
      identifiant: 'PER-2024-057',
      libelle: 'Résidence Les Pins Perpignan',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/06/2024',
      dateFin: '01/02/2026',
      TM: 3800,
      HR: 0,
      SH: 3800,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0

  },
  {
    id: 58,
    label: 'Complexe Sportif Rouen',
    image: 26,
    color: '#9575CD',
    borderColor: '#512DA8',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-058',
      identifiant: 'ROU-2024-058',
      libelle: 'Complexe Sportif Rouen',
      etat: 'En cours',
      chargeAffaire: 37,
      chefChantier: 42,
      dateOS: '01/04/2024',
      dateFin: '01/09/2025',
      TM: 4700,
      HR: 2350,
      SH: 2350,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 59,
    label: 'Bâtiment Administratif Clermont-Ferrand',
    image: 26,
    color: '#FFA726',
    borderColor: '#FB8C00',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-059',
      identifiant: 'CLE-2024-059',
      libelle: 'Bâtiment Administratif Clermont-Ferrand',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/05/2024',
      dateFin: '01/03/2026',
      TM: 3900,
      HR: 0,
      SH: 3900,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 60,
    label: 'École Primaire Bordeaux',
    image: 26,
    color: '#4DB6AC',
    borderColor: '#00796B',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-060',
      identifiant: 'BOR-2024-060',
      libelle: 'École Primaire Bordeaux',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 40,
      dateOS: '01/02/2024',
      dateFin: '01/10/2025',
      TM: 3500,
      HR: 1750,
      SH: 1750,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 61,
    label: 'Hôpital Pédiatrique Lille',
    image: 26,
    color: '#E57373',
    borderColor: '#D32F2F',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-061',
      identifiant: 'LIL-2024-061',
      libelle: 'Hôpital Pédiatrique Lille',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/12/2025',
      TM: 7100,
      HR: 3550,
      SH: 3550,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 62,
    label: 'Résidence étudiante Nancy',
    image: 26,
    color: '#81C784',
    borderColor: '#388E3C',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-062',
      identifiant: 'NAN-2024-062',
      libelle: 'Résidence étudiante Nancy',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/08/2024',
      dateFin: '01/06/2026',
      TM: 4100,
      HR: 0,
      SH: 4100,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 63,
    label: 'Centre Commercial Amiens',
    image: 26,
    color: '#7986CB',
    borderColor: '#3949AB',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-063',
      identifiant: 'AMI-2024-063',
      libelle: 'Centre Commercial Amiens',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/04/2024',
      dateFin: '01/10/2025',
      TM: 6400,
      HR: 3200,
      SH: 3200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
    {
    id: 64,
    label: 'Médiathèque Avignon',
    image: 26,
    color: '#BA68C8',
    borderColor: '#7B1FA2',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-064',
    identifiant: 'AVI-2024-064',
    libelle: 'Médiathèque Avignon',
    etat: 'En cours',
    chargeAffaire: 41,
    chefChantier: 42,
    dateOS: '01/03/2024',
    dateFin: '01/10/2025',
    TM: 4300,
    HR: 2150,
    SH: 2150,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 65,
    label: 'Résidence étudiante Brest',
    image: 26,
    color: '#4DD0E1',
    borderColor: '#00838F',
    textColor: '#000000',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-065',
    identifiant: 'BRE-2024-065',
    libelle: 'Résidence étudiante Brest',
    etat: 'Planifié',
    chargeAffaire: 36,
    chefChantier: 40,
    dateOS: '01/09/2024',
    dateFin: '01/07/2026',
    TM: 3900,
    HR: 0,
    SH: 3900,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 66,
    label: 'Bâtiment Logistique Toulon',
    image: 26,
    color: '#FDD835',
    borderColor: '#F9A825',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-066',
      identifiant: 'TOU-2024-066',
      libelle: 'Bâtiment Logistique Toulon',
      etat: 'En cours',
      chargeAffaire: 41,
      chefChantier: 42,
      dateOS: '15/02/2024',
      dateFin: '15/09/2025',
      TM: 6200,
      HR: 3720,
      SH: 2480,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 67,
    label: 'École Maternelle Tours',
    image: 26,
    color: '#81D4FA',
    borderColor: '#0288D1',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-067',
      identifiant: 'TOU-2024-067',
      libelle: 'École Maternelle Tours',
      etat: 'Planifié',
      chargeAffaire: 36,
      chefChantier: 40,
      dateOS: '01/08/2024',
      dateFin: '01/04/2026',
      TM: 3100,
      HR: 0,
      SH: 3100,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 68,
    label: 'Résidence Les Chênes Reims',
    image: 26,
    color: '#A1887F',
    borderColor: '#5D4037',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-068',
      identifiant: 'REI-2024-068',
      libelle: 'Résidence Les Chênes Reims',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/04/2024',
      dateFin: '01/12/2025',
      TM: 4800,
      HR: 1920,
      SH: 2880,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 69,
    label: 'Immeuble Le Panorama Lyon',
    image: 26,
    color: '#FF8A65',
    borderColor: '#D84315',
    textColor: '#000000',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-069',
      identifiant: 'LYO-2024-069',
      libelle: 'Immeuble Le Panorama Lyon',
      etat: 'Planifié',
      chargeAffaire: 41,
      chefChantier: 40,
      dateOS: '01/06/2024',
      dateFin: '01/06/2026',
      TM: 5200,
      HR: 0,
      SH: 5200,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 70,
    label: 'Centre Technique Toulouse',
    image: 26,
    color: '#4CAF50',
    borderColor: '#2E7D32',
    textColor: '#FFFFFF',
    type: 'chantier',
   
      poleActivite: 1,
      code: 'CHT-070',
      identifiant: 'TOU-2024-070',
      libelle: 'Centre Technique Toulouse',
      etat: 'En cours',
      chargeAffaire: 36,
      chefChantier: 42,
      dateOS: '01/03/2024',
      dateFin: '01/11/2025',
      TM: 6100,
      HR: 3050,
      SH: 3050,
      DPF: 0,
      RPF: 0,
      AP: 0,
      SP: 0
  },
  {
    id: 71,
    label: 'Bureaux Innovalia Paris',
    image: 26,
    color: '#F44336',
    borderColor: '#C62828',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-071',
    identifiant: 'PAR-2024-071',
    libelle: 'Bureaux Innovalia Paris',
    etat: 'Terminé',
    chargeAffaire: 36,
    chefChantier: 42,
    dateOS: '01/09/2023',
    dateFin: '01/04/2024',
    TM: 3500,
    HR: 3500,
    SH: 0,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 72,
    label: 'Centre Logistique Lille',
    image: 26,
    color: '#009688',
    borderColor: '#00695C',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-072',
    identifiant: 'LIL-2024-072',
    libelle: 'Centre Logistique Lille',
    etat: 'En cours',
    chargeAffaire: 41,
    chefChantier: 42,
    dateOS: '01/01/2024',
    dateFin: '01/09/2025',
    TM: 6700,
    HR: 3350,
    SH: 3350,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 73,
    label: 'Résidence Les Tilleuls Metz',
    image: 26,
    color: '#FFB74D',
    borderColor: '#F57C00',
    textColor: '#000000',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-073',
    identifiant: 'MET-2024-073',
    libelle: 'Résidence Les Tilleuls Metz',
    etat: 'Planifié',
    chargeAffaire: 36,
    chefChantier: 40,
    dateOS: '01/07/2024',
    dateFin: '01/05/2026',
    TM: 4600,
    HR: 0,
    SH: 4600,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 74,
    label: 'Rénovation Gare Saint-Lazare',
    image: 26,
    color: '#3F51B5',
    borderColor: '#283593',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-074',
    identifiant: 'PAR-2024-074',
    libelle: 'Rénovation Gare Saint-Lazare',
    etat: 'En cours',
    chargeAffaire: 36,
    chefChantier: 40,
    dateOS: '01/02/2024',
    dateFin: '01/12/2025',
    TM: 8000,
    HR: 3200,
    SH: 4800,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 75,
    label: 'Construction Piscine Olympique',
    image: 26,
    color: '#03A9F4',
    borderColor: '#0277BD',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-075',
    identifiant: 'LYO-2024-075',
    libelle: 'Construction Piscine Olympique',
    etat: 'Planifié',
    chargeAffaire: 37,
    chefChantier: 38,
    dateOS: '01/06/2024',
    dateFin: '01/06/2026',
    TM: 12000,
    HR: 0,
    SH: 12000,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 76,
    label: 'Aménagement Bureaux La Défense',
    image: 26,
    color: '#607D8B',
    borderColor: '#455A64',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 2,
    code: 'CHT-076',
    identifiant: 'DEF-2024-076',
    libelle: 'Aménagement Bureaux La Défense',
    etat: 'En cours',
    chargeAffaire: 39,
    chefChantier: 42,
    dateOS: '15/01/2024',
    dateFin: '15/09/2024',
    TM: 4500,
    HR: 2250,
    SH: 2250,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 77,
    label: 'Réfection Toiture École Jules Ferry',
    image: 26,
    color: '#795548',
    borderColor: '#4E342E',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-077',
    identifiant: 'NAN-2024-077',
    libelle: 'Réfection Toiture École Jules Ferry',
    etat: 'Terminé',
    chargeAffaire: 41,
    chefChantier: 40,
    dateOS: '01/09/2023',
    dateFin: '01/03/2024',
    TM: 1800,
    HR: 1800,
    SH: 0,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 78,
    label: 'Installation Fibre Optique Quartier Nord',
    image: 26,
    color: '#9C27B0',
    borderColor: '#7B1FA2',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 3,
    code: 'CHT-078',
    identifiant: 'MAR-2024-078',
    libelle: 'Installation Fibre Optique Quartier Nord',
    etat: 'En cours',
    chargeAffaire: 36,
    chefChantier: 38,
    dateOS: '01/04/2024',
    dateFin: '01/10/2024',
    TM: 2500,
    HR: 1000,
    SH: 1500,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 79,
    label: 'Construction Parking Souterrain Centre-Ville',
    image: 26,
    color: '#424242',
    borderColor: '#212121',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-079',
    identifiant: 'BOR-2024-079',
    libelle: 'Construction Parking Souterrain Centre-Ville',
    etat: 'En cours',
    chargeAffaire: 37,
    chefChantier: 42,
    dateOS: '01/02/2024',
    dateFin: '01/02/2025',
    TM: 5600,
    HR: 2000,
    SH: 3600,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 80,
    label: 'Restauration Château de Versailles (Aile Nord)',
    image: 26,
    color: '#D4AF37',
    borderColor: '#B8860B',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-080',
    identifiant: 'VER-2024-080',
    libelle: 'Restauration Château de Versailles (Aile Nord)',
    etat: 'Planifié',
    chargeAffaire: 39,
    chefChantier: 40,
    dateOS: '01/09/2024',
    dateFin: '01/09/2026',
    TM: 15000,
    HR: 0,
    SH: 15000,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 81,
    label: 'Construction Hôpital Privé de l\'Ouest',
    image: 26,
    color: '#E91E63',
    borderColor: '#C2185B',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-081',
    identifiant: 'REN-2024-081',
    libelle: 'Construction Hôpital Privé de l\'Ouest',
    etat: 'En cours',
    chargeAffaire: 41,
    chefChantier: 38,
    dateOS: '01/01/2024',
    dateFin: '01/06/2025',
    TM: 9500,
    HR: 3500,
    SH: 6000,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 82,
    label: 'Aménagement Parc Urbain Les Érables',
    image: 26,
    color: '#8BC34A',
    borderColor: '#689F38',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 2,
    code: 'CHT-082',
    identifiant: 'STR-2024-082',
    libelle: 'Aménagement Parc Urbain Les Érables',
    etat: 'En cours',
    chargeAffaire: 36,
    chefChantier: 42,
    dateOS: '01/03/2024',
    dateFin: '01/11/2024',
    TM: 3200,
    HR: 1600,
    SH: 1600,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  },
  {
    id: 83,
    label: 'Rénovation Théâtre Municipal',
    image: 26,
    color: '#673AB7',
    borderColor: '#512DA8',
    textColor: '#FFFFFF',
    type: 'chantier',
    poleActivite: 1,
    code: 'CHT-083',
    identifiant: 'NIC-2024-083',
    libelle: 'Rénovation Théâtre Municipal',
    etat: 'Planifié',
    chargeAffaire: 37,
    chefChantier: 40,
    dateOS: '01/10/2024',
    dateFin: '01/10/2025',
    TM: 4800,
    HR: 0,
    SH: 4800,
    DPF: 0,
    RPF: 0,
    AP: 0,
    SP: 0
  }
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
      let duration: number = 1;
      let appointmentType: 'chantier' | 'absence' | 'autre' = 'chantier';
      let selectedEvent = null;
      let description = '';
      
      // Essayer de trouver un créneau libre jusqu'à 100 tentatives
      while (!isValid && attempts < 100) {
        attempts++;
        
        // Choisir le type d'événement
        const rand = Math.random();
        if (rand < 0.6) { // 60% chantiers
          appointmentType = 'chantier';
          while (!selectedEvent) {
            selectedEvent = Evenements[Math.floor(Math.random() * Evenements.length)];
            if (selectedEvent.type !== 'chantier') {
              selectedEvent = null;
            }
          }
          duration = Math.floor(Math.random() * 3) + 3; // 3 à 5 jours
          description = `Chantier de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`;
        } else if (rand < 0.8) { // 20% absences
          appointmentType = 'absence';
          while (!selectedEvent) {
            selectedEvent = Evenements[Math.floor(Math.random() * Evenements.length)];
            if (selectedEvent.type !== 'absence') {
              selectedEvent = null;
            }
          }
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
          description = `${selectedEvent?.label} de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`;
        } else { // 20% autres
          appointmentType = 'autre';
          while (!selectedEvent) {
            selectedEvent = Evenements[Math.floor(Math.random() * Evenements.length)];
            if (selectedEvent.type !== 'autre') {
              selectedEvent = null;
            }
          }
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
          description = `${selectedEvent?.label} de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`;
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
        
        // Créer l'appointment avec les bonnes propriétés selon le type
        const newAppointment: Appointment = {
          id: appointmentId++,
          description: description,
          startDate: startDate.getTime(),
          endDate: endDate.getTime(),
          employeeId: employee.id,
          type: appointmentType,
          EventId: selectedEvent?.id as number
        };

        appointments.push(newAppointment);
      }
    }
  });
  
  return appointments;
}




export const Images: Image[] = [
  { id: 1, name: 'Pinceau peinture', image: brushPaint.src },
  { id: 2, name: 'Compas', image: caliper.src },
  { id: 3, name: 'Robinet', image: faucet.src },
  { id: 4, name: 'Lunettes de protection', image: googleEyeProtector.src },
  { id: 5, name: 'Mécanicien', image: mechanic.src },
  { id: 6, name: 'Peinture', image: paint.src },
  { id: 7, name: 'Parquet', image: parquet.src },
  { id: 8, name: 'Pinces', image: pliers.src },
  { id: 9, name: 'Plomberie', image: plumbing.src },
  { id: 10, name: 'Bras robotique', image: roboticArm.src },
  { id: 11, name: 'Rouleau peinture', image: rollPaint.src },
  { id: 12, name: 'Scie', image: saw.src },
  { id: 13, name: 'Vis', image: screw.src },
  { id: 14, name: 'Pelle', image: shovel.src },
  { id: 15, name: 'Rouleau compresseur', image: steamroller.src },
  { id: 16, name: 'Boîte à outils', image: toolbox.src },
  { id: 17, name: 'Truelle', image: trowel.src },
  { id: 18, name: 'Camion', image: truck.src },
  { id: 19, name: 'Panneau chantier', image: underConstructionSign.src },
  { id: 20, name: 'Gilet de sécurité', image: vestProtect.src },
  { id: 21, name: 'Mur en briques', image: wallBrick.src },
  { id: 22, name: 'Brouette', image: wheelbarrow.src },
  { id: 23, name: 'Bois/Sciage', image: woodenLogging.src },
  { id: 24, name: 'Clé à pipe', image: wrenchPipe.src },
  { id: 25, name: 'Clé', image: wrench.src },
  { id: 26, name: 'Icone Chantier', image: iconeChantier.src },
  { id: 27, name: 'Icone Absence', image: iconeAbsenceValide.src },
  { id: 28, name: 'Icone Absence Non Validée', image: iconeAbsenceNonValide.src},
  { id: 29, name: 'Absence', image: iconesAbsences.src },
  { id: 30, name: 'Repas', image: iconesRepas.src },
  { id: 31, name: 'Prime', image: iconesPrime.src },
  { id: 32, name: 'Heures sup.', image: iconesHeurSup.src },
  { id: 33, name: 'Congés payés', image: iconesCongesPayes.src },
  { id: 34, name: 'Salaire', image: iconesSalaire.src },
  {id: 35, name : 'Andre Grégory', image: 'https://i.pravatar.cc/40?img=1'},
  {id: 36, name : 'Barret Alexandre', image: 'https://i.pravatar.cc/40?img=2'},
  {id: 37, name : 'Bourdin Lucas', image: 'https://i.pravatar.cc/40?img=3'},
  {id: 38, name : 'Dubois Emma', image: 'https://i.pravatar.cc/40?img=4'},
  {id: 39, name : 'Fournier Chloé', image: 'https://i.pravatar.cc/40?img=5'},
  {id: 40, name : 'Garcia Louis', image: 'https://i.pravatar.cc/40?img=6'},
  {id: 41, name : 'Lemoine Manon', image: 'https://i.pravatar.cc/40?img=7'},
  {id: 42, name : 'Moreau Hugo', image: 'https://i.pravatar.cc/40?img=8'},
]





//API
export const getEvenements = (): Item[] => {
  return Evenements.map(event => {
    const image = Images.find(img => img.id === event.image) || null;    

    if(event.type === 'chantier' ){
      return {
        ...event,
        image,
        chargeAffaire: initialEmployees.find(emp => emp.id === (event as any).chargeAffaire)?.name + ' ' + initialEmployees.find(emp => emp.id === (event as any).chargeAffaire)?.firstName || '',
        chefChantier : initialEmployees.find(emp => emp.id === (event as any).chefChantier)?.name + ' ' + initialEmployees.find(emp => emp.id === (event as any).chefChantier)?.firstName || '',
        poleActivite : PA.find(pa => pa.id === (event as any).poleActivite)?.name || ''
      } as Item;
    } else {
      return {
        ...event,
        image
      } as Item;
    }
  });
};


export const getEmployees = (): Employee[] => {

  return initialEmployees.map(emp => {
    return { 
      id: emp.id,
      name: emp.name,
      firstName: emp.firstName,
      type: emp.type as "employee" | "interim",
      pole: emp.pole,
      image: Images.find(img => img.id === emp.image) || undefined,
      code: emp.code,
      group: initialTeams.find(group => group.id === emp.groupId) || undefined
    }
  });

}


export const getImages = (): Image[] => {
  return Images;
}



export const initialAppointments: Appointment[] = generateAppointments(getEmployees());
