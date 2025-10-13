/**
 * @fileoverview Utilitaires de tri pour les tableaux
 * 
 * Fonctions generiques de tri pour :
 * - Tri par colonnes avec direction
 * - Gestion de l'état de tri
 * - Tri spécialisé par type de données
 * 
 * @module SortUtils
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { ChantierEvent, AbsenceEvent, AutreEvent, Appointment } from '../types';
import { calculateDPF, calculateRPF, calculateAP, calculateSP } from './chantierCalculations';

/**
 * Configuration de tri
 */
export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

type ItemType = ChantierEvent | AbsenceEvent | AutreEvent;

/**
 * Compare deux valeurs en tenant compte du tri numérique et alphabétique
 */
const compareValues = (a: string | number, b: string | number): number => {
  // Conversion en nombres si possible
  const numA = typeof a === 'string' ? parseFloat(a.replace(/[^\d.-]/g, '')) : a;
  const numB = typeof b === 'string' ? parseFloat(b.replace(/[^\d.-]/g, '')) : b;
  
  // Si les deux valeurs sont des nombres valides
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  
  // Sinon, comparaison alphabétique
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  return strA.localeCompare(strB);
};

/**
 * Obtient la valeur d'un attribut pour le tri
 */
const getSortValue = (
  item: ItemType,
  key: string,
  dataType: 'chantier' | 'paie',
  appointments: Appointment[]
): string => {
  if (!item) return '';
  
  if (dataType === 'chantier') {
    const chantier = item as ChantierEvent;
    
    switch (key) {
      case 'DPF':
        return calculateDPF(chantier.id, appointments);
      case 'RPF':
        return calculateRPF(chantier, appointments);
      case 'AP':
        return calculateAP(chantier, appointments);
      case 'SP':
        return calculateSP(chantier, appointments);
      default:
        // Propriétés de base
        if (key in chantier) {
          return String((chantier as any)[key]);
        }
        // Attributs spécifiques
        if (chantier.attributs && key in chantier.attributs) {
          return String(chantier.attributs[key as keyof typeof chantier.attributs]);
        }
        return '';
    }
  } else {
    // Paie
    const paieItem = item as AbsenceEvent | AutreEvent;
    
    if (key === 'verrou') {
      return paieItem.verrou ? 'Oui' : 'Non';
    }
    
    if (key in paieItem) {
      return String((paieItem as any)[key]);
    }
    
    return '';
  }
};

/**
 * Trie un tableau d'éléments selon la configuration de tri
 */
export const sortItems = (
  items: ItemType[],
  sortConfig: SortConfig,
  dataType: 'chantier' | 'paie',
  appointments: Appointment[]
): ItemType[] => {
  if (!sortConfig.key) return [...items];
  
  return [...items].sort((a, b) => {
    if (!a || !b) return 0;
    
    const aValue = getSortValue(a, sortConfig.key!, dataType, appointments);
    const bValue = getSortValue(b, sortConfig.key!, dataType, appointments);
    
    const comparison = compareValues(aValue, bValue);
    
    return sortConfig.direction === 'desc' ? -comparison : comparison;
  });
};

/**
 * Génère une nouvelle configuration de tri
 */
export const getNewSortConfig = (currentConfig: SortConfig, attributeKey: string): SortConfig => {
  if (currentConfig.key === attributeKey) {
    // Même colonne : inverser la direction
    return {
      key: attributeKey,
      direction: currentConfig.direction === 'asc' ? 'desc' : 'asc'
    };
  } else {
    // Nouvelle colonne : tri ascendant par défaut
    return {
      key: attributeKey,
      direction: 'asc'
    };
  }
};