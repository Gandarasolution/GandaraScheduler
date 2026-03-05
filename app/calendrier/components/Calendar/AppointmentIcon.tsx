import React, { memo, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../..';

type IconType = 'annotation' | 'tag';
type PlacementType = 'hover' | 'fixed';

interface AppointmentIconProps {
  type: IconType;
  color: string;
  textColor: string;
  isHovered: boolean;
  mainScrollRef?: React.RefObject<HTMLDivElement>;
  
  // Props spécifiques aux annotations
  annotation?: string;
  
  // Props spécifiques aux tags
  displayText?: string;
  iconPath?: string;
  appointmentWidth?: number;
  title?: string;
  placement?: PlacementType;
}

const AppointmentIcon: React.FC<AppointmentIconProps> = ({
  type,
  color,
  textColor,
  isHovered,
  mainScrollRef,
  annotation,
  displayText,
  iconPath,
  appointmentWidth = 100,
  title,
  placement = 'hover',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ vertical: 'top', horizontal: 'right' });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Pour les tags en mode hover
  const isSmallAppointment = appointmentWidth < 60;
  const isMediumAppointment = appointmentWidth >= 60 && appointmentWidth < 120;
  const maxBadgeWidth = Math.min(appointmentWidth - 20, 150);

  // SVG path pour l'annotation (document icon)
  const annotationIconPath = "M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z";

  const handleMouseEnter = () => {
    if (type === 'annotation' || (type === 'tag' && placement === 'hover')) {
      timerRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 250);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
    setIsPositioned(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Positionnement intelligent du tooltip
  useEffect(() => {
    if (showTooltip && tooltipRef.current && iconRef.current && mainScrollRef?.current) {
      requestAnimationFrame(() => {
        if (!tooltipRef.current || !iconRef.current || !mainScrollRef?.current) return;
        
        const iconRect = iconRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const containerRect = mainScrollRef.current.getBoundingClientRect();
        
        let vertical = 'top';
        let horizontal = 'right';
        
        // Calculer la position absolue du tooltip
        let top = iconRect.top;
        let left = iconRect.left;
        
        // Vérifier si déborde en haut
        if (iconRect.top - tooltipRect.height - 8 < (containerRect.top + TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT)) {
          vertical = 'bottom';
          top = iconRect.bottom + 8;
        } else {
          vertical = 'top';
          top = iconRect.top - tooltipRect.height - 8;
        }
        
        // Vérifier si déborde à droite
        if (iconRect.right + tooltipRect.width > containerRect.right) {
          horizontal = 'left';
          left = iconRect.right - tooltipRect.width;
        } else {
          horizontal = 'right';
          left = iconRect.left;
        }
        
        // Vérifier si déborde à gauche
        if (left < containerRect.left) {
          horizontal = 'left';
          left = iconRect.left;
        }
        
        setPosition({ vertical, horizontal });
        setTooltipPosition({ top, left });
        setIsPositioned(true);
      });
    }
  }, [showTooltip, mainScrollRef]);

  // Rendu pour annotation
  if (type === 'annotation') {
    return (
      <>
        <div 
          ref={iconRef}
          className="relative"
          style={{
            zIndex: showTooltip ? 99999 : 'auto',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 16 16" 
            fill="currentColor"
            style={{ color: isHovered ? color : textColor }}
          >
            <path d={annotationIconPath} />
          </svg>
        </div>

        {/* Tooltip pour annotation - rendu via portail */}
        {showTooltip && annotation && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div 
            ref={tooltipRef}
            className="fixed z-[99999] pointer-events-none transition-opacity duration-75"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              minWidth: '200px',
              maxWidth: '300px',
              opacity: isPositioned ? 1 : 0,
            }}
          >
            <div 
              className="bg-white border-2 rounded-lg shadow-lg p-3"
              style={{
                borderColor: color,
                color: '#333',
              }}
            >
              <div className="text-sm whitespace-pre-wrap break-words">{annotation}</div>
            </div>
            {/* Flèche */}
            <div 
              className={`absolute w-0 h-0 ${
                position.horizontal === 'right' ? 'left-2' : 'right-2'
              }`}
              style={{
                ...(position.vertical === 'top' 
                  ? {
                      bottom: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${color}`,
                    }
                  : {
                      top: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: `6px solid ${color}`,
                    }
                )
              }}
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Rendu pour tag en mode hover
  if (type === 'tag' && placement === 'hover') {
    return (
      <>
        <div 
          ref={iconRef}
          className="relative flex items-center gap-1 transition-all duration-300 ease-in-out"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            borderRadius: '6px',
            zIndex: showTooltip ? 99999 : 'auto',
          }}
        >
          {/* Icône */}
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 16 16" 
            fill="currentColor" 
            className="transition-all duration-300 ease-in-out flex-shrink-0"
            style={{
              width: '16px',
              color: isHovered ? color : textColor
            }}
          >
            <path d={iconPath || ''} />
          </svg>
        </div>

        {/* Tooltip pour tag - rendu via portail */}
        {showTooltip && displayText && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div 
            ref={tooltipRef}
            className="fixed z-[99999] pointer-events-none transition-opacity duration-75"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              minWidth: '150px',
              maxWidth: '250px',
              opacity: isPositioned ? 1 : 0,
            }}
          >
            <div 
              className="bg-white border-2 rounded-lg shadow-lg p-3"
              style={{
                borderColor: color,
                color: '#333',
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
              className={`absolute w-0 h-0 ${
                position.horizontal === 'right' ? 'left-2' : 'right-2'
              }`}
              style={{
                ...(position.vertical === 'top' 
                  ? {
                      bottom: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: `6px solid ${color}`,
                    }
                  : {
                      top: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: `6px solid ${color}`,
                    }
                )
              }}
            />
          </div>,
          document.body
        )}
      </>
    );
  }

  // Rendu pour tag en mode fixed
  if (type === 'tag' && placement === 'fixed') {
    return (
      <div 
        className="absolute -right-5  -bottom-6 z-50" 
        style={{
          transform: 'translateX(-50%)',
          overflow: 'visible',
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
  }

  return null;
};

export default memo(AppointmentIcon);
