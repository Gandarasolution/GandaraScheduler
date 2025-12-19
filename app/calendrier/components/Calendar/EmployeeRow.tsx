import React, { memo, useMemo } from 'react';
import { Employee, Appointment, Item } from '../../types';
import { CELL_WIDTH, DAY_MS } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';
import { AppointmentItem } from './index';
import { countWeekends } from '../../utils/dates';

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
}) => {
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
        const topPx = (app.top * 52) + (2 * app.top);


        return { ...app, left, width, topPx } as Appointment & {
          top: number;
          left: number;
          width: number;
          topPx: number;
        };
      });
  }, [appointments, employee.id, pixelsPerMs, timelineEnd, timelineStart]);

  return (
    <div 
      id={getRowId('employee', employee.id)}
      className="calendar-row employee-row flex w-fit relative" 
      data-employee-id={employee.id}
      role="row"
      style={{
        ...style,
        height: rowHeight,
        width: rowWidth,
        overflow: 'hidden',
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
      {todayIndex >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none calendar-today"
          style={{
            left: `${(todayIndex * CELL_WIDTH + CELL_WIDTH / 2) - 2}px`,
            backgroundColor: '#ffcdde'
          }}
        />
      )}
      {positionedAppointments.map((app) => {
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
            onResize={(id, newStartDate, newEndDate, resizeDirection) =>
              onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection)
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
      prev.todayIndex !== next.todayIndex
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
