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

import { Appointment, Employee, Groupe, EventTemplate, EventType } from './calendrier/types/index';

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

// ===== BASE DE DONNÉES CHANTIERS DÉTAILLÉS =====

/**
 * Interface définissant un chantier avec ses attributs détaillés
 * Structure organisée pour simuler une base de données réaliste
 * 
 * === STRUCTURE DE LA BASE DE DONNÉES CHANTIERS ===
 * Cette section simule une vraie base de données avec :
 * 
 * 🏗️ DONNÉES MÉTIER COHÉRENTES :
 * - Codes de référence structurés (CHT-XXX)
 * - Identifiants géographiques (VES-2024-001, PAR-2024-002...)
 * - États logiques et progressions cohérentes
 * - Budgets et durées réalistes selon le type de projet
 * 
 * 👥 RESSOURCES HUMAINES :
 * - Chargés d'affaires et chefs de chantier référencés
 * - Équipes géographiques organisées
 * - Correspondance avec la base employés
 * 
 * 📊 GESTION DE PROJET AVANCÉE :
 * - Dates OS (Ordre de Service) et fins prévisionnelles
 * - Temps Marché (TM) et Heures Réalisées (HR)
 * - Solde Heure (SH) et Durée Planifiée Future (DPF)
 * - Avancement prévisionnel (AP) et Solde Prévisionnel (SP)
 * - Calculs de performance et indicateurs KPI
 * 
 * 🎯 STRUCTURE ORGANISÉE EN CATÉGORIES :
 * - Informations Générales : Image, Code, Identifiant, Libellé, État, Responsables, Dates
 * - Analyse Chantier : TM, HR, SH, DPF, RPF, AP, SP (indicateurs métier spécialisés)
 * 
 * 💡 UTILISATION :
 * - Source unique de vérité pour les chantiers
 * - Liaison avec les EventTemplate pour le calendrier  
 * - Fonctions utilitaires d'accès et de statistiques
 * - Compatible avec le système de tableau ChantierTableFrame
 * - Indicateurs de performance calculés automatiquement
 */
export interface ChantierDetailed {
  id: number;
  label: string;
  image?: string;
  attributs: {
    // === CATÉGORIE INFORMATIONS GÉNÉRALES ===
    image?: string;
    code: string;
    identifiant: string;
    libelle: string;
    etat: string;
    chargeAffaire: string;
    chefChantier: string;
    dateOS: string;
    dateFin: string;
    // === CATÉGORIE ANALYSE CHANTIER ===
    TM: string;        // Temps Marché
    HR: string;        // Heures Réalisées  
    SH: string;        // Solde Heure
    DPF: string;       // Durée Planifiée Future
    RPF: string;       // Réalisé - Planif Future
    AP: string;        // Avancement prévisionnel
    SP: string;        // Solde Prévisionnel
  };
}

/**
 * Base de données complète des chantiers avec informations détaillées
 * BASE ÉTENDUE : 13 chantiers détaillés couvrant diverses régions françaises
 * 
 * 🏗️ DIVERSITÉ GÉOGRAPHIQUE :
 * - Vesoul, Paris, Reims, Dijon, Flins, Les Lilas (Nord/Est)
 * - Lyon, Toulouse, Marseille (Sud/Sud-Est) 
 * - Bordeaux, Strasbourg, Montpellier (Nouveaux ajouts 2024)
 * 
 * 📊 TYPES DE PROJETS :
 * - Logements sociaux et résidences (4 projets)
 * - Établissements publics (écoles, gares, mairies) (4 projets)
 * - Infrastructures industrielles et commerciales (3 projets)
 * - Équipements sportifs et de loisirs (2 projets)
 * 
 * ⚡ ÉTATS ET PROGRESSIONS RÉALISTES :
 * - En cours (6) : 25% à 90% d'avancement
 * - Planifiés (4) : 0% à 10% d'avancement
 * - Terminés (1) : 100% terminé
 * - Suspendus (1) : 15% suspendu
 * - Nouvelle balance : 1 terminé proche + nouveaux projets 2024
 * 
 * 💼 ÉQUIPES DIVERSIFIÉES :
 * - 13 chefs de chantier différents issus de la base employés
 * - Répartition équilibrée des responsabilités
 * - Correspondance avec les équipes régionales
 */
