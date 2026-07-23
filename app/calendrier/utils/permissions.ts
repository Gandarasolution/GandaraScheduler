/**
 * @fileoverview Utilitaires de gestion des permissions utilisateur
 * 
 * Ce fichier contient les fonctions pour vérifier les permissions
 * des utilisateurs selon leur rôle dans l'application.
 * 
 * Rôles disponibles :
 * - **admin** : Tous les droits (créer, modifier, supprimer tout)
 * - **manager** : Peut gérer son équipe et les événements (chantiers et social)
 * - **user** : Peut voir tout, éditer son calendrier, mais pas les rubriques sociales
 * - **viewer** : Lecture seule complète
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { UserRole, UserPermissions } from '../types';

/**
 * Récupère les permissions d'un utilisateur selon son rôle
 * @param role - Le rôle de l'utilisateur
 * @returns Les permissions de l'utilisateur
 */
export const getUserPermissions = (role?: UserRole): UserPermissions => {
  switch (role) {
    case 'admin':
      return {
        social: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
        chantier: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
        canViewAllCalendars: true,
        canEditOwnCalendar: true,
        canEditAllCalendars: true,
        canAccessSocialView: true,
        canAccessManualEventsView: true,
      };

    case 'manager':
      return {
        social: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: true,
        },
        chantier: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canDelete: false, // Les managers ne peuvent pas supprimer les chantiers
        },
        canViewAllCalendars: true,
        canEditOwnCalendar: true,
        canEditAllCalendars: true,
        canAccessSocialView: true,
        canAccessManualEventsView: true,
      };

    case 'user':
      return {
        social: {
          canView: true,
          canCreate: false, // Les utilisateurs ne peuvent pas créer de rubriques sociales
          canEdit: false,   // Les utilisateurs ne peuvent pas éditer les rubriques sociales
          canDelete: false, // Les utilisateurs ne peuvent pas supprimer les rubriques sociales
        },
        chantier: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        canViewAllCalendars: false, // Les users ne voient que leur propre calendrier
        canEditOwnCalendar: true,
        canEditAllCalendars: false,
        canAccessSocialView: false, // Les users ne peuvent pas accéder à la vue rubrique sociale
        canAccessManualEventsView: false, // Les users ne peuvent pas accéder aux événements manuels
      };

    case 'viewer':
      return {
        social: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        chantier: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        canViewAllCalendars: false, // Les viewers ne voient que leur propre calendrier
        canEditOwnCalendar: false,
        canEditAllCalendars: false,
        canAccessSocialView: false, // Les viewers ne peuvent pas accéder à la vue rubrique sociale
        canAccessManualEventsView: false, // Les viewers ne peuvent pas accéder aux événements manuels
      };

    default:
      // Par défaut, permissions minimales (équivalent à viewer)
      return {
        social: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        chantier: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        },
        canViewAllCalendars: false, // Par défaut, ne voir que son propre calendrier
        canEditOwnCalendar: false,
        canEditAllCalendars: false,
        canAccessSocialView: false,
        canAccessManualEventsView: false,
      };
  }
};

/**
 * Vérifie si un utilisateur peut créer des événements de type social
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut créer des événements sociaux
 */
export const canCreateSocialEvent = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.social.canCreate;
};

/**
 * Vérifie si un utilisateur peut éditer des événements de type social
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut éditer des événements sociaux
 */
export const canEditSocialEvent = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.social.canEdit;
};

/**
 * Vérifie si un utilisateur peut supprimer des événements de type social
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut supprimer des événements sociaux
 */
export const canDeleteSocialEvent = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.social.canDelete;
};

/**
 * Vérifie si un utilisateur peut créer des chantiers
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut créer des chantiers
 */
export const canCreateChantier = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.chantier.canCreate;
};

/**
 * Vérifie si un utilisateur peut éditer des chantiers
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut éditer des chantiers
 */
export const canEditChantier = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.chantier.canEdit;
};

/**
 * Vérifie si un utilisateur peut supprimer des chantiers
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut supprimer des chantiers
 */
export const canDeleteChantier = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.chantier.canDelete;
};

/**
 * Vérifie si un utilisateur peut éditer tous les calendriers
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut éditer tous les calendriers
 */
export const canEditAllCalendars = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.canEditAllCalendars;
};

/**
 * Vérifie si un utilisateur peut voir tous les calendriers
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut voir tous les calendriers
 */
export const canViewAllCalendars = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.canViewAllCalendars;
};

/**
 * Vérifie si un utilisateur peut créer un événement d'un type donné
 * @param role - Le rôle de l'utilisateur
 * @param eventType - Le type d'événement ('chantier', 'absence', 'autre')
 * @returns true si l'utilisateur peut créer cet événement
 */
export const canCreateEvent = (role?: UserRole, eventType?: 'Projet' | 'Paie' | 'Rubrique Perso'): boolean => {
  if (!eventType) return false;
  
  const permissions = getUserPermissions(role);
  
  if (eventType === 'Projet') {
    return permissions.chantier.canCreate;
  }
  
  // 'Paie' et 'Rubrique Perso' sont des événements sociaux
  return permissions.social.canCreate;
};

/**
 * Vérifie si un utilisateur peut éditer un événement d'un type donné
 * @param role - Le rôle de l'utilisateur
 * @param eventType - Le type d'événement ('chantier', 'absence', 'autre')
 * @returns true si l'utilisateur peut éditer cet événement
 */
export const canEditEvent = (role?: UserRole, eventType?: 'Projet' | 'Paie' | 'Rubrique Perso'): boolean => {
  if (!eventType) return false;
  
  const permissions = getUserPermissions(role);
  
  if (eventType === 'Projet') {
    return permissions.chantier.canEdit;
  }
  
  // 'Paie' et 'Rubrique Perso' sont des événements sociaux
  return permissions.social.canEdit;
};

/**
 * Vérifie si un utilisateur peut supprimer un événement d'un type donné
 * @param role - Le rôle de l'utilisateur
 * @param eventType - Le type d'événement ('chantier', 'absence', 'autre')
 * @returns true si l'utilisateur peut supprimer cet événement
 */
export const canDeleteEvent = (role?: UserRole, eventType?: 'chantier' | 'absence' | 'autre'): boolean => {
  if (!eventType) return false;
  
  const permissions = getUserPermissions(role);
  
  if (eventType === 'chantier') {
    return permissions.chantier.canDelete;
  }
  
  // 'absence' et 'autre' sont des événements sociaux
  return permissions.social.canDelete;
};

/**
 * Vérifie si un utilisateur peut accéder à la vue rubrique sociale
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut accéder à la vue rubrique sociale
 */
export const canAccessSocialView = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.canAccessSocialView;
};

/**
 * Vérifie si un utilisateur peut accéder à la vue événements manuels
 * @param role - Le rôle de l'utilisateur
 * @returns true si l'utilisateur peut accéder à la vue événements manuels
 */
export const canAccessManualEventsView = (role?: UserRole): boolean => {
  const permissions = getUserPermissions(role);
  return permissions.canAccessManualEventsView;
};

/**
 * Obtient une description lisible du rôle
 * @param role - Le rôle de l'utilisateur
 * @returns Description du rôle
 */
export const getRoleDescription = (role?: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrateur - Tous les droits';
    case 'manager':
      return 'Manager - Gestion d\'équipe et événements';
    case 'user':
      return 'Utilisateur - Édition de son calendrier uniquement';
    case 'viewer':
      return 'Visiteur - Lecture seule';
    default:
      return 'Rôle non défini';
  }
};
