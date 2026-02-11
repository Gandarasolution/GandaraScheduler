/**
 * @fileoverview Hook personnalisé pour la gestion des notifications
 * 
 * Ce hook centralise toute la logique de gestion des notifications :
 * - Création et suppression de notifications
 * - Gestion des états (lu/non lu)
 * - Auto-suppression des notifications temporaires
 * - Comptage des notifications non lues
 * 
 * @hook useNotifications
 * @author Gandara Solutions
 * @version 1.0.0
 */

import { useState, useCallback, useMemo } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: Notification['type'], title: string, message: string) => void;
  markAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * Hook pour la gestion des notifications
 * @returns {NotificationsState} État et fonctions de gestion des notifications
 */
export const useNotifications = (): NotificationsState => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    title: string,
    message: string
  ) => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      isRead: false
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Garder seulement les 50 dernières
    
    // Les notifications restent jusqu'à suppression manuelle
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    removeNotification,
    clearAll
  };
};