/**
 * Hook personnalisé pour gérer les configurations du calendrier
 * Centralise toute la logique de configuration et de dimension
 */

import { useState, useCallback, useMemo, MutableRefObject } from 'react';
import { CalendarConfig, Employee } from '../types';

interface UseCalendarConfigProps {
  employees: MutableRefObject<Employee[]>;
}

export function useCalendarConfig({ employees }: UseCalendarConfigProps) {
  const [customConfigs, setCustomConfigs] = useState<CalendarConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  // Fonction pour obtenir les configurations disponibles selon les pôles des employés
  const getAvailableConfigs = useMemo((): CalendarConfig[] => {
    const poles = Array.from(new Set(employees.current.map(emp => emp.pole)));
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
  }, [employees.current.length, customConfigs]);

  const openConfigModal = useCallback(() => {
    setIsConfigModalOpen(true);
  }, []);

  const closeConfigModal = useCallback(() => {
    setIsConfigModalOpen(false);
    setEditingConfig(null);
    setIsCreatingConfig(false);
  }, []);

  const startCreatingConfig = useCallback(() => {
    setIsCreatingConfig(true);
    setEditingConfig(null);
  }, []);

  const startEditingConfig = useCallback((config: CalendarConfig) => {
    setEditingConfig(config);
    setIsCreatingConfig(false);
  }, []);

  const saveConfig = useCallback((config: CalendarConfig) => {
    if (isCreatingConfig) {
      setCustomConfigs(prev => [...prev, { ...config, id: Date.now() }]);
    } else if (editingConfig) {
      setCustomConfigs(prev => prev.map(c => c.id === editingConfig.id ? config : c));
    }
    closeConfigModal();
  }, [isCreatingConfig, editingConfig, closeConfigModal]);

  const deleteConfig = useCallback((configId: number) => {
    setCustomConfigs(prev => prev.filter(c => c.id !== configId));
  }, []);

  const addConfig = useCallback((config: CalendarConfig) => {
    setCustomConfigs(prev => [...prev, config]);
  }, []);

  const updateConfig = useCallback((config: CalendarConfig) => {
    setCustomConfigs(prev => prev.map(c => c.id === config.id ? config : c));
  }, []);

  return {
    customConfigs,
    isConfigModalOpen,
    editingConfig,
    isCreatingConfig,
    getAvailableConfigs,
    openConfigModal,
    closeConfigModal,
    startCreatingConfig,
    startEditingConfig,
    saveConfig,
    deleteConfig,
    addConfig,
    updateConfig,
    setIsConfigModalOpen,
    setEditingConfig,
    setIsCreatingConfig
  };
}
