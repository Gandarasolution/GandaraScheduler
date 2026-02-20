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


import { Appointment, Equipe, Groupe, Item, Image, PoleActivite, poleActivite, BaseItemCategory, MockNotification, User, CalendarConfig} from './calendrier/types/index';

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
import { Group } from 'lucide-react';

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
const initialEmployeesBase = [
    // ===== ÉQUIPE TECHNIQUE (15 employés) =====
    // Spécialisés dans les travaux de construction, rénovation et maintenance
    { nom: 'ANDRE', prenom: 'Grégory', id: 1, groupId: 1, type: 'employee', image: 35, pole: 1, code: 'EMP-001', role: 'admin', theme: 'light', email: "gregory.andre@entreprise.fr" },
    { nom: 'BARRET', prenom: 'Alexandre', id: 2, groupId: 1, type: 'employee', image: 36, pole: 1, code: 'EMP-002', role: 'user', theme: 'light', email: "alexandre.barret@entreprise.fr"},
    { nom: 'MALIVERNAY', prenom: 'Eric', id: 7, groupId: 1, type: 'interim', pole: 1, code: 'EMP-007', role: 'user', theme: 'dark' },
    { nom: 'MARTIN', prenom: 'Sophie', id: 11, groupId: 1, type: 'employee', pole: 1, code: 'EMP-011', role: 'user', theme: 'light' },
    { nom: 'DUBOIS', prenom: 'Antoine', id: 13, groupId: 1, type: 'interim', pole: 1, code: 'EMP-013', role:'user' , theme:'dark'},
    { nom:'LEROY', prenom:'Marie', id : 14, groupId : 1 , type : "employee", pole : 1 , code : "EMP-014", role : "user", theme : "light", email : "marie.leroy@entreprise.fr"},
    { nom: 'MOREAU', prenom: 'Vincent', id: 15, groupId: 1, type: 'employee', pole: 1, code: 'EMP-015', role: 'user', theme: 'dark' },
    { nom: 'GARCIA', prenom: 'Céline', id: 16, groupId: 1, type: 'interim', pole: 1, code: 'EMP-016', role:'user' , theme:'light'},
    
    // Équipe Commercial
    { nom: 'BOURDIN', prenom: 'Lucas', id: 3, groupId: 2, type: 'interim', image: 37, pole: 2, code: 'EMP-003', role: 'user', theme: 'light'},
    { nom: 'ZERR', prenom: 'Romain', id: 4, groupId: 2,  type: 'employee', pole: 2 , code: 'EMP-004', role: 'user', theme: 'dark'},
    { nom: 'BERNARD', prenom: 'Lucas', id: 8, groupId: 2,  type: 'employee', pole: 2 , code: 'EMP-008', role: 'user', theme: 'light'},
    { nom: 'PETIT', prenom: 'Julien', id: 12, groupId: 2, type: 'interim', pole: 2 , code: 'EMP-012', role:'user' , theme:'dark'},
    { nom: 'ROBERT', prenom: 'Nathalie', id: 17, groupId: 2, type: 'employee', pole: 2 , code: 'EMP-017', role:'user' , theme:'light'},
    { nom: 'RICHARD', prenom: 'David', id: 18, groupId: 2, type: 'employee', pole: 2 , code: 'EMP-018', role:'user' , theme:'dark'},
    { nom: 'DURAND', prenom: 'Isabelle', id: 19, groupId: 2, type: 'interim', pole: 2 , code: 'EMP-019', role:'user' , theme:'light'},
    { nom: 'LEFEBVRE', prenom: 'Stéphane', id: 20, groupId: 2, type: 'employee', pole: 2 , code: 'EMP-020', role:'user' , theme:'dark'},
    
    // Équipe Administrative
    { nom: 'DACHAUD', prenom: 'Fabrice', id: 5, groupId: 3, type: 'employee', pole: 3, code: 'EMP-005', role:'user' , theme:'light' },
    { nom: 'GERMAIN', prenom: 'Sébastien', id: 6, groupId: 3, type: 'employee', pole: 3 , code: 'EMP-006', role:'user' , theme:'dark'},
    { nom: 'SIMON', prenom: 'Caroline', id: 21, groupId: 3, type: 'employee', pole: 3 , code: 'EMP-021', role:'user' , theme:'light'},
    { nom: 'MICHEL', prenom: 'Philippe', id: 22, groupId: 3, type: 'interim', pole: 3 , code: 'EMP-022', role:'user' , theme:'dark'},
    { nom: 'LAURENT', prenom: 'Valérie', id: 23, groupId: 3, type: 'employee', pole: 3 , code: 'EMP-023', role:'user' , theme:'light'},
    { nom: 'LEFRANC', prenom: 'Patrick', id: 24, groupId: 3, type: 'employee', pole: 3   , code: 'EMP-024', role:'user' , theme:'dark'},
    
    // Équipe RH
    { nom: 'ROUSSEAU', prenom: 'Emma', id: 9, groupId: 4,  type: 'employee', pole: 4, code: 'EMP-009', role:'user' , theme:'light'},
    { nom: 'VINCENT', prenom: 'Paul', id: 10, groupId: 4, type: 'interim', pole: 4 , code: 'EMP-010', role:'user' , theme:'dark'},
    { nom: 'THOMAS', prenom: 'Sandrine', id: 25, groupId: 4, type: 'employee', pole: 4 , code: 'EMP-025', role:'user' , theme:'light'},
    { nom: 'BONNET', prenom: 'Christophe', id: 26, groupId: 4, type: 'employee', pole: 4 , code: 'EMP-026', role:'user' , theme:'dark'},
    { nom: 'FRANCOIS', prenom: 'Sylvie', id: 27, groupId: 4, type: 'interim', pole: 4 , code: 'EMP-027', role:'user' , theme:'light'},
    
    // Nouvelles équipes
    { nom: 'GIRARD', prenom: 'Marine', id: 28, groupId: 5, type: 'employee', pole: 1, code: 'EMP-028', role:'user' , theme:'dark'},
    { nom: 'ANDRE', prenom: 'Pierre', id: 29, groupId: 6, type: 'employee', pole: 2, code: 'EMP-029', role:'user' , theme:'light'},
    { nom: 'NICOLAS', prenom: 'Sylvie', id: 30, groupId: 7, type: 'employee', pole: 3 , code: 'EMP-030', role:'user' , theme:'dark'},
    { nom: 'MOREL', prenom: 'Thomas', id: 31, groupId: 8, type: 'employee', pole: 1 , code: 'EMP-031', role:'user' , theme:'light'},
    { nom: 'FOURNIER', prenom: 'Julie', id: 32, groupId: 5, type: 'interim', pole: 1 , code: 'EMP-032', role:'user' , theme:'dark'},
    { nom: 'MORETTI', prenom: 'Olivier', id: 33, groupId: 6, type: 'employee', pole: 2 , code: 'EMP-033', role:'user' , theme:'light'},
    { nom: 'ROUSSEL', prenom: 'Patricia', id: 34, groupId: 7, type: 'employee', pole: 3 , code: 'EMP-034', role:'user' , theme:'dark'},
    { nom: 'GERARD', prenom: 'Frédéric', id: 35, groupId: 8, type: 'interim', pole: 1 , code : "EMP-035", role:"user", theme:"light"},


    { nom: 'GERARD', prenom: 'Frédéric', id: 44, type: 'employee', pole: 2, code: 'EMP-044', role:'user' , theme:'dark'},
    { nom: 'DUPONT', prenom: 'Jean', id: 36, type: 'employee', pole: 2 , code: 'EMP-036', role:'user' , theme:'light'},
    { nom: 'DUBOIS', prenom: 'Marie', id: 37, type: 'employee', pole: 2, code: 'EMP-037' , role:'user' , theme:'dark'},
    { nom: 'MOREAU', prenom: 'Luc', id: 38, type: 'employee', pole: 2 , code: 'EMP-038', role:'user' , theme:'light'},
    { nom: 'LEROY', prenom: 'Sophie', id: 39, type: 'employee', pole: 2 , code: 'EMP-039', role:'user' , theme:'dark'},
    { nom: 'ROUSSEAU', prenom: 'Marc', id: 40, type: 'employee', pole: 2 , code: 'EMP-040', role:'user' , theme:'light'},
    { nom: 'GARCIA', prenom: 'Céline', id: 41, type: 'employee', pole: 2 , code: 'EMP-041', role:'user' , theme:'dark'},
    { nom: 'MALIVERNAY', prenom: 'Eric', id: 42, type: 'employee', pole: 2 , code : "EMP-042", role:"user", theme:"light"},
    { nom: 'MARTIN', prenom: 'Sophie', id: 43, type: 'employee', pole: 2 , code: 'EMP-043', role:'user' , theme:'dark'},

    { nom: 'FAURE', prenom: 'Julien', id: 45, groupId: 1, type: 'employee', pole: 1, code: 'EMP-045', role:'user' , theme:'light'},
    { nom: 'BLANC', prenom: 'Benoît', id: 46, groupId: 1, type: 'interim', pole: 1, code: 'EMP-046', role:'user' , theme:'dark'},
    { nom: 'PONT', prenom: 'Aurélie', id: 47, groupId: 1, type: 'employee', pole: 1, code: 'EMP-047', role:'user' , theme:'light'},
    { nom: 'GUERIN', prenom: 'Lucas', id: 48, groupId: 5, type: 'employee', pole: 1, code: 'EMP-048', role:'user' , theme:'dark'},
    { nom: 'MULLER', prenom: 'Kevin', id: 49, groupId: 5, type: 'interim', pole: 1, code: 'EMP-049', role:'user' , theme:'light'},
    { nom: 'SCHMITT', prenom: 'Sarah', id: 50, groupId: 8, type: 'employee', pole: 1, code : "EMP-050", role:"user", theme:"dark"},
    { nom: 'LEMAIRE', prenom: 'Thomas', id :51 , groupId :8 , type : "employee", pole :1 , code :"EMP-051", role:"user", theme:"light"},
    { nom : "ROBIN", prenom : "Emma", id :52 , groupId :6 , type :"employee", pole :2 , code :"EMP-052", role:"user", theme:"dark"},
    { nom: 'PICARD', prenom: 'Nicolas', id: 53, groupId: 6, type: 'employee', pole: 2, code: 'EMP-053', role:'user' , theme:'light'},
    { nom: 'RIVIERE', prenom: 'Laura', id: 54, groupId: 2, type: 'employee', pole: 2, code: 'EMP-054', role:'user' , theme:'dark'},
    { nom: 'MARCHAND', prenom: 'Antoine', id: 55, groupId: 2, type: 'interim', pole: 2, code: 'EMP-055', role:'user' , theme:'light'},
    { nom: 'DUPUIS', prenom: 'Chloé', id: 56, groupId: 3, type: 'employee', pole: 3, code: 'EMP-056', role:'user' , theme:'dark'},
    { nom: 'LAMBERT', prenom: 'Juliette', id: 57, groupId: 3, type: 'employee', pole: 3, code: 'EMP-057', role:'user' , theme:'light'},
    { nom: 'CLEMENT', prenom: 'Julien', id: 58, groupId: 4, type: 'employee', pole: 4, code: 'EMP-058', role:'user' , theme:'dark'},
    { nom: 'GUILLAUME', prenom: 'Sophie', id: 59, groupId: 4, type: 'interim', pole: 4, code:'EMP-059' , role:'user' , theme:'dark'},
    { nom : "LEDUC", prenom : "Mathieu", id :60 , groupId :4 , type :"employee", pole :4 , code :"EMP-060", role:"user", theme:"light"},
    { nom : "FERNANDEZ", prenom : "Isabelle", id :61 , groupId :7 , type :"employee", pole :3 , code :"EMP-061", role:"user", theme:"dark"},
    { nom : "MARTINEZ", prenom : "Sébastien", id :62 , groupId :7 , type :"employee", pole :3 , code :"EMP-062", role:"user", theme:"light"},
    { nom: 'DAVID', prenom: 'Céline', id: 63, groupId: 6, type: 'employee', pole: 2, code: 'EMP-063', role:'user' , theme:'dark'},
    { nom: 'JACQUET', prenom: 'Vincent', id: 64, groupId: 5, type: 'employee', pole: 1, code: 'EMP-064', role:'user' , theme:'light'},
    { nom: 'LOPEZ', prenom: 'Amélie', id: 65, groupId: 8, type: 'interim', pole: 1, code: 'EMP-065', role:'user' , theme:'dark'},
    { nom: 'FOUCAULT', prenom: 'Cédric', id: 66, groupId: 1, type: 'employee', pole: 1, code: 'EMP-066', role:'user' , theme:'light'},
    { nom: 'MARTY', prenom: 'Aline', id: 67, groupId: 2, type: 'employee', pole: 2, code: 'EMP-067', role:'user' , theme:'dark'},
    { nom: 'LEBLANC', prenom: 'Bruno', id: 68, groupId: 3, type: 'employee', pole: 3, code: 'EMP-068', role:'user' , theme:'light'},
    { nom: 'GARNIER', prenom: 'Catherine', id: 69, groupId: 4, type: 'interim', pole: 4, code: 'EMP-069', role:'user' , theme:'dark'},
    { nom: 'CARTER', prenom: 'David', id: 70, groupId: 5, type: 'employee', pole: 1, code: 'EMP-070', role:'user' , theme:'light'},
    { nom: 'WILLIAMS', prenom: 'Laura', id: 71, groupId: 6, type: 'employee', pole: 2, code: 'EMP-071', role:'user' , theme:'dark'},
    { nom: 'JONES', prenom: 'Kevin', id: 72, groupId: 7, type: 'employee', pole: 3, code: 'EMP-072', role:'user' , theme:'light'},
    { nom: 'BROWN', prenom: 'Sophie', id: 73, groupId: 8, type: 'interim', pole: 1, code: 'EMP-073', role:'user' , theme:'dark'},
    { nom: 'DAVIS', prenom: 'Thomas', id: 74, groupId: 1, type: 'employee', pole: 1, code: 'EMP-074', role:'user' , theme:'light'},
    { nom: 'MILLER', prenom: 'Emma', id: 75, groupId: 2, type: 'employee', pole: 2, code: 'EMP-075', role:'user' , theme:'dark'},
    { nom : "WILSON", prenom : "Lucas", id :76 , groupId :3 , type :"employee", pole :3 , code :"EMP-076", role:"user", theme:"light"},
    { nom : "MOORE", prenom : "Chloé", id :77 , groupId :4 , type :"interim", pole :4 , code :"EMP-077", role:"user", theme:"dark"},
    { nom : "TAYLOR", prenom : "Antoine", id :78 , groupId :5 , type :"employee", pole :1 , code :"EMP-078", role:"user", theme:"light"},
    { nom: 'ANDERSON', prenom: 'Julie', id: 79, groupId: 6, type: 'employee', pole: 2, code: 'EMP-079', role:'user' , theme:'dark'},
    { nom: 'THOMAS', prenom: 'Nicolas', id: 80, groupId: 7, type: 'employee', pole: 3, code: 'EMP-080', role:'user' , theme:'light'},
    { nom: 'JACKSON', prenom: 'Isabelle', id: 81, groupId: 8, type: 'interim', pole: 1, code: 'EMP-081', role:'user' , theme:'dark'},
    { nom: 'WHITE', prenom: 'David', id: 82, groupId: 1, type: 'employee', pole: 1, code: 'EMP-082', role:'user' , theme:'light'},
    { nom: 'HARRIS', prenom: 'Sophie', id: 83, groupId: 2, type: 'employee', pole: 2, code: 'EMP-083', role:'user' , theme:'dark'},
    { nom: 'SANCHEZ', prenom: 'Julien', id: 84, groupId: 3, type: 'employee', pole: 3, code: 'EMP-084', role:'user' , theme:'light'},
    { nom : "CLARK", prenom : "Emma", id :85 , groupId :4 , type :"interim", pole :4 , code :"EMP-085", role:"user", theme:"dark"},
    { nom : "RAMIREZ", prenom : "Lucas", id :86 , groupId :5 , type :"employee", pole :1 , code :"EMP-086", role:"user", theme:"light"},
    { nom : "LEWIS", prenom : "Laura", id :87 , groupId :6 , type :"employee", pole :2 , code :"EMP-087", role:"user", theme:"dark"},
    { nom : "ROBINSON", prenom : "Kevin", id :88 , groupId :7 , type :"employee", pole :3 , code :"EMP-088", role:"user", theme:"light"},
    { nom: 'WALKER', prenom: 'Sophie', id: 89, groupId: 8, type: 'interim', pole: 1, code: 'EMP-089', role:'user' , theme:'dark'},
    { nom: 'YOUNG', prenom: 'Thomas', id: 90, groupId: 1, type: 'employee', pole: 1, code: 'EMP-090', role:'user' , theme:'light'},
    { id: 91, nom: 'HERNANDEZ', prenom: 'Chloé', type: 'employee', pole: 2, code: 'EMP-091', role:'user' , theme:'dark'},
    { id: 92, nom: 'KING', prenom: 'Antoine', type: 'employee', pole: 2, code: 'EMP-092', role:'user' , theme:'light'},
    { id: 93, nom: 'WRIGHT', prenom: 'Julie', type: 'employee', pole: 2, code: 'EMP-093', role:'user' , theme:'dark'},
    { id: 94, nom: 'LOPEZ', prenom: 'Nicolas', type: 'employee', pole: 2, code: 'EMP-094', role:'user' , theme:'light'},
    { id: 95, nom: 'HILL', prenom: 'Isabelle', type: 'employee', pole: 2, code: 'EMP-095', role:'user' , theme:'dark'},
    { id: 96, nom: 'SCOTT', prenom: 'David', type: 'employee', pole: 2, code: 'EMP-096', role:'user' , theme:'light'},
    { id: 97, nom : "GREEN", prenom : "Sophie" , groupId :1 , type :"employee", pole :3 , code :"EMP-097", role:"user", theme:"dark"},
    { id : 98, nom : "ADAMS", prenom : "Julien", type :"employee", pole :4 , code :"EMP-098", role:"user", theme:"light"},
    { id: 99, nom: 'BAKER', prenom: 'Emma', type: 'employee', pole: 2, code: 'EMP-099', role:'user' , theme:'dark'},
    { id: 100, nom: 'GONZALEZ', prenom: 'Lucas', type: 'employee', pole: 2, code: 'EMP-100', role:'user' , theme:'light'},
    { nom: 'LEE', prenom: 'Laura', id: 101, type: 'employee', pole: 2, code: 'EMP-101', role:'user' , theme:'dark'},
    { nom: 'HARRISON', prenom: 'Kevin', id: 102, type: 'employee', pole: 2, code: 'EMP-102', role:'user' , theme:'light'},
    { nom: 'SULLIVAN', prenom: 'Sophie', id: 103, type: 'employee', pole: 2, code: 'EMP-103', role:'user' , theme:'dark'},
    { nom: 'MURPHY', prenom: 'Antoine', id: 104, type: 'employee', pole: 2, code: 'EMP-104', role:'user' , theme:'light'},
    { nom: 'COOK', prenom: 'Julie', id: 105, type: 'employee', pole: 2, code: 'EMP-105', role:'user' , theme:'dark'},
    { nom: 'ROGERS', prenom: 'Nicolas', id: 106, type: 'employee', pole: 2, code: 'EMP-106', role:'user' , theme:'light'},
    { nom : "REED", prenom : "Isabelle", id :107 , groupId :7 , type :"employee", pole :4 , code :"EMP-107", role:"user", theme:"dark"},
    { nom : "COOPER", prenom : "David", id :108 , groupId :8 , type :"employee", pole :3 , code :"EMP-108", role:"user", theme:"light"},
    { nom: 'MORGAN', prenom: 'Sophie', id: 109, type: 'employee', pole: 2, code: 'EMP-109', role:'user' , theme:'dark'},
    { nom: 'BELL', prenom: 'Julien', id: 110, type: 'employee', pole: 2, code: 'EMP-110', role:'user' , theme:'light'},
    { nom: 'MURRAY', prenom: 'Emma', id: 111, type: 'employee', pole: 2, code: 'EMP-111', role:'user' , theme:'dark'},
    { nom: 'BAILEY', prenom: 'Lucas', id: 112, type: 'employee', pole: 2, code: 'EMP-112', role:'user' , theme:'light'},
];

