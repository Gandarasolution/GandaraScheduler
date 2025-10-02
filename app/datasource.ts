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


import { Appointment, Employee, Groupe, Evenement, PaieItem} from './calendrier/types/index';

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

export const Evenements: Evenement[] = [
    // Nouveaux événements
    {
      id: 1,
      label: '1052 Logements Vesoul',
      image: iconeChantier.src,
      color: '#FF6B6B',
      borderColor: '#FF5252',
      textColor: '#FFFFFF',
      location: 'Vesoul',
      client: 'Ville de Vesoul',
      type: 'Chantier',
      attributs: {
        // Informations Générales
        code: 'CHT-001',
        identifiant: 'VES-2024-001',
        libelle: '1052 Logements Vesoul',
        etat: 'En cours',
        chargeAffaire: 'Jean Dupont',
        chefChantier: 'Pierre Martin',
        dateOS: '15/01/2024',
        dateFin: '15/07/2025',
        // Analyse Chantier
        TM: '2500h',        // Temps Marché
        HR: '1625h',        // Heures Réalisées (65% de 2500h)
        SH: '875h',         // Solde Heure (2500h - 1625h)
        DPF: '',        // Durée Planifiée Future
        RPF: '',          // Réalisé - Planif Future
        AP: '',          // Avancement prévisionnel
        SP: ''           // Solde Prévisionnel
      }
    },
    {
      id: 2,
      label: 'Résidence Les Jardins de Paris',
      image: iconeChantier.src,
      color: '#4ECDC4',
      borderColor: '#3FBDB6',
      textColor: '#FFFFFF',
      location: 'Paris 15ème',
      client: 'SCI Jardins de Paris',
      type: 'Chantier',
      attributs: {
        // Informations Générales
        code: 'CHT-002',
        identifiant: 'PAR-2024-002',
        libelle: 'Résidence Les Jardins de Paris',
        etat: 'Planifié',
        chargeAffaire: 'Marie Dubois',
        chefChantier: 'Luc Moreau',
        dateOS: '01/03/2024',
        dateFin: '01/03/2026',
        // Analyse Chantier
        TM: '5800h',        // Temps Marché
        HR: '580h',         // Heures Réalisées (10% de 5800h)
        SH: '5220h',        // Solde Heure (5800h - 580h)
        DPF: '',       // Durée Planifiée Future
        RPF: '',          // Réalisé - Planif Future
        AP: '',          // Avancement prévisionnel
        SP: ''           // Solde Prévisionnel
      }
    },
    {
      id: 3,
      label: 'Chantier Lycée Jean Moulin',
      image: iconeChantier.src,
      color: '#FFD700',
      borderColor: '#FFC300',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        // Informations Générales
        code: 'CHT-003',
        identifiant: 'REI-2024-003',
        libelle: 'Chantier Lycée Jean Moulin',
        etat: 'En cours',
        chargeAffaire: 'Sophie Leroy',
        chefChantier: 'Marc Rousseau',
        dateOS: '10/09/2023',
        dateFin: '10/12/2024',
        // Analyse Chantier
        TM: '3200h',        // Temps Marché
        HR: '1280h',        // Heures Réalisées (40% de 3200h)
        SH: '1920h',        // Solde Heure (3200h - 1280h)
        DPF: '',       // Durée Planifiée Future
        RPF: '',          // Réalisé - Planif Future
        AP: '',          // Avancement prévisionnel
        SP: ''           // Solde Prévisionnel
      }
    },
    // Chantiers existants avec données enrichies
    {
      id: 4,
      label: 'Rénovation Hôtel de Ville',
      image: iconeChantier.src,
      color: '#A3A3A3',
      borderColor: '#737373',
      textColor: '#FFFFFF',
      type: 'Chantier',
      attributs: {
        code: 'CHT-004',
        identifiant: 'HDV-2024-004',
        libelle: 'Rénovation Hôtel de Ville',
        etat: 'En cours',
        chargeAffaire: 'Antoine Dubois',
        chefChantier: 'Grégory ANDRE',
        dateOS: '05/02/2024',
        dateFin: '05/11/2024',
        TM: '1800h',
        HR: '1350h',
        SH: '450h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 5,
      label: 'Extension Usine Renault Flins',
      image: iconeChantier.src,
      color: '#FFB300',
      borderColor: '#FF9800',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-005',
        identifiant: 'REN-2024-005',
        libelle: 'Extension Usine Renault Flins',
        etat: 'Planifié',
        chargeAffaire: 'Lucas BOURKIN',
        chefChantier: 'Alexandre BARRET',
        dateOS: '15/04/2024',
        dateFin: '15/12/2025',
        TM: '8500h',
        HR: '425h',
        SH: '8075h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 6,
      label: 'Construction EHPAD Les Lilas',
      image: iconeChantier.src,
      color: '#8BC34A',
      borderColor: '#689F38',
      textColor: '#FFFFFF',
      type: 'Chantier',
      attributs: {
        code: 'CHT-006',
        identifiant: 'LIL-2024-006',
        libelle: 'Construction EHPAD Les Lilas',
        etat: 'En cours',
        chargeAffaire: 'Marie LEROY',
        chefChantier: 'Vincent MOREAU',
        dateOS: '01/01/2024',
        dateFin: '01/08/2025',
        TM: '4200h',
        HR: '2310h',
        SH: '1890h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 7,
      label: 'Réhabilitation Collège Victor Hugo',
      image: iconeChantier.src,
      color: '#90CAF9',
      borderColor: '#1976D2',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-007',
        identifiant: 'VHU-2024-007',
        libelle: 'Réhabilitation Collège Victor Hugo',
        etat: 'Terminé',
        chargeAffaire: 'Céline GARCIA',
        chefChantier: 'Eric MALIVERNAY',
        dateOS: '01/06/2023',
        dateFin: '01/02/2024',
        TM: '2100h',
        HR: '2100h',
        SH: '0h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 8,
      label: 'Immeuble Le Belvédère Lyon',
      image: iconeChantier.src,
      color: '#F06292',
      borderColor: '#C2185B',
      textColor: '#FFFFFF',
      type: 'Chantier',
      attributs: {
        code: 'CHT-008',
        identifiant: 'BEL-2024-008',
        libelle: 'Immeuble Le Belvédère Lyon',
        etat: 'En cours',
        chargeAffaire: 'Sophie MARTIN',
        chefChantier: 'Thomas MOREL',
        dateOS: '01/05/2024',
        dateFin: '01/10/2025',
        TM: '6800h',
        HR: '1700h',
        SH: '5100h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 9,
      label: 'Bâtiment Industriel Toulouse',
      image: iconeChantier.src,
      color: '#FFD54F',
      borderColor: '#FFA000',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-009',
        identifiant: 'TOU-2024-009',
        libelle: 'Bâtiment Industriel Toulouse',
        etat: 'Suspendu',
        chargeAffaire: 'Julie FOURNIER',
        chefChantier: 'Frédéric GERARD',
        dateOS: '01/03/2024',
        dateFin: '01/01/2025',
        TM: '3500h',
        HR: '525h',
        SH: '2975h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 10,
      label: 'Résidence Étudiante Marseille',
      image: iconeChantier.src,
      color: '#4DD0E1',
      borderColor: '#00838F',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-010',
        identifiant: 'MAR-2024-010',
        libelle: 'Résidence Étudiante Marseille',
        etat: 'Planifié',
        chargeAffaire: 'Marine GIRARD',
        chefChantier: 'Olivier MORETTI',
        dateOS: '01/06/2024',
        dateFin: '01/12/2025',
        TM: '4100h',
        HR: '0h',
        SH: '4100h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 11,
      label: 'Centre Aquatique Bordeaux',
      image: iconeChantier.src,
      color: '#BA68C8',
      borderColor: '#7B1FA2',
      textColor: '#FFFFFF',
      type: 'Chantier',
      attributs: {
        code: 'CHT-011',
        identifiant: 'BOR-2024-011',
        libelle: 'Centre Aquatique Bordeaux',
        etat: 'En cours',
        chargeAffaire: 'Pierre ANDRE',
        chefChantier: 'Julie FOURNIER',
        dateOS: '01/02/2024',
        dateFin: '01/01/2025',
        TM: '3800h',
        HR: '2280h',
        SH: '1520h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 12,
      label: 'Rénovation Gare SNCF Strasbourg',
      image: iconeChantier.src,
      color: '#AED581',
      borderColor: '#689F38',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-012',
        identifiant: 'STR-2024-012',
        libelle: 'Rénovation Gare SNCF Strasbourg',
        etat: 'En cours',
        chargeAffaire: 'Sylvie NICOLAS',
        chefChantier: 'Patricia ROUSSEL',
        dateOS: '15/03/2024',
        dateFin: '15/09/2024',
        TM: '2200h',
        HR: '1980h',
        SH: '220h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    {
      id: 13,
      label: 'Complexe Sportif Montpellier',
      image: iconeChantier.src,
      color: '#FF8A65',
      borderColor: '#D84315',
      textColor: '#000000',
      type: 'Chantier',
      attributs: {
        code: 'CHT-013',
        identifiant: 'MTP-2024-013',
        libelle: 'Complexe Sportif Montpellier',
        etat: 'Planifié',
        chargeAffaire: 'Christophe BONNET',
        chefChantier: 'Sandrine THOMAS',
        dateOS: '01/08/2024',
        dateFin: '01/06/2025',
        TM: '4500h',
        HR: '0h',
        SH: '4500h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
      }
    },
    { 
      id: 14, 
      label: 'Congés payés', 
      image: iconeAbsenceValide.src,
      type: 'Absence',
      color: '#22C55E',
      borderColor: '#16A34A',
      textColor: '#FFFFFF',
      defaultDescription: 'Congés payés',
      category: 'Congés'
    },
    { 
      id: 15, 
      label: 'Arrêt maladie', 
      image: iconeAbsenceNonValide.src,
      type: 'Absence',
      color: '#EF4444',
      borderColor: '#DC2626',
      textColor: '#FFFFFF',
      defaultDescription: 'Arrêt maladie',
      category: 'Maladie'
    },
    { 
      id: 16, 
      label: 'Formation', 
      image: iconeAbsenceValide.src,
      type: 'Absence',
      color: '#3B82F6',
      borderColor: '#2563EB',
      textColor: '#FFFFFF',
      defaultDescription: 'Formation professionnelle',
      category: 'Formation'
    },
    { 
      id: 17, 
      label: 'RTT', 
      image: iconeAbsenceValide.src,
      type: 'Absence',
      color: '#8B5CF6',
      borderColor: '#7C3AED',
      textColor: '#FFFFFF',
      defaultDescription: 'Réduction du temps de travail',
      category: 'RTT'
    },
    { 
      id: 18, 
      label: 'Congé sans solde', 
      image: iconeAbsenceNonValide.src,
      type: 'Absence',
      color: '#F59E0B',
      borderColor: '#D97706',
      textColor: '#FFFFFF',
      defaultDescription: 'Congé sans solde',
      category: 'Congés'
    },
    { 
      id: 19, 
      label: 'Réunion équipe', 
      image: mechanic.src,
      type: 'Autre',
      color: '#06B6D4',
      borderColor: '#0891B2',
      textColor: '#FFFFFF',
      defaultDescription: 'Réunion d\'équipe',
      category: 'Réunion'
    },
    { 
      id: 20, 
      label: 'Rendez-vous client', 
      image: toolbox.src,
      color: '#EC4899',
      type: 'Autre',
      borderColor: '#DB2777',
      textColor: '#FFFFFF',
      defaultDescription: 'Rendez-vous avec le client',
      category: 'Commercial'
    },
    { 
      id: 21, 
      label: 'Visite technique', 
      image: googleEyeProtector.src,
      color: '#F97316',
      borderColor: '#EA580C',
      type: 'Autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Visite technique sur site',
      category: 'Technique'
    },
    { 
      id: 22, 
      label: 'Réunion sécurité', 
      image: vestProtect.src,
      color: '#DC2626',
      borderColor: '#B91C1C',
      type: 'Autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Réunion sécurité',
      category: 'Sécurité'
    },
    { 
      id: 23, 
      label: 'Formation technique', 
      image: wrench.src,
      color: '#7C3AED',
      borderColor: '#6D28D9',
      type: 'Autre',
      textColor: '#FFFFFF',
      defaultDescription: 'Formation technique',
      category: 'Formation'
    }
];

import iconesAbsences from './calendrier/image/Icones/Paie/Absence.svg'
export const paieitems = <PaieItem[]>([
    {
      id: 1,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Repas.svg",
      code: "38",
      libelle: "Repas St Claude",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 2,
      verrou: true,
      image: iconesAbsences.src,
      code: "48",
      libelle: "Absence (en Jour)",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 3,
      verrou: false,
      image: iconesAbsences.src,
      code: "19",
      libelle: "Accident travail",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 4,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Prime.svg",
      code: "1",
      libelle: "Acompte",
      actf: "Financier - Retenues",
      categorie: "Financier - Retenues"
    },
    {
      id: 5,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Prime.svg",
      code: "7",
      libelle: "Ancienne",
      actf: "Financier - Primes",
      categorie: "Financier - Primes"
    },
    {
      id: 6,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Astreinte.svg",
      code: "62",
      libelle: "Astreinte - Heure sup 2h (h en heure)",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 7,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "23",
      libelle: "Autorités",
      actf: "Absences - Sans Soldes",
      categorie: "Absences - Sans Soldes"
    },
    {
      id: 8,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Absence.svg",
      code: "8",
      libelle: "Avance sur salaire",
      actf: "Financier - Retenues",
      categorie: "Financier - Retenues"
    },
    {
      id: 9,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "97",
      libelle: "Boost",
      actf: "Financier - Primes",
      categorie: "Financier - Primes"
    },
    {
      id: 10,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "64",
      libelle: "Chèque déjeuner",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 11,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Absence.svg",
      code: "52",
      libelle: "Chômage partiel",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 12,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Prime.svg",
      code: "14",
      libelle: "Comité d'entreprise 46 (heure)",
      actf: "Extérieur Entreprise",
      categorie: "Extérieur Entreprise"
    },
    {
      id: 13,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Formation.svg",
      code: "31",
      libelle: "Congé de fractionnement",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 14,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/CongesPayes.svg",
      code: "21",
      libelle: "Congé parental",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 15,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/CongesPayes.svg",
      code: "22",
      libelle: "Congés payés",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 16,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/CongesPayes.svg",
      code: "32",
      libelle: "Congés solidaire",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 17,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "44",
      libelle: "Contra Four",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 18,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "43",
      libelle: "Contra Froid",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 19,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "45",
      libelle: "Contra Car",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 20,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "42",
      libelle: "Dépannage",
      actf: "Internes",
      categorie: "Internes"
    },
    {
      id: 21,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Autres.svg",
      code: "35",
      libelle: "Divers",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 22,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Prime.svg",
      code: "5",
      libelle: "Exceptionnelle",
      actf: "Financier - Primes",
      categorie: "Financier - Primes"
    },
    {
      id: 23,
      verrou: true,
      image: "/app/calendrier/image/Icones/Paie/Absence.svg",
      code: "57",
      libelle: "Finit / Formation entreprise",
      actf: "Absences - Indemnités",
      categorie: "Absences - Indemnités"
    },
    {
      id: 24,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Formation.svg",
      code: "13",
      libelle: "Formation (en heure)",
      actf: "Extérieur Entreprise",
      categorie: "Extérieur Entreprise"
    },
    {
      id: 25,
      verrou: false,
      image: "/app/calendrier/image/Icones/Paie/Formation.svg",
      code: "70",
      libelle: "Formation - Temps déplacement",
      actf: "Extérieur Entreprise",
      categorie: "Extérieur Entreprise"
    }
  ]);


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
      let selectedEvent: Evenement | null = null;
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
            if (selectedEvent.type !== 'Chantier') {
              selectedEvent = null;
            }
          }
          duration = Math.floor(Math.random() * 3) + 3; // 3 à 5 jours
          description = `Chantier de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`;
        } else if (rand < 0.8) { // 20% absences
          appointmentType = 'absence';
          while (!selectedEvent) {
            selectedEvent = Evenements[Math.floor(Math.random() * Evenements.length)];
            if (selectedEvent.type !== 'Absence') {
              selectedEvent = null;
            }
          }
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
          description = `${selectedEvent?.label} de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`;
        } else { // 20% autres
          appointmentType = 'autre';
          while (!selectedEvent) {
            selectedEvent = Evenements[Math.floor(Math.random() * Evenements.length)];
            if (selectedEvent.type !== 'Autre') {
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
          startDate: startDate,
          endDate: endDate,
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