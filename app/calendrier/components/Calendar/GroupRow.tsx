import React, { memo } from 'react';
import { format, isWeekend } from 'date-fns';
import { HalfDayInterval, Item, Appointment } from '../../types';
import { DayCell } from './index';
import { CELL_WIDTH } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';

interface GroupRowProps {
  itemId: string | number;
  dayInTimeline: number[];
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
}

const GroupRow: React.FC<GroupRowProps> = ({
  itemId,
  dayInTimeline,
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
}) => {
  return (
    <div 
      id={getRowId('group', itemId)}
      className="calendar-row inactive-row flex w-fit relative"
      data-item-id={`inactive-${itemId}`}
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
      {dayInTimeline.map((day) => (
          <DayCell
            key={`inactive-${itemId}-${format(day, 'yyyy-MM-dd')}`}
            dayTs={day}
            employee={{ id: 0, name: 'Inactive' }}
            appointments={[]}
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
            isCellActive={false}
          />
      ))}
    </div>
  );
};

export default memo(GroupRow);
