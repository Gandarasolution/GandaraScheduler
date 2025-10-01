/**
 * @fileoverview Composant pour l'affichage desktop du calendrier
 * Vue en grille avec colonne employés à gauche et timeline à droite
 * 
 * @component DesktopCalendarView
 * @author Gandara Solutions
 * @version 1.0.0
 */

import React, { useRef, useCallback } from 'react';
import EmployeeColumn from './EmployeeColumn';
import CalendarTable from './CalendarTable';
import TimelineFrame from '../TimelineFrame';
import { Appointment, Employee, HalfDayInterval, Evenement, CalendarConfig, Groupe } from '../../types';
import { AppointmentWithPosition } from '../../hooks/useAppointmentPositioning';

interface DesktopCalendarViewProps {
  dimensionItems: Array<{id: string | number; name: string}>;
  employeesByDimension: Record<string | number, Employee[]>;
  openItems: (string | number)[];
  toggleItem: (itemId: string | number) => void;
  appointmentsWithTop: AppointmentWithPosition[];
  employeeHeights: Array<{employeeId: number; height: number; dayKey?: number}>;
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Date[];
  includeWeekend: boolean;
  events: Evenement[];
  calendarConfig: CalendarConfig;
  availableConfigs: CalendarConfig[];
  onCalendarConfigChange: (config: CalendarConfig) => void;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

const DesktopCalendarView: React.FC<DesktopCalendarViewProps> = ({
  dimensionItems,
  employeesByDimension,
  openItems,
  toggleItem,
  appointmentsWithTop,
  employeeHeights,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  includeWeekend,
  events,
  calendarConfig,
  availableConfigs,
  onCalendarConfigChange,
  mainScrollRef,
  handleScroll,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu
}) => {
  const columnEmployeeRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleScrollY = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!mainScrollRef.current || !columnEmployeeRef.current) return;

    if (isSyncingScroll.current) {
      isSyncingScroll.current = false;
      return;
    }

    if (mainScrollRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      columnEmployeeRef.current.scrollTop = mainScrollRef.current.scrollTop;
    } else if (columnEmployeeRef.current === e.currentTarget) {
      isSyncingScroll.current = true;
      mainScrollRef.current.scrollTop = columnEmployeeRef.current.scrollTop;
    }
  }, [mainScrollRef]);

  return (
    <div className="relative flex h-full flex-row calendar-grid">
      {/* Colonne employés sticky à gauche */}
      <EmployeeColumn
        dimensionItems={dimensionItems}
        employeesByDimension={employeesByDimension}
        openItems={openItems}
        toggleItem={toggleItem}
        employeeHeights={employeeHeights}
        calendarConfig={calendarConfig}
        availableConfigs={availableConfigs}
        onCalendarConfigChange={onCalendarConfigChange}
        columnEmployeeRef={columnEmployeeRef}
        onScroll={handleScrollY}
      />

      {/* Timeline principale avec table du calendrier */}
      <TimelineFrame
        dayInTimeline={dayInTimeline}
        mainScrollRef={mainScrollRef}
        onScroll={(e) => {
          handleScroll();
          handleScrollY(e);              
        }}
        showTodayLine={true}
        todayLineColor="#ffcdde"
      >
        <CalendarTable
          dayInTimeline={dayInTimeline}
          dimensionItems={dimensionItems}
          employeesByDimension={employeesByDimension}
          openItems={openItems}
          appointmentsWithTop={appointmentsWithTop}
          employeeHeights={employeeHeights}
          HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
          isFullDay={isFullDay}
          nonWorkingDates={nonWorkingDates}
          includeWeekend={includeWeekend}
          events={events}
          onAppointmentMoved={onAppointmentMoved}
          onCellDoubleClick={onCellDoubleClick}
          onAppointmentDoubleClick={onAppointmentDoubleClick}
          onExternalDragDrop={onExternalDragDrop}
          handleContextMenu={handleContextMenu}
        />
      </TimelineFrame>
    </div>
  );
};

export default DesktopCalendarView;