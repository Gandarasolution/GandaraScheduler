import React from 'react';
import { render, screen } from '@testing-library/react';
import EmployeeRow from '@/app/calendrier/components/Calendar/EmployeeRow';
import { Employee, Appointment, HalfDayInterval, Item } from '@/app/calendrier/types';

// Mock DayCell to simplify testing
jest.mock('@/app/calendrier/components/Calendar/DayCell', () => {
  return function MockDayCell(props: any) {
    return <div data-testid="day-cell">{props.day.toISOString()}</div>;
  };
});

describe('EmployeeRow', () => {
  const mockEmployee: Employee = {
    id: 1,
    name: 'Doe',
    firstName: 'John',
    code: 'EMP001',
    group: { id: 1, name: 'Group 1' },
    type: 'employee',
    pole: 'Technique',
  };

  const mockDayInTimeline = [
    new Date('2023-01-01T00:00:00.000Z').getTime(),
    new Date('2023-01-02T00:00:00.000Z').getTime(),
  ];

  const mockAppointments: (Appointment & { top: number })[] = [];
  const mockHalfDayIntervals: HalfDayInterval[] = [
    { name: 'morning', startHour: 8, endHour: 12 },
    { name: 'afternoon', startHour: 13, endHour: 17 },
  ];
  const mockEvents: Item[] = [];
  const mockNonWorkingDates: number[] = [];

  const defaultProps = {
    employee: mockEmployee,
    dayInTimeline: mockDayInTimeline,
    appointments: mockAppointments,
    rowHeight: 50,
    HALF_DAY_INTERVALS: mockHalfDayIntervals,
    isFullDay: false,
    events: mockEvents,
    nonWorkingDates: mockNonWorkingDates,
    isDisplayWeekend: true,
    selectedCell: null,
    selectedAppointmentId: undefined,
    onSelectCell: jest.fn(),
    onSelectAppointment: jest.fn(),
    onAppointmentMoved: jest.fn(),
    onCellDoubleClick: jest.fn(),
    onAppointmentDoubleClick: jest.fn(),
    onExternalDragDrop: jest.fn(),
    handleContextMenu: jest.fn(),
    todayIndex: -1,
  };

  it('renders correctly', () => {
    render(<EmployeeRow {...defaultProps} />);
    const row = screen.getByRole('row');
    expect(row).toBeInTheDocument();
    expect(row).toHaveAttribute('data-employee-id', '1');
  });

  it('renders the correct number of DayCells', () => {
    render(<EmployeeRow {...defaultProps} />);
    const dayCells = screen.getAllByTestId('day-cell');
    expect(dayCells).toHaveLength(mockDayInTimeline.length);
  });

  it('passes style prop correctly', () => {
    const style = { marginTop: '10px' };
    render(<EmployeeRow {...defaultProps} style={style} />);
    const row = screen.getByRole('row');
    expect(row).toHaveStyle('margin-top: 10px');
  });
});
