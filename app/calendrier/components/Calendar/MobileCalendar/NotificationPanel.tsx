/**
 * @fileoverview Panneau de notifications pour mobile
 * 
 * Affiche les notifications de l'utilisateur avec gestion de lecture
 * et suppression
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onRemove,
  onClearAll 
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-orange-500" />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`;
    return format(date, 'dd/MM à HH:mm', { locale: fr });
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
          <p className="text-xs text-gray-400">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => onClearAll()}
            className="text-xs text-teal-500 hover:text-teal-600 font-medium"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Liste des notifications */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 opacity-60">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-sm">Aucune notification</p>
            <p className="text-xs text-gray-400 mt-1">Vous êtes à jour !</p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`px-6 py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${!notif.isRead ? 'bg-teal-50/30' : ''}`}
                onClick={() => !notif.isRead && onMarkAsRead(notif.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-800 truncate">{notif.title}</h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(notif.id);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">{formatTime(notif.timestamp)}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
