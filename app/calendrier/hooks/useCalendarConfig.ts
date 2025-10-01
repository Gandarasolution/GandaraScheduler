/**
 * @fileoverview Hook personnalisé pour la gestion des configurations du calendrier
 * 
 * Ce hook centralise la logique de gestion des configurations :
 * - Configurations dynamiques basées sur les pôles des employés
 * - Configurations personnalisées CRUD
 * - Application des filtres aux employés et rendez-vous
 * 
 * @hook useCalendarConfig
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';
import { CalendarConfig, Employee, Appointment } from '../types';
import { applyFiltersToEmployees, applyFiltersToAppointments } from '../utils/filters';

export interface CalendarConfigState {
  currentConfig: CalendarConfig | null;
  customConfigs: CalendarConfig[];
  availableConfigs: CalendarConfig[];
  filteredEmployees: Employee[];
  filteredAppointments: Appointment[];
  setCurrentConfig: (config: CalendarConfig | null) => void;
  saveCustomConfig: (config: Omit<CalendarConfig, 'id'>) => CalendarConfig;
  updateCustomConfig: (config: CalendarConfig) => void;
  deleteCustomConfig: (configId: number) => void;
  duplicateConfig: (config: CalendarConfig) => CalendarConfig;
}

/**
 * Génère les configurations disponibles basées sur les pôles des employés
 * @param employees - Liste des employés
 * @param customConfigs - Configurations personnalisées
 * @returns Configurations disponibles
 */
const generateAvailableConfigs = (employees: Employee[], customConfigs: CalendarConfig[]): CalendarConfig[] => {
  const poles = Array.from(new Set(employees.map(emp => emp.pole)));
  const configs: CalendarConfig[] = [];

  // Configuration par pôles (toujours disponible si plusieurs pôles)
  if (poles.length > 1) {
    configs.push({
      id: 2,
      name: 'Vue par pôles',
      dimension: 'pole',
      filters: [],
      selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
    });
  }

  // Configurations spécifiques selon les pôles présents
  if (poles.includes('Technique')) {
    configs.push({
      id: 3,
      name: 'Vue Technique - Par équipes',
      dimension: 'group',
      filters: [
        {
          id: 'pole-technique',
          field: 'pole',
          type: 'equals',
          value: 'Technique',
          label: 'Pôle Technique'
        }
      ],
      selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
    });
  }

  if (poles.includes('Commercial')) {
    configs.push({
      id: 4,
      name: 'Vue Commercial - Par contrats',
      dimension: 'contract',
      filters: [
        {
          id: 'pole-commercial',
          field: 'pole',
          type: 'equals',
          value: 'Commercial',
          label: 'Pôle Commercial'
        }
      ],
      selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
    });
  }

  if (poles.includes('Administrative')) {
    configs.push({
      id: 5,
      name: 'Vue Administrative - Par types',
      dimension: 'type',
      filters: [
        {
          id: 'pole-administrative',
          field: 'pole',
          type: 'equals',
          value: 'Administrative',
          label: 'Pôle Administrative'
        }
      ],
      selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
    });
  }

  if (poles.includes('RH')) {
    configs.push({
      id: 6,
      name: 'Vue RH - Par contrats',
      dimension: 'contract',
      filters: [
        {
          id: 'pole-rh',
          field: 'pole',
          type: 'equals',
          value: 'RH',
          label: 'Pôle RH'
        }
      ],
      selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
    });
  }

  // Ajouter les configurations personnalisées
  configs.push(...customConfigs);

  return configs;
};

/**
 * Hook pour la gestion des configurations du calendrier
 * @param employees - Liste des employés
 * @param appointments - Liste des rendez-vous filtrés
 * @param onNotification - Callback pour les notifications
 * @returns État et fonctions de gestion des configurations
 */