export const chantiersDetailles: ChantierDetailed[] = [
    // Nouveaux chantiers détaillés
    {
      id: 1,
      label: '1052 Logements Vesoul',
      image: iconeChantier.src,
      attributs: {
        // Informations Générales
        image: iconeChantier.src,
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
        DPF: '875h',        // Durée Planifiée Future
        RPF: '0h',          // Réalisé - Planif Future
        AP: '65%',          // Avancement prévisionnel
        SP: '35%'           // Solde Prévisionnel
      }
    },
    {
      id: 2,
      label: 'Résidence Les Jardins de Paris',
      image: iconeChantier.src,
      attributs: {
        // Informations Générales
        image: iconeChantier.src,
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
        DPF: '5220h',       // Durée Planifiée Future
        RPF: '0h',          // Réalisé - Planif Future
        AP: '10%',          // Avancement prévisionnel
        SP: '90%'           // Solde Prévisionnel
      }
    },
    {
      id: 3,
      label: 'Chantier Lycée Jean Moulin',
      image: iconeChantier.src,
      attributs: {
        // Informations Générales
        image: iconeChantier.src,
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
        DPF: '1920h',       // Durée Planifiée Future
        RPF: '0h',          // Réalisé - Planif Future
        AP: '40%',          // Avancement prévisionnel
        SP: '60%'           // Solde Prévisionnel
      }
    },
    // Chantiers existants avec données enrichies
    {
      id: 4,
      label: 'Rénovation Hôtel de Ville',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '450h',
        RPF: '0h',
        AP: '75%',
        SP: '25%'
      }
    },
    {
      id: 5,
      label: 'Extension Usine Renault Flins',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '8075h',
        RPF: '0h',
        AP: '5%',
        SP: '95%'
      }
    },
    {
      id: 6,
      label: 'Construction EHPAD Les Lilas',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '1890h',
        RPF: '0h',
        AP: '55%',
        SP: '45%'
      }
    },
    {
      id: 7,
      label: 'Réhabilitation Collège Victor Hugo',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '0h',
        RPF: '0h',
        AP: '100%',
        SP: '0%'
      }
    },
    {
      id: 8,
      label: 'Immeuble Le Belvédère Lyon',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '5100h',
        RPF: '0h',
        AP: '25%',
        SP: '75%'
      }
    },
    {
      id: 9,
      label: 'Bâtiment Industriel Toulouse',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '2975h',
        RPF: '0h',
        AP: '15%',
        SP: '85%'
      }
    },
    {
      id: 10,
      label: 'Résidence Étudiante Marseille',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '4100h',
        RPF: '0h',
        AP: '0%',
        SP: '100%'
      }
    },
    {
      id: 11,
      label: 'Centre Aquatique Bordeaux',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '1520h',
        RPF: '0h',
        AP: '60%',
        SP: '40%'
      }
    },
    {
      id: 12,
      label: 'Rénovation Gare SNCF Strasbourg',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '220h',
        RPF: '0h',
        AP: '90%',
        SP: '10%'
      }
    },
    {
      id: 13,
      label: 'Complexe Sportif Montpellier',
      image: iconeChantier.src,
      attributs: {
        image: iconeChantier.src,
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
        DPF: '4500h',
        RPF: '0h',
        AP: '0%',
        SP: '100%'
      }
    }
];

export const chantier: EventTemplate[] = [
    // Les 13 premiers correspondent aux chantiers détaillés (ajout de 3 nouveaux)
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
    { id: 11 , label: 'Centre Aquatique Bordeaux' , image: iconeChantier.src},
    { id: 12 , label: 'Rénovation Gare SNCF Strasbourg' , image: iconeChantier.src},
    { id: 13 , label: 'Complexe Sportif Montpellier' , image: iconeChantier.src},
    // Chantiers supplémentaires pour compléter la liste
    { id: 14 , label: 'Villa Moderne Cannes', image: iconeChantier.src},
    { id: 15 , label: 'Centre Commercial Avignon', image: iconeChantier.src},
    { id: 16 , label: 'Piscine Municipale Nice', image: iconeChantier.src},
    { id: 17 , label: 'Rénovation Théâtre Antique', image: iconeChantier.src},
    { id: 18 , label: 'Parking Souterrain Montpellier', image: iconeChantier.src},
    { id: 19 , label: 'Bureaux Tech Park Sophia', image: iconeChantier.src},
    { id: 20 , label: 'Clinique Sainte-Marie Toulon', image: iconeChantier.src},
    { id: 21 , label: 'Stade Municipal Perpignan', image: iconeChantier.src},
    { id: 22 , label: 'Médiathèque Nîmes Centre', image: iconeChantier.src},
    { id: 23 , label: 'Hôtel 4 étoiles Saint-Tropez', image: iconeChantier.src}
];

