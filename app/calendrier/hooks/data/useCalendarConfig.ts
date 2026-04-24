/**
 * Hook personnalisé pour gérer les configurations du calendrier
 * Centralise toute la logique de configuration et de dimension
 */

import { useState, useCallback, useMemo, useEffect, MutableRefObject } from 'react';
import { CalendarConfig, User } from '@/app/calendrier';
import calendarConfigService from '@/app/service/calendarConfig.service';

interface UseCalendarConfigProps {
  employees: MutableRefObject<User[]>;
  user: User;
}

export function useCalendarConfig({ employees, user }: UseCalendarConfigProps) {
  const [customConfigs, setCustomConfigs] = useState<CalendarConfig[]>([]);
  const [loadedConfigs, setLoadedConfigs] = useState<CalendarConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  const loadConfigs = async () => {
      const response = await calendarConfigService.getCalendarConfigsByUserId(user.IdPersonnel);
      
      if (response?.error === 0 && Array.isArray(response.data)) {

        setLoadedConfigs(response.data);
        return;
      }

      setLoadedConfigs([]);
  }; 

  // Fonction pour obtenir les configurations disponibles depuis la base de données
  const getAvailableConfigs = useMemo((): CalendarConfig[] => {
    // Ajouter les configurations personnalisées créées par l'utilisateur
    const configs = [...loadedConfigs, ...customConfigs];

    return configs;
  }, [loadedConfigs, customConfigs]);

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
      void calendarConfigService.createCalendarConfig(config).then((response) => {
        if (response?.error === 0 && response.data) {
          setLoadedConfigs(prev => [...prev, response.data]);
          return;
        }
        setCustomConfigs(prev => [...prev, { ...config, id: Date.now() }]);
      });
    } else if (editingConfig) {
      void calendarConfigService.updateCalendarConfig(editingConfig.IdPlanningVue, config).then((response) => {
        if (response?.error === 0 && response.data) {
          setLoadedConfigs(prev => prev.map(c => c.IdPlanningVue === editingConfig.IdPlanningVue ? response.data : c));
          return;
        }
        setCustomConfigs(prev => prev.map(c => c.IdPlanningVue === editingConfig.IdPlanningVue ? config : c));
      });
    }
    closeConfigModal();
  }, [isCreatingConfig, editingConfig, closeConfigModal]);

  const deleteConfig = useCallback((configId: number) => {
    void calendarConfigService.deleteCalendarConfig(configId).then((response) => {
      if (response?.error === 0) {
        setLoadedConfigs(prev => prev.filter(c => c.IdPlanningVue !== configId));
      }
      setCustomConfigs(prev => prev.filter(c => c.IdPlanningVue !== configId));
    });
  }, []);

  const addConfig = useCallback((config: CalendarConfig) => {
    void calendarConfigService.createCalendarConfig(config).then((response) => {
      if (response?.error === 0 && response.data) {
        setLoadedConfigs(prev => [...prev, response.data]);
        return;
      }
      setCustomConfigs(prev => [...prev, config]);
    });
  }, []);

  const updateConfig = useCallback((config: CalendarConfig) => {
    void calendarConfigService.updateCalendarConfig(config.IdPlanningVue, config).then((response) => {
      if (response?.error === 0 && response.data) {
        setLoadedConfigs(prev => prev.map(c => c.IdPlanningVue === config.IdPlanningVue ? response.data : c));
        return;
      }
      setCustomConfigs(prev => prev.map(c => c.IdPlanningVue === config.IdPlanningVue ? config : c));
    });
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
    setIsCreatingConfig,
    loadConfigs,
  };
}
