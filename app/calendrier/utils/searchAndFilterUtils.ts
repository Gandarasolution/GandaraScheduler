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

import { Appointment, Item, ChantierItem, Employee, SocialItem } from '../types';

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

export interface ActiveFilters {
  [key: string]: string[];
}

export interface SearchAndFilterUtils {
  applyFilters: (
    chantiers: Item[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ) => Item[];
  
  
  searchAppointments: (
    appointments: Appointment[],
    events: Item[],
    searchQuery: string
  ) => Appointment[];

  getFilterOptions: (  
    events: Item[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }) => FilterConfig;

  createEmptyFilters: () => ActiveFilters;
}

/**
 * Crée une instance des utilitaires de recherche et filtrage
 * @returns Objet contenant toutes les fonctions utilitaires
 */
export const createSearchAndFilterUtils = (): SearchAndFilterUtils => {
  
  const applyFilters = (
    chantiers: Item[],
    searchQuery: string,
    activeFilters: ActiveFilters,
  ): Item[] => {

    let filtered = [...chantiers];
    
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

  const searchAppointments = (
    appointments: Appointment[],
    events: Item[],
    searchQuery: string
  ): Appointment[] => {
    if (!searchQuery) {
      return appointments;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    
    return appointments
      .map(app => {
        // Récupérer les informations selon le type de rendez-vous
        const event = events.find(e => e.id === app.EventId);
        const title = event?.label || '';
        const description = app.description || '';
        
        // Vérifier si la recherche correspond
        if (
          title.toLowerCase().includes(lowercasedQuery) ||
          description.toLowerCase().includes(lowercasedQuery)
        ) {
          return app;
        }
        return undefined;
      })
      .filter((app): app is Appointment => app !== undefined);
  };

  const getFilterOptions = (
    events: Item[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }
  ): FilterConfig => {
    const eventsToProcess = viewtype === 'chantier'
      ? events.filter(e => e.type === 'chantier') as ChantierItem[]
      : events.filter(e => e.type !== 'chantier') as SocialItem[];
    
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

  const createEmptyFilters = (): ActiveFilters => ({
    etat: [],
    chargeAffaire: [],
    chefChantier: []
  });

  

  return {
    applyFilters,
    searchAppointments,
    getFilterOptions,
    createEmptyFilters,
  };
};