/**
 * Fonction utilitaire pour récupérer un chantier détaillé par son ID
 * @param chantierId - ID du chantier recherché
 * @returns Chantier détaillé ou undefined si non trouvé
 */
export const getChantierDetailById = (chantierId: number): ChantierDetailed | undefined => {
    return chantiersDetailles.find(chantier => chantier.id === chantierId);
};

/**
 * Fonction utilitaire pour obtenir tous les chantiers avec leurs détails (si disponibles)
 * Combine les EventTemplate basiques avec les données détaillées quand elles existent
 */
export const getAllChantiersWithDetails = () => {
    return chantier.map(chantierTemplate => {
        const chantierDetail = getChantierDetailById(chantierTemplate.id);
        return {
            ...chantierTemplate,
            details: chantierDetail?.attributs || null
        };
    });
};

/**
 * Fonction utilitaire pour obtenir les statistiques des chantiers
 */
export const getChantierStats = () => {
    const stats = {
        total: chantiersDetailles.length,
        enCours: chantiersDetailles.filter(c => c.attributs.etat === 'En cours').length,
        planifies: chantiersDetailles.filter(c => c.attributs.etat === 'Planifié').length,
        termines: chantiersDetailles.filter(c => c.attributs.etat === 'Terminé').length,
        suspendus: chantiersDetailles.filter(c => c.attributs.etat === 'Suspendu').length,
        // Calcul basé sur le Temps Marché total (TM)
        tempsTotal: chantiersDetailles.reduce((total, chantier) => {
            const tempsMarche = parseInt(chantier.attributs.TM.replace(/[h\s]/g, '')) || 0;
            return total + tempsMarche;
        }, 0),
        // Calcul des heures réalisées total
        heuresRealisees: chantiersDetailles.reduce((total, chantier) => {
            const heuresReal = parseInt(chantier.attributs.HR.replace(/[h\s]/g, '')) || 0;
            return total + heuresReal;
        }, 0),
        // Pourcentage d'avancement moyen
        avancementMoyen: Math.round(
            chantiersDetailles.reduce((total, chantier) => {
                const avancement = parseInt(chantier.attributs.AP.replace(/[%\s]/g, '')) || 0;
                return total + avancement;
            }, 0) / chantiersDetailles.length
        )
    };
    return stats;
};

// ===== EXEMPLES D'UTILISATION BDD CHANTIERS =====

/**
 * Exemple d'utilisation des fonctionnalités de la base de données chantiers
 * Base de données étendue à 13 chantiers détaillés avec indicateurs complets
 * Décommentez pour tester dans la console
 */
