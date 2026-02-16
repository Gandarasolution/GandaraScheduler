import React from 'react';
import { render, screen } from '@testing-library/react';
import EmployeeRow from '@/app/calendrier/components/Calendar/EmployeeRow'; // Ajustez le chemin selon votre structure
import { Employee } from '@/app/calendrier/types';
import '@testing-library/jest-dom';

// 1. Mock des constantes pour simplifier les calculs de largeur
jest.mock('@/app/calendrier/utils/constants', () => ({
  CELL_WIDTH: 100,
  DAY_MS: 86400000,
  // Ajoutez ces définitions pour éviter le crash dans AppointmentItem
  HALF_DAY_INTERVALS: [
    { name: 'morning', startHour: 8, endHour: 12 },
    { name: 'afternoon', startHour: 13, endHour: 17 }
  ],
  DAY_INTERVALS: [
    { name: 'day', startHour: 8, endHour: 17 }
  ]
}));

// 2. Mock de l'utilitaire d'ID
jest.mock('@/app/calendrier/utils/domIds', () => ({
  getRowId: (type: string, id: string | number) => `${type}-${id}-test`,
}));

// 3. Mock des composants enfants (AppointmentItem) pour isoler le test de la ligne
jest.mock('@/app/calendrier/components/index', () => ({
  AppointmentItem: () => <div data-testid="appointment-item">Rendez-vous</div>,
}));

// 4. Mock des utilitaires de date
jest.mock('@/app/calendrier/utils/dates', () => ({
  countWeekends: jest.fn(() => 0), // On simule 0 weekend pour simplifier les calculs de position
}));

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
    1672531200000, // Jour 1
    1672617600000, // Jour 2
  ];

  const defaultProps = {
    employee: mockEmployee,
    dayInTimeline: mockDayInTimeline,
    appointments: [],
    rowHeight: 50,
    isFullDay: false,
    events: [],
    nonWorkingDates: [],
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

  it('renders the row container with correct attributes', () => {
    render(<EmployeeRow {...defaultProps} />);
    const row = screen.getByRole('row');

    expect(row).toBeInTheDocument();
    // Vérifie l'ID généré par le mock
    expect(row).toHaveAttribute('id', 'employee-1-test'); 
    expect(row).toHaveAttribute('data-employee-id', '1');
    expect(row).toHaveClass('calendar-row', 'employee-row');
  });

  // REMPLACEMENT DU TEST "renders the correct number of DayCells"
  it('calculates total width based on timeline length', () => {
    render(<EmployeeRow {...defaultProps} />);
    const row = screen.getByRole('row');

    // Width = 2 jours * 100px (mocked CELL_WIDTH) = 200px
    expect(row).toHaveStyle({ width: '200px' });
    expect(row).toHaveStyle({ height: '50px' });
  });

  it('renders background gradient (grid lines)', () => {
    render(<EmployeeRow {...defaultProps} />);
    const row = screen.getByRole('row');
    const style = window.getComputedStyle(row);

    // Vérifie que le gradient CSS est appliqué pour simuler la grille
    expect(style.backgroundImage).toContain('repeating-linear-gradient');
  });

  it('renders appointments when provided', () => {
    const mockApps = [
      {
        id: 100,
        startDate: mockDayInTimeline[0],
        endDate: mockDayInTimeline[0] + 3600000,
        employeeId: 1,
        EventId: 99,
        top: 0,
        type: 'chantier',
        description: 'Test',
      }
    ] as any;

    // 1. On récupère "container" depuis le render
    const { container } = render(<EmployeeRow {...defaultProps} appointments={mockApps} />);
    
    // 2. On cherche l'élément par sa classe CSS (visible dans vos logs d'erreur)
    // Le vrai composant a la classe "appointment-item"
    const appointment = container.querySelector('.appointment-item');
    
    expect(appointment).toBeInTheDocument();
  });

  it('passes style prop correctly', () => {
    const style = { marginTop: '10px' };
    render(<EmployeeRow {...defaultProps} style={style} />);
    const row = screen.getByRole('row');
    expect(row).toHaveStyle({ marginTop: '10px' });
  });
});