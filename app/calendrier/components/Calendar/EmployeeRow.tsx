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
  appointments: Appointment[];
  rowHeight: number;
  isFullDay: boolean;
  events: Record<number, Item>;
  isDisplayWeekend: boolean;
  tagPlacement?: 'hover' | 'fixed';
  visibleWindowStart: number;
  visibleWindowEnd: number;
  onAppointmentMoved: (data: { id: number; newStartDate: number; newEndDate: number; newEmployeeId: number; idRessource: number; resizeDirection?: 'left' | 'right' }, saveToHistory?: boolean, newPriority?: number) => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  style?: React.CSSProperties;
  todayIndex: number;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  onOverlapExpansionChange: (employeeId: number, expandedOverlapCount: number) => void;
  onHiddenOverlapCountChange: (employeeId: number, hiddenOverlapCount: number) => void;
  collapseTrigger?: number;
  expandTrigger?: number;
  mainScrollRef: React.RefObject<HTMLDivElement>;
  onLockedError: (message: string) => void;
  rowBackgroundColor?: string;
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
  onOverlapExpansionChange,
  onHiddenOverlapCountChange,
  collapseTrigger,
  expandTrigger,
  mainScrollRef,
  onLockedError,
  rowBackgroundColor = 'transparent'
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpandedGroups({});
  }, [collapseTrigger]);

  const handleAppointmentResize = useCallback((id: number, newStartDate: number, newEndDate: number, resizeDirection: 'left' | 'right', priority: number) => {
    const appointmentToResize = appointments.find((app) => app.IdPlanningEvenement === id);
    if (!appointmentToResize) return;

    onAppointmentMoved(
      {
        id,
        newStartDate,
        newEndDate,
        newEmployeeId: employee.IdPersonnel as number,
        idRessource: appointmentToResize.IdPlanningRessource as number,
        resizeDirection,
      },
      true,
      priority
    );
  }, [onAppointmentMoved, employee.IdPersonnel, appointments]);

  const timelineStart = dayInTimeline[0] || 0;

  const overlappingGroups = useMemo(() => {
    if (!appointments.length) return [];

    const seenIds = new Set<number>();
    const visibleAppointments: Appointment[] = [];

    for (let i = 0; i < appointments.length; i++) {
      const app = appointments[i]!;
      if (
        Number(app.IdEmploye) === Number(employee.IdPersonnel) &&
        app.FinPlanningEvenement > visibleWindowStart &&
        app.DebutPlanningEvenement < visibleWindowEnd &&
        !seenIds.has(app.IdPlanningEvenement)
      ) {
        seenIds.add(app.IdPlanningEvenement);
        visibleAppointments.push(app);
      }
    }

    if (!visibleAppointments.length) return [];

    visibleAppointments.sort((a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement);
    const groups: Array<{ key: number; apps: Appointment[]; end: number }> = [];

    for (const app of visibleAppointments) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && app.DebutPlanningEvenement < lastGroup.end) {
        lastGroup.apps.push(app);
        if (app.FinPlanningEvenement > lastGroup.end) {
          lastGroup.end = app.FinPlanningEvenement;
        }
      } else {
        groups.push({ key: app.IdPlanningEvenement, apps: [app], end: app.FinPlanningEvenement });
      }
    }

    for (const group of groups) {
      if (group.apps.length > 1) {
        group.apps.sort((a, b) => {
          const pA = a.PlanningEvenementPriorite ?? 0;
          const pB = b.PlanningEvenementPriorite ?? 0;
          return (pA - pB) || (a.DebutPlanningEvenement - b.DebutPlanningEvenement);
        });
      }
    }

    return groups;
  }, [appointments, employee.IdPersonnel, visibleWindowEnd, visibleWindowStart]);

  useEffect(() => {
    const hiddenOverlapCount = overlappingGroups.reduce(
      (total, group) => total + Math.max(0, group.apps.length - 1),
      0
    );
    onHiddenOverlapCountChange(employee.IdPersonnel, hiddenOverlapCount);
  }, [employee.IdPersonnel, onHiddenOverlapCountChange, overlappingGroups]);

  const positionedGroups = useMemo(() => {
    return overlappingGroups.map((group) => {
      const isExpanded = expandedGroups[group.key] === true;
      const priority0Apps = group.apps.filter(app => Number(app.PlanningEvenementPriorite ?? 0) === 0);
      let prevWidth = Infinity;

      const positionedApps = group.apps.map((app, index) => {
        const start = app.DebutPlanningEvenement;
        const end = app.FinPlanningEvenement;
        const previousApp = index > 0 ? group.apps[index - 1] : undefined;

        const left = calculateLeftPx(start, timelineStart, isFullDay, isDisplayWeekend);
        const width = calculateWidthPx(start, end, isFullDay, isDisplayWeekend);

        const priority = Number(app.PlanningEvenementPriorite ?? 0);
        const beforeHasTag = previousApp && priority > 0 && tagPlacement === 'fixed' && !!previousApp.Etiquette?.IdPlanningEtiquette;
        const isSimilarSize = Math.abs(width - prevWidth) <= CELL_WIDTH;
        prevWidth = width;

        const topPx = isExpanded
          ? (priority * CELL_HEIGHT) + (CELL_HEIGHT / 14) + (2 * priority) + (beforeHasTag && isSimilarSize ? 18 : 0)
          : CELL_HEIGHT / 14;

        let ghostIntervals: { start: number; end: number }[] | undefined;
        if (priority !== 0 && priority0Apps.length > 0) {
          const intervals: { start: number; end: number }[] = [];
          for (const baseApp of priority0Apps) {
            const gStart = Math.max(start, baseApp.DebutPlanningEvenement);
            const gEnd = Math.min(end, baseApp.FinPlanningEvenement);
            if (gStart < gEnd) intervals.push({ start: gStart, end: gEnd });
          }
          if (intervals.length > 0) ghostIntervals = intervals;
        }

        const isGhost = !isExpanded && !!ghostIntervals;
        const startDay = new Date(start).getDay();
        const isWeekendHidden = !isDisplayWeekend && (startDay === 0 || startDay === 6);

        return {
          ...app,
          left,
          width,
          topPx,
          isGhost,
          ghostIntervals,
          isWeekendHidden
        };
      });

      const hiddenCount = group.apps.reduce((count, app) => (app.PlanningEvenementPriorite && app.PlanningEvenementPriorite > 0 ? count + 1 : count), 0);

      return {
        key: group.key,
        isExpanded,
        apps: positionedApps,
        hiddenCount
      };
    });
  }, [overlappingGroups, timelineStart, isFullDay, isDisplayWeekend, tagPlacement, expandedGroups]);

  useEffect(() => {
    if (expandTrigger === undefined) return;
    setExpandedGroups((previous) => {
      const next = { ...previous };
      overlappingGroups.forEach((group) => { next[group.key] = true; });
      return next;
    });
  }, [expandTrigger, overlappingGroups]);

  useEffect(() => {
    const maxExpandedOverlap = overlappingGroups.reduce((maxOverlap, group) => {
      if (group.apps.length <= 1 || expandedGroups[group.key] !== true) return maxOverlap;

      const activeEndDates: number[] = [];
      let groupMaxOverlap = 0;
      const sortedApps = [...group.apps].sort((a, b) => a.DebutPlanningEvenement - b.DebutPlanningEvenement);

      for (let i = 0; i < sortedApps.length; i++) {
        const app = sortedApps[i]!;
        for (let index = activeEndDates.length - 1; index >= 0; index--) {
          if (activeEndDates[index]! <= app.DebutPlanningEvenement) {
            activeEndDates.splice(index, 1);
          }
        }
        activeEndDates.push(app.FinPlanningEvenement);
        if (activeEndDates.length > groupMaxOverlap) {
          groupMaxOverlap = activeEndDates.length;
        }
      }

      return Math.max(maxOverlap, groupMaxOverlap);
    }, 0);
    onOverlapExpansionChange(employee.IdPersonnel, maxExpandedOverlap);
  }, [employee.IdPersonnel, expandedGroups, onOverlapExpansionChange, overlappingGroups]);

  const selectionOverlay = useMemo(() => {
    if (!selectedCell || selectedCell.employeeId !== employee.IdPersonnel) return null;
    const dayIndex = dayInTimeline.findIndex((day) => isSameDay(day, selectedCell.date));
    if (dayIndex === -1) return null;

    const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
    const startHour = new Date(selectedCell.date).getHours();
    const intervalIndex = isFullDay ? 0 : (startHour >= (HALF_DAY_INTERVALS[1]?.startHour ?? 0) ? 1 : 0);

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

  // Style de fond isolé du positionnement vertical `style.top`
  const backgroundGridStyle = useMemo<React.CSSProperties>(() => {
    const STEP_WIDTH = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
    return {
      width: dayInTimeline.length * CELL_WIDTH,
      backgroundColor: rowBackgroundColor,
      backgroundImage: `repeating-linear-gradient(
        to right,
        transparent 0px,
        transparent ${STEP_WIDTH - 1}px,
        var(--border-100) ${STEP_WIDTH - 1}px,
        var(--border-100) ${STEP_WIDTH}px
      )`,
      boxShadow: 'inset 0 -0.5px 0 0 var(--border-100)',
      zIndex: 6,
    };
  }, [dayInTimeline.length, rowBackgroundColor, isFullDay]);

  const rowStyle = useMemo<React.CSSProperties>(() => ({
    ...style,
    ...backgroundGridStyle,
    height: rowHeight,
  }), [style, backgroundGridStyle, rowHeight]);

  const isInactive = employee.Actif === false;

  return (
    <div
      id={getRowId('employee', employee.IdPersonnel)}
      className="calendar-row employee-row flex w-fit relative"
      data-employee-id={employee.IdPersonnel}
      role="row"
      onClick={handleRowClick}
      style={rowStyle}
    >
      {selectionOverlay && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none rounded-md bg-primary-500/20 border border-primary/40 z-20"
          style={{ left: selectionOverlay.left, width: selectionOverlay.width }}
        />
      )}
      {todayIndex >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none calendar-today"
          style={{ left: `${(todayIndex * CELL_WIDTH + CELL_WIDTH / 2) - 2}px`, backgroundColor: '#ffcdde' }}
        />
      )}

      {positionedGroups.map((group) => {
        const firstApp = group.apps[0];
        const baseTopPx = firstApp?.topPx || 0;

        return (
          <React.Fragment key={group.key}>
            {group.apps.map((app) => {
              if (app.isWeekendHidden) return null;
              const ressource = events[Number(app.IdPlanningRessource)];
              if (!ressource) return null;

              return (
                <AppointmentItem
                  key={app.IdPlanningEvenement}
                  appointment={app}
                  isInactive={isInactive}
                  isFullDay={isFullDay}
                  isMobile={false}
                  isDisplayWeekend={isDisplayWeekend}
                  tagPlacement={tagPlacement}
                  event={ressource}
                  timelineStart={timelineStart}
                  chargeeAffaire={ressource.Type === 'Projet' ? ressource.ChargeAffaire : ''}
                  absoluteLeft={app.left}
                  absoluteWidth={app.width}
                  absoluteTop={app.topPx}
                  mainScrollRef={mainScrollRef}
                  isGhost={app.isGhost}
                  ghostInterval={app.ghostIntervals}
                  onAppointmentResize={handleAppointmentResize}
                  handleContextMenu={handleContextMenu}
                  onDoubleClick={onAppointmentDoubleClick}
                  onClick={onSelectAppointment}
                  isSelected={selectedAppointmentId === app.IdPlanningEvenement}
                  onLockedError={onLockedError}
                />
              );
            })}

            {!group.isExpanded && group.apps.length > 1 && firstApp && (
              <button
                type="button"
                className="absolute z-30 text-[11px] font-semibold rounded-full px-2 py-0.5 shadow-sm border border-gray-200 bg-white/95 text-gray-700 flex items-center gap-1 transition-transform hover:-translate-y-0.5 hover:shadow-md hover:bg-white cursor-pointer"
                style={{ left: (firstApp.left + firstApp.width) - 24, top: baseTopPx - 6 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
                }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                +{group.hiddenCount}
              </button>
            )}

            {group.isExpanded && group.apps.length > 1 && firstApp && (
              <button
                type="button"
                className="absolute z-30 cursor-pointer text-[10px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition"
                style={{ left: (firstApp.left + firstApp.width) - 36, top: firstApp.topPx - 12 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups((prev) => ({ ...prev, [group.key]: false }));
                }}
              >
                Réduire
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default memo(EmployeeRow, (prev, next) => {
  if (
    prev.employee.IdPersonnel !== next.employee.IdPersonnel ||
    prev.employee.Actif !== next.employee.Actif ||
    prev.dayInTimeline !== next.dayInTimeline ||
    prev.appointments !== next.appointments ||
    prev.rowHeight !== next.rowHeight ||
    prev.style?.top !== next.style?.top ||
    prev.isFullDay !== next.isFullDay ||
    prev.events !== next.events ||
    prev.isDisplayWeekend !== next.isDisplayWeekend ||
    prev.tagPlacement !== next.tagPlacement ||
    prev.todayIndex !== next.todayIndex ||
    prev.visibleWindowStart !== next.visibleWindowStart ||
    prev.visibleWindowEnd !== next.visibleWindowEnd ||
    prev.collapseTrigger !== next.collapseTrigger ||
    prev.expandTrigger !== next.expandTrigger ||
    prev.selectedAppointmentId !== next.selectedAppointmentId
  ) {
    return false;
  }

  const wasSelected = prev.selectedCell?.employeeId === prev.employee.IdPersonnel;
  const isSelected = next.selectedCell?.employeeId === next.employee.IdPersonnel;
  if (wasSelected !== isSelected) return false;
  if (wasSelected && isSelected && prev.selectedCell?.date !== next.selectedCell?.date) return false;

  return true;
});