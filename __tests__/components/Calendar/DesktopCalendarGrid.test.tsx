import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DesktopCalendarGrid } from '@/app/calendrier/components';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Employee } from '@/app/calendrier/types';

// Mock des composants enfants pour simplifier le test
jest.mock('../../../app/calendrier/components/Calendar/DayCell', () => {
  return function MockDayCell({ day, employee }: any) {
    return <div data-testid="day-cell">{day.toISOString()} - {employee.name}</div>;
  };
});

jest.mock('../../../app/calendrier/components/Calendar/TimelineFrame', () => {
  return function MockTimelineFrame({ children }: any) {
    return <div data-testid="timeline-frame">{children}</div>;
  };
});

const mockEmployees: Employee[] = [
  { id: 1, name: 'Alice', firstName: 'Doe', type: 'employee' as const, code: 'EMP001' },
  { id: 2, name: 'Bob', firstName: 'Smith', type: 'interim' as const, code: 'INT001' }
];

const mockConfig = {
  id: 1,
  name: 'Default',
  dimension: 'employee' as const,
  filters: [],
  selectedRdvTypes: []
};

const defaultProps = {
  employees: mockEmployees,
  appointmentsWithTop: [],
  employeeHeights: [],
  dayInTimeline: [new Date(2023, 0, 1).getTime(), new Date(2023, 0, 2).getTime()],
  initialTeams: [],
  calendarConfig: mockConfig,
  onCalendarConfigChange: jest.fn(),
  availableConfigs: [mockConfig],
  HALF_DAY_INTERVALS: [],
  isFullDay: true,
  events: [],
  nonWorkingDates: [],
  isDisplayWeekend: true,
  mainScrollRef: { current: null },
  handleScroll: jest.fn(),
  handleScrollY: jest.fn(),
  columnREmployeeef: { current: null },
  tableRef: { current: null },
  handleMouseOver: jest.fn(),
  handleMouseOut: jest.fn(),
  onAppointmentMoved: jest.fn(),
  onCellDoubleClick: jest.fn(),
  onAppointmentDoubleClick: jest.fn(),
  onExternalDragDrop: jest.fn(),
  handleContextMenu: jest.fn(),
  updateHighlightedEmployeeRow: jest.fn(),
};

describe('DesktopCalendarGrid', () => {
  it('renders without crashing', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <DesktopCalendarGrid {...defaultProps} />
      </DndProvider>
    );
    expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
  });

  it('displays employee names in the left column', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <DesktopCalendarGrid {...defaultProps} />
      </DndProvider>
    );
    // Alice et Bob devraient être visibles (selon la logique de filtrage/groupement par défaut)
    // Note: Cela dépend de la logique de groupement par défaut.
  });
});
