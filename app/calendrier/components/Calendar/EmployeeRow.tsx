import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Employee, Appointment, Item } from '../../types';
import { CELL_WIDTH, DAY_MS, DAY_INTERVALS, HALF_DAY_INTERVALS, HOUR_MS, CELL_HEIGHT } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';
import { AppointmentItem } from './index';
import { countWeekends } from '../../utils/dates';
import { isSameDay } from 'date-fns';

interface EmployeeRowProps {
  employee: Employee;
  dayInTimeline: number[];
  appointments: (Appointment & { top: number})[];
  rowHeight: number;
  isFullDay: boolean;
  events: Item[];
  nonWorkingDates: number[];
  isDisplayWeekend: boolean;
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  style?: React.CSSProperties;
  todayIndex: number;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  isOverlapExpanded: boolean;
  onExpandOverlaps: () => void;
  onCollapseOverlaps: () => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  dayInTimeline,
  appointments,
  rowHeight,
  isFullDay,
  events,
  nonWorkingDates,
  isDisplayWeekend,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  style,
  todayIndex,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  isOverlapExpanded,
  onExpandOverlaps,
  onCollapseOverlaps,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const timelineStart = useMemo(() => dayInTimeline[0], [dayInTimeline]);
  const timelineEnd = useMemo(() => (dayInTimeline[dayInTimeline.length - 1] ?? 0) + DAY_MS, [dayInTimeline]);
  const pixelsPerMs = CELL_WIDTH / DAY_MS;
  const rowWidth = dayInTimeline.length * CELL_WIDTH;

  const positionedAppointments = useMemo(() => {
    return appointments
      .filter((app) => {
        if (app.employeeId !== employee.id) return false;
        const start = app.startDate;
        const end = app.endDate;
        return end > timelineStart && start < timelineEnd;
      })
      .map((app) => {
        const start = app.startDate;
        const end = app.endDate;

        //Calcul du nombre de jours TOTAL (réels) depuis le début de la timeline
        const msDiffStart = Math.max(0, start - timelineStart);
        const totalDaysDiff = msDiffStart / DAY_MS;

        //Combien de ces jours étaient des weekends ? (Si isDisplayWeekend est false)
        let weekendsToRemove = 0;
        if (!isDisplayWeekend) {
          weekendsToRemove = countWeekends(timelineStart, start);
        }

        // Nombre de "Jours Visuels" (Jours réels - Weekends)
        const visualDaysOffset = totalDaysDiff - weekendsToRemove;

        // POSITION FINALE (Left)
        // On multiplie par la largeur d'une cellule (ex: 100px) plutôt que par ms
        // car on raisonne maintenant en "colonnes"
        const left = visualDaysOffset * CELL_WIDTH;

        const durationMs = end - start;
        const durationDays = durationMs / DAY_MS;

        let weekendsInDuration = 0;
        if (!isDisplayWeekend) {
          weekendsInDuration = countWeekends(start, end);
        }
        const visualDurationDays = Math.max(0.1, durationDays - weekendsInDuration);
        const width = visualDurationDays * CELL_WIDTH;        
        const topPx = (app.top * CELL_HEIGHT) + (2 * app.top);


        return { ...app, left, width, topPx } as Appointment & {
          top: number;
          left: number;
          width: number;
          topPx: number;
        };
      });
  }, [appointments, employee.id, pixelsPerMs, timelineEnd, timelineStart, isDisplayWeekend]);

  // Regroupe les rendez-vous qui se chevauchent pour n'afficher que le premier par défaut.
  const overlappingGroups = useMemo(() => {
    if (!positionedAppointments.length) return [] as { key: number; apps: (Appointment & { top: number; left: number; width: number; topPx: number; })[] }[];

    const sorted = [...positionedAppointments].sort((a, b) => a.startDate - b.startDate);
    const groups: Array<{ key: number; apps: (typeof positionedAppointments)[number][]; end: number }> = [];

    for (const app of sorted) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && app.startDate < lastGroup.end) {
        lastGroup.apps.push(app);
        lastGroup.end = Math.max(lastGroup.end, app.endDate);
      } else {
        groups.push({ key: app.id, apps: [app], end: app.endDate });
      }
    }

