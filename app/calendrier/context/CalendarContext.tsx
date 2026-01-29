import React, { createContext, useContext } from 'react';
import { Appointment, Employee, Groupe, CalendarConfig, Item, HalfDayInterval } from '../types';

export interface CalendarContextType {
  employees: Employee[];
  appointmentsWithTop: (Appointment & { top: number; _dayKey?: number })[];
  appointmentsDefault: Appointment[];
  employeeHeights: { employeeId: number; height: number; dayKey?: number }[];
  dayInTimeline: number[];
  initialTeams: Groupe[];
  calendarConfig: CalendarConfig;
  availableConfigs: CalendarConfig[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  events: Item[];
  nonWorkingDates: number[];
  isDisplayWeekend: boolean;
  
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  columnEmployeeRef: React.RefObject<HTMLDivElement | null>;
  tableRef: React.RefObject<HTMLDivElement | null>;
  
  hoverColumnLeft: number | null;
  
  onCalendarConfigChange: (config: CalendarConfig) => void;
  handleScrollY: (e: React.UIEvent<HTMLDivElement>) => void;
  handleMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
  handleMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
  updateHighlightedEmployeeRow: (employeeId: number | null) => void;
  
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right', saveToHistory?: boolean, newPriority?: number) => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  
  onLoadAppointmentsInRange: (startDate: number, endDate: number) => Promise<boolean>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};

export const CalendarProvider: React.FC<CalendarContextType & { children: React.ReactNode }> = ({
  children,
  ...props
}) => {
  return (
    <CalendarContext.Provider value={props}>
      {children}
    </CalendarContext.Provider>
  );
};
