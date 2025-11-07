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

import { Appointment, Evenement, ChantierEvent, Employee, SocialEvent } from '../types';

// Types pour la configuration des filtres
type FilterType = 'checkbox' | 'select' | 'radio' | 'search' | 'combobox' | 'badge';

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
  applyFiltersToChantiers: (
    chantiers: ChantierEvent[],
    searchQuery: string,
    activeFilters: ActiveFilters
  ) => ChantierEvent[];
  
  searchAppointments: (
    appointments: Appointment[],
    events: Evenement[],
    searchQuery: string
  ) => Appointment[];

  getFilterOptions: (  
    events: Evenement[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }) => FilterConfig;

  createEmptyFilters: () => ActiveFilters;
  
  filterEventsBySearch: (
    events: Evenement[],
    searchQuery: string
  ) => Evenement[];
}

/**
 * Crée une instance des utilitaires de recherche et filtrage
 * @returns Objet contenant toutes les fonctions utilitaires
 */
export const createSearchAndFilterUtils = (): SearchAndFilterUtils => {
  
  const applyFiltersToChantiers = (
    chantiers: ChantierEvent[],
    searchQuery: string,
    activeFilters: ActiveFilters
  ): ChantierEvent[] => {
    let filtered = [...chantiers];
    
    // Appliquer le filtre de recherche si présent
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(chantier => 
        chantier.libelle.toLowerCase().includes(lowercasedQuery) || 
        chantier.chefChantier.toLowerCase().includes(lowercasedQuery) ||
        chantier.chargeAffaire.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    // Appliquer les filtres par état
    if (activeFilters.etat.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.etat.includes(chantier.etat)
      );
    }
    
    // Appliquer les filtres par chargé d'affaire
    if (activeFilters.chargeAffaire.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.chargeAffaire.includes(chantier.chargeAffaire)
      );
    }
    
    // Appliquer les filtres par chef de chantier
    if (activeFilters.chefChantier.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.chefChantier.includes(chantier.chefChantier)
      );
    }
    
    return filtered;
  };

  const searchAppointments = (
    appointments: Appointment[],
    events: Evenement[],
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
    events: Evenement[], 
    viewtype: 'chantier' | null, 
    keyOfFilter: { [key: string]: { label: string; type: FilterType; badgeColors?: Record<string, string> } }
  ): FilterConfig => {
    const eventsToProcess = viewtype === 'chantier'
      ? events.filter(e => e.type === 'chantier') as ChantierEvent[]
      : events.filter(e => e.type !== 'chantier') as SocialEvent[];
    
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

  const filterEventsBySearch = (
    events: Evenement[],
    searchQuery: string
  ): Evenement[] => {
    if (!searchQuery) {
      return events;
    }

    const lowercasedQuery = searchQuery.toLowerCase();
    
    return events.filter(event => {
      // Recherche dans le label
      if (event.label.toLowerCase().includes(lowercasedQuery)) {
        return true;
      }
      
      // Recherche dans les attributs selon le type
      if (event.type === 'chantier') {
        const chantierEvent = event as ChantierEvent;
        return (
          chantierEvent.libelle.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.chefChantier.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.chargeAffaire.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.etat.toLowerCase().includes(lowercasedQuery)
        );
      }
      
      return false;
    });
  };

  return {
    applyFiltersToChantiers,
    searchAppointments,
    getFilterOptions,
    createEmptyFilters,
    filterEventsBySearch
  };
};

