/**
 * @fileoverview Composant pour la table principale du calendrier en mode desktop
 * Gère l'affichage en grille avec gestion des interactions mouse
 * 
 * @component CalendarTable
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React, { useCallback } from 'react';
import { format, isWeekend, isSameDay } from 'date-fns';
import DayCell from '../DayCell';
import { Appointment, Employee, HalfDayInterval, Evenement } from '../../types';
import { CELL_WIDTH, CELL_HEIGHT, MARGIN_BETWEEN_TEAMS } from '../../utils/constants';
import { AppointmentWithPosition } from '../../hooks/useAppointmentPositioning';

interface CalendarTableProps {
  dayInTimeline: Date[];
  dimensionItems: Array<{id: string | number; name: string}>;
  employeesByDimension: Record<string | number, Employee[]>;
  openItems: (string | number)[];
  appointmentsWithTop: AppointmentWithPosition[];
  employeeHeights: Array<{employeeId: number; height: number; dayKey?: number}>;
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Date[];
  includeWeekend: boolean;
  events: Evenement[];
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

const CalendarTable: React.FC<CalendarTableProps> = ({
  dayInTimeline,
  dimensionItems,
  employeesByDimension,
  openItems,
  appointmentsWithTop,
  employeeHeights,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  includeWeekend,
  events,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu
}) => {
  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;
    let cell = target.closest('.calendar-cell') as HTMLElement;
    
    if (cell && cell.classList.contains('calendar-cell')) {
      // Nettoyer les anciennes classes hover
      const existingHoverCells = document.querySelectorAll('.hover-column');
      const existingHoverEmployees = document.querySelectorAll('.hover-employee');
      existingHoverCells.forEach(cell => cell.classList.remove('hover-column'));
      existingHoverEmployees.forEach(emp => emp.classList.remove('hover-employee'));
      
      // Calculer la colonne basée sur la position X de la souris
      const table = e.currentTarget as HTMLTableElement;
      if (table) {
        const tableRect = table.getBoundingClientRect();
        const mouseX = e.clientX - tableRect.left;
        const colIndex = Math.floor(mouseX / CELL_WIDTH);
        
        // Vérifier que l'index de colonne est valide
        if (colIndex >= 0 && colIndex < dayInTimeline.length) {
          const rows = table.querySelectorAll('.calendar-row');
          rows.forEach(row => {
            const cellInCol = row.children[colIndex] as HTMLElement;
            if (cellInCol) {
              cellInCol.classList.add('hover-column');
            }
          });
        }
        
        // Trouver la ligne parent et l'employé correspondant
        const row = cell.closest('.calendar-row[data-employee-id]') as HTMLElement;
        if (row) {
          const employeeId = row.getAttribute('data-employee-id');
          if (employeeId) {
            const employeeElement = document.querySelector(`.employee-row-item[data-employee-id="${employeeId}"]`) as HTMLElement;
            if (employeeElement) {
              employeeElement.classList.add('hover-employee');
            }
          }
        }
      }
    }
  }, [dayInTimeline]);

  const handleMouseOut = useCallback((e: React.MouseEvent<HTMLTableElement>) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.calendar-cell') as HTMLElement;
    
    if (cell && cell.classList.contains('calendar-cell')) {
      const cells = document.querySelectorAll('.hover-column');
      const employees = document.querySelectorAll('.hover-employee');
      cells.forEach(cell => cell.classList.remove('hover-column'));
      employees.forEach(emp => emp.classList.remove('hover-employee'));
    }
  }, []);

  return (
    <table 
      className="calendar-table bg-white relative"
      style={{
        width: `${dayInTimeline.length * CELL_WIDTH}px`,
        tableLayout: 'fixed',
        borderCollapse: 'collapse'
      }}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <tbody>
        {dimensionItems.map((item, idx) => {
          const isOpen = openItems.includes(item.id);
          const itemEmployees = employeesByDimension[item.id] || [];
          
          if (itemEmployees.length === 0) return null;
          
          const rows = [];
          
          // Ligne inactive pour la dimension
          rows.push(
            <tr key={`inactive-row-${item.id}`} className="calendar-row inactive-row">
              {dayInTimeline.map((day) => (
                <td 
                  key={`inactive-${item.id}-${format(day, 'yyyy-MM-dd')}`}
                  className="calendar-cell p-0"
                  style={{ 
                    width: `${CELL_WIDTH}px`,
                    height: `${idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}px`
                  }}
                >
                  <DayCell
                    day={day}
                    employee={{ id: 0, name: 'Inactive' }}
                    appointments={[]}
                    intervals={HALF_DAY_INTERVALS}
                    isFullDay={isFullDay}
                    RowHeight={idx === 0 ? CELL_HEIGHT : CELL_HEIGHT + MARGIN_BETWEEN_TEAMS + 10}
                    isMobile={false}
                    events={events}
                    nonWorkingDates={nonWorkingDates}
                    includeWeekend={includeWeekend}
                    onAppointmentMoved={onAppointmentMoved}
                    onCellDoubleClick={onCellDoubleClick}
                    onAppointmentClick={onAppointmentDoubleClick}
                    onExternalDragDrop={onExternalDragDrop}
                    isWeekend={isWeekend(day)}
                    handleContextMenu={handleContextMenu}
                    isCellActive={false}
                  />
                </td>
              ))}
            </tr>
          );
          
          // Lignes des employés si la dimension est ouverte
          if (isOpen) {
            itemEmployees.forEach((employee) => {
              const employeeRowHeight = employeeHeights.find(e => e.employeeId === employee.id)?.height ?? CELL_HEIGHT;
              
              rows.push(
                <tr key={`employee-row-${employee.id}`} className="calendar-row employee-row" data-employee-id={employee.id}>
                  {dayInTimeline.map((day) => {
                    const dayEmployeeAppointments = appointmentsWithTop.filter((app) =>
                      isSameDay(app.startDate, day) && app.employeeId === employee.id
                    );
                    
                    return (
                      <td 
                        key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
                        className="calendar-cell p-0"
                        style={{ 
                          width: `${CELL_WIDTH}px`,
                          height: `${employeeRowHeight}px`
                        }}
                      >
                        <DayCell
                          day={day}
                          employee={{ id: employee.id, name: employee.name }}
                          appointments={dayEmployeeAppointments}
                          intervals={HALF_DAY_INTERVALS}
                          isFullDay={isFullDay}
                          RowHeight={employeeRowHeight}
                          isMobile={false}
                          events={events}
                          nonWorkingDates={nonWorkingDates}
                          includeWeekend={includeWeekend}
                          onAppointmentMoved={onAppointmentMoved}
                          onCellDoubleClick={onCellDoubleClick}
                          onAppointmentClick={onAppointmentDoubleClick}
                          onExternalDragDrop={onExternalDragDrop}
                          isWeekend={isWeekend(day)}
                          handleContextMenu={handleContextMenu}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            });
          }
          
          return rows;
        })}
      </tbody>
    </table>
  );
};

export default CalendarTable;