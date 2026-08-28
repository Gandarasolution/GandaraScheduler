/**
 * @fileoverview Utilitaires pour le filtrage et la recherche
 * 
 * Ce fichier contient toutes les fonctions utilitaires pour :
 * - Filtrage des chantiers par différents critères
 * - Recherche dans les appointments et events
 * - Gestion des filtres actifs
 * - Obtention des options de filtrage
 * 
 * @utils searchAndFilterUtils
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { Appointment, Item, ChantierItem, User, SocialItem } from '../types';

// Types pour la configuration des filtres
export type FilterType = 'checkbox' | 'select' | 'radio' | 'search' | 'combobox' | 'badge';

/**
 * Type représentant une catégorie de filtre
 * - label : Nom affiché de la catégorie
 * - type : Type de filtre (checkbox, select, radio, search, badge, combobox)
 * - options : Options disponibles pour le filtre
 * - badgeColors : Couleurs optionnelles pour chaque option (uniquement pour type 'badge')
 */
export type FilterCategory = {
  label: string;
  type: FilterType;
  options: string[];
  badgeColors?: Record<string, string>;
};

export type FilterConfig = {
  [key: string]: FilterCategory;
}

export type FilterConfigWithActive = FilterConfig & {
  activeFilters?: ActiveFilters;
}

export interface ActiveFilters {
  [key: string]: string[];
}

export interface SearchAndFilterUtils {
  applyFiltersToItem: (
    chantiers: Item[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ) => Item[];

  applyFiltersToEmployees: (
    employees: User[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ) => User[];
  
  
  searchAppointments: (
    appointments: Appointment[],
    events: Item[],
    searchQuery: string
  ) => Appointment[];

  getFilterOptions: (  
    events: Item[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }) => FilterConfig;
}

/**
 * Crée une instance des utilitaires de recherche et filtrage
 * @returns Objet contenant toutes les fonctions utilitaires
 */
export const createSearchAndFilterUtils = (): SearchAndFilterUtils => {
  
  const applyFiltersToItem = (
    items: Item[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ): Item[] => {

    let filtered = [...items];
    
    // Appliquer le filtre de recherche si présent
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(chantier => {

        for (const key in chantier) {
          if ((chantier as any)[key] === undefined) continue;
          if (typeof (chantier as any)[key] !== 'string') continue;
          if ((chantier as any)[key].toLowerCase().includes(lowercasedQuery)) {
            return true;
          }
        }
        return false;
      });
    }
    
    for (const categoryKey in activeFilters) {
      const selectedOptions = activeFilters[categoryKey];
      if (selectedOptions.length === 0) continue; // Ignorer si aucune option sélectionnée
      filtered = filtered.filter(chantier => 
        selectedOptions.includes((chantier as any)[categoryKey])
      );
    }
    return filtered;
  };

  const applyFiltersToEmployees = (
    employees: User[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ): User[] => {
    let filtered = [...employees];
    
    // Appliquer le filtre de recherche si présent
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(employee => {
        for (const key in employee) {
          if ((employee as any)[key] === undefined) continue;
          if (typeof (employee as any)[key] !== 'string') continue;
          if ((employee as any)[key].toLowerCase().includes(lowercasedQuery)) {
            return true;
          }
        }
        return false;
      });
    }
    for (const categoryKey in activeFilters) {
      const selectedOptions = activeFilters[categoryKey];
      if (selectedOptions.length === 0) continue;
      filtered = filtered.filter(employee => 
        selectedOptions.includes((employee as any)[categoryKey])
      );
    }
    return filtered;
  };

  const searchAppointments = (
    appointments: Appointment[],
    events: Item[],
    searchQuery: string
  ): Appointment[] => {
    if (!searchQuery) {
      return appointments;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    
    return appointments.filter((app) => {
      // Récupérer la ressource liée au rendez-vous (comparaison robuste nombre/chaîne)
      const event = events.find(
        (e) => Number(e.IdPlanningRessource) === Number(app.IdPlanningRessource)
      );

      const haystack = [
        event?.LibellePlanningRessource,
        event?.CodePlanningRessource,
        app.AnnotationPlanningEvenement,
      ]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.toLowerCase());

      return haystack.some((value) => value.includes(lowercasedQuery));
    });
  };

  const getFilterOptions = (
    events: Item[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }
  ): FilterConfig => {
    const eventsToProcess = viewtype === 'chantier'
      ? events.filter(e => e.Type === 'Projet') as ChantierItem[]
      : events.filter(e => e.Type !== 'Projet') as SocialItem[];
    
    // Initialiser la structure avec label, type et options vides
    const result: FilterConfig = Object.entries(keyOfFilter).reduce((acc, [key, config]) => {
      acc[key] = {
        label: config.label,
        type: config.type,
        options: [],
        ...(config.badgeColors && { badgeColors: config.badgeColors })
      };
      return acc;
    }, {} as FilterConfig);

    // Collecter les options uniques pour chaque filtre
    for (const event of eventsToProcess) {
      for (const key in keyOfFilter) {
        const eventAsAny = event as any;
        if (eventAsAny[key] && !result[key].options.includes(eventAsAny[key])) {
          result[key].options.push(eventAsAny[key]);
        }
      }
    }

    // Trier les options alphabétiquement
    Object.keys(result).forEach(key => {
      result[key].options.sort();
    });

    return result;
  };

  

  return {
    applyFiltersToItem,
    applyFiltersToEmployees,
    searchAppointments,
    getFilterOptions  
  };
};

