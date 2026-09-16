import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle, CheckCheck } from 'lucide-react';
import { memo, useEffect, useRef, useCallback } from 'react';
import { Notification } from '@/app/calendrier/types';

type NotificationsPanelProps = {
  isOpen?: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (ids: string[]) => void | Promise<void>;
  onRemove?: (id: string) => void;
  onClearAll?: () => void;
  variant?: 'desktop' | 'mobile';
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen = true,
  onClose,
  notifications,
  onMarkAsRead,
  onRemove,
  onClearAll,
  variant = 'desktop'
}) => {
  const observer = useRef<IntersectionObserver | null>(null);
  const isMobile = variant === 'mobile';

  const pendingIdsToRead = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    observer.current = new IntersectionObserver(
      (entries) => {
        let hasNewVisibleItems = false;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-id');
            const isRead = entry.target.getAttribute('data-is-read') === 'true';
            
            if (id && !isRead) {
              // 1. On ajoute l'ID dans notre "panier"
              pendingIdsToRead.current.add(id);
              hasNewVisibleItems = true;
              
              // On arrête d'observer cet élément
              observer.current?.unobserve(entry.target);
            }
          }
        });

        // 2. Si on a détecté de nouvelles notifications à l'écran
        if (hasNewVisibleItems) {
          // On annule le timer précédent s'il y en avait un
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          // On lance un timer de 500ms. S'il n'y a pas d'autre scroll d'ici là, on envoie le tableau.
          timeoutRef.current = setTimeout(() => {
            const idsArray = Array.from(pendingIdsToRead.current);
            if (idsArray.length > 0) {
              onMarkAsRead(idsArray); // ENVOI DU TABLEAU !
              pendingIdsToRead.current.clear(); // On vide le panier
            }
          }, 500);
        }
      },
      { root: null, threshold: 0.5 }
    );

    return () => {
      if (observer.current) observer.current.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current); // Nettoyage du timer
    };
  }, [isOpen, onMarkAsRead]);

  // Attachement de l'observateur à chaque div de notification
  const setNotificationRef = useCallback((node: HTMLDivElement | null) => {
    if (node && observer.current) {
      observer.current.observe(node);
    }
  }, []);

  if (!isOpen) return null;

  const hasUnread = notifications.some(n => !n.IsRead);

  const getNotificationIcon = (type: Notification['Type']) => {
    switch (type) {
      case 'Succès':
        return <CheckCircle size={isMobile ? 18 : 16} className="text-green-600" />;
      case 'Erreur':
        return <AlertCircle size={isMobile ? 18 : 16} className="text-red-600" />;
      case 'Avertissement':
        return <AlertTriangle size={isMobile ? 18 : 16} className="text-yellow-600" />;
      case 'Information':
      default:
        return <Info size={isMobile ? 18 : 16} className="text-blue-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

    if (diffMinutes < 1) return "A l'instant";
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Il y a ${Math.floor(diffMinutes / 60)}h`;
    return format(date, 'dd/MM a HH:mm', { locale: fr });
  };

  const onMarkAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.IsRead).map(n => n.Id);
    if (unreadIds.length > 0) {
      onMarkAsRead(unreadIds);
    }
  };

  return (
    <>
      {!isMobile && <div className="fixed inset-0 z-40" onClick={onClose} />}

      <div className={isMobile
        ? 'absolute top-full right-0 mt-2 w-80 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-30 bg-[var(--bg-card)] shadow-2xl border border-[var(--border-light)]'
        : 'fixed top-16 right-4 w-96 max-h-[80vh] bg-secondary-bg text-primary rounded-2xl shadow-2xl border border-default z-50 flex flex-col poppins'}
        onClick={(event) => isMobile && event.stopPropagation()}
      >
        <div className={isMobile
          ? 'px-6 py-4 flex items-center justify-between border-b border-[var(--border-light)]'
          : 'flex items-center justify-between p-6 border-b border-light bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-2xl'}>
          <div className="flex items-center gap-3">
            <Bell size={isMobile ? 20 : 24} />
            <div>
              <h3 className={isMobile ? 'text-lg font-bold text-[var(--text-primary)]' : 'text-lg font-semibold'}>Notifications</h3>
              {isMobile && <p className="text-xs text-[var(--text-tertiary)]">{notifications.length} notification{notifications.length > 1 ? 's' : ''}</p>}
            </div>
            {notifications.length > 0 && (
              <span className={isMobile ? 'hidden' : 'bg-secondary-bg/20 text-xs px-2 py-1 rounded-full'}>
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            
            {/* Nouveau Bouton : Tout marquer comme lu */}
            {hasUnread && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className={isMobile 
                  ? 'text-xs font-medium text-[var(--color-primary-500)] hover:underline mr-1' 
                  : 'text-white/80 hover:text-white p-1 rounded-lg hover:bg-secondary-bg/20 transition-colors flex items-center gap-1'}
                title="Tout marquer comme lu"
              >
                {isMobile ? 'Tout lire' : <CheckCheck size={18} />}
              </button>
            )}

            <button
              onClick={onClose}
              className={isMobile ? 'text-[var(--text-tertiary)]' : 'text-white/80 hover:text-white p-1 rounded-lg hover:bg-secondary-bg/20 transition-colors'}
              aria-label="Fermer les notifications"
            >
              <X size={isMobile ? 18 : 20} />
            </button>
          </div>
        </div>

        <div className={isMobile ? 'max-h-96 overflow-y-auto' : 'flex-1 overflow-y-auto'}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell size={isMobile ? 32 : 36} className="mb-4 text-gray-400" />
              <h4 className="text-lg font-medium text-secondary mb-2">Aucune notification</h4>
              <p className="text-sm">{isMobile ? 'Vous êtes à jour !' : 'Vos notifications apparaîtront ici'}</p>
            </div>
          ) : (
            <div className={isMobile ? 'py-2' : 'p-2'}>
              {notifications.map((notification) => (
                <div
                  key={notification.Id}
                  ref={setNotificationRef} // On attache la ref ici pour l'observateur
                  data-id={notification.Id} // Donnée lue par l'observateur
                  data-is-read={notification.IsRead} // Donnée lue par l'observateur
                  className={isMobile
                    ? 'px-6 py-4 transition-colors cursor-pointer border-b border-[var(--bg-secondary)]'
                    : `relative p-4 mb-2 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${notification.IsRead ? 'bg-gray-50 border-gray-200' : 'bg-secondary border-l-4 border-l-[#009580] shadow-sm'}`}
                  style={isMobile ? { backgroundColor: notification.IsRead ? 'transparent' : 'var(--bg-primary)' } : undefined}
                  onClick={() => !notification.IsRead && onMarkAsRead([notification.Id])}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">{getNotificationIcon(notification.Type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={isMobile ? 'text-sm font-semibold truncate text-[var(--text-primary)]' : `text-sm font-medium ${notification.IsRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.Titre}
                        </h4>
                      </div>
                      <p className={isMobile ? 'text-xs mb-2 line-clamp-2 text-[var(--text-secondary)]' : `text-xs ${notification.IsRead ? 'text-gray-500' : 'text-gray-700'} mb-2`}>
                        {notification.Message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTime(notification.Timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(NotificationsPanel);