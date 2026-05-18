import React, { memo, useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../..';

interface AppointmentMetadataProps {
  color: string;
  textColor: string;
  isHovered: boolean;
  mainScrollRef?: React.RefObject<HTMLDivElement>;
  annotation?: string;
  tagText?: string;
  tagColor?: string;
  annotationImgSvg: React.ReactNode;
  tagImgSvg: React.ReactNode;
}

const AppointmentMetadata: React.FC<AppointmentMetadataProps> = ({
  color,
  textColor,
  mainScrollRef,
  annotation,
  tagText,
  tagColor,
  annotationImgSvg,
  tagImgSvg,
}) => {
  const [showAnnotationTooltip, setShowAnnotationTooltip] = useState(false);
  const [showTagTooltip, setShowTagTooltip] = useState(false);
  const [isAnnotationPositioned, setIsAnnotationPositioned] = useState(false);
  const [isTagPositioned, setIsTagPositioned] = useState(false);
  
  const tooltipRef = useRef<HTMLDivElement>(null);
  const annotationIconRef = useRef<HTMLDivElement>(null);
  const tagIconRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState({ vertical: 'top', horizontal: 'right' });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // SVG path pour l'annotation (document icon)
  const annotationIconPath = "M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z";

  // SVG path pour l'étiquette (tag icon)
  const tagIconPathDefault = "M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z";

  // Handlers pour l'annotation
  const handleAnnotationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAnnotationTooltip(!showAnnotationTooltip);
    setShowTagTooltip(false); // Fermer l'autre tooltip
  };

  // Handlers pour le tag
  const handleTagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTagTooltip(!showTagTooltip);
    setShowAnnotationTooltip(false); // Fermer l'autre tooltip
  };

  // Fermer les tooltips au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedInsideAnnotation = annotationIconRef.current?.contains(event.target as Node);
      const clickedInsideTag = tagIconRef.current?.contains(event.target as Node);
      
      if (!clickedInsideAnnotation && !clickedInsideTag) {
        setShowAnnotationTooltip(false);
        setShowTagTooltip(false);
        setIsAnnotationPositioned(false);
        setIsTagPositioned(false);
      }
    };

    if (showAnnotationTooltip || showTagTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAnnotationTooltip, showTagTooltip]);

  // Positionnement pour annotation tooltip
  useEffect(() => {
    if (showAnnotationTooltip && tooltipRef.current && annotationIconRef.current && mainScrollRef?.current) {
      requestAnimationFrame(() => {
        if (!tooltipRef.current || !annotationIconRef.current || !mainScrollRef?.current) return;
        
        const iconRect = annotationIconRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const containerRect = mainScrollRef.current.getBoundingClientRect();
        
        let vertical = 'top';
        let horizontal = 'right';
        let top = iconRect.top;
        let left = iconRect.left - 20;
        
        // Vérifier si le tooltip dépasse du conteneur en haut, sinon le positionner en dessous de l'icône
        if (iconRect.top - tooltipRect.height - 8 < (containerRect.top + TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT)) {
          vertical = 'bottom';
          top = iconRect.bottom + 8;
        } else {
          vertical = 'top';
          top = iconRect.top - tooltipRect.height;
        }
        
        // Vérifier si le tooltip dépasse du conteneur à droite, sinon le positionner à gauche de l'icône
        if (iconRect.right + tooltipRect.width > containerRect.right) {
          horizontal = 'left';
          left = iconRect.right - tooltipRect.width;
        } else {
          horizontal = 'right';
          left = iconRect.left - iconRect.width;
        }
        
        // Vérifier si le tooltip dépasse du conteneur à gauche, sinon le positionner à droite de l'icône
        if (left < containerRect.left) {
          horizontal = 'left';
          left = iconRect.left;
        }
        
        setPosition({ vertical, horizontal });
        setTooltipPosition({ top, left });
        setIsAnnotationPositioned(true);
      });
    }
  }, [showAnnotationTooltip, mainScrollRef]);

  // Positionnement pour tag tooltip
  useEffect(() => {
    if (showTagTooltip && tooltipRef.current && tagIconRef.current && mainScrollRef?.current) {
          console.log('Calculating tag tooltip position...');

      requestAnimationFrame(() => {
        if (!tooltipRef.current || !tagIconRef.current || !mainScrollRef?.current) return;
        
        const iconRect = tagIconRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const containerRect = mainScrollRef.current.getBoundingClientRect();
        
        let vertical = 'top';
        let horizontal = 'right';
        let top = iconRect.top;
        let left = iconRect.left ;
        
        if (iconRect.top - tooltipRect.height - 8 < (containerRect.top + TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT)) {
          vertical = 'bottom';
          top = iconRect.bottom + 8;
        } else {
          vertical = 'top';
          top = iconRect.top - tooltipRect.height - 8;
        }
        
        if (iconRect.right + tooltipRect.width > containerRect.right) {
          horizontal = 'left';
          left = iconRect.right - tooltipRect.width;
        } else {
          horizontal = 'right';
          left = iconRect.left - iconRect.width;
        }
        
        if (left < containerRect.left) {
          horizontal = 'left';
          left = iconRect.left + iconRect.width;
        }
        
        setPosition({ vertical, horizontal });
        setTooltipPosition({ top, left });
        setIsTagPositioned(true);
      });
    }
  }, [showTagTooltip, mainScrollRef]);



  return (
    <>
      <div className="flex items-center gap-1">
        {/* Icône d'annotation */}
        {annotation && (
          <div 
            ref={annotationIconRef}
            className="relative cursor-pointer"
            style={{
              zIndex: showAnnotationTooltip ? 99999 : 'auto',
            }}
            onClick={handleAnnotationClick}
          >
            {annotationImgSvg}
          </div>
        )}

        {/* Icône d'étiquette */}
        {tagText && (
          <div 
            ref={tagIconRef}
            className="relative cursor-pointer"
            style={{
              zIndex: showTagTooltip ? 99999 : 'auto',
            }}
            onClick={handleTagClick}
          >
            {tagImgSvg}
          </div>
        )}
      </div>

      {/* Tooltip annotation */}
      {((showAnnotationTooltip && annotation) || (showTagTooltip && tagText)) &&  typeof document !== 'undefined' && ReactDOM.createPortal(
        <div 
          ref={tooltipRef}
          className="fixed z-[99999] transition-opacity duration-75"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            minWidth: '250px',
            maxWidth: '350px',
            opacity: isAnnotationPositioned || isTagPositioned ? 1 : 0,
          }}
        >
          <div 
            className="bg-white border-2 rounded-lg shadow-2xl p-4"
            style={{
              borderColor: 'var(--contraste-max)',
              color: '#333',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {annotation && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="currentColor"
                    style={{ color: '#000000' }}
                  >
                    <path d={annotationIconPath} />
                  </svg>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    Annotation
                  </span>
                </div>
                <div 
                  className="text-sm whitespace-pre-wrap break-words"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {annotation}
                </div>
              </div>
            )}

            {tagText &&(
              <div className='mt-4'>
                <div className="flex items-center gap-2 mb-2">
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="currentColor"
                    style={{ color: '#000000' }}
                  >
                    <path d={tagIconPathDefault} />
                  </svg>
                  <div 
                    className="px-3 py-2 rounded-md font-bold uppercase text-xs"
                    style={{ 
                      backgroundColor: tagColor || color,
                      color: textColor,
                    }}
                  >
                    {tagText}
                  </div>
                </div>
                
              </div>
            )}
          </div>
        
          <div 
            className={`absolute w-0 h-0 ${
              position.horizontal === 'right' ? 'left-4' : 'right-4'
            }`}
            style={{
              ...(position.vertical === 'top' 
                ? {
                    bottom: '-6px',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `6px solid var(--contraste-max)`,
                  }
                : {
                    top: '-6px',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: `6px solid var(--contraste-max)`,
                  }
              )
            }}
          />
        </div>,
        document.body
      )}      
    </>
  );
};

export default memo(AppointmentMetadata);
