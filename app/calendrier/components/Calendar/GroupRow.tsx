import React, { memo } from 'react';
import { CELL_WIDTH } from '../../utils/constants';
import { getRowId } from '../../utils/domIds';

interface GroupRowProps {
  itemId: string | number;
  dayInTimeline: number[];
  style?: React.CSSProperties;
  todayIndex: number;
  isFullDay: boolean;
}

const GroupRow: React.FC<GroupRowProps> = ({
  itemId,
  dayInTimeline,
  style,
  todayIndex,
  isFullDay,
}) => {
  const rowWidth = dayInTimeline.length * CELL_WIDTH;

  return (
    <div 
      id={getRowId('group', itemId)}
      className="calendar-row inactive-row flex w-fit relative"
      data-item-id={`inactive-${itemId}`}
      role="row"
      style={{
        ...style,
        width: rowWidth,
        backgroundColor: 'transparent',
        backgroundImage: `repeating-linear-gradient(
          to right,
          rgba(229,231,235,0.9) 0px,
          rgba(229,231,235,0.9) 1px,
          transparent 1px,
          transparent ${isFullDay ? CELL_WIDTH  : CELL_WIDTH / 2}px
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
    </div>
  );
};

export default memo(GroupRow);
