"use client";
import React, { memo, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDrag } from 'react-dnd';
import { isWeekend } from 'date-fns';
import { Appointment, Item } from '../../types';
import { CELL_WIDTH, HALF_DAY_INTERVALS, CELL_HEIGHT, DAY_INTERVALS, DAY_MS } from '../../utils/constants';
import AppointmentMetadata from './AppointmentIcon';
import { useAppointmentResize, useGhostSegments, calculateWidthPx, calculateLeftPx, getIntervalCount } from '../../hooks';
import { useAuth } from '../../hooks/utils/AuthContext';
import { evenementService } from '@/app/service';

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
  chargeeAffaire: string;
  source?: 'calendar' | 'demo';
  isSelected?: boolean;
  isGhost?: boolean;
  ghostInterval?: { start: number; end: number } | { start: number; end: number }[];
  tagPlacement?: 'hover' | 'fixed';
  mainScrollRef: React.RefObject<HTMLDivElement> | null;
  onClick?: (app: Appointment) => void;
  onDoubleClick?: (app: Appointment) => void;
  onAppointmentResize?: (id: number, newStart: number, newEnd: number, resizeDirection: 'left' | 'right', priority: number) => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  onLockedError?: (message: string) => void;
}

const LOCK_ICON_SVG = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const ANNOTATION_ICON_SVG = (
  <svg height="16" viewBox="0 0 24 24" width="16" xmlns="http://www.w3.org/2000/svg">
    <path d="m22 12c0 5.5228-4.4772 10-10 10-5.52285 0-10-4.4772-10-10 0-5.52285 4.47715-10 10-10 5.5228 0 10 4.47715 10 10z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="m11 10c-.5523 0-1 .4477-1 1s.4477 1 1 1v3c-.5523 0-1.00001.4477-1.00001 1s.44771 1 1.00001 1h2c.5523 0 1-.4477 1-1s-.4477-1-1-1v-4c0-.2652-.1054-.5196-.2929-.7071s-.4419-.2929-.7071-.2929zm0-2c0-.55228.4477-1 1-1s1 .44772 1 1-.4477 1-1 1-1-.44772-1-1z" fill="currentColor" />
  </svg>
);

