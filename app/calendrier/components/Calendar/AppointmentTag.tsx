import React, { memo, useState, useEffect, useRef } from 'react';

interface AppointmentTagProps {
  displayText: string; // Le texte à afficher (géré par le parent)
  iconPath: string; // Le path SVG de l'icône à afficher
  color: string;
  textColor: string;
  isHovered: boolean;
  appointmentWidth?: number; // Largeur du rendez-vous en pixels
  title?: string; // Tooltip optionnel
  placement?: 'hover' | 'fixed'; // Mode d'affichage de l'étiquette
}

const AppointmentTag: React.FC<AppointmentTagProps> = ({
  displayText,
  iconPath,
  color,
  textColor,
  isHovered,
  appointmentWidth = 100,
  title,
  placement = 'hover',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Adapter la taille de l'indicateur en fonction de la largeur du rendez-vous
  const isSmallAppointment = appointmentWidth < 60;
  const isMediumAppointment = appointmentWidth >= 60 && appointmentWidth < 120;
  
  // Largeur maximale du badge
  const maxBadgeWidth = Math.min(appointmentWidth - 20, 150);

  const handleMouseEnter = () => {
    if (!isHovered && placement === 'hover') { // Seulement si le tag n'est pas déjà déployé
      timerRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Masquer le tooltip quand le tag est déployé au hover
  useEffect(() => {
    if (isHovered && showTooltip) {
      setShowTooltip(false);
    }
  }, [isHovered, showTooltip]);

  if (placement === 'hover') {
    
    return (
      <div 
        className="relative flex items-center gap-1 transition-all duration-300 ease-in-out"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          backgroundColor: isHovered ? color : 'transparent',
          borderRadius: '6px',
          paddingLeft: isHovered ? '8px' : '0px',
          paddingRight: isHovered ? '8px' : '0px',
          paddingTop: isHovered ? '4px' : '0px',
          paddingBottom: isHovered ? '4px' : '0px',
          minHeight: isHovered ? '24px' : 'auto',
          maxWidth: isHovered ? `${maxBadgeWidth}px` : '16px',
        }}
      >
        {/* Icône - visible uniquement quand non hover */}
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="currentColor" 
          className="transition-all duration-300 ease-in-out flex-shrink-0"
          style={{
            display: isHovered ? 'none' : 'block',
            width: isHovered ? '0px' : '16px',
            color: textColor,
          }}
        >
          <path d={iconPath} />
        </svg>

        {/* Texte de l'étiquette - visible uniquement au hover */}
        <span 
          className="font-bold uppercase whitespace-nowrap transition-all duration-300 ease-in-out"
          style={{ 
            fontSize: isSmallAppointment ? '8px' : isMediumAppointment ? '8.5px' : '9px',
            color: textColor,
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            opacity: isHovered ? 1 : 0,
            width: isHovered ? 'auto' : '0px',
            overflow: 'hidden',
          }}
        >
          {isSmallAppointment && isHovered ? displayText.slice(0, 6) : displayText}
        </span>

        {/* Tooltip personnalisé */}
        {showTooltip && !isHovered && (
          <div 
            className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none"
            style={{
              minWidth: '150px',
              maxWidth: '250px',
            }}
          >
            <div 
              className="border-2 rounded-lg shadow-lg p-3"
              style={{
                backgroundColor: color,
                borderColor: color,
                color: textColor,
              }}
            >
              <div className="font-semibold text-sm">Tag</div>
              <div className="font-bold uppercase mt-1">{displayText}</div>
              {title && title !== displayText && (
                <div className="text-xs mt-1 opacity-80">{title}</div>
              )}
            </div>
            {/* Flèche */}
            <div 
              className="absolute top-full right-2 w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: `6px solid ${color}`,
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
      <div 
        className="absolute -right-5  -bottom-5 z-50" 
        style={{
          transform: 'translateX(-50%)',
          overflow: 'visible'
        }}
      >
        <div 
          className="flex items-center px-2 py-1 shadow-lg rounded-md"
          style={{
            backgroundColor: color,
            maxWidth: `${Math.min(appointmentWidth * 0.9, 200)}px`,
            overflow: 'visible'
          }}
        >
          <span 
            className="font-bold uppercase whitespace-nowrap text-xs"
            style={{ 
              color: textColor,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {displayText}
          </span>
        </div>
      </div>
    );
  
};

export default memo(AppointmentTag);
