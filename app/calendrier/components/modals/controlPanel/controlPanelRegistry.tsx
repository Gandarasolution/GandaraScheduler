import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { GroupIcon } from '../../index';

export type ControlPanelCategoryKey =
  | 'daysManagement'
  | 'mobileAppointmentFields'
  | 'displaySettings'
  | 'calendarConfigurations'
  | 'teamsManagement';


export interface ControlPanelCategoryMeta {
  key: ControlPanelCategoryKey;
  label: string; // Libellé dans le menu
  categoryTitle: string; // Titre de la section dans ControlPanelModal
  /** Où afficher l'entrée dans le header : 'settings' (roue crantée) ou 'workspace' (changer d'espace) */
  menuLocation: 'settings' | 'workspace';
  /** Ajoute un séparateur avant cet élément dans le dropdown */
  dividerBefore?: boolean;
  /** Vérifie si l'utilisateur a accès à cette catégorie */
  isAllowed: (hasPermission: (moduleId: number, actionId: number) => boolean) => boolean;
  /** Icône affichée dans le dropdown du Header */
  icon: React.ReactNode;
}

export const CONTROL_PANEL_CATEGORIES: ControlPanelCategoryMeta[] = [
  {
    key: 'daysManagement',
    label: 'Gestion des jours',
    categoryTitle: 'Gestion des jours',
    menuLocation: 'settings',
    isAllowed: (hasPermission) => hasPermission(224, 3) && hasPermission(223, 3),
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
      </svg>
    ),
  },
  {
    key: 'mobileAppointmentFields',
    label: 'Affichage mobile',
    categoryTitle: 'Affichage mobile des événements',
    menuLocation: 'settings',
    isAllowed: (hasPermission) => hasPermission(230, 3),
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M3 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm6 11a1 1 0 1 0-2 0 1 1 0 0 0 2 0" />
      </svg>
    ),
  },
  {
    key: 'displaySettings',
    label: "Options d'affichage",
    categoryTitle: 'Options d’affichage',
    menuLocation: 'settings',
    isAllowed: (hasPermission) => hasPermission(230, 3),
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
        <path d="M2 2v4.586l7 7L13.586 9l-7-7H2zM1 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 1 6.586z" />
        <path d="M4.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1" />
      </svg>
    ),
  },
  {
    key: 'calendarConfigurations',
    label: 'Gestion des vues',
    categoryTitle: 'Gestion des vues',
    menuLocation: 'settings',
    dividerBefore: true,
    isAllowed: (hasPermission) => hasPermission(221, 3),
    icon: <LayoutTemplate />,
  },
  {
    key: 'teamsManagement',
    label: 'Gestion des équipes',
    categoryTitle: 'Gestion des équipes',
    menuLocation: 'workspace',
    isAllowed: (hasPermission) => hasPermission(172, 3),
    icon: <GroupIcon />,
  },
];

export const CONTROL_PANEL_META_BY_KEY = Object.fromEntries(
  CONTROL_PANEL_CATEGORIES.map((cat) => [cat.key, cat])
) as Record<ControlPanelCategoryKey, ControlPanelCategoryMeta>;