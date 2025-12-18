import React from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment, Employee, HalfDayInterval, Item } from '../../types';
import { DayCell } from './index';
import { CELL_HEIGHT } from '../../utils/constants';
import { snapToHour } from '../../utils/dates';

interface MobileCalendarGridProps {
  employees: Employee[];
  appointmentsWithTop: (Appointment & { top: number; _dayKey?: number; startTs?: number; endTs?: number })[];
  employeeHeights: { employeeId: number; dayKey?: number; height: number }[];
  dayInTimeline: number[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: number[];
  events: Item[];
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  selectedCell?: { employeeId: number; date: number } | null;
  selectedAppointmentId?: number | undefined;
  onSelectCell?: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment?: (appointment: Appointment | null) => void;
}

const MobileCalendarGrid: React.FC<MobileCalendarGridProps> = ({
  employees,
  appointmentsWithTop,
  employeeHeights,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  events,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
}) => {
  const displayEmployee = employees[0];

  if (!displayEmployee) return null;

  return (
    <div className="relative h-full w-full poppins">
      <div className="mobile-employee-header sticky top-0 z-30 flex items-center justify-center">
        {displayEmployee.image && (
          <img
            src={displayEmployee.image?.image}
            alt={displayEmployee.name}
            className="employee-avatar w-14 h-14 rounded-full mr-4"
            onError={(e) => { e.currentTarget.src = `https://placehold.co/56x56/cccccc/333333?text=${displayEmployee.name.charAt(0)}`; }}
          />
        )}
        <span className="employee-name">{displayEmployee.name}</span>
      </div>

      <div className="flex flex-col w-full">
        {dayInTimeline.map((day) => {
          const dayStart = day;
          snapToHour(dayStart, 0, 0, 0, 0);
          
          const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
            app.employeeId === displayEmployee.id &&
            app._dayKey === dayStart
          );

          const rowHeight = employeeHeights.find(e => e.employeeId === displayEmployee.id && e.dayKey === dayStart)?.height ?? CELL_HEIGHT;
          
          return (
            <div key={`day-section-${format(day, 'yyyy-MM-dd')}`} className="border-b border-gray-200">
              <div
                className={`
                  mobile-day-header flex flex-col items-center justify-center
                  ${isWeekend(day) ? 'weekend' : ''}
                  ${isSameDay(day, Date.now()) ? 'today' : ''}
                `}
              >
                <span className="day-title">{format(day, 'EEEE d MMMM', { locale: fr })}</span>
              </div>

              <div className={`mobile-day-cell ${isWeekend(day) ? 'weekend' : ''}`}>
                <DayCell
                  dayTs={day}
                  employee={displayEmployee}
                  appointments={dayEmployeeAppointments}
                  intervals={HALF_DAY_INTERVALS}
                  isFullDay={isFullDay}
                  nonWorkingDates={nonWorkingDates}
                  isMobile={true}
                  events={events}
                  RowHeight={dayEmployeeAppointments.length > 0 ? rowHeight : CELL_HEIGHT}
                  onAppointmentMoved={(id, start, end, empId, direction) =>
                    onAppointmentMoved(id, start, end, empId, direction)
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
                      appointment ? { ...appointment, startDate:appointment.startDate, endDate: appointment.endDate } : null,
                      cell ? { employeeId: cell.employeeId, date: cell.date } : undefined
                    )
                  }
                  isCellActive={true}
                  selectedCell={selectedCell ? { employeeId: selectedCell.employeeId, date: selectedCell.date } : null}
                  selectedAppointmentId={selectedAppointmentId}
                  onSelectCell={(cell) => onSelectCell && onSelectCell(cell)}
                  onSelectAppointment={onSelectAppointment}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCalendarGrid;
