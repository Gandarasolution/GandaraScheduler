/**
 * @fileoverview Hook personnalisé pour la gestion des dimensions et employés
 * Centralise la logique de filtrage, regroupement et gestion des dimensions
 * 
 * @hook useDimensionManagement
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useMemo, useState, useEffect } from 'react';
import { Employee, CalendarConfig, Groupe } from '../types';
import { getDimensionItems, groupEmployeesByDimension, applyFiltersToEmployees } from '../utils/filters';

/**
 * Hook pour gérer les dimensions, filtres et regroupements d'employés
 */
export const useDimensionManagement = (
  employees: Employee[],
  calendarConfig: CalendarConfig,
  initialTeams: Groupe[]
) => {
  // État pour gérer les éléments de dimension ouverts
  const [openItems, setOpenItems] = useState<(string | number)[]>([]);

  // Calculer les éléments de dimension
  const dimensionItems = useMemo(() => {
    return getDimensionItems(calendarConfig.dimension, employees, initialTeams);
  }, [calendarConfig.dimension, employees, initialTeams]);

  // Appliquer les filtres aux employés
  const filteredEmployees = useMemo(() => {
    return applyFiltersToEmployees(employees, calendarConfig.filters);
  }, [employees, calendarConfig.filters]);

  // Regrouper les employés par dimension
  const employeesByDimension = useMemo(() => {
    return groupEmployeesByDimension(filteredEmployees, calendarConfig.dimension, initialTeams);
  }, [filteredEmployees, calendarConfig.dimension, initialTeams]);

  // Initialiser les éléments ouverts quand les dimensionItems changent
  useEffect(() => {
    setOpenItems(dimensionItems.map(item => item.id));
  }, [dimensionItems]);

  // Fonction pour ouvrir/fermer un élément de dimension
  const toggleItem = (itemId: string | number) => {
    setOpenItems(open =>
      open.includes(itemId)
        ? open.filter(id => id !== itemId)
        : [...open, itemId]
    );
  };

  return {
    dimensionItems,
    filteredEmployees,
    employeesByDimension,
    openItems,
    toggleItem
  };
};