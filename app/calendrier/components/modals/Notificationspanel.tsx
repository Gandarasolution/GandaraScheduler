import { format } from "date-fns";
import { memo } from "react";

// Composant NotificationsPanel
type NotificationsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    timestamp: number;
    isRead: boolean;
  }>;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onRemove,
  onClearAll
}) => {
  if (!isOpen) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <>
      {/* Overlay pour fermer en cliquant à l'extérieur */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      
      {/* Panneau de notifications */}
      <div className="fixed top-16 right-4 w-96 max-h-[80vh] bg-secondary-bg text-primary rounded-2xl shadow-2xl border border-default z-50 flex flex-col poppins">
        {/* En-tête */}
        <div className="flex items-center justify-between p-6 border-b border-light bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.09c0-2.5-2.5-4.09-5-4.09S5 6.59 5 9.09V12l-5 5h5m0 0v1a3 3 0 006 0v-1m-6 0h6" />
            </svg>
            <h3 className="text-lg font-semibold">Notifications</h3>
            {notifications.length > 0 && (
              <span className="bg-secondary-bg/20 text-xs px-2 py-1 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={() => onClearAll()}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-secondary-bg/20 transition-colors"
                title="Tout effacer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onClose()}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-secondary-bg/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5V9.09c0-2.5-2.5-4.09-5-4.09S5 6.59 5 9.09V12l-5 5h5m0 0v1a3 3 0 006 0v-1m-6 0h6" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-secondary mb-2">Aucune notification</h4>
              <p className="text-sm text-center">
                Vos notifications apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={`relative p-4 mb-2 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer ${
                    notification.isRead 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-secondary border-l-4 border-l-[#009580] shadow-sm'
                  }`}
                  onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(notification.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className={`text-xs ${notification.isRead ? 'text-gray-500' : 'text-gray-700'} mb-2`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {notification.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4">
                      <div className="w-2 h-2 bg-[#009580] rounded-full"></div>
                    </div>
                  )}
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