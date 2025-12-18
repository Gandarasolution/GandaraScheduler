import React from 'react';
import { render, screen } from '@testing-library/react';
import DayCell from '@/app/calendrier/components/Calendar/DayCell';
import { HalfDayInterval } from '@/app/calendrier/types';
import { isHoliday } from '../../../app/calendrier/utils/dates';

// Mock IntervalCell
jest.mock('@/app/calendrier/components/Calendar/IntervalCell', () => {
  return function MockIntervalCell(props: any) {
    return <div data-testid="interval-cell" data-interval={props.intervalName}>{props.intervalName}</div>;
  };
});

// Mock utils
jest.mock('../../../app/calendrier/utils/dates', () => ({
  isHoliday: jest.fn(),
}));

describe('DayCell', () => {
  const mockDate = new Date(2023, 10, 15); // Nov 15 2023
  const mockEmployee = { id: 1, name: 'John Doe' };
  const mockIntervals: HalfDayInterval[] = [
    { name: 'morning', startHour: 8, endHour: 12 },
    { name: 'afternoon', startHour: 13, endHour: 17 },
  ];
  const defaultProps = {
    dayTs: mockDate.getTime(),
    employee: mockEmployee,
    appointments: [],
    intervals: mockIntervals,
    events: [],
    isWeekend: false,
    isFullDay: false,
    nonWorkingDates: [],
    isMobile: false,
    onAppointmentMoved: jest.fn(),
    onCellDoubleClick: jest.fn(),
    onAppointmentClick: jest.fn(),
    onExternalDragDrop: jest.fn(),
    handleContextMenu: jest.fn(),
  };

  beforeEach(() => {
    (isHoliday as jest.Mock).mockReturnValue(false);
  });

  it('renders correctly with intervals', () => {
    render(<DayCell {...defaultProps} />);
    const intervals = screen.getAllByTestId('interval-cell');
    expect(intervals).toHaveLength(2);
    expect(screen.getByText('morning')).toBeInTheDocument();
    expect(screen.getByText('afternoon')).toBeInTheDocument();
  });

  it('applies weekend class when isWeekend is true', () => {
    const { container } = render(<DayCell {...defaultProps} isWeekend={true} />);
    expect(container.firstChild).toHaveClass('WEEKEND');
  });

  it('applies ferie class when isHoliday returns true', () => {
    (isHoliday as jest.Mock).mockReturnValue(true);
    const { container } = render(<DayCell {...defaultProps} />);
    expect(container.firstChild).toHaveClass('FERIE');
  });

  it('renders mobile view correctly', () => {
    render(<DayCell {...defaultProps} isMobile={true} />);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.queryByTestId('interval-cell')).not.toBeInTheDocument();
  });
});
