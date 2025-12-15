import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentItem } from '@/app/calendrier/components';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Appointment, Item } from '@/app/calendrier/types';

// Mock des props
const mockAppointment: Appointment & { top: number } = {
  id: 1,
  startDate: new Date(2023, 10, 15, 8, 0),
  endDate: new Date(2023, 10, 15, 12, 0),
  employeeId: 1,
  tag: {    id:0, name: 'Urgent' },
  description: '',
  type: 'chantier',
  EventId: 1,
  top: 0
};

const mockEvent: Item = {
  id: 1,
  label: 'Chantier A',
  color: '#000000',
  borderColor: '#000000',
  textColor: '#ffffff',
  type: 'autre',
  verrou: false,
  actif: true,
  code: 'CHANTIER_A',
};

const renderComponent = (props = {}) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      <AppointmentItem
        appointment={mockAppointment}
        isFullDay={false}
        isMobile={false}
        event={mockEvent}
        chargeeAffaire="Jean Dupont"
        {...props}
      />
    </DndProvider>
  );
};

describe('AppointmentItem', () => {
  it('renders the appointment label', () => {
    renderComponent();
    expect(screen.getByText('Chantier A')).toBeInTheDocument();
  });

  it('renders the chargee d\'affaire', () => {
    renderComponent();
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('renders the tag when present', () => {
    renderComponent();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    renderComponent({ onClick: handleClick });
    
    fireEvent.click(screen.getByText('Chantier A'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
