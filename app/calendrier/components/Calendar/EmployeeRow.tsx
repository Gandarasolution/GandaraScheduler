import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Appointment, Item, User } from '../../types';
import { CELL_WIDTH, DAY_INTERVALS, HALF_DAY_INTERVALS, HOUR_MS, CELL_HEIGHT } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';
import { AppointmentItem } from './index';
import { calculateWidthPx, calculateLeftPx } from '../../hooks';
import { isSameDay } from 'date-fns';

interface EmployeeRowProps {
  employee: User;
  dayInTimeline: number[];
  appointments: (Appointment & { top: number})[];
  rowHeight: number;
  isFullDay: boolean;
  events: Item[];
  isDisplayWeekend: boolean;
  tagPlacement?: 'hover' | 'fixed';
  visibleWindowStart: number;
  visibleWindowEnd: number;
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right', saveToHistory?: boolean, newPriority?: number) => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  style?: React.CSSProperties;
  todayIndex: number;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  isOverlapExpanded: boolean;
  onSetExpansion: (id: number, expanded: boolean) => void;
  collapseTrigger?: number;
  mainScrollRef: React.RefObject<HTMLDivElement>;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  dayInTimeline,
  appointments,
  rowHeight,
  isFullDay,
  events,
  visibleWindowEnd,
  visibleWindowStart,
  isDisplayWeekend,
  tagPlacement = 'hover',
  onAppointmentMoved,
  onAppointmentDoubleClick,
  handleContextMenu,
  style,
  todayIndex,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  isOverlapExpanded,
  onSetExpansion,
  collapseTrigger,
  mainScrollRef,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setExpandedGroups({});
  }, [collapseTrigger]);

  const handleAppointmentResize = useCallback((id: number, newStartDate: number, newEndDate: number, resizeDirection: 'left' | 'right', priority: number) => {
    onAppointmentMoved(id, newStartDate, newEndDate, employee.IdPersonnel as number, resizeDirection, true, priority);
  }, [onAppointmentMoved, employee.IdPersonnel]);

  const timelineStart = useMemo(() => dayInTimeline[0] || 0, [dayInTimeline]);
  
  // Positionnement et calcul des dimensions
  const positionedAppointments = useMemo(() => {
    const filterred =  appointments
      .filter((app) => {
        if (app?.Employee?.IdPersonnel !== employee.IdPersonnel) return false;
        return app.FinPlanningEvenement > visibleWindowStart && app.DebutPlanningEvenement < visibleWindowEnd;
      })

    return filterred.map((app, index) => {
      const start = app.DebutPlanningEvenement;
      const end = app.FinPlanningEvenement;

      // Utilisation des fonctions utilitaires pour les calculs de position
      const left = calculateLeftPx(start, timelineStart, isFullDay, isDisplayWeekend ?? false);
      const width = calculateWidthPx(start, end, isFullDay, isDisplayWeekend ?? false);
      const topPx = (app.top * CELL_HEIGHT) + (2 * app.top) + ((tagPlacement === 'fixed' && index > 0) && filterred[index - 1]?.Etiquette ? 18 : 0); // Décalage pour les tags en placement fixe

      return { ...app, left, width, topPx } as Appointment & {
        top: number;
        left: number;
        width: number;
        topPx: number;
      };
    });
  }, [appointments, employee.IdPersonnel, timelineStart, isDisplayWeekend, visibleWindowEnd, visibleWindowStart, isFullDay]);

  const overlappingGroups = useMemo(() => {
    if (!positionedAppointments.length) return [] as { key: number; apps: (typeof positionedAppointments) }[];

    // DÉDUPLICATION : Supprimer les doublons basés sur l'ID
    // Si plusieurs rendez-vous ont le même ID, ne garder que le premier
    const deduplicatedAppointments = positionedAppointments.reduce((acc, app) => {
      const existingIndex = acc.findIndex(a => a.IdPlanningEvenement === app.IdPlanningEvenement);
      if (existingIndex === -1) {
        acc.push(app);
      }
      return acc;
    }, [] as typeof positionedAppointments);

    const sorted = [...deduplicatedAppointments].sort((a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement);
    const groups: Array<{ key: number; apps: (typeof positionedAppointments)[number][]; end: number }> = [];

    for (const app of sorted) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && app.DebutPlanningEvenement < lastGroup.end) {
        lastGroup.apps.push(app);
        lastGroup.end = Math.max(lastGroup.end, app.FinPlanningEvenement);
      } else {
        groups.push({ key: app.IdPlanningEvenement, apps: [app], end: app.FinPlanningEvenement });
      }
    }

   for (const group of groups) {
      // OPTIMISATION 5 : Ne trier que si nécessaire (plus de 1 élément)
      if (group.apps.length > 1) {
        group.apps.sort((a, b) => {
          const pA = a.PlanningEvenementPriorite ?? 0;
          const pB = b.PlanningEvenementPriorite ?? 0;
          return (pA - pB) || (a.DebutPlanningEvenement - b.DebutPlanningEvenement);
        });
      }
    }

    return groups.map(({ key, apps }) => ({ key, apps }));
  }, [positionedAppointments]);

  const hasExpandedGroup = useMemo(() => overlappingGroups.some((g) => expandedGroups[g.key]), [overlappingGroups, expandedGroups]);
  
  // Nettoyer les groupes étendus qui n'existent plus
  useEffect(() => {
    const validKeys = new Set(overlappingGroups.map(g => g.key));
    setExpandedGroups(prev => {
      const cleaned: Record<number, boolean> = {};
      for (const key in prev) {
        if (validKeys.has(Number(key)) && prev[key] !== undefined) {
          cleaned[key] = prev[key];
        }
      }
      return cleaned;
    });
  }, [overlappingGroups]);
  

  useEffect(() => {
    if (hasExpandedGroup && !isOverlapExpanded) {
      onSetExpansion(employee.IdPersonnel, true);
    } else if (!hasExpandedGroup && isOverlapExpanded) {
      onSetExpansion(employee.IdPersonnel, false);
    }
  }, [hasExpandedGroup, isOverlapExpanded, onSetExpansion, employee.IdPersonnel]);

  const selectionOverlay = useMemo(() => {
    if (!selectedCell || selectedCell.employeeId !== employee.IdPersonnel) return null;
    const dayIndex = dayInTimeline.findIndex((day) => isSameDay(day, selectedCell.date));
    if (dayIndex === -1) return null;

    const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
    const startHour = new Date(selectedCell.date).getHours();
    const intervalIndex = isFullDay
      ? 0
      : startHour >= (HALF_DAY_INTERVALS[1]?.startHour ?? 0) ? 1 : 0;

    return {
      left: dayIndex * CELL_WIDTH + intervalIndex * intervalWidth,
      width: intervalWidth,
    };
  }, [dayInTimeline, employee.IdPersonnel, isFullDay, selectedCell]);

  const handleRowClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!dayInTimeline.length) return;
    const target = e.target as HTMLElement;
    if (target.closest('.appointment-item')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    if (relativeX < 0) return;
    const dayIndex = Math.floor(relativeX / CELL_WIDTH);
    if (dayIndex < 0 || dayIndex >= dayInTimeline.length) return;
    const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
    const offsetInDay = relativeX - dayIndex * CELL_WIDTH;
    const rawIntervalIndex = Math.floor(offsetInDay / intervalWidth);
    const clampedIndex = isFullDay
      ? Math.min(Math.max(rawIntervalIndex, 0), DAY_INTERVALS.length - 1)
      : Math.min(Math.max(rawIntervalIndex, 0), HALF_DAY_INTERVALS.length - 1);
    const intervalConfig = isFullDay ? DAY_INTERVALS[clampedIndex] : HALF_DAY_INTERVALS[clampedIndex];
    const day = dayInTimeline[dayIndex];
    if (day === undefined) return;
    const selectedDate = day + (intervalConfig?.startHour ?? 0) * HOUR_MS;

    onSelectCell({ employeeId: employee.IdPersonnel, date: selectedDate });
    onSelectAppointment(null);
  }, [dayInTimeline, employee.IdPersonnel, isFullDay, onSelectAppointment, onSelectCell]);

  const rowWidth = dayInTimeline.length * CELL_WIDTH;
  const isInactive = employee.Actif === false;
  const STEP_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;

  return (
    <div 
      id={getRowId('employee', employee.IdPersonnel)}
      className="calendar-row employee-row flex w-fit relative" 
      data-employee-id={employee.IdPersonnel}
      role="row"
      onClick={handleRowClick}
      style={{
        ...style,
        height: rowHeight,
        width: rowWidth,
        backgroundColor: 'transparent',
        backgroundImage: `repeating-linear-gradient(
          to right,
          transparent 0px,
          transparent ${STEP_WIDTH - 1}px, /* L'espace vide prend presque toute la largeur */
          var(--border-100) ${STEP_WIDTH - 1}px, /* Le trait commence ici */
          var(--border-100) ${STEP_WIDTH}px    /* Et se termine 1px plus loin */
        )`
      }}
    >
      {selectionOverlay && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none rounded-md bg-primary/20 border border-primary/40 z-20"
          style={{
            left: selectionOverlay.left,
            width: selectionOverlay.width,
          }}
        />
      )}
      {todayIndex >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none calendar-today"
          style={{
            left: `${(todayIndex * CELL_WIDTH + CELL_WIDTH / 2) - 2}px`,
            backgroundColor: '#ffcdde'
          }}
        />
      )}
      {overlappingGroups.map((group) => {
        const isExpanded = expandedGroups[group.key] === true;
        const appsToRender = group.apps;
        const baseTopPx = group.apps[0]?.topPx || 0; // Position de base pour les éléments du groupe (le premier élément)

        // Récupérer tous les RDV avec priorité 0 (RDV de base)
        const priority0Apps = group.apps.filter(app => (app.PlanningEvenementPriorite ?? 0) === 0);
        
        // Clé unique pour le groupe basée sur tous les IDs des rendez-vous
        const groupUniqueKey = `group-${group.apps.map(a => `${a.IdPlanningEvenement}-${a.DebutPlanningEvenement}-${a.FinPlanningEvenement}`).join('_')}`;
        
        return (
          <React.Fragment key={groupUniqueKey}>
            {appsToRender.map((app, index) => {
              const event = app.Ressource as Item | undefined;
  
              // Est-ce un "fantôme" ? (Non étendu, et pas le premier élément)
              const isGhost = !isExpanded && (app.PlanningEvenementPriorite ?? 0) !== 0;
              
              const beforeApp = index > 0 ? group.apps[index - 1] : null;
              const beforeHasTag = beforeApp && (app.PlanningEvenementPriorite ?? 0) > 0 && tagPlacement === 'fixed' && !!beforeApp.Etiquette;
              const widthDiff = beforeApp ? Math.abs(app.width - beforeApp.width) : Infinity;
              const isSimilarSize = widthDiff <= CELL_WIDTH; // À une case près
              const shouldOffsetForTag = beforeHasTag && isSimilarSize;              
              
              // Position verticale forcée (superposition)
              // Si l'événement est dans un groupe non étendu, on utilise la position du premier rendez-vous
              // Sinon, on utilise sa propre position (+ décalage si l'événement précédent a un tag et taille similaire)
              const forcedTopPx = !isExpanded ? baseTopPx : shouldOffsetForTag ? app.topPx + 18 : app.topPx;



              // Calcul des intervalles de chevauchement avec les RDV de priorité 0
              // Pour chaque RDV de priorité 0, on calcule l'intersection temporelle
              const ghostIntervals: { start: number; end: number }[] = [];
              
              if (isGhost) {
                priority0Apps.forEach(baseApp => {
                  // Calculer l'intersection entre le RDV actuel et le RDV de base
                  const overlapStart = Math.max(app.DebutPlanningEvenement, baseApp.DebutPlanningEvenement);
                  const overlapEnd = Math.min(app.FinPlanningEvenement, baseApp.FinPlanningEvenement);
                  
                  // S'il y a un chevauchement réel
                  if (overlapStart < overlapEnd) {
                    ghostIntervals.push({ start: overlapStart, end: overlapEnd });
                  }
                });
              }

              return (
                <AppointmentItem
                  key={`${app.IdPlanningEvenement}-${app.DebutPlanningEvenement}-${app.FinPlanningEvenement}-${index}`}
                  appointment={app as Appointment}
                  isInactive={isInactive}
                  isFullDay={isFullDay}
                  isMobile={false}
                  isDisplayWeekend={isDisplayWeekend}
                  tagPlacement={tagPlacement}
                  event={event as Item}
                  timelineStart={timelineStart}
                  chargeeAffaire={(event && event.Type === 'chantier' ? event.chargeAffaire : '') || ''}
                  absoluteLeft={app.left}
                  absoluteWidth={app.width}
                  absoluteTop={forcedTopPx} 
                  mainScrollRef={mainScrollRef}
                  isGhost={isGhost} 
                  ghostInterval={ghostIntervals.length > 0 ? ghostIntervals : undefined}

                  onResize={handleAppointmentResize}
                  handleContextMenu={handleContextMenu}
                  onDoubleClick={onAppointmentDoubleClick}
                  onClick={onSelectAppointment}
                  isSelected={selectedAppointmentId === app.IdPlanningEvenement}
                />
              );
            })}

            {group.apps.length > 1 && !isExpanded && group.apps[0] && (
              <button
                type="button"
                className="absolute z-40 text-[11px] font-semibold rounded-full px-2 py-0.5 shadow-sm border border-gray-200 bg-white/95 text-gray-700 flex items-center gap-1 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:bg-white"
                style={{
                  left: (group.apps[0].left + group.apps[0].width) - 24,
                  top: baseTopPx - 6,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
                }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                +{group.apps.reduce((count, app) => (app.PlanningEvenementPriorite && app.PlanningEvenementPriorite > 0 ? count + 1 : count), 0)}
              </button>
            )}

            {isExpanded && group.apps.length > 1 && group.apps[0] && (
              <button
                type="button"
                className="absolute z-40 text-[11px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition"
                style={{
                  left: (group.apps[0]?.left + group.apps[0]?.width) - 36,
                  top: group.apps[0]?.topPx - 12,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups((prev) => ({ ...prev, [group.key]: false }));
                }}
              >
                Masquer
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default memo(EmployeeRow, (prev, next) => {
  if (prev.employee.IdPersonnel !== next.employee.IdPersonnel ||
      prev.dayInTimeline !== next.dayInTimeline ||
      prev.appointments.length !== next.appointments.length ||
      prev.appointments.some((app, i) => app.IdPlanningEvenement !== next.appointments[i].IdPlanningEvenement || app.DebutPlanningEvenement !== next.appointments[i].DebutPlanningEvenement || app.FinPlanningEvenement !== next.appointments[i].FinPlanningEvenement || app.top !== next.appointments[i].top || app.Etiquette !== next.appointments[i].Etiquette) ||
      prev.rowHeight !== next.rowHeight ||
      prev.style?.top !== next.style?.top ||
      prev.isFullDay !== next.isFullDay ||
      prev.events !== next.events ||
      prev.isDisplayWeekend !== next.isDisplayWeekend ||
      prev.tagPlacement !== next.tagPlacement ||
      prev.todayIndex !== next.todayIndex ||
      prev.isOverlapExpanded !== next.isOverlapExpanded ||
      prev.visibleWindowStart !== next.visibleWindowStart ||
      prev.visibleWindowEnd !== next.visibleWindowEnd ||
      prev.collapseTrigger !== next.collapseTrigger || 
      prev.onSetExpansion !== next.onSetExpansion
  ) {
    return false;
  }
  const wasSelected = prev.selectedCell?.employeeId === prev.employee.IdPersonnel;
  const isSelected = next.selectedCell?.employeeId === next.employee.IdPersonnel;

  if (wasSelected !== isSelected) return false;
  if (wasSelected && isSelected) {
     if (prev.selectedCell?.date !== next.selectedCell?.date) return false;
  }
  return true;
});