const generatedEmployees = Array.from({ length: 200 }, (_, idx) => {
  const id = 113 + idx;
  const poleOrder = [1, 2, 3, 4];
  const pole = poleOrder[idx % poleOrder.length];
  const group = initialTeams[idx % initialTeams.length];
  const isInterim = idx % 5 === 0;

  return {
    id,
    nom: `EMP${id}`,
    prenom: `Auto${id}`,
    code: `EMP-${String(id).padStart(3, '0')}`,
    pole,
    type: isInterim ? 'interim' : 'employee',
    groupId: group?.id,
    image: 35 + (idx % 5),
    role: 'user',
    theme: idx % 2 === 0 ? 'light' : 'dark',
    email: `${id}@entreprise.fr`
  };
});

const initialEmployees = [
  ...initialEmployeesBase,
  ...generatedEmployees,
];

const EventCategory: BaseItemCategory[] = [
    { id: 1, name: 'Congés' },
    { id: 2, name: 'Maladie' },
    { id: 3, name: 'Formation' },
    { id: 4, name: 'RTT' },
    { id: 5, name: 'Réunion' },
    { id: 6, name: 'Commercial' },
    { id: 7, name: 'Technique' },
    { id: 8, name: 'Administratif' },
    { id: 9, name: 'Sécurité' },
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
      category: 1,
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
      category: 2,
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
      category: 3,
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
      category: 4,
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
      category: 1,
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
      category: 5,
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
      category: 6,
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
      category: 7,
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
      category: 9,
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
      category: 1,
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

// ===== BASE DE DONNÉES DES NOTIFICATIONS =====

export const mockNotifications: MockNotification[] = [
  // Notifications pour l'utilisateur 1 (Admin Grégory)
  {
    id: 'notif-1',
    userId: 1,
    type: 'info',
    title: 'Nouvelle demande de congés',
    message: 'Sophie Martin a soumis une demande de congés du 15 au 20 février.',
    timestamp: Date.now() - 3600000, // Il y a 1h
    isRead: false
  },
  {
    id: 'notif-2',
    userId: 1,
    type: 'warning',
    title: 'Retard sur chantier',
    message: 'Le chantier Vesoul accuse un retard de 2 jours.',
    timestamp: Date.now() - 7200000, // Il y a 2h
    isRead: false
  },
  {
    id: 'notif-3',
    userId: 1,
    type: 'success',
    title: 'Validation effectuée',
    message: 'La feuille de temps d\'Alexandre a été validée.',
    timestamp: Date.now() - 86400000, // Il y a 1 jour
    isRead: true
  },
  {
    id: 'notif-4',
    userId: 1,
    type: 'error',
    title: 'Conflit d\'horaires',
    message: 'Un conflit a été détecté dans le planning de Lucas.',
    timestamp: Date.now() - 172800000, // Il y a 2 jours
    isRead: true
  },

  // Notifications pour l'utilisateur 2 (Alexandre)
  {
    id: 'notif-5',
    userId: 2,
    type: 'info',
    title: 'Rendez-vous confirmé',
    message: 'Votre rendez-vous client à 14h a été confirmé.',
    timestamp: Date.now() - 1800000, // Il y a 30min
    isRead: false
  },
  {
    id: 'notif-6',
    userId: 2,
    type: 'warning',
    title: 'Rappel : Formation',
    message: 'Formation sécurité demain à 9h.',
    timestamp: Date.now() - 43200000, // Il y a 12h
    isRead: false
  },
  {
    id: 'notif-7',
    userId: 2,
    type: 'success',
    title: 'Validation de congés',
    message: 'Votre demande de congés a été approuvée.',
    timestamp: Date.now() - 259200000, // Il y a 3 jours
    isRead: true
  },

  // Notifications pour l'utilisateur 3 (Lucas)
  {
    id: 'notif-8',
    userId: 3,
    type: 'info',
    title: 'Nouveau message',
    message: 'Le client Dupuis souhaite vous contacter.',
    timestamp: Date.now() - 900000, // Il y a 15min
    isRead: false
  },
  {
    id: 'notif-9',
    userId: 3,
    type: 'warning',
    title: 'Document à signer',
    message: 'Le contrat chantier Lyon nécessite votre signature.',
    timestamp: Date.now() - 21600000, // Il y a 6h
    isRead: false
  },
  {
    id: 'notif-10',
    userId: 3,
    type: 'info',
    title: 'Réunion planifiée',
    message: 'Réunion d\'équipe jeudi à 10h.',
    timestamp: Date.now() - 86400000, // Il y a 1 jour
    isRead: true
  },

  // Notifications génériques pour d'autres utilisateurs
  {
    id: 'notif-11',
    userId: 5,
    type: 'info',
    title: 'Planning mis à jour',
    message: 'Votre planning de la semaine prochaine est disponible.',
    timestamp: Date.now() - 3600000,
    isRead: false
  },
  {
    id: 'notif-12',
    userId: 5,
    type: 'success',
    title: 'Tâche terminée',
    message: 'La réparation du système électrique est complète.',
    timestamp: Date.now() - 172800000,
    isRead: true
  },
];

export const getNotificationsByUserId = (userId: number): MockNotification[] => {
  return mockNotifications.filter(notif => notif.userId === userId);
};


// ===== CONFIGURATIONS DE VUES CALENDRIER =====

/**
 * Configuration des vues calendrier disponibles dans le système
 * Chaque vue définit comment organiser et filtrer les données du calendrier
 */
const mockCalendarConfigs: CalendarConfig[] = [
  // Vue Générale - Tous les employés
  {
    id: 1,
    name: 'Vue Générale',
    description: 'Vue complète sans filtres, organisée par pôles d\'activité',
    groupingLevels: {
      level1: 'pole',
    },
    filterCategories: {
      personnel: [],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue Technique
  {
    id: 2,
    name: 'Vue par équipes',
    description: 'Vue organisée par équipes',
    groupingLevels: {
      level1: 'equipe',
    },
    filterCategories: {
      personnel: [],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue Commercial - Hiérarchie Pôle > Équipe
  {
    id: 3,
    name: 'Vue Commercial - Par équipes',
    description: 'Organisation hiérarchique du pôle Commercial par équipes',
    groupingLevels: {
      level1: 'pole',
      level2: 'equipe'
    },
    filterCategories: {
      personnel: [
        {
          field: 'pole',
          type: 'equals',
          value: 'Commercial'
        }
      ],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue par Pôles (un seul niveau)
  {
    id: 4,
    name: 'Vue par Pôles',
    description: 'Organisation simple par pôles d\'activité',
    groupingLevels: {
      level1: 'pole'
    },
    filterCategories: {
      personnel: [],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue Administrative
  {
    id: 5,
    name: 'Vue Administrative',
    description: 'Vue du pôle Administratif',
    groupingLevels: {
      level1: 'pole',
    },
    filterCategories: {
      personnel: [
        {
          field: 'pole',
          type: 'equals',
          value: 'Administrative'
        }
      ],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue RH
  {
    id: 6,
    name: 'Vue RH',
    description: 'Vue du pôle Ressources Humaines',
    groupingLevels: {
      level1: 'pole',
    },
    filterCategories: {
      personnel: [
        {
          field: 'pole',
          type: 'equals',
          value: 'RH'
        }
      ],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
      }
    },
  },

  // Vue Chantiers uniquement
  {
    id: 7,
    name: 'Vue Chantiers',
    description: 'Vue avec uniquement les chantiers',
    groupingLevels: {
      level1: 'pole',
    },
    filterCategories: {
      personnel: [],
      evenements: {
        filters: [],
        selectedRdvTypes: ['Chantier']
      }
    },
  },
];

/**
 * Relation entre utilisateurs et leurs vues autorisées
 * Chaque utilisateur peut avoir accès à une ou plusieurs vues
 */
const userCalendarConfigAccess: Record<number, number[]> = {
  // Admin - Accès à toutes les vues
  100: [1, 2, 3, 4, 5, 6, 7],
  
  // Grégory (Technique) - Accès vues générales et techniques
  1: [1, 2, 4, 7],
  
  // Alexandre (Technique) - Accès vues générales et techniques
  2: [1, 2, 4, 7],
  
  // Lucas (Commercial) - Accès vues générales et commerciales
  3: [1, 3, 4, 7],
  
  // Romain (Commercial) - Accès vues générales et commerciales
  4: [1, 3, 4, 7],
  
  // Fabrice (Administrative) - Accès vues générales et administratives
  5: [1, 4, 5],
  
  // Autres utilisateurs - Vue générale uniquement par défaut
  11: [1, 2, 4],
  12: [1, 3, 4],
};

/**
 * Récupérer toutes les configurations de vues
 */
export const getAllCalendarConfigs = (): CalendarConfig[] => {
  return mockCalendarConfigs;
};

/**
 * Récupérer une configuration par son ID
 */
export const getCalendarConfigById = (configId: number): CalendarConfig | undefined => {
  return mockCalendarConfigs.find(config => config.id === configId);
};

/**
 * Récupérer les configurations accessibles pour un utilisateur
 */
export const getCalendarConfigsByUserId = (userId: number): CalendarConfig[] => {
  const configIds = userCalendarConfigAccess[userId] || [1]; // Vue générale par défaut
  return mockCalendarConfigs.filter(config => configIds.includes(config.id));
};

/**
 * Vérifier si un utilisateur a accès à une configuration
 */
export const hasAccessToConfig = (userId: number, configId: number): boolean => {
  const allowedConfigs = userCalendarConfigAccess[userId] || [1];
  return allowedConfigs.includes(configId);
};

/**
 * Récupérer un utilisateur par son ID
 */
export const getUserById = (userId: number): User => {
  const u = initialEmployees.find(user => user.id === userId);

  if (!u) return {
      id: initialEmployees[0].id,
      nom: initialEmployees[0].nom,
      prenom: initialEmployees[0].prenom,
      image: Images.find(img => img.id === initialEmployees[0].image) || undefined,
      equipe: initialTeams.find(g => g.id === initialEmployees[0].groupId) || undefined,
      poleActivite: PA.find(p => p.id === initialEmployees[0].pole) || undefined,
      type: initialEmployees[0].type as 'employee' | 'interim',
      email: initialEmployees[0].email || ''
  }; // Fallback pour éviter undefined

  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    image: Images.find(img => img.id === u.image) || undefined,
    equipe: initialTeams.find(g => g.id === u.groupId) || undefined,
    poleActivite: PA.find(p => p.id === u.pole) || undefined,
    type: u.type as 'employee' | 'interim',
    email: u.email || ''
  }
};

/**
 * Récupérer un utilisateur par son email
 */
export const getUserByEmail = (email: string) => {
  return initialEmployeesBase.find(user => user.email === email);
};

/**
 * Récupérer tous les utilisateurs
 */
export const getAllUsers = () => {
  return initialEmployeesBase;
};

/**
 * Récupérer les utilisateurs par rôle
 */
export const getUsersByRole = (role: 'admin' | 'user') => {
  return initialEmployeesBase.filter(user => user.role === role);
};

/**
 * Récupérer l'employé associé à un utilisateur (si existe)
 * L'ID de l'utilisateur correspond à l'ID de l'employé (IdPersonnel)
 */
export const getEmployeeByUserId = (userId: number) => {
  const user = getUserById(userId);
  if (!user) return null;
  
  const employees = getEmployees();
  return employees.find(emp => emp.id === user.id) || null;
};




// ===== GÉNÉRATEUR DE RENDEZ-VOUS =====

/**
 * Générateur de rendez-vous sans superposition
 * Garantit qu'aucun rendez-vous ne se chevauche pour chaque employé
 * @param employees - Liste des employés à planifier
 * @returns Tableau de rendez-vous générés
 */
function generateAppointments(employees: User[]): Appointment[] {
  const appointments: Appointment[] = [];
  let appointmentId = 1;

  // 1. Calcul stable du Lundi de départ (Reset heures pour éviter effets de bord)
  const baseDate = new Date();
  baseDate.setHours(0, 0, 0, 0); 

  const day = baseDate.getDay();
  const diffToMonday = (day + 6) % 7; 
  const baseMonday = new Date(baseDate);
  baseMonday.setDate(baseDate.getDate() - diffToMonday);

  const weeksBefore = 200;
  const weeksAfter = 200;
  const startMonday = new Date(baseMonday);
  startMonday.setDate(baseMonday.getDate() - (weeksBefore * 7));

  const weeksToGenerate = weeksBefore + weeksAfter + 1;

  // Pré-calculer les timestamps des lundis pour éviter new Date() dans les boucles
  const weekMondays: number[] = [];
  for(let i=0; i < weeksToGenerate; i++) {
     const d = new Date(startMonday);
     d.setDate(startMonday.getDate() + (i * 7));
     weekMondays.push(d.getTime());
  }

  const isOverlapping = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return !(end1 < start2 || start1 > end2);
  };

  employees.forEach((employee) => {
    // Stocker en timestamp (number) est plus léger que { start: Date, end: Date }
    const employeeAppointments: { start: number; end: number }[] = [];

    for (let week = 0; week < weeksToGenerate; week++) {
      const weeklyQuota = Math.floor(Math.random() * 3);
      if (weeklyQuota === 0) continue; // Optimisation: skip direct

      const isFullWeek = weeklyQuota === 1;
      const currentMondayTs = weekMondays[week];

      for (let slot = 0; slot < weeklyQuota; slot++) {
        let attempts = 0;
        let isValid = false;

        // Variables pour le résultat final
        let finalStartTs = 0;
        let finalEndTs = 0;
        let description = '';
        let appointmentType: 'chantier' | 'absence' | 'autre' = 'chantier';
        let selectedEventId = 0;

        while (!isValid && attempts < 50) {
          attempts++;

          // --- LOGIQUE METIER ---
          const rand = Math.random();
          let typeTarget = 'chantier';
          if (rand >= 0.6 && rand < 0.8) typeTarget = 'absence';
          else if (rand >= 0.8) typeTarget = 'autre';

          // Sécurité pour éviter la boucle infinie si Evenements est vide
          const candidates = Evenements.filter(e => e.type === typeTarget);
          const selectedEvent = candidates.length > 0 
            ? candidates[Math.floor(Math.random() * candidates.length)] 
            : Evenements[0]; // Fallback

          appointmentType = typeTarget as any;
          selectedEventId = selectedEvent?.id || 0;

          let duration = isFullWeek ? 5 : (Math.floor(Math.random() * 2) + 1);
          description = `${selectedEvent?.label || 'Event'} (${duration}j)`;

          // --- CALCUL DATES (Optimisé) ---
          const dayOffset = isFullWeek ? 0 : Math.floor(Math.random() * 5); // 0..4 (Lun..Ven)

          // On crée une Date juste pour calculer le jour précis (gestion DST)
          const tempStart = new Date(currentMondayTs);
          tempStart.setDate(tempStart.getDate() + dayOffset);
          tempStart.setHours(0, 0, 0, 0);

          const tempEnd = new Date(tempStart);
          tempEnd.setDate(tempStart.getDate() + duration - 1);

          // Gestion Week-end (Recul)
          const endDay = tempEnd.getDay();
          if (endDay === 6) tempEnd.setDate(tempEnd.getDate() - 1); // Sam -> Ven
          else if (endDay === 0) tempEnd.setDate(tempEnd.getDate() - 2); // Dim -> Ven

          tempEnd.setHours(23, 59, 59, 999);

          const startTs = tempStart.getTime();
          const endTs = tempEnd.getTime();

          // --- VALIDATION STRICTE (Anti-Crash Luxon) ---

          // 1. Vérifier NaN
          if (isNaN(startTs) || isNaN(endTs)) continue;

          // 2. Vérifier cohérence temporelle
          if (startTs > endTs) continue;

          // 3. Vérifier Week-end (Start)
          const startDay = tempStart.getDay();
          if (startDay === 0 || startDay === 6) continue;

          // 4. Vérifier Chevauchement
          const overlap = employeeAppointments.some(existing => 
            isOverlapping(startTs, endTs, existing.start, existing.end)
          );

          if (!overlap) {
            isValid = true;
            finalStartTs = startTs;
            finalEndTs = endTs;
          }
        }

        if (isValid) {
          // On pousse des nombres, pas des objets Date
          employeeAppointments.push({ start: finalStartTs, end: finalEndTs });

          appointments.push({
            id: appointmentId++,
            description,
            startDate: finalStartTs, // C'est garanti valide et nombre
            endDate: finalEndTs,     // C'est garanti valide et nombre
            employee: employee,
            type: appointmentType,
            EventId: selectedEventId
          });
        }
      }
    }
  });

  return appointments;
}



//API
export const getEvenements = (): Item[] => {
  return Evenements.map(event => {
    const image = Images.find(img => img.id === event.image) || null;    

    if(event.type === 'chantier' ){
      return {
        ...event,
        image,
        chargeAffaire: initialEmployees.find(emp => emp.id === (event as any).chargeAffaire)?.nom + ' ' + initialEmployees.find(emp => emp.id === (event as any).chargeAffaire)?.prenom || '',
        chefChantier : initialEmployees.find(emp => emp.id === (event as any).chefChantier)?.nom + ' ' + initialEmployees.find(emp => emp.id === (event as any).chefChantier)?.prenom || '',
        poleActivite : PA.find(pa => pa.id === (event as any).poleActivite)?.name || ''
      } as Item;
    } else {
      return {
        ...event,
        category: event.type === 'absence' ? EventCategory.find(cat => cat.id === (event as any).category)?.name || null : null,
        image
      } as Item;
    }
  });
};

export const getEventCategories = (): BaseItemCategory[] => {
  return EventCategory;
}

export const getEmployees = (): User[] => {

  return initialEmployees
    .filter(emp => emp.nom && emp.prenom)
    .map(emp => {
      return { 
        id: emp.id,
        nom: emp.nom || '',
        prenom: emp.prenom || '',
        code: emp.code || '',
        type: emp.type as "employee" | "interim",
        poleActivite: PA.find(pa => pa.id === emp.pole) || undefined,
        image: Images.find(img => img.id === emp.image) || undefined,
        equipe: initialTeams.find(group => group.id === emp.groupId) || undefined,
        email: emp.email || ''
      }
    });

}


export const getImages = (): Image[] => {
  return Images;
}


export const getAppointments = (startDate: number, endDate: number): Appointment[] => {
  return initialAppointments.filter(appointment => 
    (appointment.startDate <= endDate) && (appointment.endDate >= startDate)
  );
}



const initialAppointments: Appointment[] = generateAppointments(getEmployees());


