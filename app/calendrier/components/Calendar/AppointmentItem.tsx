/**
 * @fileoverview Composant AppointmentItem - Affichage et interaction avec un rendez-vous
 * @version 1.2.0 (Mode Ghost Partiel / Chevauchement Hybride)
 */

"use client";
import React, { useState, memo, useEffect, useCallback, useMemo } from 'react';
import { useDrag, useDragLayer } from 'react-dnd';
import { isWeekend } from 'date-fns';
import { Appointment, Item } from '../../types';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS, DAY_MS } from '../../utils/constants';
import AppointmentMetadata from './AppointmentIcon';
import { useAppointmentResize, useGhostSegments, calculateWidthPx, calculateLeftPx, getIntervalCount } from '../../hooks';
import { Image } from '../ui/Image';

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
  mainScrollRef: React.RefObject<HTMLDivElement> | null;
  onClick?: (app: Appointment) => void;
  onDoubleClick?: (app: Appointment) => void;
  onAppointmentResize?: (id: number, newStart: number, newEnd: number, resizeDirection: 'left' | 'right', priority: number) => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  isFullDay,
  event,
  mainScrollRef,
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
  onAppointmentResize,
  handleContextMenu,
}) => {

  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isHovered, setIsHovered] = useState(false);

  const startDate = React.useMemo(() => appointment.DebutPlanningEvenement, [appointment.DebutPlanningEvenement]);
  const endDate = React.useMemo(() => appointment.FinPlanningEvenement, [appointment.FinPlanningEvenement]);
  
  
  // console.log('AppointmentItem render', appointment);
  // console.log('top', absoluteTop);
  

  // Hook de gestion du resize
  const {
    isResizingLeft,
    isResizingRight,
    dragStart,
    dragEnd,
    handleMouseDown,
  } = useAppointmentResize({
    appointmentId: appointment.IdPlanningEvenement,
    startDate,
    endDate,
    priority: appointment.PlanningEvenementPriorite ?? 0,
    isFullDay,
    isDisplayWeekend: isDisplayWeekend ?? false,
    onAppointmentResize,
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
      id: appointment.IdPlanningEvenement,
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

  // Calculer le padding nécessaire pour le chargé d'affaire si les icônes sont présentes
  const chargeAffairePaddingRight = useMemo(() => {
    const hasAnnotation = !!appointment.AnnotationPlanningEvenement;
    const hasTag = !!appointment.Etiquette && !isGhost;
    
    if (!hasAnnotation && !hasTag) return 0; // Pas d'icônes, pas de padding
    
    // Calculer l'espace nécessaire : chaque icône fait ~16px + gap de 4px
    let iconSpace = 0;
    if (hasAnnotation) iconSpace += 20; // 16px icône + 4px marge
    
    // Pour l'étiquette, l'espace dépend du mode d'affichage
    if (hasTag) {
      if (tagPlacement === 'hover') {
        // En mode hover, juste l'icône
        iconSpace += 20; // 16px icône + 4px marge
      }
      else{
        const tag = appointment.Etiquette?.LibelleLongPlanningEtiquette || '';
        const approxTagWidth = Math.min(120, 6 * tag.length + 16);

        iconSpace += approxTagWidth + 4; // largeur de l'étiquette + marge
      }
    }
    
    return iconSpace + 4; // + 4px de marge de sécurité
  }, [appointment.AnnotationPlanningEvenement, appointment.Etiquette, isGhost, tagPlacement]);

  // --- Styles ---
  
  const appointmentColor = event?.CouleurFondPlanningRessource || '#1E40AF';
  const appointmentBorderColor = event?.CouleurBordurePlanningRessource || '#1E40AF';
  const appointmentTextColor = event?.CouleurTextePlanningRessource || '#FFFFFF';

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
    transform: `translate3d(${computedLeft}px, 0, 0)`,
    left: 0,
    willChange: 'transform, width',
    top: computedTop,
    // Le conteneur principal devient transparent si c'est un Ghost
    // car les backgrounds sont gérés par les enfants (Ghost Part vs Real Part)
    backgroundColor: isGhost ? 'transparent' : (isHovered ? 'white' : appointmentColor), 
    border: isGhost ? 'none' : `2px solid ${appointmentBorderColor}`,
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease-in-out, background-color 0.2s ease-in-out, opacity 0.2s ease-in-out transform 0.2s ease-in-out',
    // Z-index basé sur priorité : plus la priorité est élevée, plus le z-index est élevé
    zIndex: isHovered ? 9999 : (isGhost ? 30 : (isDragging ? 40 : (20 + (appointment.PlanningEvenementPriorite || 0)))),
    cursor: isInactive ? 'not-allowed' : (isDragging ? 'grabbing' : (source === 'calendar' ? 'grab' : 'default')),
  }), [source, computedWidth, INTERVAL_WIDTH, isDragging, computedLeft, computedTop, isHovered, appointmentColor, appointmentBorderColor, isGhost, appointment, isInactive, isResizingLeft, isResizingRight]);

  return (
    <div
      key={`${appointment.IdPlanningEvenement}-${appointment.DebutPlanningEvenement}-${appointment.FinPlanningEvenement}-${appointment.AnnotationPlanningEvenement}`} // Clé unique basée sur les propriétés de l'appointment 
      ref={(node) => { if (node && source === 'calendar' && !isInactive) drag(node); }}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(appointment);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsHovered(false); // Masquer le tooltip au double-clic
        if (!isInactive) {
          onDoubleClick && onDoubleClick(appointment);
        }
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
           const targetHour = new Date(targetDate).getHours();
           let currentIntervalIdx = intervals.findIndex(interval =>
              targetHour >= interval.startHour && targetHour < interval.endHour
           );
           if (currentIntervalIdx === -1) currentIntervalIdx = 0;
           
           currentIntervalIdx++;
           if (currentIntervalIdx >= intervals.length) {
             targetDate = new Date(targetDate + DAY_MS).setHours(intervals[0]?.startHour ?? 0, 0, 0, 0);
             while (!isDisplayWeekend && isWeekend(targetDate)) {
               targetDate += DAY_MS;
             }
           } else {
             targetDate = new Date(targetDate).setHours(intervals[currentIntervalIdx]?.startHour ?? 0, 0, 0, 0);
           }
           currentIntervalCount++;
         }
         
         const cellUnderMouse = {
           employeeId:  Number(appointment.IdEmploye),
           date: targetDate
         };
         
         handleContextMenu && handleContextMenu(e, 'appointment', appointment, cellUnderMouse);
      }}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        appointment-item rounded-xl text-sm shadow-md
        flex flex-shrink-0 items-center gap-2 overflow-visible whitespace-nowrap text-ellipsis
        z-20 h-11 group
        ${isDragging  ? 'opacity-60 scale-95 duration-0' : 'opacity-100 duration-200'}
        ${source === 'calendar' && isSelected ? 'ring-3 ring-color' : ''}
        ${isAnyDragging ? 'opacity-50 pointer-events-none' : ''}
        ${source === 'calendar' ? 'absolute cursor-grab' : 'block'}
        ${!isGhost && 'hover:shadow-xl'}
        ${className || ''}
        

      `}
      title={event?.LibellePlanningRessource}
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
                          opacity: isInactive ? 0.2 : 0.4,
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
                          opacity: isInactive ? 0.5 : 1,
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
      {source === 'calendar' && !isInactive && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30`}
          title={isSmallAppointment ? "Redimensionner (côté gauche)" : "Redimensionner"}
          onMouseDown={(e) => !isInactive && handleMouseDown(e, 'left')}
          style={{ 
            borderRadius: '4px 0 0 4px',
            cursor: isInactive ? 'not-allowed' : 'ew-resize',
            width: `${Math.min((parseFloat(computedWidth) * 0.1), 12)}px` // 10% de la largeur ou max 12px
          }}
        />
      )}

      {/* CONTENU (Tags, Icone, Texte) */}
      {/* On met z-10 et relative pour être au-dessus des backgrounds */}
      {/* Masqué si en mode Ghost (chevauchement) */}
      {!isGhost && (
        <div 
          className="relative z-10 flex items-center gap-2 w-full h-full"
          style={{
            opacity: isInactive ? 0.5 : 1
          }}
        >        
          {event?.Image ? (
            <Image
              image={event.Image}
              className="w-8 h-8 object-cover flex-shrink-0 rounded-full"
            />
          ): (
              <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"></div>
          )}

          <div 
            className='flex flex-col min-w-0 flex-1'
          >
              <span 
                className={`appointment-text flex-grow font-semibold truncate max-w-full transition-colors duration-200 text-sm`}
                style={{ 
                    color: (isHovered || isResizingLeft || isResizingRight) ? appointmentColor : appointmentTextColor || '#FFFFFF'
                }}
              >
                {event?.LibellePlanningRessource}
              </span>
              
              <div 
                className="flex items-center gap-2 text-xs truncate"
                style={{
                  paddingRight: chargeAffairePaddingRight > 0 ? `${chargeAffairePaddingRight}px` : undefined
                }}
              >
                <span 
                    className="truncate transition-colors duration-200"
                    style={{ 
                    color: (isHovered || isResizingLeft || isResizingRight) ? appointmentColor : appointmentTextColor || '#FFFFFF'
                    }}
                >
                    {chargeeAffaire}
                </span>
                {((appointment.Etiquette && !isGhost) || appointment.AnnotationPlanningEvenement) && (
                  <div className="absolute right-1 bottom-0.5 z-40">
                    <AppointmentMetadata
                      annotation={appointment.AnnotationPlanningEvenement}
                      tagText={tagPlacement === 'hover' ? appointment.Etiquette?.LibelleLongPlanningEtiquette : undefined}
                      tagColor={event?.CouleurFondPlanningRessource}
                      color={isGhost ? '#333' : appointmentColor}
                      textColor={isGhost ? '#000' : appointmentTextColor}
                      isHovered={isHovered}
                      mainScrollRef={mainScrollRef as React.RefObject<HTMLDivElement>}
                      annotationImgSvg={
                        <svg height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg" style={{ color: (isHovered || isResizingLeft || isResizingRight) ? (event.CouleurFondPlanningRessource) : event.CouleurTextePlanningRessource }}>
                          <path d="m22 12c0 5.5228-4.4772 10-10 10-5.52285 0-10-4.4772-10-10 0-5.52285 4.47715-10 10-10 5.5228 0 10 4.47715 10 10z" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="1.5" />

                          <path d="m11 10c-.5523 0-1 .4477-1 1s.4477 1 1 1v3c-.5523 0-1.00001.4477-1.00001 1s.44771 1 1.00001 1h2c.5523 0 1-.4477 1-1s-.4477-1-1-1v-4c0-.2652-.1054-.5196-.2929-.7071s-.4419-.2929-.7071-.2929zm0-2c0-.55228.4477-1 1-1s1 .44772 1 1-.4477 1-1 1-1-.44772-1-1z" 
                                fill="currentColor" />
                        </svg>
                      }
                      tagImgSvg={
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: (isHovered || isResizingLeft || isResizingRight) ? (event.CouleurFondPlanningRessource) : event.CouleurTextePlanningRessource }}>
                          <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                        </svg>
                      }
                    />
                  </div>
                )}
              </div>
              
              {/* Étiquette fixe en bas à droite (mode 'fixed') */}
              {appointment.Etiquette?.IdPlanningEtiquette && tagPlacement === 'fixed' && !isGhost && (
                <div 
                  className="absolute right-6 -bottom-3 z-40 px-1.5 py-0.5 rounded-sm text-xs font-medium shadow-sm transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-primary)', 
                    color: 'var(--contraste-max)', 
                    maxWidth: '120px',
                    border: `1px solid var(--color-gray-400)`,
                  
                  }}
                >
                  <span className="truncate block">{appointment.Etiquette.LibelleLongPlanningEtiquette}</span>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Étiquette/Tag et Annotation en bas à droite */}
      

      {/* Handle de redimensionnement à droite */}
      {source === 'calendar' && !isInactive && (
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
            cursor: isInactive ? 'not-allowed' : 'ew-resize',
            width: `${Math.min((parseFloat(computedWidth) * 0.1), 12)}px` // 10% de la largeur ou max 12px
          }}
        />
      )}
    </div>
  );
};