    return groups.map(({ key, apps }) => ({ key, apps }));
  }, [positionedAppointments]);
  const hasExpandedGroup = useMemo(() => overlappingGroups.some((g) => expandedGroups[g.key]), [overlappingGroups, expandedGroups]);

  useEffect(() => {
    if (hasExpandedGroup && !isOverlapExpanded) {
      onExpandOverlaps();
    } else if (!hasExpandedGroup && isOverlapExpanded) {
      onCollapseOverlaps();
    }
  }, [hasExpandedGroup, isOverlapExpanded, onCollapseOverlaps, onExpandOverlaps]);

  const selectionOverlay = useMemo(() => {
    if (!selectedCell || selectedCell.employeeId !== employee.id) return null;

    const dayIndex = dayInTimeline.findIndex((day) => isSameDay(day, selectedCell.date));
    if (dayIndex === -1) return null;

    const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
    const startHour = new Date(selectedCell.date).getHours();
    const intervalIndex = isFullDay
      ? 0
      : startHour >= HALF_DAY_INTERVALS[1].startHour
        ? 1
        : 0;

    return {
      left: dayIndex * CELL_WIDTH + intervalIndex * intervalWidth,
      width: intervalWidth,
    };
  }, [dayInTimeline, employee.id, isFullDay, selectedCell]);

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
    const selectedDate = dayInTimeline[dayIndex] + (intervalConfig?.startHour ?? 0) * HOUR_MS;

    onSelectCell({ employeeId: employee.id, date: selectedDate });
    onSelectAppointment(null);
  }, [dayInTimeline, employee.id, isFullDay, onSelectAppointment, onSelectCell]);

  return (
    <div 
      id={getRowId('employee', employee.id)}
      className="calendar-row employee-row flex w-fit relative" 
      data-employee-id={employee.id}
      role="row"
      onClick={handleRowClick}
      style={{
        ...style,
        height: rowHeight,
        width: rowWidth,
        backgroundColor: 'transparent',
        backgroundImage: `repeating-linear-gradient(
          to right,
          rgba(229,231,235,0.9) 0px,
          rgba(229,231,235,0.9) 1px,
          transparent 1px,
          transparent ${isFullDay ? CELL_WIDTH : CELL_WIDTH / 2}px
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
        const visibleAppointments = isExpanded ? group.apps : [group.apps[0]];
        const hiddenCount = group.apps.length - visibleAppointments.length;

        return (
          <React.Fragment key={group.key}>
            {visibleAppointments.map((app) => {
              const event = events.find((et) => et.id === app.EventId) as Item | undefined;
              return (
                <AppointmentItem
                  key={app.id}
                  appointment={app as Appointment & { top: number;}}
                  isFullDay={isFullDay}
                  isMobile={false}
                  isDisplayWeekend={isDisplayWeekend}
                  event={event as Item}
                  timelineStart={timelineStart}
                  chargeeAffaire={(event && event.type === 'chantier' ? event.chargeAffaire : '') || ''}
                  absoluteLeft={app.left}
                  absoluteWidth={app.width}
                  absoluteTop={app.topPx}
                  onResize={(id, newStartDate, newEndDate, resizeDirection) =>{              
                    onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection)}
                  }
                  handleContextMenu={(e, origin) =>
                    handleContextMenu(
                      e,
                      origin,
                      { ...app, startDate: app.startDate, endDate: app.endDate },
                      { employeeId: app.employeeId as number, date: app.startDate }
                    )
                  }
                  onDoubleClick={() => onAppointmentDoubleClick(app)}
                  onClick={() => onSelectAppointment(app)}
                  isSelected={selectedAppointmentId === app.id}
                />
              );
            })}

            {hiddenCount > 0 && !isExpanded && (
              <button
                type="button"
                className="absolute z-30 text-[11px] font-semibold rounded-full px-2 py-0.5 shadow-sm border border-gray-200 bg-white/85 text-gray-700 flex items-center gap-1 transition-transform hover:-translate-y-0.5 hover:shadow-md"
                style={{
                  left: (group.apps[0].left + group.apps[0].width) - 24,
                  top: group.apps[0].topPx + 6,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedGroups((prev) => ({ ...prev, [group.key]: true }));
                }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true" />
                +{hiddenCount}
              </button>
            )}

            {isExpanded && group.apps.length > 1 && (
              <button
                type="button"
                className="absolute z-30 text-[11px] font-semibold bg-white text-gray-700 border border-gray-200 rounded-full px-2 py-0.5 shadow-sm hover:bg-gray-50 transition"
                style={{
                  left: (group.apps[0].left + group.apps[0].width) - 36,
                  top: group.apps[0].topPx - 12,
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
  if (prev.employee.id !== next.employee.id ||
      prev.dayInTimeline !== next.dayInTimeline ||
      prev.appointments !== next.appointments ||
      prev.rowHeight !== next.rowHeight ||
      prev.isFullDay !== next.isFullDay ||
      prev.events !== next.events ||
      prev.nonWorkingDates !== next.nonWorkingDates ||
      prev.isDisplayWeekend !== next.isDisplayWeekend ||
      prev.todayIndex !== next.todayIndex ||
      prev.isOverlapExpanded !== next.isOverlapExpanded
  ) {
    return false;
  }

  // Optimization for selectedCell
  const wasSelected = prev.selectedCell?.employeeId === prev.employee.id;
  const isSelected = next.selectedCell?.employeeId === next.employee.id;

  if (wasSelected !== isSelected) return false; // Selection state changed for this row
  if (wasSelected && isSelected) {
     if (prev.selectedCell?.date !== next.selectedCell?.date) return false; // Selected date changed within this row
  }

  // Optimization for selectedAppointmentId
  if (prev.selectedAppointmentId !== next.selectedAppointmentId) {
     // If appointment selection changed, we ideally check if the appointment is in this row.
     // For now, to be safe and simple, we can re-render. 
     // Or we can try to be smart.
     // If we return false here, ALL rows re-render on appointment click.
     // This is what happens currently anyway (via context).
     // But we want to avoid it if possible.
     // Let's assume for now we re-render all rows on appointment selection change.
     // It's less frequent than cell selection (maybe?).
     return false;
  }

  return true;
});
