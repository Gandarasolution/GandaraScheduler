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
    const iconStyle = { width: '18px', height: '18px' };
    switch (type) {
      case 'success':
        return <CheckCircle size={18} style={{ ...iconStyle, color: 'var(--color-success)' }} />;
      case 'error':
        return <AlertCircle size={18} style={{ ...iconStyle, color: 'var(--color-error)' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ ...iconStyle, color: 'var(--color-warning)' }} />;
      case 'info':
      default:
        return <Info size={18} style={{ ...iconStyle, color: 'var(--color-info)' }} />;
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
      className="absolute top-full right-0 mt-2 w-80 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-30"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: 'var(--bg-card)',
        boxShadow: 'var(--shadow-2xl)',
        borderWidth: '1px',
        borderColor: 'var(--border-light)'
      }}
    >
      {/* Header */}
      <div 
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        <div>
          <h3 
            className="text-lg font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Notifications
          </h3>
          <p 
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {notifications.length} notification{notifications.length > 1 ? 's' : ''}
          </p>
        </div>
        {notifications.length > 0 && (
          <button 
            onClick={() => onClearAll()}
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Liste des notifications */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 opacity-60">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <Bell size={32} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <p 
              className="font-medium text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Aucune notification
            </p>
            <p 
              className="text-xs mt-1"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Vous êtes à jour !
            </p>
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                className="px-6 py-4 transition-colors cursor-pointer"
                style={{
                  borderBottom: '1px solid var(--bg-secondary)',
                  backgroundColor: !notif.isRead ? 'var(--bg-primary)' : 'transparent'
                }}
                onClick={() => !notif.isRead && onMarkAsRead(notif.id)}
                onMouseEnter={(e) => {
                  if (notif.isRead) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (notif.isRead) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 
                        className="text-sm font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {notif.title}
                      </h4>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(notif.id);
                        }}
                        className="transition-colors flex-shrink-0"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-error)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p 
                      className="text-xs mb-2 line-clamp-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {formatTime(notif.timestamp)}
                      </span>
                      {!notif.isRead && (
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--color-primary)' }}
                        >
                        </span>
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