const arePropsEqual = (prevProps: AppointmentItemProps, nextProps: AppointmentItemProps) => {
  return (
    prevProps.appointment.IdPlanningEvenement === nextProps.appointment.IdPlanningEvenement &&
    prevProps.appointment.DebutPlanningEvenement === nextProps.appointment.DebutPlanningEvenement &&
    prevProps.appointment.FinPlanningEvenement === nextProps.appointment.FinPlanningEvenement &&
    prevProps.appointment.AnnotationPlanningEvenement === nextProps.appointment.AnnotationPlanningEvenement &&
    prevProps.appointment.Etiquette?.IdPlanningEtiquette === nextProps.appointment.Etiquette?.IdPlanningEtiquette &&
    prevProps.absoluteLeft === nextProps.absoluteLeft &&
    prevProps.absoluteWidth === nextProps.absoluteWidth &&
    prevProps.absoluteTop === nextProps.absoluteTop &&
    prevProps.isGhost === nextProps.isGhost &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isFullDay === nextProps.isFullDay &&
    prevProps.isDisplayWeekend === nextProps.isDisplayWeekend &&
    prevProps.isInactive === nextProps.isInactive &&
    prevProps.tagPlacement === nextProps.tagPlacement &&
    prevProps.chargeeAffaire === nextProps.chargeeAffaire &&
    prevProps.event.Image === nextProps.event.Image &&
    prevProps.event.LibellePlanningRessource === nextProps.event.LibellePlanningRessource &&
    prevProps.event.CouleurFondPlanningRessource === nextProps.event.CouleurFondPlanningRessource &&
    prevProps.event.CouleurBordurePlanningRessource === nextProps.event.CouleurBordurePlanningRessource &&
    prevProps.event.CouleurTextePlanningRessource === nextProps.event.CouleurTextePlanningRessource &&
    JSON.stringify(prevProps.ghostInterval) === JSON.stringify(nextProps.ghostInterval)
  );
};

export default memo(AppointmentItem, arePropsEqual);