import React, { useEffect, useState } from 'react';
import { format, isSameDay, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DayCell } from './index';
import { CELL_HEIGHT } from '../../utils/constants';
import { snapToHour } from '../../utils/dates';
import { useCalendarContext } from '../../context/CalendarContext';

const MobileCalendarGrid: React.FC = () => {
  const {
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
  } = useCalendarContext();

  const [todayTs, setTodayTs] = useState<number | null>(null);

  useEffect(() => {
    setTodayTs(Date.now());
  }, []);

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

          const isToday = todayTs ? isSameDay(day, todayTs) : false;

          return (
            <div key={`day-section-${format(day, 'yyyy-MM-dd')}`} className="border-b border-gray-200">
              <div
                className={`
                  mobile-day-header flex flex-col items-center justify-center
                  ${isWeekend(day) ? 'weekend' : ''}
                  ${isToday ? 'today' : ''}
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
