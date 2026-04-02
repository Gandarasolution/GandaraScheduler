/**
 * @fileoverview Hook personnalisé pour gérer les employés récemment consultés
 * 
 * Ce hook maintient une liste des employés récemment sélectionnés dans le localStorage
 * pour faciliter l'accès rapide aux employés fréquemment consultés.
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/app/calendrier';

const STORAGE_KEY = 'recentEmployees';
const MAX_RECENT = 3;

/**
 * Hook pour gérer les employés récents
 * @returns Objet contenant les employés récents et les fonctions de gestion
 * 
 * @example
 * const { recentEmployees, addRecentEmployee, clearRecent } = useRecentEmployees();
 * 
 * // Ajouter un employé à la liste
 * addRecentEmployee(employee);
 */
export function useRecentEmployees() {
  const [recentEmployees, setRecentEmployees] = useState<User[]>([]);

  // Charger les employés récents depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentEmployees(parsed);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des employés récents:', error);
    }
  }, []);

  // Ajouter un employé à la liste des récents
  const addRecentEmployee = useCallback((employee: User) => {
    setRecentEmployees(prev => {
      // Retirer l'employé s'il existe déjà
      const filtered = prev.filter(emp => emp.IdPersonnel !== employee.IdPersonnel);
      
      // Ajouter l'employé au début de la liste
      const updated = [employee, ...filtered].slice(0, MAX_RECENT);
      
      // Sauvegarder dans localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des employés récents:', error);
      }
      
      return updated;
    });
  }, []);

  // Effacer tous les employés récents
  const clearRecent = useCallback(() => {
    setRecentEmployees([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression des employés récents:', error);
    }
  }, []);

  return {
    recentEmployees,
    addRecentEmployee,
    clearRecent,
  };
}
