/**
 * @fileoverview Composant CalendarRows - Lignes virtualisées du calendrier
 * 
 * Rend les lignes visibles du calendrier (groupes et employés)
 * Utilisé par DesktopCalendarGrid avec virtualisation
 * 
 * @component
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React, { memo } from 'react';
import { Appointment, Item } from '../../types';
import EmployeeRow from './EmployeeRow';
import GroupRow from './GroupRow';

interface CalendarRowsProps {
  mainScrollRef:React.RefObject<HTMLDivElement>;
  visibleRows:{
    start: number;
    end: number;
    index: number;
    domId: string;
    type: "group" | "employee";
    id: string | number;
    uniqueKey: string;
    data: any;
    height: number;
  }[];
  dayInTimeline: number[];
  todayIndex: number;
  isFullDay: boolean;
  isGrabbing: boolean;
  appointmentsByEmployee: Record<number, Appointment[]>;
  EMPTY_APPOINTMENTS: Appointment[];
  events: Record<number, Item>;
  visibleWindowStart: number;
  visibleWindowEnd: number;
  isDisplayWeekend: boolean;
  onAppointmentMoved: (data: { id: number; newStartDate: number; newEndDate: number; newEmployeeId: number; idRessource: number; resizeDirection?: 'left' | 'right' }, saveToHistory?: boolean, newPriority?: number) => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  onOverlapExpansionChange: (employeeId: number, expandedOverlapCount: number) => void;
  onHiddenOverlapCountChange: (employeeId: number, hiddenOverlapCount: number) => void;
  collapseTriggers: Record<number, number>;
  expandTriggers: Record<number, number>;
  tagPlacement: 'hover' | 'fixed';
  onLockedError: (message: string) => void;
}

/**
 * Composant qui rend les lignes visibles du calendrier
 * Utilisé avec virtualisation pour optimiser les performances
 */
const CalendarRows: React.FC<CalendarRowsProps> = memo(({
  mainScrollRef,
  visibleRows,
  dayInTimeline,
  todayIndex,
  isFullDay,
  isGrabbing,
  appointmentsByEmployee,
  EMPTY_APPOINTMENTS,
  events,
  visibleWindowStart,
  visibleWindowEnd,
  isDisplayWeekend,
  onAppointmentMoved,
  onAppointmentDoubleClick,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  onOverlapExpansionChange,
  onHiddenOverlapCountChange,
  collapseTriggers,
  expandTriggers,
  tagPlacement,
  onLockedError
}) => {
  ////console.log('Rendering CalendarRows with visibleRows:', visibleRows);
  return (
    <>
      {visibleRows.map((row) => {
               
        const commonProps = {
          style: {
            width: '100%',
            position: 'absolute' as const,
            top: row.start,
            height: row.height,
            left: 0,
            right: 0,
          },
        };
       

        return row.type === 'group' ? (
          <GroupRow
            key={row.uniqueKey}
            {...commonProps}
            itemId={row.id}
            dayInTimeline={dayInTimeline}
            todayIndex={todayIndex}
            isFullDay={isFullDay}
          />
        ) : (
          <EmployeeRow
            key={row.uniqueKey}
            mainScrollRef={mainScrollRef}
            {...commonProps}
            employee={row.data}
            dayInTimeline={dayInTimeline}
            appointments={isGrabbing ? EMPTY_APPOINTMENTS : (appointmentsByEmployee[row.id as number] || EMPTY_APPOINTMENTS)}
            rowHeight={row.height}
            isFullDay={isFullDay}
            events={events}
            visibleWindowStart={visibleWindowStart}
            visibleWindowEnd={visibleWindowEnd}
            isDisplayWeekend={isDisplayWeekend}
            onAppointmentMoved={onAppointmentMoved}
            onAppointmentDoubleClick={onAppointmentDoubleClick}
            handleContextMenu={handleContextMenu}
            todayIndex={todayIndex}
            selectedCell={selectedCell}
            selectedAppointmentId={selectedAppointmentId}
            onSelectCell={onSelectCell}
            onSelectAppointment={onSelectAppointment}
            onOverlapExpansionChange={onOverlapExpansionChange}
            onHiddenOverlapCountChange={onHiddenOverlapCountChange}
            collapseTrigger={collapseTriggers[row.id as number]}
            expandTrigger={expandTriggers[row.id as number]}
            tagPlacement={tagPlacement}
            onLockedError={onLockedError}
          />
        );
      })}
    </>
  );
});

CalendarRows.displayName = 'CalendarRows';

export default CalendarRows;
