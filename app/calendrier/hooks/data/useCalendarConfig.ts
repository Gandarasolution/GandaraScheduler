/**
 * Hook personnalisé pour gérer les configurations du calendrier
 * Centralise toute la logique de configuration et de dimension
 */

import { useState, useCallback, useMemo, useEffect, MutableRefObject } from 'react';
import { CalendarConfig, User } from '@/app/calendrier';
import calendarConfigService from '@/app/service/calendarConfig.service';
import { useAuth } from '../utils/AuthContext';

interface UseCalendarConfigProps {
  user: User;
  idPlanning: number;
  setCurrentCalendarConfig: (config: CalendarConfig | null) => void;
}

export function useCalendarConfig({ user, idPlanning, setCurrentCalendarConfig }: UseCalendarConfigProps) {
  const { currentVueId } = useAuth();
    
  const [configs, setConfigs] = useState<CalendarConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  const loadConfigs = async (hasPermission: boolean) => {
    console.log('Loading configs with permission:', hasPermission);
      const response = hasPermission ? await calendarConfigService.getCalendarConfigsByUserId(user.IdPersonnel, idPlanning) : null;
      console.log('Load Configs Response:', response);
      
      if (response?.error === 0 && Array.isArray(response.data.Configs)) {

        setConfigs(response.data.Configs);
        setCurrentCalendarConfig(response.data.Configs.find((config: { IdPlanningVue: number | null; }) => Number(config.IdPlanningVue) === Number(currentVueId)) || null);
        return response;
      }

      setConfigs([]);
  }; 

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

  const saveConfig = useCallback(async (config: { planningVue: any; filtrePerso: any }) => {
    if (isCreatingConfig) {
      const response = await calendarConfigService.createCalendarConfig(config);
      console.log('Create Config Response:', response);
      if (response?.error === 0 && (response.data || response.message)) {
        console.log('Config created successfully:', response.data);
        setConfigs(prev => [...prev, response.data]);
        
        return response;
      }else {
        console.error('Failed to create config:', response?.message);
        return response;
      }
    } else if (editingConfig) {
      const response = await calendarConfigService.updateCalendarConfig(editingConfig.IdPlanningVue, config);
      if (response?.error === 0 && (response.data || response.message)) {
        setConfigs(prev => prev.map(c => c.IdPlanningVue === editingConfig.IdPlanningVue ? response.data : c));
        return response;
      } else {
        console.error('Failed to update config:', response?.message);
        return response;
      }
    }
  }, [isCreatingConfig, editingConfig, closeConfigModal, user.IdPersonnel]);

  const deleteConfig = useCallback(async (configId: number): Promise<{error: number, message?: string} | void> => {
    try {
      const response = await calendarConfigService.deleteCalendarConfig(configId);
      
      // On vérifie si la réponse existe et si l'erreur est 0
      if (response && response.error === 0) {
        setConfigs(prev => prev.filter(c => c.IdPlanningVue !== configId));
      }
      
      // On retourne la réponse pour que la modale puisse lire le code erreur (0 ou 1)
      return response;
    } catch (error) {
      console.error("Erreur lors de l'appel API de suppression:", error);
      // On retourne une structure d'erreur cohérente en cas de crash réseau
      return { error: 1, message: "Erreur de communication avec le serveur." };
    }
  }, []);

useEffect(() => {
  console.log(configs);
}, [configs]);

  return {
    isConfigModalOpen,
    editingConfig,
    isCreatingConfig,
    configs, setConfigs,
    openConfigModal,
    closeConfigModal,
    startCreatingConfig,
    startEditingConfig,
    saveConfig,
    deleteConfig,
    setIsConfigModalOpen,
    setEditingConfig,
    setIsCreatingConfig,
    loadConfigs,
  };
}
