import React, { memo } from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { Employee, Appointment, HalfDayInterval, Item } from '../../types';
import { DayCell } from './index';
import { CELL_WIDTH } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';

interface EmployeeRowProps {
  employee: Employee;
  dayInTimeline: number[];
  appointments: (Appointment & { top: number; startTs?: number; endTs?: number })[];
  appointmentsByDay?: Map<string, (Appointment & { top: number })[]>;
  rowHeight: number;
  HALF_DAY_INTERVALS: HalfDayInterval[];
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
  appointmentsByDay,
  rowHeight,
  HALF_DAY_INTERVALS,
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
  return (
    <div 
      id={getRowId('employee', employee.id)}
      className="calendar-row employee-row flex w-fit relative" 
      data-employee-id={employee.id}
      role="row"
      style={{
        ...style,
        height: rowHeight,
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
      {dayInTimeline.map((day) => {
        let dayEmployeeAppointments: (Appointment & { top: number })[] = [];
        
        if (appointmentsByDay) {
          const dateKey = format(day, 'yyyy-MM-dd');
          const key = `${employee.id}-${dateKey}`;
          dayEmployeeAppointments = appointmentsByDay.get(key) || [];
        } else {
          dayEmployeeAppointments = appointments.filter((app) =>
            isSameDay(app.startDate, day) && app.employeeId === employee.id
          );
        }
        
        return (
            <DayCell
              key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
              dayTs={day}
              employee={{ id: employee.id, name: employee.name }}
              appointments={dayEmployeeAppointments}
              intervals={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
              RowHeight={rowHeight}
              isMobile={false}
              events={events}
              nonWorkingDates={nonWorkingDates}
              isDisplayWeekend={isDisplayWeekend}
              onAppointmentMoved={(id, start, end, employeeId, direction) =>
                onAppointmentMoved(id, start, end, employeeId, direction)
              }
              onCellDoubleClick={(ts, empId, intervalName) => onCellDoubleClick(ts, empId, intervalName)}
              onAppointmentClick={onAppointmentDoubleClick}
              onExternalDragDrop={(title, ts, intervalName, empId, imageUrl, typeEvent) =>
                onExternalDragDrop(title, ts, intervalName, empId, imageUrl, typeEvent)
              }
              isWeekend={isWeekend(day)}
              handleContextMenu={(e, origin, appointment, cell) =>
                handleContextMenu(
                  e,
                  origin,
                  appointment ? { ...appointment, startDate: appointment.startDate, endDate: appointment.endDate } : null,
                  cell ? { employeeId: cell.employeeId, date: cell.date } : undefined
                )
              }
              selectedCell={selectedCell ? { employeeId: selectedCell.employeeId, date: selectedCell.date } : null}
              selectedAppointmentId={selectedAppointmentId}
              onSelectCell={(cell) => onSelectCell(cell ? { employeeId: cell.employeeId, date: cell.date } : null)}
              onSelectAppointment={onSelectAppointment}
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
      prev.appointmentsByDay !== next.appointmentsByDay ||
      prev.rowHeight !== next.rowHeight ||
      prev.HALF_DAY_INTERVALS !== next.HALF_DAY_INTERVALS ||
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
