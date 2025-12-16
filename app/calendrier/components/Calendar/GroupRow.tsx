import React, { memo } from 'react';
import { format, isWeekend, isSameDay } from 'date-fns';
import { HalfDayInterval, Item, Appointment } from '../../types';
import { DayCell } from './index';
import { CELL_WIDTH } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';

interface GroupRowProps {
  itemId: string | number;
  dayInTimeline: Date[];
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
        <div 
          key={`inactive-${itemId}-${format(day, 'yyyy-MM-dd')}`}
          className="calendar-cell p-0"
          style={{ 
            width: `${CELL_WIDTH}px`,
            height: `${rowHeight}px`,
            minWidth: `${CELL_WIDTH}px`
          }}
          role="gridcell"
        >
          <DayCell
            day={day}
            employee={{ id: 0, name: 'Inactive' }}
            appointments={[]}
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
            isCellActive={false}
          />
        </div>
      ))}
    </div>
  );
};

export default memo(GroupRow);
