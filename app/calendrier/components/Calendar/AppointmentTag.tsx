import React, { memo, use, useMemo, useState } from 'react';

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
  annotation?: string; // Annotation/note du rendez-vous
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
  annotation,
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

  // Mode fixe : même comportement que le mode hover
  if (placement === 'fixed') {
    return (
      <>
        <div className="absolute right-1 bottom-0 z-30 flex items-center gap-1">
          {/* Icône d'annotation - visible si annotation présente */}
          {annotation && (
            <div 
              className="relative"
              title={annotation}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="currentColor"
                className=""
                style={{ color: isHovered ? color : textColor }}
              >
                <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
              </svg>          
            </div>
          )}
        
          {/* Étiquette avec animation */}
          {tagName && (
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
          )}
      </div>
      </>
    );
  }

  // Mode hover : comportement par défaut avec animation
  return (
    <>
      <div className="absolute right-1 bottom-0 z-30 flex items-center gap-1">
        {/* Icône d'annotation - visible si annotation présente */}
        {annotation && (
          <div 
            className="relative"
            title={annotation}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="currentColor"
              className=""
              style={{ color: isHovered ? color : textColor }}
            >
              <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
            </svg>          
          </div>
        )}
      
        {/* Étiquette avec animation */}
        {tagName && (
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
        )}
    </div>
    </>
  );
};

export default memo(AppointmentTag);
