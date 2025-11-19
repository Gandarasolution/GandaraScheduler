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
      TM: '2500h',        // Temps Marché
      HR: '1625h',        // Heures Réalisées (65% de 2500h)
      SH: '875h',         // Solde Heure (2500h - 1625h)
      DPF: '',        // Durée Planifiée Future
      RPF: '',          // Réalisé - Planif Future
      AP: '',          // Avancement prévisionnel
      SP: ''           // Solde Prévisionnel
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
        TM: '5800h',        // Temps Marché
        HR: '580h',         // Heures Réalisées (10% de 5800h)
        SH: '5220h',        // Solde Heure (5800h - 580h)
        DPF: '',       // Durée Planifiée Future
        RPF: '',          // Réalisé - Planif Future
        AP: '',          // Avancement prévisionnel
        SP: ''           // Solde Prévisionnel
  
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
        TM: '3200h',        // Temps Marché
        HR: '1280h',        // Heures Réalisées (40% de 3200h)
        SH: '1920h',        // Solde Heure (3200h - 1280h)
        DPF: '',       // Durée Planifiée Future
        RPF: '',          // Réalisé - Planif Future
        AP: '',          // Avancement prévisionnel
        SP: ''           // Solde Prévisionnel
 
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
        TM: '1800h',
        HR: '1350h',
        SH: '450h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
     
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
        TM: '8500h',
        HR: '425h',
        SH: '8075h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
   
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
        TM: '4200h',
        HR: '2310h',
        SH: '1890h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''

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
        TM: '2100h',
        HR: '2100h',
        SH: '0h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
  
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
        TM: '6800h',
        HR: '1700h',
        SH: '5100h',
        DPF: '',
        RPF: '',
        AP: '',

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
        TM: '3500h',
        HR: '525h',
        SH: '2975h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''

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
        TM: '4100h',
        HR: '0h',
        SH: '4100h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
 
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
        TM: '3800h',
        HR: '2280h',
        SH: '1520h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
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
        TM: '2200h',
        HR: '1980h',
        SH: '220h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
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
        TM: '4500h',
        HR: '0h',
        SH: '4500h',
        DPF: '',
        RPF: '',
        AP: '',
        SP: ''
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
      TM: '3400h',
      HR: '1360h',
      SH: '2040h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '5200h',
      HR: '0h',
      SH: '5200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''

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
      TM: '7600h',
      HR: '3800h',
      SH: '3800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''

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
      TM: '4100h',
      HR: '0h',
      SH: '4100h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''

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
      TM: '6200h',
      HR: '3720h',
      SH: '2480h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
 
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
      TM: '4500h',
      HR: '2250h',
      SH: '2250h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '5300h',
      HR: '0h',
      SH: '5300h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
  
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
      TM: '4000h',
      HR: '1800h',
      SH: '2200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '3100h',
      HR: '3100h',
      SH: '0h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '5400h',
      HR: '2700h',
      SH: '2700h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '2800h',
      HR: '1820h',
      SH: '980h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '3900h',
      HR: '0h',
      SH: '3900h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '5800h',
      HR: '2320h',
      SH: '3480h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
   
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
      TM: '4600h',
      HR: '0h',
      SH: '4600h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
 
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
      TM: '2900h',
      HR: '2100h',
      SH: '800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
  
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
      TM: '6300h',
      HR: '0h',
      SH: '6300h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
 
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
      TM: '3100h',
      HR: '1550h',
      SH: '1550h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
 
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
      TM: '3800h',
      HR: '0h',
      SH: '3800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4800h',
      HR: '1920h',
      SH: '2880h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '7200h',
      HR: '3600h',
      SH: '3600h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4200h',
      HR: '0h',
      SH: '4200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '6900h',
      HR: '3100h',
      SH: '3800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '5700h',
      HR: '2600h',
      SH: '3100h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '3900h',
      HR: '0h',
      SH: '3900h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '5100h',
      HR: '2550h',
      SH: '2550h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4800h',
      HR: '0h',
      SH: '4800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '3600h',
      HR: '1800h',
      SH: '1800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4400h',
      HR: '3080h',
      SH: '1320h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '3800h',
      HR: '3800h',
      SH: '0h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
    
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
      TM: '5000h',
      HR: '0h',
      SH: '5000h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '6400h',
      HR: '3200h',
      SH: '3200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '7200h',
      HR: '0h',
      SH: '7200h',
      DPF: '',
      RPF: '',
      AP: '',
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
      TM: '5300h',
      HR: '2120h',
      SH: '3180h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
 
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
      TM: '3800h',
      HR: '0h',
      SH: '3800h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''

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
      TM: '4700h',
      HR: '2350h',
      SH: '2350h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '3900h',
      HR: '0h',
      SH: '3900h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '3500h',
      HR: '1750h',
      SH: '1750h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '7100h',
      HR: '3550h',
      SH: '3550h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4100h',
      HR: '0h',
      SH: '4100h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '6400h',
      HR: '3200h',
      SH: '3200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
    TM: '4300h',
    HR: '2150h',
    SH: '2150h',
    DPF: '',
    RPF: '',
    AP: '',
    SP: ''
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
    TM: '3900h',
    HR: '0h',
    SH: '3900h',
    DPF: '',
    RPF: '',
    AP: '',
    SP: ''
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
      TM: '6200h',
      HR: '3720h',
      SH: '2480h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '3100h',
      HR: '0h',
      SH: '3100h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '4800h',
      HR: '1920h',
      SH: '2880h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '5200h',
      HR: '0h',
      SH: '5200h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''
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
      TM: '6100h',
      HR: '3050h',
      SH: '3050h',
      DPF: '',
      RPF: '',
      AP: '',
      SP: ''

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
    TM: '3500h',
    HR: '3500h',
    SH: '0h',
    DPF: '',
    RPF: '',
    AP: '',
    SP: ''
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
    TM: '6700h',
    HR: '3350h',
    SH: '3350h',
    DPF: '',
    RPF: '',
    AP: '',
    SP: ''
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
    TM: '4600h',
    HR: '0h',
    SH: '4600h',
    DPF: '',
    RPF: '',
    AP: '',
    SP: ''
  },
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
    const image = Images.find(img => img.id === event.image)?.image || null;    

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
      image: Images.find(img => img.id === emp.image)?.image || undefined,
      code: emp.code,
      group: initialTeams.find(group => group.id === emp.groupId) || undefined
    }
  });

}


export const getImages = (): Image[] => {
  return Images;
}



export const initialAppointments: Appointment[] = generateAppointments(getEmployees());
