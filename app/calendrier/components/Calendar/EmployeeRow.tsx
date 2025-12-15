import React, { memo } from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { Employee, Appointment, HalfDayInterval, Item } from '../../types';
import { DayCell } from './index';
import { CELL_WIDTH } from '../../utils/constants';

interface EmployeeRowProps {
  employee: Employee;
  dayInTimeline: Date[];
  appointments: (Appointment & { top: number })[];
  rowHeight: number;
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  events: Item[];
  nonWorkingDates: Date[];
  isDisplayWeekend: boolean;
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({
  employee,
  dayInTimeline,
  appointments,
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
}) => {
  return (
    <tr 
      id={`row-employee-${employee.id}`}
      className="calendar-row employee-row" 
      data-employee-id={employee.id}
      role="row"
    >
      {dayInTimeline.map((day) => {
        const dayEmployeeAppointments = appointments.filter((app) =>
          isSameDay(app.startDate, day) && app.employeeId === employee.id
        );
        
        return (
          <td 
            key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
            className="calendar-cell p-0"
            style={{ 
              width: `${CELL_WIDTH}px`,
              height: `${rowHeight}px`
            }}
            role="gridcell"
          >
            <DayCell
              day={day}
              employee={{ id: employee.id, name: employee.name }}
              appointments={dayEmployeeAppointments}
              intervals={HALF_DAY_INTERVALS}
              isFullDay={isFullDay}
              RowHeight={rowHeight}
              isMobile={false}
              events={events}
              nonWorkingDates={nonWorkingDates}
              isDisplayWeekend={isDisplayWeekend}
              onAppointmentMoved={onAppointmentMoved}
              onCellDoubleClick={onCellDoubleClick}
              onAppointmentClick={onAppointmentDoubleClick}
              onExternalDragDrop={onExternalDragDrop}
              isWeekend={isWeekend(day)}
              handleContextMenu={handleContextMenu}
            />
          </td>
        );
      })}
    </tr>
  );
};

export default memo(EmployeeRow);
