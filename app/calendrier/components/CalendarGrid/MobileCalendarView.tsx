/**
 * @fileoverview Composant pour l'affichage mobile du calendrier
 * Vue verticale avec un employé affiché par jour
 * 
 * @component MobileCalendarView
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React from 'react';
import { format, isWeekend, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import DayCell from '../DayCell';
import { Appointment, Employee, HalfDayInterval, Evenement } from '../../types';
import { CELL_HEIGHT } from '../../utils/constants';
import { AppointmentWithPosition } from '../../hooks/useAppointmentPositioning';

interface MobileCalendarViewProps {
  displayEmployee: Employee;
  dayInTimeline: Date[];
  appointmentsWithTop: AppointmentWithPosition[];
  employeeHeights: Array<{employeeId: number; height: number; dayKey?: number}>;
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Date[];
  events: Evenement[];
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  displayEmployee,
  dayInTimeline,
  appointmentsWithTop,
  employeeHeights,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  events,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu
}) => {
  return (
    <div className="relative h-full w-full poppins">
      {/* En-tête employé fixe */}
      <div className="mobile-employee-header sticky top-0 z-30 flex items-center justify-center">
        {displayEmployee.avatar && (
          <img
            src={displayEmployee.avatar}
            alt={displayEmployee.name}
            className="employee-avatar w-14 h-14 rounded-full mr-4"
            onError={(e) => { 
              e.currentTarget.src = `https://placehold.co/56x56/cccccc/333333?text=${displayEmployee.name.charAt(0)}`; 
            }}
          />
        )}
        <span className="employee-name">{displayEmployee.name}</span>
      </div>

      {/* Zone de contenu principal - liste verticale des jours */}
      <div className="flex flex-col w-full">
        {dayInTimeline.map((day) => {
          const dayStart = new Date(day);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
            app.employeeId === displayEmployee.id &&
            app._dayKey === dayStart.getTime()
          );

          const rowHeight = employeeHeights.find(
            e => e.employeeId === displayEmployee.id && e.dayKey === dayStart.getTime()
          )?.height ?? CELL_HEIGHT;

          return (
            <div 
              key={`day-section-${format(day, 'yyyy-MM-dd')}`} 
              className="border-b border-gray-200"
            >
              {/* En-tête de date pour chaque jour */}
              <div
                className={`
                  mobile-day-header flex flex-col items-center justify-center
                  ${isWeekend(day) ? 'weekend' : ''}
                  ${isSameDay(day, new Date()) ? 'today' : ''}
                `}
              >
                <span className="day-title">
                  {format(day, 'EEEE d MMMM', { locale: fr })}
                </span>
              </div>

              {/* DayCell pour l'employé unique */}
              <div className={`mobile-day-cell ${isWeekend(day) ? 'weekend' : ''}`}>
                <DayCell
                  day={day}
                  employee={displayEmployee}
                  appointments={dayEmployeeAppointments}
                  intervals={HALF_DAY_INTERVALS}
                  isFullDay={isFullDay}
                  nonWorkingDates={nonWorkingDates}
                  isMobile={true}
                  events={events}
                  RowHeight={dayEmployeeAppointments.length > 0 ? rowHeight : CELL_HEIGHT}
                  onAppointmentMoved={onAppointmentMoved}
                  onCellDoubleClick={onCellDoubleClick}
                  onAppointmentClick={onAppointmentDoubleClick}
                  onExternalDragDrop={onExternalDragDrop}
                  isWeekend={isWeekend(day)}
                  handleContextMenu={handleContextMenu}
                  isCellActive={true}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCalendarView;