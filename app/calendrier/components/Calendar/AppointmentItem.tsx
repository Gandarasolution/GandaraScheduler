/**
 * @fileoverview Composant AppointmentItem - Affichage et interaction avec un rendez-vous
 * @version 1.2.0 (Mode Ghost Partiel / Chevauchement Hybride)
 */

"use client";
import React, { useState, useRef, memo, useEffect, useCallback, useMemo } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { isWeekend } from 'date-fns';
import { Appointment, HalfDayInterval, Item } from '../../types';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS, DAY_MS, HOUR_MS } from '../../utils/constants';
import AppointmentTag from './AppointmentTag';
import { useAppointmentResize, useGhostSegments, calculateWidthPx, calculateLeftPx, getIntervalCount } from '../../hooks';

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
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const startDate = React.useMemo(() => appointment.startDate, [appointment.startDate]);
  const endDate = React.useMemo(() => appointment.endDate, [appointment.endDate]);

  // Hook de gestion du resize
  const {
    isResizingLeft,
    isResizingRight,
    dragStart,
    dragEnd,
    handleMouseDown,
  } = useAppointmentResize({
    appointmentId: appointment.id,
    startDate,
    endDate,
    priority: appointment.priority ?? 0,
    isFullDay,
    isDisplayWeekend: isDisplayWeekend ?? false,
    onResize,
  });

  // Hook de calcul des segments Ghost
  const ghostSegments = useGhostSegments({
    isGhost: isGhost ?? false,
    ghostInterval,
    dragStart,
    dragEnd,
    isFullDay,
    isDisplayWeekend: isDisplayWeekend ?? false,
  });

  // Calculer la durée du rendez-vous en jours
  const appointmentDurationDays = React.useMemo(() => {
    const durationMs = endDate - startDate;
    return Math.ceil(durationMs / DAY_MS);
  }, [startDate, endDate]);

  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;

  // Calcul de la largeur et position avec les fonctions utilitaires
  const [computedWidth, setComputedWidth] = useState<string>(
    absoluteWidth !== undefined 
    ? `${absoluteWidth}px` 
    : `${INTERVAL_WIDTH}px`
  );
  const [computedLeft, setComputedLeft] = useState<number>(absoluteLeft ?? 0);
  
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
  
  // --- Handlers (Drag) ---
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientX - rect.left);
  }, []);

  // Calcul de la largeur et position lors du resize
  useEffect(() => {
    // Calcul de la largeur totale
    const widthPx = calculateWidthPx(dragStart, dragEnd, isFullDay, isDisplayWeekend ?? false);
    setComputedWidth(widthPx + 'px');

    // Calcul du Left en cas de resize gauche
    if (isResizingLeft) {
      const leftPx = calculateLeftPx(dragStart, timelineStart, isFullDay, isDisplayWeekend ?? false);
      setComputedLeft(leftPx);
    }
  }, [dragStart, dragEnd, isResizingLeft, timelineStart, isFullDay, isDisplayWeekend]); 
  
  // Synchroniser la position left avec les props
  useEffect(() => {
    if (isResizingLeft) return; 
    if (absoluteLeft !== undefined) {
      setComputedLeft(absoluteLeft);
    }
  }, [absoluteLeft, isResizingLeft]);

  // Calcul de l'appointmentWidthPx pour les handles
  const appointmentWidthPx = useMemo(() => {
    return parseFloat(computedWidth) || INTERVAL_WIDTH;
  }, [computedWidth, INTERVAL_WIDTH]);

  const hasSpaceForBothHandles = appointmentWidthPx >= 60;
  const isSmallAppointment = appointmentWidthPx < (INTERVAL_WIDTH * 1.5);

  // Calculer le padding nécessaire pour éviter le chevauchement avec les icônes (tag + annotation)
  const contentPaddingRight = useMemo(() => {
    const hasAnnotation = !!appointment.description;
    const hasTag = !!appointment.tag;
    
    if (!hasAnnotation && !hasTag) return 8; // Padding minimal par défaut
    
    // Calculer l'espace nécessaire : chaque icône fait ~16px + gap de 4px
    let iconSpace = 0;
    if (hasAnnotation) iconSpace += 20; // 16px icône + 4px marge
    if (hasTag) iconSpace += 20; // 16px icône + 4px marge
    
    // Sur les petits événements, on réduit légèrement le padding
    if (isSmallAppointment) {
      return Math.max(iconSpace * 0.8, 20); // Au minimum 20px sur les petits événements
    }
    
    return iconSpace + 8; // + 8px de marge de sécurité
  }, [appointment.description, appointment.tag, isSmallAppointment]);

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
         const totalIntervals = getIntervalCount(startDate, endDate, isFullDay, isDisplayWeekend ?? false);
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
            {ghostSegments.map((segment, index) => {
              const leftOffset = ghostSegments.slice(0, index).reduce((acc, g) => acc + g.widthGhost + g.widthNoGhost, 0);
              const isFirst = index === 0;
              const isLast = index === ghostSegments.length - 1;
              
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
        <div className="relative z-10 flex items-center gap-2 w-full h-full">        
          {event?.image ? (
              <img
              src={event?.image.image}
              alt="Icône"
              className="w-8 h-8 object-cover flex-shrink-0"
              />
          ): (
              <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"></div>
          )}

          <div 
            className='flex flex-col min-w-0 flex-1'
            style={{ paddingRight: `${contentPaddingRight}px` }}
          >
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
      {((appointment.tag && !isGhost) || appointment.description) && (
        <AppointmentTag 
          tagName={appointment?.tag?.name || ''}
          tagShortName={appointment?.tag?.shortName}
          color={isGhost ? '#333' : appointmentColor}
          textColor={isGhost ? '#000' : appointmentTextColor}
          isHovered={isHovered}
          isResizing={isResizingRight}
          appointmentWidth={appointmentWidthPx}
          appointmentDurationDays={appointmentDurationDays}
          placement={tagPlacement}
          annotation={appointment.description}
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