/*
console.log('🏗️ === DEMO BASE DE DONNÉES CHANTIERS ===');

// 1. Statistiques générales avec nouveaux indicateurs
const stats = getChantierStats();
console.log('📊 Statistiques (13 chantiers):', {
  ...stats,
  tempsTotal: `${stats.tempsTotal}h`,
  heuresRealisees: `${stats.heuresRealisees}h`,
  avancementMoyen: `${stats.avancementMoyen}%`
});

// 2. Nouveaux chantiers ajoutés
const nouveauxChantiers = [11, 12, 13];
nouveauxChantiers.forEach(id => {
  const chantier = getChantierDetailById(id);
  if (chantier) {
    console.log(`� Nouveau chantier ${id}:`, {
      nom: chantier.label,
      etat: chantier.attributs.etat,
      avancement: chantier.attributs.AP,
      responsable: chantier.attributs.chargeAffaire
    });
  }
});

// 3. Analyse par secteur géographique
const villes = ['Bordeaux', 'Strasbourg', 'Montpellier'];
villes.forEach(ville => {
  const chantiersVille = chantiersDetailles.filter(c => 
    c.attributs.identifiant.includes(ville.substring(0, 3).toUpperCase())
  );
  console.log(`🏙️ Chantiers ${ville}:`, chantiersVille.map(c => c.label));
});

// 4. Chantiers proches de la fin (>= 90% d'avancement)
const chantiersPresqueFinis = chantiersDetailles.filter(c => 
  parseInt(c.attributs.AP.replace('%', '')) >= 90
);
console.log('🏁 Chantiers bientôt terminés (>=90%):',
  chantiersPresqueFinis.map(c => ({
    nom: c.label,
    avancement: c.attributs.AP,
    heuresRestantes: c.attributs.SH,
    finPrevue: c.attributs.dateFin
  }))
);

// 5. Répartition par équipe de chefs de chantier
const chefEquipes = [...new Set(chantiersDetailles.map(c => c.attributs.chefChantier))];
chefEquipes.forEach(chef => {
  const chantiersChef = chantiersDetailles.filter(c => c.attributs.chefChantier === chef);
  const totalHeures = chantiersChef.reduce((sum, c) => 
    sum + parseInt(c.attributs.HR.replace('h', '')), 0
  );
  console.log(`👷 Chef ${chef}: ${chantiersChef.length} chantiers, ${totalHeures}h réalisées`);
});
*/

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


 // --- CRÉATION DES EVENTTYPES À PARTIR DES TEMPLATES ---
  // Convertir les templates en EventTypes avec les nouvelles propriétés
  const chantiersEventTypes: EventType[] = chantier.map((item, index) => ({
    id: index + 1,
    name: item.label,
    label: item.label,
    category: "Chantier",
    image: item.image,
    color: colors[index % colors.length]?.color || "#007BFF",
    borderColor: colors[index % colors.length]?.color || "#007BFF",
    textColor: "#FFFFFF",
    defaultDescription: `Projet ${item.label}`
  }));

  const absencesEventTypes: EventType[] = absences.map((item, index) => ({
    id: index + 21,
    name: item.label,
    label: item.label,
    category: "Absence",
    image: item.image,
    color: colors[(index + chantier.length) % colors.length]?.color || "#DC2626",
    borderColor: colors[(index + chantier.length) % colors.length]?.color || "#DC2626",
    textColor: "#FFFFFF",
    defaultDescription: `Absence: ${item.label}`
  }));

  const autresEventTypes: EventType[] = autres.map((item, index) => ({
    id: index + 34,
    name: item.label,
    label: item.label,
    category: "Autre",
    image: item.image,
    color: colors[(index + chantier.length + absences.length) % colors.length]?.color || "#059669",
    borderColor: colors[(index + chantier.length + absences.length) % colors.length]?.color || "#059669",
    textColor: "#FFFFFF",
    defaultDescription: `Événement: ${item.label}`
  }));

  const allEventTypes: EventType[] = [...chantiersEventTypes, ...absencesEventTypes, ...autresEventTypes];

// Export des EventTypes
export { chantiersEventTypes, absencesEventTypes, autresEventTypes, allEventTypes };


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
      let eventType: EventType = chantiersEventTypes[0]; // Valeur par défaut
      let duration: number = 1;
      
      // Essayer de trouver un créneau libre jusqu'à 100 tentatives
      while (!isValid && attempts < 100) {
        attempts++;
        
        // Choisir le type d'événement
        const rand = Math.random();
        if (rand < 0.6) { // 60% chantiers
          eventType = chantiersEventTypes[Math.floor(Math.random() * chantiersEventTypes.length)];
          duration = Math.floor(Math.random() * 3) + 3; // 3 à 5 jours
        } else if (rand < 0.8) { // 20% absences
          eventType = absencesEventTypes[Math.floor(Math.random() * absencesEventTypes.length)];
          duration = Math.floor(Math.random() * 2) + 1; // 1 à 2 jours
        } else { // 20% autres
          eventType = autresEventTypes[Math.floor(Math.random() * autresEventTypes.length)];
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
        
        appointments.push({
          id: appointmentId++,
          description: eventType.defaultDescription || `${eventType.category} de ${duration} jour${duration > 1 ? 's' : ''} pour ${employee.name}`,
          startDate: startDate,
          endDate: endDate,
          employeeId: employee.id,
          eventTypeId: eventType.id
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