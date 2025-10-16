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

import { Appointment, Evenement, ChantierEvent, Employee } from '../types';

export interface FilterOptions {
  etats: string[];
  chargeAffaires: string[];
  chefChantiers: string[];
}

export interface ActiveFilters {
  etat: string[];
  chargeAffaire: string[];
  chefChantier: string[];
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
  
  getFilterOptions: (chantiers: ChantierEvent[]) => FilterOptions;
  
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
        chantier.attributs.libelle.toLowerCase().includes(lowercasedQuery) || 
        chantier.attributs.chefChantier.toLowerCase().includes(lowercasedQuery) ||
        chantier.attributs.chargeAffaire.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    // Appliquer les filtres par état
    if (activeFilters.etat.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.etat.includes(chantier.attributs.etat)
      );
    }
    
    // Appliquer les filtres par chargé d'affaire
    if (activeFilters.chargeAffaire.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.chargeAffaire.includes(chantier.attributs.chargeAffaire)
      );
    }
    
    // Appliquer les filtres par chef de chantier
    if (activeFilters.chefChantier.length > 0) {
      filtered = filtered.filter(chantier => 
        activeFilters.chefChantier.includes(chantier.attributs.chefChantier)
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

  const getFilterOptions = (chantiers: ChantierEvent[]): FilterOptions => {
    const etats = [...new Set(chantiers.map(c => c.attributs.etat))].sort();
    const chargeAffaires = [...new Set(chantiers.map(c => c.attributs.chargeAffaire))].sort();
    const chefChantiers = [...new Set(chantiers.map(c => c.attributs.chefChantier))].sort();
    
    return { etats, chargeAffaires, chefChantiers };
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
          chantierEvent.attributs.libelle.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.attributs.chefChantier.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.attributs.chargeAffaire.toLowerCase().includes(lowercasedQuery) ||
          chantierEvent.attributs.etat.toLowerCase().includes(lowercasedQuery)
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

/**
 * Hook personnalisé pour la gestion des filtres et de la recherche
 * @param events - Liste des événements
 * @param appointments - Liste des rendez-vous
 * @returns Utilitaires et état pour la recherche et le filtrage
 */
export const useSearchAndFilter = (
  events: Evenement[],
  appointments: Appointment[]
) => {
  const utils = createSearchAndFilterUtils();
  
  // Extraire les chantiers des événements
  const chantiers = events.filter(e => e.type === 'chantier') as ChantierEvent[];
  
  // Obtenir les options de filtrage disponibles
  const filterOptions = utils.getFilterOptions(chantiers);
  
  return {
    ...utils,
    chantiers,
    filterOptions
  };
};