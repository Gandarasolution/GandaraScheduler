import React, { memo, use, useMemo } from 'react';

interface AppointmentTagProps {
  tagName: string;
  tagShortName?: string; // Version courte pour les petits rendez-vous
  color: string;
  textColor: string;
  isHovered: boolean;
  isResizing: boolean;
  appointmentWidth?: number; // Largeur du rendez-vous en pixels
  appointmentDurationDays?: number; // Durée du rendez-vous en jours
  placement?: 'hover' | 'fixed'; // Mode d'affichage de l'étiquette
}

const AppointmentTag: React.FC<AppointmentTagProps> = ({
  tagName,
  tagShortName,
  color,
  textColor,
  isHovered,
  isResizing,
  appointmentWidth = 100,
  appointmentDurationDays = 1,
  placement = 'hover',
}) => {
  // Adapter la taille de l'indicateur en fonction de la largeur du rendez-vous
  const isSmallAppointment = appointmentWidth < 60;
  const isMediumAppointment = appointmentWidth >= 60 && appointmentWidth < 120;
  const isLargeAppointment = appointmentWidth >= 120;
  
  // Déterminer quel texte afficher selon la durée et la taille
  // Pour les RDV de 2 jours ou moins, utiliser shortName si disponible
  const shouldUseShortName = appointmentDurationDays <= 2 && tagShortName;
  const displayText = shouldUseShortName ? tagShortName : tagName;
  
  // Taille de l'indicateur
  const indicatorSize = isSmallAppointment ? 6 : isMediumAppointment ? 7 : 8;
  // Largeur maximale du badge
  const maxBadgeWidth = Math.min(appointmentWidth - 20, 150);

  function getContrastColor(hexColor: string) {
    // Enlever le # si présent
    const hex = hexColor.replace('#', '');
    
    // 2. Convertir en RGB
    var r = parseInt(hex.substr(0, 2), 16);
    var g = parseInt(hex.substr(2, 2), 16);
    var b = parseInt(hex.substr(4, 2), 16);
    
    // 3. Calculer la luminosité (formule YIQ standard)
    var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    
    // 4. Retourner Noir ou Blanc selon le seuil (128 est le milieu)
    // Vous pouvez changer 'black' par une couleur sombre de votre choix (ex: #333333)
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  }

  // Mode fixe : étiquette toujours visible en bas, peut dépasser du rendez-vous
  if (placement === 'fixed') {
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
          title={`${tagName}${tagShortName ? ` (${tagShortName})` : ''}`}
        >
          <span 
            className="font-bold uppercase whitespace-nowrap text-xs"
            style={{ 
              color: getContrastColor(color),
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}
          >
            {shouldUseShortName ? tagShortName : tagName}
          </span>
        </div>
      </div>
    );
  }

  // Mode hover : comportement par défaut avec animation
  return (
    <div className="absolute right-1 bottom-0 z-30">
      <div 
        className="flex items-center gap-1 overflow-hidden transition-all duration-300 ease-in-out"
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
        title={`${tagName}${tagShortName ? ` (${tagShortName})` : ''}`}
      >
        {/* Icône étiquette - visible uniquement quand non hover */}
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
          <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
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
      </div>
    </div>
  );
};

export default memo(AppointmentTag);
