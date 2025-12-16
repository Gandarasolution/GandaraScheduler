import React from 'react';
import { render, screen } from '@testing-library/react';
import GroupRow from '@/app/calendrier/components/Calendar/GroupRow';
import { HalfDayInterval, Item } from '@/app/calendrier/types';

// Mock DayCell
jest.mock('@/app/calendrier/components/Calendar/DayCell', () => {
  return function MockDayCell(props: any) {
    return <div data-testid="day-cell">{props.day.toISOString()}</div>;
  };
});

describe('GroupRow', () => {
  const mockDayInTimeline = [
    new Date('2023-01-01T00:00:00.000Z'),
    new Date('2023-01-02T00:00:00.000Z'),
  ];

  const mockHalfDayIntervals: HalfDayInterval[] = [
    { name: 'morning', startHour: 8, endHour: 12 },
    { name: 'afternoon', startHour: 13, endHour: 17 },
  ];
  const mockEvents: Item[] = [];
  const mockNonWorkingDates: Date[] = [];

  const defaultProps = {
    itemId: 'group-1',
    dayInTimeline: mockDayInTimeline,
    rowHeight: 50,
    HALF_DAY_INTERVALS: mockHalfDayIntervals,
    isFullDay: false,
    events: mockEvents,
    nonWorkingDates: mockNonWorkingDates,
    isDisplayWeekend: true,
    onAppointmentMoved: jest.fn(),
    onCellDoubleClick: jest.fn(),
    onAppointmentDoubleClick: jest.fn(),
    onExternalDragDrop: jest.fn(),
    handleContextMenu: jest.fn(),
    todayIndex: -1,
  };

  it('renders correctly', () => {
    render(<GroupRow {...defaultProps} />);
    const row = screen.getByRole('row');
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute('data-item-id', 'inactive-group-1');
  });

  it('renders the correct number of DayCells', () => {
    render(<GroupRow {...defaultProps} />);
    const dayCells = screen.getAllByTestId('day-cell');
    expect(dayCells).toHaveLength(mockDayInTimeline.length);
  });

  it('passes style prop correctly', () => {
    const style = { marginTop: '10px' };
    render(<GroupRow {...defaultProps} style={style} />);
    const row = screen.getByRole('row');
    expect(row).toHaveStyle('margin-top: 10px');
  });
});
