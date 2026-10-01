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
import notificationApiService from '@/app/service/notificationApi.service';
import { Notification } from '@/app/calendrier/types';



export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAsRead: (ids: string[]) => Promise<void>;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * Hook pour la gestion des notifications
 * @param setNotification - Fonction pour afficher une notification à l'utilisateur
 * @returns {NotificationsState} État et fonctions de gestion des notifications
 */
export const useNotifications = (setNotification?: (message: string) => void): NotificationsState => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const loadNotifications = useCallback(async () => {
    const response = await notificationApiService.getNotificationsByUserId();
    if (response?.success === false || !Array.isArray(response.data)) return;

    console.log('Loaded notifications:', response.data);
    const loadedNotifications: Notification[] = response.data.map((notification: Notification) => ({
      ...notification,
      Id: String(notification.Id),
      Timestamp: new Date(notification.Timestamp).getTime(),
      isRead: Boolean(notification.IsRead),
    }));

    setNotifications(loadedNotifications);
  }, []);



  const markAsRead = useCallback(async (ids: string[]) => {
    const wasUnread = notifications.some(notification => 
        ids.includes(String(notification.Id)) && !notification.IsRead
    );

    console.log('markAsRead called with ids:', ids, 'wasUnread:', wasUnread, notifications);
    if (!wasUnread) return;

    setNotifications(prev => prev.map(notification => {
        if (!ids.includes(String(notification.Id)) || notification.IsRead) {
            return notification;
        }
        return { ...notification, IsRead: true };
    }));

    try {
        const response = await notificationApiService.markNotificationAsRead(ids);
        console.log('markNotificationAsRead response:', response);
        
        if (response?.success === false) {
            throw new Error('L\'API a renvoyé une erreur : ' + response?.message);
        }
        
    } catch (error) {
        console.error('Erreur attrapée dans le catch :', error);
        setNotification?.('Erreur lors de la mise à jour des notifications.');
        
        setNotifications(prev => prev.map(notification =>
            ids.includes(String(notification.Id)) ? { ...notification, IsRead: false } : notification
        ));
    }
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.IsRead).length;
  }, [notifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.Id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);


  return {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    removeNotification,
    clearAll,
  };
};