import React, { memo, useState, useEffect, useRef } from 'react';
import { TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../..';

interface AppointmentAnnotationProps {
  annotation: string;
  color: string;
  textColor: string;
  isHovered: boolean;
  mainScrollRef: React.RefObject<HTMLDivElement>;
}

const AppointmentAnnotation: React.FC<AppointmentAnnotationProps> = ({
  annotation,
  color,
  textColor,
  isHovered,
  mainScrollRef,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ vertical: 'top', horizontal: 'right' });

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 250);
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

  useEffect(() => {
    if (showTooltip && tooltipRef.current && mainScrollRef) {
      // Attendre que le tooltip soit complètement rendu
      requestAnimationFrame(() => {
        if (!tooltipRef.current || !mainScrollRef.current) return;
        
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const containerRect = mainScrollRef.current.getBoundingClientRect();
        
        let vertical = 'top';
        let horizontal = 'right';
        
        // Vérifier si déborde en haut
        if (tooltipRect.top < (containerRect.top + TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT)) {
          vertical = 'bottom';
        }
        
        // Vérifier si déborde à droite
        if (tooltipRect.right > containerRect.right) {
          horizontal = 'left';
        }
        // Vérifier si déborde à gauche - forcer à gauche pour qu'il parte vers la droite
        else if (tooltipRect.left < containerRect.left) {
          horizontal = 'left';
        }
        
        setPosition({ vertical, horizontal });
        setIsPositioned(true);
      });
    }
  }, [showTooltip, mainScrollRef]);

  return (
    <div 
      className="relative"
      style={{
        zIndex: showTooltip ? 99999 : 'auto',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 16 16" 
        fill="currentColor"
        style={{ color: isHovered ? color : textColor }}
      >
        <path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z"/>
      </svg>

      {/* Tooltip personnalisé */}
      {showTooltip && (
        <div 
          ref={tooltipRef}
          className={`absolute z-[9999] pointer-events-none transition-opacity duration-75 ${
            position.vertical === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            position.horizontal === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{
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
              position.horizontal === 'right' ? 'right-2' : 'left-2'
            }`}
            style={{
              ...(position.vertical === 'top' 
                ? {
                    top: '100%',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `6px solid ${color}`,
                  }
                : {
                    bottom: '100%',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: `6px solid ${color}`,
                  }
              )
            }}
          />
        </div>
      )}
    </div>
  );
};

export default memo(AppointmentAnnotation);