const TAG_ICON_SVG = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
  </svg>
);

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  isFullDay,
  event,
  mainScrollRef,
  chargeeAffaire,
  isDisplayWeekend = false,
  timelineStart = 0,
  isInactive = false,
  source = 'calendar',
  isSelected,
  className = '',
  absoluteLeft,
  absoluteWidth,
  absoluteTop = 0,
  isGhost = false,
  ghostInterval,
  tagPlacement = 'hover',
  onClick,
  onDoubleClick,
  onAppointmentResize,
  handleContextMenu,
  onLockedError
}) => {
  const { hasPermission } = useAuth();
  const canEdit = useMemo(() => hasPermission(214, 23), [hasPermission]);
  const canDragPerm = useMemo(() => canEdit || hasPermission(214, 22), [canEdit, hasPermission]);

  const dragOffsetRef = useRef(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragLockSentRef = useRef(false);
  const dragLockPromiseRef = useRef<Promise<boolean> | null>(null);
  const hasMountedRef = useRef(false);

  const startDate = appointment.DebutPlanningEvenement;
  const endDate = appointment.FinPlanningEvenement;
  const isLocked = appointment.isLocked === true;
  const isReadOnly = appointment.isReadOnly === true;

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
    isDisplayWeekend,
    onAppointmentResize,
    onLockedError,
  });

  const ghostSegments = useGhostSegments({
    isGhost,
    ghostInterval,
    dragStart,
    dragEnd,
    isFullDay,
    isDisplayWeekend,
  });

  const INTERVAL_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
  const isResizing = isResizingLeft || isResizingRight;

  const appointmentWidthPx = useMemo(() => {
    if (isResizing) {
      return calculateWidthPx(dragStart, dragEnd, isFullDay, isDisplayWeekend);
    }
    return absoluteWidth ?? INTERVAL_WIDTH;
  }, [isResizing, dragStart, dragEnd, isFullDay, isDisplayWeekend, absoluteWidth, INTERVAL_WIDTH]);

  const computedLeft = useMemo(() => {
    if (isResizingLeft) {
      return calculateLeftPx(dragStart, timelineStart, isFullDay, isDisplayWeekend);
    }
    return absoluteLeft ?? 0;
  }, [isResizingLeft, dragStart, timelineStart, isFullDay, isDisplayWeekend, absoluteLeft]);

  const [{ isDragging }, drag] = useDrag({
    type: 'appointment',
    item: () => ({
      id: appointment.IdPlanningEvenement,
      type: 'appointment',
      startDate,
      endDate,
      dragOffset: dragOffsetRef.current,
    }),
    canDrag: () => !isResizing && !isLocked && !isReadOnly && !isInactive && canDragPerm,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: async () => {
      const lockPromise = dragLockPromiseRef.current;
      dragLockPromiseRef.current = null;
      const lockAcquired = lockPromise ? await lockPromise : dragLockSentRef.current;
      if (!lockAcquired) return;

      try {
        await evenementService.unlockEvenement(appointment.IdPlanningEvenement);
      } catch (error) {
        console.error('Erreur lors du déverrouillage après drag/drop :', error);
      } finally {
        dragLockSentRef.current = false;
      }
    },
  });

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly || isLocked || isInactive || source === 'demo') return;
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = e.clientX - rect.left;
  }, [isInactive, isLocked, isReadOnly, source]);

  useEffect(() => {
    hasMountedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isDragging || dragLockSentRef.current || isReadOnly || isLocked || isInactive || source === 'demo') {
      return;
    }

    dragLockSentRef.current = true;
    dragLockPromiseRef.current = evenementService
      .lockQuickEvenement(appointment.IdPlanningEvenement)
      .then(response => {
        if (response.success === false) {
          dragLockSentRef.current = false;
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
          onLockedError?.(response.message || 'Un autre utilisateur modifie cet événement.');
          return false;
        }
        return true;
      })
      .catch(error => {
        dragLockSentRef.current = false;
        console.error('Erreur lors du verrouillage rapide du rendez-vous :', error);
        return false;
      });
  }, [isDragging, appointment.IdPlanningEvenement, isInactive, isLocked, isReadOnly, onLockedError, source]);

  const handleAppointmentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isReadOnly) return;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      onClick?.(appointment);
    }, 220);
  }, [appointment, isReadOnly, onClick]);

  const handleAppointmentDoubleClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    if (isLocked || isReadOnly) return;

    if ((!isInactive && canEdit) || source === 'demo') {
      if (source === 'demo') {
        onDoubleClick?.(appointment);
        return;
      }

      try {
        const response = await evenementService.lockQuickEvenement(appointment.IdPlanningEvenement);
        if (response.success === false) {
          onLockedError?.(response.message || 'Un autre utilisateur modifie cet événement.');
          return;
        }
        onDoubleClick?.(appointment);
      } catch (error) {
        console.error('Erreur lors du verrouillage avant ouverture du formulaire :', error);
      }
    }
  }, [appointment, canEdit, isInactive, isLocked, isReadOnly, onDoubleClick, onLockedError, source]);

  const onContextMenuHandler = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!handleContextMenu) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const intervalIndex = Math.floor(mouseX / INTERVAL_WIDTH);
    const totalIntervals = getIntervalCount(startDate, endDate, isFullDay, isDisplayWeekend);
    const clampedIntervalIndex = Math.max(0, Math.min(intervalIndex, totalIntervals - 1));

    const intervals = isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS;
    let targetDate = startDate;
    let currentIntervalCount = 0;

    while (currentIntervalCount < clampedIntervalIndex) {
      const targetHour = new Date(targetDate).getHours();
      let currentIntervalIdx = intervals.findIndex(interval => targetHour >= interval.startHour && targetHour < interval.endHour);
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

    handleContextMenu(e, 'appointment', appointment, {
      employeeId: Number(appointment.IdEmploye),
      date: targetDate
    });
  }, [INTERVAL_WIDTH, appointment, endDate, handleContextMenu, isDisplayWeekend, isFullDay, isReadOnly, startDate]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  const chargeAffairePaddingRight = useMemo(() => {
    const hasAnnotation = !!appointment.AnnotationPlanningEvenement;
    const hasTag = !!appointment.Etiquette && !isGhost;
    if (!hasAnnotation && !hasTag) return 0;

    let iconSpace = hasAnnotation ? 20 : 0;
    if (hasTag) {
      if (tagPlacement === 'hover') {
        iconSpace += 20;
      } else {
        const tag = appointment.Etiquette?.LibelleLongPlanningEtiquette || '';
        iconSpace += Math.min(120, 6 * tag.length + 16) + 4;
      }
    }
    return iconSpace + 4;
  }, [appointment.AnnotationPlanningEvenement, appointment.Etiquette, isGhost, tagPlacement]);

  // Narrowing discriminé sur Item ("Projet" -> ChantierItem | "Paie" | "Rubrique Perso" -> SocialItem)
  const { titleText, primaryLabel, secondaryLabel } = useMemo(() => {
    if (!event) {
      return { titleText: '', primaryLabel: '', secondaryLabel: '' };
    }

    if (event.Type === 'Projet') {
      const codeAndId = [event.CodePlanningRessource, event.Identifiant]
        .filter((v) => v !== undefined && v !== null && v !== '')
        .join(' - ');

      return {
        titleText: [codeAndId, event.LibellePlanningRessource].filter(Boolean).join(' - '),
        primaryLabel: codeAndId,
        secondaryLabel: event.LibellePlanningRessource,
      };
    }

    // SocialItem (AbsenceItem | AutreItem)
    return {
      titleText: event.LibellePlanningRessource,
      primaryLabel: event.LibellePlanningRessource,
      secondaryLabel: appointment.isReadOnly ? (appointment.EtapeValidation ?? '') : chargeeAffaire,
    };
  }, [event, appointment.isReadOnly, appointment.EtapeValidation, chargeeAffaire]);

  const appointmentColor = event?.CouleurFondPlanningRessource || '#1E40AF';
  const appointmentBorderColor = event?.CouleurBordurePlanningRessource || '#1E40AF';
  const appointmentTextColor = event?.CouleurTextePlanningRessource || '#FFFFFF';

 const containerStyle = useMemo<React.CSSProperties>(() => ({
    width: source === 'demo' ? '100%' : `${appointmentWidthPx}px`,
    height: `${CELL_HEIGHT}px`,
    minWidth: `${INTERVAL_WIDTH}px`,
    pointerEvents: isDragging ? 'none' : 'auto',
    transform: `translate3d(${computedLeft}px, ${absoluteTop}px, 0)`,
    left: 0,
    top: 0,
    willChange: isDragging || isResizing ? 'transform, width' : 'auto',
    backgroundColor: isGhost ? 'transparent' : appointmentColor,
    border: isGhost ? 'none' : `2px solid ${appointmentBorderColor}`,
    color: appointmentTextColor,
    transition:
      isDragging || isResizing || !hasMountedRef.current
        ? 'none'
        : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.15s ease-in-out, opacity 0.2s ease-in-out',
    zIndex: isGhost ? 30 : (isDragging ? 40 : (20 + (appointment.PlanningEvenementPriorite || 0))),
    cursor: (isInactive || isLocked || isReadOnly) ? 'not-allowed' : (isDragging ? 'grabbing' : (source === 'calendar' && canEdit ? 'grab' : 'pointer')),
  }), [
    source, appointmentWidthPx, INTERVAL_WIDTH, isDragging, computedLeft, absoluteTop,
    isResizing, isGhost, appointmentColor, appointmentBorderColor, appointmentTextColor,
    appointment.PlanningEvenementPriorite, isInactive, isLocked, isReadOnly, canEdit
  ]);

  const hasSpaceForBothHandles = appointmentWidthPx >= 60;
  const isSmallAppointment = appointmentWidthPx < (INTERVAL_WIDTH * 1.5);
  const handleWidth = `${Math.min(appointmentWidthPx * 0.1, 12)}px`;
  const canInteract = source === 'calendar' && !isInactive && !isLocked && !isReadOnly;

  const attachDragRef = useCallback((node: HTMLDivElement | null) => {
    if (node && canInteract && canEdit) drag(node);
  }, [canInteract, canEdit, drag]);

  return (
    <div
      ref={attachDragRef}
      onClick={handleAppointmentClick}
      onDoubleClick={handleAppointmentDoubleClick}
      onContextMenu={onContextMenuHandler}
      onMouseDown={canEdit && !isReadOnly ? handleDragStart : undefined}
      className={`
        appointment-item rounded-xl text-sm
        flex flex-shrink-0 items-center gap-2 overflow-visible whitespace-nowrap text-ellipsis
        z-20 hover:!z-30 h-11 group
        ${!isGhost ? 'shadow-md hover:shadow-xl' : 'shadow-none'}
        ${isDragging && source === 'calendar' ? 'opacity-60 duration-0' : 'opacity-100 duration-200'}
        ${source === 'calendar' && isSelected ? 'ring-3 ring-color' : ''}
        ${source === 'calendar' ? 'absolute cursor-grab' : 'block'}
        ${className}
      `}
      title={titleText}
      style={containerStyle}
    >
      {/* ZONES D'ARRIÈRE-PLAN POUR LE MODE GHOST */}
      {isGhost && ghostSegments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === ghostSegments.length - 1;
        const baseBorder = `2px solid ${appointmentBorderColor}`;
        const hasLeftBorder = segment.widthGhost === 0 && isFirst;

        return (
          <React.Fragment key={index}>
            {segment.widthGhost > 0 && (
              <div
                className="absolute top-0 bottom-0 transition-shadow duration-150 group-hover:shadow-lg"
                style={{
                  left: `${segment.leftOffset}px`,
                  width: `${segment.widthGhost}px`,
                  backgroundImage: `repeating-linear-gradient(45deg, ${appointmentColor} 0px, ${appointmentColor} 10px, rgba(255,255,255,0.8) 10px, rgba(255,255,255,0.8) 20px)`,
                  opacity: isInactive ? 0.2 : 0.4,
                  border: '2px dashed rgba(0,0,0,0.2)',
                  borderRight: segment.widthNoGhost > 0 ? 'none' : undefined,
                  borderLeft: isFirst ? undefined : 'none',
                  borderRadius: isFirst ? '0.75rem 0 0 0.75rem' : '0',
                  zIndex: 1
                }}
              />
            )}
            {segment.widthNoGhost > 0 && (
              <div
                className="absolute top-0 bottom-0 transition-shadow duration-150 group-hover:shadow-lg"
                style={{
                  left: `${segment.leftOffset + segment.widthGhost}px`,
                  width: `${segment.widthNoGhost}px`,
                  backgroundColor: appointmentColor,
                  borderTop: baseBorder,
                  borderBottom: baseBorder,
                  borderLeft: hasLeftBorder ? baseBorder : 'none',
                  borderRight: isLast ? baseBorder : 'none',
                  borderRadius: isLast && hasLeftBorder ? '0.75rem' : isLast ? '0 0.75rem 0.75rem 0' : hasLeftBorder ? '0.75rem 0 0 0.75rem' : '0',
                  opacity: isInactive ? 0.5 : 1,
                  zIndex: 1,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Handle de redimensionnement gauche */}
      {canInteract && (
        <div
          className="absolute top-0 h-full cursor-ew-resize z-30"
          title={isSmallAppointment ? "Redimensionner (côté gauche)" : "Redimensionner"}
          onMouseDown={(e) => canEdit && handleMouseDown(e, 'left')}
          style={{
            borderRadius: '4px 0 0 4px',
            cursor: !canEdit ? 'default' : 'ew-resize',
            width: handleWidth
          }}
        />
      )}

      {/* CONTENU */}
      {!isGhost && (
        <div className="relative z-10 flex items-center gap-2 w-full h-full" style={{ opacity: isInactive ? 0.5 : 1 }}>
          {event?.Image?.image ? (
            <img src={event.Image.image} draggable={false} className="w-6 h-6 object-cover flex-shrink-0 rounded-full" loading="lazy" alt="" />
          ) : (
            <div className="w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0" />
          )}

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 overflow-hidden">
              {isLocked && LOCK_ICON_SVG}
              <span className="appointment-text flex-grow font-semibold truncate max-w-full text-xs">
                {primaryLabel}
              </span>
            </div>

            <div
              className="flex items-center gap-2 text-xs truncate"
              style={{ paddingRight: chargeAffairePaddingRight > 0 ? `${chargeAffairePaddingRight}px` : undefined }}
            >
              <span className="truncate">
                {secondaryLabel}
              </span>

              {(appointment.Etiquette || appointment.AnnotationPlanningEvenement) && (
                <div className="absolute right-1 bottom-0.5 z-40">
                  <AppointmentMetadata
                    annotation={appointment.AnnotationPlanningEvenement}
                    tagText={tagPlacement === 'hover' ? appointment.Etiquette?.LibelleLongPlanningEtiquette : undefined}
                    mainScrollRef={mainScrollRef as React.RefObject<HTMLDivElement>}
                    annotationImgSvg={ANNOTATION_ICON_SVG}
                    tagImgSvg={TAG_ICON_SVG}
                  />
                </div>
              )}
            </div>

            {appointment.Etiquette?.IdPlanningEtiquette && tagPlacement === 'fixed' && (
              <div
                className="absolute right-6 -bottom-3 z-40 px-1.5 py-0.5 rounded-sm text-xs font-medium shadow-sm transition-all duration-200"
                style={{
                  backgroundColor: 'var(--bg-primary-500)',
                  color: 'var(--contraste-max)',
                  maxWidth: '120px',
                  border: '1px solid var(--color-gray-400)',
                }}
              >
                <span className="truncate block">{appointment.Etiquette.LibelleLongPlanningEtiquette}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Handle de redimensionnement droit */}
      {canInteract && (
        <div
          className={`absolute top-0 h-full cursor-ew-resize z-30 ${isSmallAppointment || !hasSpaceForBothHandles ? 'right-0 w-1/3 bg-transparent' : '-right-1 w-3'}`}
          title={isSmallAppointment ? "Redimensionner (côté droit)" : "Redimensionner"}
          onMouseDown={(e) => canEdit && handleMouseDown(e, 'right')}
          style={{
            borderRadius: '0 4px 4px 0',
            cursor: !canEdit ? 'default' : 'ew-resize',
            width: handleWidth
          }}
        />
      )}
    </div>
  );
};

const areGhostIntervalsEqual = (
  a?: { start: number; end: number } | { start: number; end: number }[],
  b?: { start: number; end: number } | { start: number; end: number }[]
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i]!.start !== b[i]!.start || a[i]!.end !== b[i]!.end) return false;
    }
    return true;
  }
  if (!Array.isArray(a) && !Array.isArray(b)) {
    return a.start === b.start && a.end === b.end;
  }
  return false;
};

const arePropsEqual = (prev: AppointmentItemProps, next: AppointmentItemProps) => {
  return (
    prev.appointment.IdPlanningEvenement === next.appointment.IdPlanningEvenement &&
    prev.appointment.isLocked === next.appointment.isLocked &&
    prev.appointment.isReadOnly === next.appointment.isReadOnly &&
    prev.appointment.EtapeValidation === next.appointment.EtapeValidation &&
    prev.appointment.DebutPlanningEvenement === next.appointment.DebutPlanningEvenement &&
    prev.appointment.FinPlanningEvenement === next.appointment.FinPlanningEvenement &&
    prev.appointment.AnnotationPlanningEvenement === next.appointment.AnnotationPlanningEvenement &&
    prev.appointment.Etiquette?.IdPlanningEtiquette === next.appointment.Etiquette?.IdPlanningEtiquette &&
    prev.appointment.PlanningEvenementPriorite === next.appointment.PlanningEvenementPriorite &&
    prev.absoluteLeft === next.absoluteLeft &&
    prev.absoluteWidth === next.absoluteWidth &&
    prev.absoluteTop === next.absoluteTop &&
    prev.isGhost === next.isGhost &&
    prev.isSelected === next.isSelected &&
    prev.isFullDay === next.isFullDay &&
    prev.isDisplayWeekend === next.isDisplayWeekend &&
    prev.isInactive === next.isInactive &&
    prev.tagPlacement === next.tagPlacement &&
    prev.chargeeAffaire === next.chargeeAffaire &&
    prev.event === next.event &&
    areGhostIntervalsEqual(prev.ghostInterval, next.ghostInterval)
  );
};

export default memo(AppointmentItem, arePropsEqual);