export const useCalendarConfig = (
  employees: Employee[],
  appointments: Appointment[],
  onNotification?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void
): CalendarConfigState => {
  const [currentConfig, setCurrentConfig] = useState<CalendarConfig | null>(null);
  const [customConfigs, setCustomConfigs] = useState<CalendarConfig[]>([]);

  // Calculer les configurations disponibles dynamiquement
  const availableConfigs = useMemo(() => {
    return generateAvailableConfigs(employees, customConfigs);
  }, [employees, customConfigs]);

  const saveCustomConfig = useCallback((config: Omit<CalendarConfig, 'id'>) => {
    const newConfig: CalendarConfig = {
      ...config,
      id: Date.now() // ID unique basé sur timestamp
    };
    setCustomConfigs(prev => [...prev, newConfig]);
    onNotification?.('success', 'Configuration sauvegardée', `La configuration "${config.name}" a été créée avec succès.`);
    return newConfig;
  }, [onNotification]);

  const updateCustomConfig = useCallback((updatedConfig: CalendarConfig) => {
    setCustomConfigs(prev => prev.map(config => 
      config.id === updatedConfig.id ? updatedConfig : config
    ));
    
    // Si la configuration mise à jour est la configuration courante, la mettre à jour aussi
    if (currentConfig?.id === updatedConfig.id) {
      setCurrentConfig(updatedConfig);
    }
    
    onNotification?.('success', 'Configuration modifiée', `La configuration "${updatedConfig.name}" a été mise à jour.`);
  }, [onNotification, currentConfig?.id]);

  const deleteCustomConfig = useCallback((configId: number) => {
    const configToDelete = customConfigs.find(c => c.id === configId);
    setCustomConfigs(prev => prev.filter(config => config.id !== configId));
    
    // Si la configuration supprimée était active, revenir à la première configuration
    if (currentConfig?.id === configId && availableConfigs.length > 0) {
      setCurrentConfig(availableConfigs[0]);
    }
    
    if (configToDelete) {
      onNotification?.('success', 'Configuration supprimée', `La configuration "${configToDelete.name}" a été supprimée.`);
    }
  }, [customConfigs, currentConfig, availableConfigs, onNotification]);

  const duplicateConfig = useCallback((config: CalendarConfig) => {
    const duplicatedConfig = {
      ...config,
      name: `${config.name} (copie)`,
      id: Date.now()
    };
    setCustomConfigs(prev => [...prev, duplicatedConfig]);
    onNotification?.('success', 'Configuration dupliquée', `Une copie de "${config.name}" a été créée.`);
    return duplicatedConfig;
  }, [onNotification]);

  // Appliquer les filtres aux employés selon la configuration
  const filteredEmployees = useMemo(() => {
    if (!currentConfig) return employees;
    return applyFiltersToEmployees(employees, currentConfig.filters);
  }, [currentConfig?.filters, employees]);

  // Appliquer les filtres aux rendez-vous selon la configuration
  const filteredAppointments = useMemo(() => {
    if (!currentConfig) return appointments;
    
    // Filtrer d'abord par types de RDV sélectionnés
    let filtered = appointments;
    
    // Appliquer le filtrage par types de RDV si certains types ne sont pas sélectionnés
    if (currentConfig.selectedRdvTypes && currentConfig.selectedRdvTypes.length > 0) {
      // Si tous les types ne sont pas sélectionnés, appliquer le filtrage
      const allTypes = ['Chantier', 'Absence', 'Autre'];
      const isAllSelected = allTypes.every(type => currentConfig.selectedRdvTypes.includes(type));
      
      if (!isAllSelected) {
        filtered = appointments.filter(appointment => {
          // Normaliser les types pour la comparaison (gérer les différences de casse et dénominations)
          const appointmentType = appointment.type;
          const normalizedType = appointmentType === 'chantier' ? 'Chantier' : 
                                appointmentType === 'absence' ? 'Absence' :
                                appointmentType === 'autre' ? 'Autre' : 'Autre';
          return currentConfig.selectedRdvTypes.includes(normalizedType);
        });
      }
    }
    
    // Puis appliquer les filtres de champs
    return applyFiltersToAppointments(filtered, currentConfig.filters, employees);
  }, [appointments, currentConfig?.filters, currentConfig?.selectedRdvTypes, employees]);

  return {
    currentConfig,
    customConfigs,
    availableConfigs,
    filteredEmployees,
    filteredAppointments,
    setCurrentConfig,
    saveCustomConfig,
    updateCustomConfig,
    deleteCustomConfig,
    duplicateConfig
  };
};