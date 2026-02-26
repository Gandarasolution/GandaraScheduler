/**
 * Hook personnalisé pour gérer les configurations du calendrier
 * Centralise toute la logique de configuration et de dimension
 */

import { useState, useCallback, useMemo, MutableRefObject } from 'react';
import { CalendarConfig, User } from '@/app/calendrier';
import { getCalendarConfigsByUserId } from '@/app/datasource';

interface UseCalendarConfigProps {
  employees: MutableRefObject<User[]>;
  user: User;
}

export function useCalendarConfig({ employees, user }: UseCalendarConfigProps) {
  const [customConfigs, setCustomConfigs] = useState<CalendarConfig[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  // Fonction pour obtenir les configurations disponibles depuis la base de données
  const getAvailableConfigs = useMemo((): CalendarConfig[] => {
    // Charger les configurations d'après l'accès utilisateur depuis datasource
    const userConfigs = getCalendarConfigsByUserId(user.id);
    
    // Ajouter les configurations personnalisées créées par l'utilisateur
    const configs = [...userConfigs, ...customConfigs];

    return configs;
  }, [user.id, customConfigs]);

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
