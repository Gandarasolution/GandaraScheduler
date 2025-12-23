import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IntervalCell from '@/app/calendrier/components/Calendar/IntervalCell';

// Mock dependencies
jest.mock('react-dnd', () => ({
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()],
}));

jest.mock('@/app/calendrier/components/index', () => ({
  AppointmentItem: () => <div data-testid="appointment-item">Appointment</div>,
  InfoBubble: () => <div data-testid="info-bubble">InfoBubble</div>,
}));

jest.mock('../../../app/calendrier/utils/dates', () => ({
  getNextWorkedDay: jest.fn((d) => d),
}));

describe('IntervalCell', () => {
  const mockDate = new Date(2023, 10, 15);
  const mockEmployee = { id: 1, name: 'John Doe' };
  const defaultProps = {
    dateTs: mockDate.getTime(),
    employee: mockEmployee,
    intervalName: 'morning' as const,
    intervalStartTs: new Date(2023, 10, 15, 8, 0).getTime(),
    intervalEndTs: new Date(2023, 10, 15, 12, 0).getTime(),
    appointments: [],
    events: [],
    isCellActive: true,
    isWeekend: false,
    isFerie: false,
    isFullDay: false,
    nonWorkingDates: [],
    isNonWorkingDay: false,
    isMobile: false,
    onAppointmentMoved: jest.fn(),
    onCellDoubleClick: jest.fn(),
    onAppointmentDoubleClick: jest.fn(),
    onExternalDragDrop: jest.fn(),
    handleContextMenu: jest.fn(),
    isSelected: false,
    selectedAppointmentId: undefined,
    onSelectCell: jest.fn(),
    onSelectAppointment: jest.fn(),
  };

  const renderWithContext = (props = {}) => {
    return render(<IntervalCell {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = renderWithContext();
    expect(container.firstChild).toHaveClass('interval-cell');
  });

  it('handles click to select cell', () => {
    const { container } = renderWithContext();
    fireEvent.click(container.firstChild as Element);
    expect(defaultProps.onSelectCell).toHaveBeenCalledWith({
      date: defaultProps.intervalStartTs,
      employeeId: mockEmployee.id,
    });
    expect(defaultProps.onSelectAppointment).toHaveBeenCalledWith(null);
  });

  it('handles double click', () => {
    const { container } = renderWithContext();
    fireEvent.doubleClick(container.firstChild as Element);
    
    expect(defaultProps.onCellDoubleClick).toHaveBeenCalledWith(
      defaultProps.intervalStartTs,
      mockEmployee.id,
      'morning'
    );
  });

  it('handles context menu', () => {
    const { container } = renderWithContext();
    fireEvent.contextMenu(container.firstChild as Element);
    expect(defaultProps.handleContextMenu).toHaveBeenCalled();
  });
});
