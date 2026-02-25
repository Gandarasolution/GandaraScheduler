/**
 * @fileoverview Composant AppointmentItem - Affichage et interaction avec un rendez-vous
 * @version 1.2.0 (Mode Ghost Partiel / Chevauchement Hybride)
 */

"use client";
import React, { useState, useRef, memo, useEffect, useCallback, useMemo } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { Appointment, HalfDayInterval, Item } from '../../types';
import { isWeekend } from 'date-fns';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS, DAY_MS, HOUR_MS } from '../../utils/constants';
import AppointmentTag from './AppointmentTag';
import { countWeekends } from '../../utils/dates';

interface AppointmentItemProps {
  appointment: Appointment;
  isFullDay: boolean;
  isMobile: boolean;
  isDisplayWeekend?: boolean;
  timelineStart?: number;
  isInactive?: boolean;
  className?: string;
  absoluteLeft?: number;
  absoluteWidth?: number;
  absoluteTop?: number;
  event: Item;
  chargeeAffaire: string ;
  source?: 'calendar' | 'demo';
  isSelected?: boolean;
  /* Indique si le composant est en mode chevauchement */
  isGhost?: boolean;
  /* Intervalle(s) de chevauchement pour le mode ghost (accepte soit un intervalle, soit un tableau d'intervalles) */
  ghostInterval?: { start: number; end: number } | { start: number; end: number }[]; 
  /* Mode d'affichage de l'étiquette */
  tagPlacement?: 'hover' | 'fixed';
  onClick?: () => void;
  onDoubleClick?: () => void;
  onResize?: (id: number, newStart: number, newEnd: number, resizeDirection: 'left' | 'right', priority: number) => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  isFullDay,
  isMobile,
  event,
  chargeeAffaire,
  isDisplayWeekend,
  timelineStart = 0,
  isInactive = false,
  source = 'calendar',
  isSelected,
  className,
  absoluteLeft,
  absoluteWidth,
  absoluteTop,
  isGhost = false,
  ghostInterval,
  tagPlacement = 'hover',
  onClick,
  onDoubleClick,
  onResize,
  handleContextMenu,
}) => {

  //console.log(tagPlacement);
  
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStart, setDragStart] = useState<number>(appointment.startDate);
  const [dragEnd, setDragEnd] = useState<number>(appointment.endDate);
  
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const dragStartRef = useRef<number>(appointment.startDate);
  const dragEndRef = useRef<number>(appointment.endDate);
  const initialX = useRef(0);
  const [ghostWidthPx, setGhostWidthPx] = useState<{widthGhost: number, widthNoGhost: number}[]>([{widthGhost: 0, widthNoGhost: 0}]);

  const startDate = React.useMemo(() => appointment.startDate, [appointment.startDate]);
  const endDate = React.useMemo(() => appointment.endDate, [appointment.endDate]);

  // Calculer la durée du rendez-vous en jours
  const appointmentDurationDays = React.useMemo(() => {
    const durationMs = endDate - startDate;
    return Math.ceil(durationMs / DAY_MS);
  }, [startDate, endDate]);

  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const INTERVAL_DURATION = isFullDay 
    ? (DAY_INTERVALS[0].endHour - DAY_INTERVALS[0].startHour) * 60 * 60 * 1000 
    : (HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour) * 60 * 60 * 1000;
    
  // --- Fonctions utilitaires ---
  const getIntervalCount = useCallback((start: number, end: number) => {
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    let count = 0;
    let currentTs = start;
    const forward = end >= start;
    
    while (forward ? currentTs < end : currentTs > end) {
      if (isDisplayWeekend || !isWeekend(currentTs)) {
        count++;
      }
      const currentHour = new Date(currentTs).getHours();
      let idx = intervals.findIndex(interval => 
        currentHour >= interval.startHour && currentHour < interval.endHour
      );
      if (idx === -1) idx = 0;

      if (forward) {
        idx++;
        if (idx >= intervals.length) {
          idx = 0;
          currentTs = new Date(currentTs + DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      } else {
        idx--;
        if (idx < 0) {
          idx = intervals.length - 1;
          currentTs = new Date(currentTs - DAY_MS).setHours(intervals[idx].startHour, 0, 0, 0);
        } else {
          currentTs = new Date(currentTs).setHours(intervals[idx].startHour, 0, 0, 0);
        }
      }
    }
    return forward ? Math.max(0, count) : -Math.max(0, count);
  }, [isDisplayWeekend, isFullDay]);

  const intervalCount = getIntervalCount(dragStart, dragEnd);
  const isSmallAppointment = intervalCount <= 1;
  const appointmentWidthPx = intervalCount * INTERVAL_WIDTH;
  const hasSpaceForBothHandles = appointmentWidthPx >= 60;

  const offsetIntervals = isDisplayWeekend 
    ? Math.floor((dragStart - startDate) / INTERVAL_DURATION)
    : getIntervalCount(startDate, dragStart);

  const [computedWidth, setComputedWidth] = useState<string>(
    absoluteWidth !== undefined 
    ? `${absoluteWidth}px` 
    : isMobile 
      ? (intervalCount >= 2 && !isFullDay ? '200%' : '100%') 
      : `${intervalCount * INTERVAL_WIDTH}px`
  );
  const [computedLeft, setComputedLeft] = useState<number>(absoluteLeft !== undefined ? absoluteLeft : offsetIntervals * INTERVAL_WIDTH);
  
  

  // --- Drag & Drop ---
  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: () => ({
      id: appointment.id,
      type: 'appointment',
      startDate: startDate,
      endDate: endDate,
      dragOffset,
    }),
    canDrag: () => !isResizingLeft && !isResizingRight,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const isAnyDragging = useDragLayer((monitor) => monitor.isDragging());
  const computedTop = `${absoluteTop}px`;
  // --- Handlers (Resize/Drag) ---
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  }, []);

  const setDragStartSafe = useCallback((date: number) => {
    dragStartRef.current = date;
    setDragStart(date);
  }, []);

  const setDragEndSafe = useCallback((date: number) => {
    dragEndRef.current = date;
    setDragEnd(date);
  }, []);

  const addInterval = useCallback((date: number, n: number, intervals: HalfDayInterval[]): number => {      
      let currentTs = date;
      let currentHour = new Date(currentTs).getHours();
      let idx = intervals.findIndex(interval => 
          currentHour >= interval.startHour && currentHour < interval.endHour
      );
      if (idx === -1) idx = 0;
      const step = n >= 0 ? 1 : -1;
      let remaining = Math.abs(n);

      while (remaining > 0) {
          idx += step;
          if (idx > 0 ) {
              idx = 0;
              currentTs += isFullDay ? DAY_MS : DAY_MS/2; 
          } else if (idx <= 0) {
              idx = intervals.length - 1;
              currentTs -= isFullDay ? DAY_MS : DAY_MS/2; 
          }
          if (!isDisplayWeekend) {
              while (isWeekend(currentTs)) {
                  currentTs += (step * (isFullDay ? DAY_MS : DAY_MS/2));
              }
          }
          remaining--;
      }
      return currentTs;
  }, [isDisplayWeekend, isFullDay]);

  const handleMouseDown = useCallback((e: React.MouseEvent, handleType: 'left' | 'right') => {
    e.stopPropagation();
    initialX.current = e.clientX;
    setDragStart(startDate);
    setDragEnd(endDate);
    if (handleType === 'left') setIsResizingLeft(true);
    else setIsResizingRight(true);
  }, [startDate, endDate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (!isResizingLeft && !isResizingRight) return;
    
    const currentDx = (e.clientX - initialX.current) ;
    let intervalsMoved = Math.round(currentDx / INTERVAL_WIDTH);
    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;

    if (isResizingLeft) {
      let newStartDate = addInterval(startDate, intervalsMoved, intervals);
      if (newStartDate > dragEndRef.current) {
        newStartDate = addInterval(dragEndRef.current, 0, intervals);
      }
      setDragStartSafe(newStartDate);
    }
    if (isResizingRight) {
      let newEndDate = addInterval(endDate, intervalsMoved, intervals);
      if (newEndDate < dragStartRef.current) {
        newEndDate = addInterval(dragStartRef.current, 1, intervals);
      }
      setDragEndSafe(new Date(newEndDate).setHours(new Date(newEndDate).getHours() - 1, 59, 59, 999));
    }    
  }, [isResizingLeft, isResizingRight, startDate, endDate, isFullDay, addInterval, setDragStartSafe, setDragEndSafe, INTERVAL_WIDTH]);

  const handleMouseUp = useCallback(() => {
    
    if (isResizingRight) {
      onResize && onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'right', (appointment.priority ?? 0));
    }
    if (isResizingLeft) {      
      onResize && onResize(appointment.id, dragStartRef.current, dragEndRef.current, 'left', (appointment.priority ?? 0));
    }
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, [isResizingLeft, isResizingRight, onResize, appointment.id]);

  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    setDragStartSafe(startDate);
    setDragEndSafe(endDate);
  }, [startDate, endDate, setDragStartSafe, setDragEndSafe]);

  useEffect(() => {
    // 1. Calcul de la largeur totale
    const durationMs = dragEndRef.current - dragStartRef.current;
    const durationInterval = Math.round(durationMs / (isFullDay ? DAY_MS : DAY_MS / 2)); 
    let NbDayWeekends = 0;
    if (!isDisplayWeekend) {
      NbDayWeekends = countWeekends(dragStartRef.current, dragEndRef.current);
    }
    const visualDurationDays = Math.max(0.1, durationInterval - (NbDayWeekends * (isFullDay ? 1 : 2)));
    setComputedWidth((visualDurationDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2)) + 'px');

    // 2. Calcul de la largeur de la zone Ghost (si activée)
    if (isGhost && ghostInterval) {
        const intervals = Array.isArray(ghostInterval) ? ghostInterval : [ghostInterval];
        // Trier les intervalles par date de début
        const sortedIntervals = intervals
            .filter(gi => gi && gi.end > dragStart && gi.start < dragEnd)
            .sort((a, b) => a.start - b.start);
        
        const ghostWidths: {widthGhost: number, widthNoGhost: number}[] = [];
        let currentPos = dragStart;
        
        sortedIntervals.forEach((gi, index) => {
            const overlapStart = Math.max(gi.start, dragStart);
            const overlapEnd = Math.min(gi.end, dragEnd);
            
            // Zone visible AVANT le chevauchement (si il y a un espace)
            if (overlapStart > currentPos) {
                const visibleDurationMs = overlapStart - currentPos;
                const visibleIntervals = Math.round(visibleDurationMs / (isFullDay ? DAY_MS : DAY_MS / 2));
                
                let visibleWeekends = 0;
                if (!isDisplayWeekend) {
                    visibleWeekends = countWeekends(currentPos, overlapStart);
                }
                
                const visualVisibleDays = Math.max(0, visibleIntervals - (visibleWeekends * (isFullDay ? 1 : 2)));
                const visibleWidthPx = visualVisibleDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2);
                
                if (visibleWidthPx > 0) {
                    ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleWidthPx });
                }
            }
            
            // Zone hachurée (chevauchement)
            const ghostDurationMs = overlapEnd - overlapStart;
            const ghostIntervals = Math.round(ghostDurationMs / (isFullDay ? DAY_MS : DAY_MS / 2));
            
            let ghostWeekends = 0;
            if (!isDisplayWeekend) {
                ghostWeekends = countWeekends(overlapStart, overlapEnd);
            }
            
            const visualGhostDays = Math.max(0, ghostIntervals - (ghostWeekends * (isFullDay ? 1 : 2)));
            const ghostWidthPx = visualGhostDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2);
            
            if (ghostWidthPx > 0) {
                ghostWidths.push({ widthGhost: ghostWidthPx, widthNoGhost: 0 });
            }
            
            currentPos = overlapEnd;
        });
        
        // Zone visible APRÈS le dernier chevauchement
        if (currentPos < dragEnd) {
            const visibleDurationMs = dragEnd - currentPos;
            const visibleIntervals = Math.round(visibleDurationMs / (isFullDay ? DAY_MS : DAY_MS / 2));
            
            let visibleWeekends = 0;
            if (!isDisplayWeekend) {
                visibleWeekends = countWeekends(currentPos, dragEnd);
            }
            
            const visualVisibleDays = Math.max(0, visibleIntervals - (visibleWeekends * (isFullDay ? 1 : 2)));
            const visibleWidthPx = visualVisibleDays * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2);
            
            if (visibleWidthPx > 0) {
                ghostWidths.push({ widthGhost: 0, widthNoGhost: visibleWidthPx });
            }
        }
        
        setGhostWidthPx(ghostWidths.length > 0 ? ghostWidths : [{widthGhost: 0, widthNoGhost: 0}]);
    } else {
        setGhostWidthPx([{widthGhost: 0, widthNoGhost: 0}]);
    }

    // 3. Calcul du Left en cas de resize
    if (isResizingLeft) {
      const startFromTimelineOrigin = dragStartRef.current - timelineStart;
      const intervalFromOrigin = Math.round(startFromTimelineOrigin / (isFullDay ? DAY_MS : (DAY_MS / 2)));
      let weekendsToRemove = 0;
      if (!isDisplayWeekend) {
        weekendsToRemove = countWeekends(timelineStart, dragStartRef.current);
      }
      const visualInstervalsOffset = intervalFromOrigin - (weekendsToRemove * (isFullDay ? 1 : 2));
      const newLeftPixel = Math.max(0, visualInstervalsOffset * (isFullDay ? CELL_WIDTH : CELL_WIDTH / 2));
      setComputedLeft(newLeftPixel);
    }
  }, [absoluteWidth, isMobile, intervalCount, INTERVAL_WIDTH, isResizingLeft, timelineStart, isFullDay, isDisplayWeekend, isGhost, ghostInterval, dragStart, dragEnd]); 
  
  useEffect(() => {
    if (isResizingLeft) return; 
    if (absoluteLeft !== undefined) {
      setComputedLeft(absoluteLeft);
    } else {
      setComputedLeft(offsetIntervals * INTERVAL_WIDTH);
    }
  }, [absoluteLeft, offsetIntervals, isResizingLeft, INTERVAL_WIDTH]);

  // --- Styles ---
  
  const appointmentColor = event?.color || '#1E40AF';
  const appointmentBorderColor = event?.borderColor || '#1E40AF';
  const appointmentTextColor = event?.textColor || '#FFFFFF';

  // if (event.label === '1052 Logements Vesoul') {
  //   console.log('appointmentColor', appointmentColor);
  //   console.log('appointmentBorderColor', appointmentBorderColor);
  //   console.log('appointmentTextColor', appointmentTextColor);
  // }

  const containerStyle = useMemo(() => ({
    width: source === 'demo' ? '100%' : computedWidth,
    height: `${CELL_HEIGHT}px`,
    minWidth: `${INTERVAL_WIDTH}px`,
    pointerEvents: isDragging ? 'none' as const : 'auto' as const,
    left: `${computedLeft}px`,
    willChange: 'width, left',
    top: computedTop,
    // Le conteneur principal devient transparent si c'est un Ghost
    // car les backgrounds sont gérés par les enfants (Ghost Part vs Real Part)
    backgroundColor: isGhost ? 'transparent' : (isHovered ? 'white' : appointmentColor), 
    border: isGhost ? 'none' : `2px solid ${appointmentBorderColor}`,
    transition: 'all 0.2s ease-in-out',
    // Z-index basé sur priorité : plus la priorité est élevée, plus le z-index est élevé
    zIndex: isGhost ? 30 : (isDragging ? 40 : (20 + (appointment.priority || 0))),
    opacity: isInactive ? 0.5 : 1,
    cursor: isInactive ? 'not-allowed' : (isDragging ? 'grabbing' : (source === 'calendar' ? 'grab' : 'default')),
  }), [source, computedWidth, INTERVAL_WIDTH, isDragging, computedLeft, computedTop, isHovered, appointmentColor, appointmentBorderColor, isGhost, appointment]);

  return (
    <div
      key={appointment.id}
      ref={(node) => { if (node && source === 'calendar' && !isInactive) drag(node); }}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick && onDoubleClick();
      }}
      onContextMenu={(e) => {
         // (Logique Context Menu inchangée)
         const rect = e.currentTarget.getBoundingClientRect();
         const mouseX = e.clientX - rect.left;
         const intervalIndex = Math.floor(mouseX / INTERVAL_WIDTH);
         const totalIntervals =getIntervalCount(startDate, endDate);
         const clampedIntervalIndex = Math.max(0, Math.min(intervalIndex, totalIntervals - 1));
         
         const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
         let targetDate = startDate;
         let currentIntervalCount = 0;
         
         while (currentIntervalCount < clampedIntervalIndex) {
           let currentIntervalIdx = intervals.findIndex(interval =>
              new Date(targetDate).getHours() >= interval.startHour && new Date(targetDate).getHours() < interval.endHour
           );
           if (currentIntervalIdx === -1) currentIntervalIdx = 0;
           
           currentIntervalIdx++;
           if (currentIntervalIdx >= intervals.length) {
             targetDate = new Date(targetDate + DAY_MS).setHours(intervals[0].startHour, 0, 0, 0);
             while (!isDisplayWeekend && isWeekend(targetDate)) {
               targetDate = targetDate + DAY_MS;
             }
           } else {
             targetDate = new Date(targetDate).setHours(intervals[currentIntervalIdx].startHour, 0, 0, 0);
           }
           currentIntervalCount++;
         }
         
         const cellUnderMouse = {
           employeeId: appointment.employee.id as number,
           date: targetDate
         };
         
         handleContextMenu && handleContextMenu(e, 'appointment', appointment, cellUnderMouse);
      }}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        appointment-item rounded-xl text-sm shadow-md
        flex flex-shrink-0 items-center gap-2 ${tagPlacement === 'fixed' ? 'overflow-visible' : 'overflow-hidden'} whitespace-nowrap text-ellipsis
        transition-all z-20 h-11 group duration-200
        ${isDragging ? 'opacity-60 scale-95' : 'opacity-100'}
        ${source === 'calendar' && isSelected ? 'ring-3 ring-color' : ''}
        ${isAnyDragging ? 'opacity-50 pointer-events-none' : ''}
        ${source === 'calendar' ? 'absolute cursor-grab' : 'block'}
        ${!isGhost && 'hover:shadow-xl'}
        ${className || ''}
        

      `}
      title={event?.label}
      style={containerStyle}
    >
      {/* ZONES D'ARRIÈRE-PLAN POUR LE MODE GHOST 
          ---------------------------------------
      */}
      {isGhost && (
          <>
            {ghostWidthPx.map((segment, index) => {
              const leftOffset = ghostWidthPx.slice(0, index).reduce((acc, g) => acc + g.widthGhost + g.widthNoGhost, 0);
              const isFirst = index === 0;
              const isLast = index === ghostWidthPx.length - 1;
              
              return (
                <React.Fragment key={index}>
                  {/* Zone hachurée (chevauchement) */}
                  {segment.widthGhost > 0 && (
                    <div 
                      className="absolute top-0 bottom-0"
                      style={{
                          left: `${leftOffset}px`,
                          width: `${segment.widthGhost}px`,
                          backgroundImage: `repeating-linear-gradient(45deg, ${appointmentColor} 0px, ${appointmentColor} 10px, rgba(255,255,255,0.8) 10px, rgba(255,255,255,0.8) 20px)`,
                          opacity: 0.4,
                          border: '2px dashed rgba(0,0,0,0.2)',
                          borderRight: segment.widthNoGhost > 0 ? 'none' : undefined,
                          borderLeft: isFirst ? undefined : 'none',
                          borderRadius: isFirst ? '0.75rem 0 0 0.75rem' : '0',
                          zIndex: 0
                      }}
                    />
                  )}
                  {/* Zone visible (non chevauchement) */}
                  {segment.widthNoGhost > 0 && (
                    <div 
                      className="absolute top-0 bottom-0"
                      style={{
                          left: `${leftOffset + segment.widthGhost}px`,
                          width: `${segment.widthNoGhost}px`,
                          backgroundColor: isHovered ? 'white' : appointmentColor,
                          border: `2px solid ${appointmentBorderColor}`,
                          borderLeft: segment.widthGhost > 0 ? 'none' : (isFirst ? undefined : 'none'),
                          borderRight: isLast ? undefined : 'none',
                          borderRadius: isLast && segment.widthGhost === 0 && isFirst ? '0.75rem' : (isLast ? '0 0.75rem 0.75rem 0' : (isFirst && segment.widthGhost === 0 ? '0.75rem 0 0 0.75rem' : '0')),
                          zIndex: 0
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </>
      )}

      {/* Handle de redimensionnement à gauche */}
      {source === 'calendar' && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30 ${
            isSmallAppointment || !hasSpaceForBothHandles 
              ? 'left-0 w-1/3 bg-transparent' 
              : '-left-1 w-3'
          }`}
          title={isSmallAppointment ? "Redimensionner (côté gauche)" : "Redimensionner"}
          onMouseDown={(e) => !isInactive && handleMouseDown(e, 'left')}
          style={{ 
            borderRadius: '4px 0 0 4px',
            cursor: isInactive ? 'not-allowed' : 'ew-resize'
          }}
        />
      )}

      {/* CONTENU (Tags, Icone, Texte) */}
      {/* On met z-10 et relative pour être au-dessus des backgrounds */}
      {/* Masqué si en mode Ghost (chevauchement) */}
      {!isGhost && (
        <div className="relative z-10 flex items-center gap-2 w-full h-full px-2">        
          {event?.image ? (
              <img
              src={event?.image.image}
              alt="Icône"
              className="w-8 h-8 object-cover rounded-full flex-shrink-0"
              />
          ): (
              <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"></div>
          )}

          <div className='flex flex-col min-w-0 flex-1'>
              <span 
              className={`appointment-text flex-grow font-semibold truncate max-w-full transition-colors duration-200`}
              style={{ 
                  color: isHovered ? appointmentColor : appointmentTextColor || '#FFFFFF'
              }}
              >
              {event?.label}
              </span>
              
              <div className="flex items-center gap-2 text-xs truncate max-w-full">
              <span 
                  className="truncate transition-colors duration-200"
                  style={{ 
                  color: isHovered ? appointmentColor : appointmentTextColor || '#FFFFFF'
                  }}
              >
                  {chargeeAffaire}
              </span>
              </div>
          </div>
        </div>
      )}

      {/* Étiquette/Tag sous forme d'indicateur en bas à droite */}
      {appointment.tag && (
        <AppointmentTag 
          tagName={appointment?.tag.name}
          tagShortName={appointment?.tag.shortName}
          color={isGhost ? '#333' : appointmentColor}
          textColor={isGhost ? '#000' : appointmentTextColor}
          isHovered={isHovered}
          isResizing={isResizingRight}
          appointmentWidth={appointmentWidthPx}
          appointmentDurationDays={appointmentDurationDays}
          placement={tagPlacement}
        />
      )}

      {/* Handle de redimensionnement à droite */}
      {source === 'calendar' && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30 ${
            isSmallAppointment || !hasSpaceForBothHandles 
              ? 'right-0 w-1/3 bg-transparent' 
              : '-right-1 w-3'
          }`}
          title={isSmallAppointment ? "Redimensionner (côté droit)" : "Redimensionner"}
          onMouseDown={(e) => !isInactive && handleMouseDown(e, 'right')}
          style={{ 
            borderRadius: '0 4px 4px 0', 
            cursor: isInactive ? 'not-allowed' : 'ew-resize'
          }}
        />
      )}
    </div>
  );
};

export default memo(AppointmentItem);