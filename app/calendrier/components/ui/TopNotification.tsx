import React, { useEffect, useState } from 'react';

interface TopNotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const TopNotification: React.FC<TopNotificationProps> = ({ 
  message, 
  onClose,
  duration = 4000 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Petit délai pour déclencher l'animation CSS fluide
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Timer pour la fermeture automatique
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Attend la fin de l'animation CSS (300ms) avant de démonter le composant
      setTimeout(onClose, 300); 
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onClose]);

  return (
    // Conteneur fixe, centré en haut de l'écran avec un z-index maximal
    <div className="fixed top-4 left-3 right-3 sm:top-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[99999] pointer-events-none flex flex-col items-center">
      
      {/* La bulle avec l'animation Tailwind */}
      <div 
        className={`
          pointer-events-auto w-full sm:w-auto flex items-start gap-3 px-4 sm:px-5 py-3
          bg-gray-900 text-white rounded-full shadow-2xl border border-gray-700/50
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${isVisible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'}
        `}
      >
        {/* Icône Cadenas Rouge (ou icône d'erreur) */}
        <div className="flex-shrink-0 bg-red-500/20 p-1.5 rounded-full text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Le message d'erreur */}
        <p className="text-sm font-medium leading-5 break-words sm:whitespace-nowrap">
          {message}
        </p>

        {/* Bouton pour fermer manuellement */}
        <button 
          onClick={() => setIsVisible(false)}
          className="ml-2 flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          title="Fermer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TopNotification;