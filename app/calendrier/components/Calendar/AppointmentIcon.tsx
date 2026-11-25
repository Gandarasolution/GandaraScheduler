import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { TIMELINE_HEADERGROUPS_CELL_HEIGHT, TIMELINE_HEADERITEMS_CELL_HEIGHT } from '../..';

interface AppointmentMetadataProps {
  color?: string;
  textColor?: string;
  isHovered?: boolean;
  mainScrollRef?: React.RefObject<HTMLDivElement>;
  annotation?: string;
  tagText?: string;
  tagColor?: string;
  annotationImgSvg: React.ReactNode;
  tagImgSvg: React.ReactNode;
}

const ANNOTATION_ICON_PATH =
  "M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h6.086a1.5 1.5 0 0 0 1.06-.44l4.915-4.914A1.5 1.5 0 0 0 15 8.586V2.5A1.5 1.5 0 0 0 13.5 1h-11zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5V8H9.5A1.5 1.5 0 0 0 8 9.5V14H2.5a.5.5 0 0 1-.5-.5v-11zm7 11.293V9.5a.5.5 0 0 1 .5-.5h4.293L9 13.793z";

const TAG_ICON_PATH_DEFAULT =
  "M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z";

const AppointmentMetadata: React.FC<AppointmentMetadataProps> = ({
  mainScrollRef,
  annotation,
  tagText,
  annotationImgSvg,
  tagImgSvg,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<'annotation' | 'tag' | null>(null);
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState<{ vertical: 'top' | 'bottom'; horizontal: 'left' | 'right' }>({
    vertical: 'top',
    horizontal: 'right',
  });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const annotationIconRef = useRef<HTMLDivElement>(null);
  const tagIconRef = useRef<HTMLDivElement>(null);

  const handleAnnotationClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPositioned(false);
    setActiveTooltip((prev) => (prev === 'annotation' ? null : 'annotation'));
  }, []);

  const handleTagClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPositioned(false);
    setActiveTooltip((prev) => (prev === 'tag' ? null : 'tag'));
  }, []);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!activeTooltip) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !annotationIconRef.current?.contains(target) &&
        !tagIconRef.current?.contains(target)
      ) {
        setActiveTooltip(null);
        setIsPositioned(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTooltip]);

  // Positionnement unifié des tooltips
  useEffect(() => {
    if (!activeTooltip || !mainScrollRef?.current) return;

    const rafId = requestAnimationFrame(() => {
      const iconEl = activeTooltip === 'annotation' ? annotationIconRef.current : tagIconRef.current;
      const tooltipEl = tooltipRef.current;
      const containerEl = mainScrollRef.current;
      if (!iconEl || !tooltipEl || !containerEl) return;

      const iconRect = iconEl.getBoundingClientRect();
      const tooltipRect = tooltipEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const minTop = containerRect.top + TIMELINE_HEADERITEMS_CELL_HEIGHT + TIMELINE_HEADERGROUPS_CELL_HEIGHT;

      let vertical: 'top' | 'bottom' = 'top';
      let horizontal: 'left' | 'right' = 'right';
      let top = 0;
      let left = 0;

      if (iconRect.top - tooltipRect.height - 8 < minTop) {
        vertical = 'bottom';
        top = iconRect.bottom + 8;
      } else {
        vertical = 'top';
        top = iconRect.top - tooltipRect.height - (activeTooltip === 'tag' ? 8 : 0);
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
        left = activeTooltip === 'tag' ? iconRect.left + iconRect.width : iconRect.left;
      }

      setPosition({ vertical, horizontal });
      setTooltipPosition({ top, left });
      setIsPositioned(true);
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeTooltip, mainScrollRef]);

  const showPortal =
    ((activeTooltip === 'annotation' && Boolean(annotation)) ||
      (activeTooltip === 'tag' && Boolean(tagText))) &&
    typeof document !== 'undefined';

  return (
    <>
      <div className="flex items-center gap-1">
        {annotation && (
          <div
            ref={annotationIconRef}
            className="relative cursor-pointer"
            style={{ zIndex: activeTooltip === 'annotation' ? 99999 : 'auto' }}
            onClick={handleAnnotationClick}
          >
            {annotationImgSvg}
          </div>
        )}

        {tagText && (
          <div
            ref={tagIconRef}
            className="relative cursor-pointer"
            style={{ zIndex: activeTooltip === 'tag' ? 99999 : 'auto' }}
            onClick={handleTagClick}
          >
            {tagImgSvg}
          </div>
        )}
      </div>

      {showPortal &&
        ReactDOM.createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[99999] transition-opacity duration-75"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              minWidth: '250px',
              maxWidth: '350px',
              opacity: isPositioned ? 1 : 0,
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
              {activeTooltip === 'annotation' && annotation && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#000000' }}>
                      <path d={ANNOTATION_ICON_PATH} />
                    </svg>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      Annotation
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                    {annotation}
                  </div>
                </div>
              )}

              {activeTooltip === 'tag' && tagText && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#000000' }}>
                      <path d={TAG_ICON_PATH_DEFAULT} />
                    </svg>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      Étiquette
                    </span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words" style={{ color: 'var(--text-secondary)' }}>
                    {tagText}
                  </div>
                </div>
              )}
            </div>

            <div
              className={`absolute w-0 h-0 ${position.horizontal === 'right' ? 'left-4' : 'right-4'}`}
              style={
                position.vertical === 'top'
                  ? {
                      bottom: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid var(--contraste-max)',
                    }
                  : {
                      top: '-6px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderBottom: '6px solid var(--contraste-max)',
                    }
              }
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default memo(AppointmentMetadata);