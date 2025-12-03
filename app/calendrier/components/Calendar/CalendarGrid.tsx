/**
 * @fileoverview Composant CalendarGrid - Grille principale du calendrier
 * 
 * Ce composant constitue le cœur de l'interface calendrier. Il gère l'affichage
 * de la grille temporelle avec les employés en lignes et les jours en colonnes.
 * 
 * Fonctionnalités principales :
 * - Affichage en grille avec timeline horizontale
 * - Groupement des employés par équipes ou pôles
 * - Système de filtrage avancé
 * - Drag & Drop des rendez-vous
 * - Scroll synchronisé horizontal/vertical
 * - Mode responsive mobile/desktop
 * - Gestion des week-ends et jours fériés
 * - Menu contextuel et interactions
 * 
 * @component CalendarGrid
 * @author Gandara Solutions
 * @version 2.0.0 (Refactored)
 */

"use client";
import React, { memo, useEffect, useRef } from 'react';
import { Appointment, Employee, HalfDayInterval, Groupe, CalendarConfig, Item } from '../../types';
import { useCalendarLayout } from '../../hooks/useCalendarLayout';
import { useCalendarInteractions } from '../../hooks/useCalendarInteractions';
import MobileCalendarGrid from './MobileCalendarGrid';
import DesktopCalendarGrid from './DesktopCalendarGrid';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  events: Item[];
  initialTeams: Groupe[];
  dayInTimeline: Date[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Date[];
  isMobile: boolean;
  isDisplayWeekend: boolean;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  calendarConfig: CalendarConfig;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
  onScrollElementMounted?: () => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  events,
  nonWorkingDates,
  isMobile,
  isDisplayWeekend,
  mainScrollRef,
  handleScroll,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  onScrollElementMounted,
}) => {

  const columnEmployeeRef = useRef<HTMLDivElement>(null);

  // Use custom hooks for logic
  const { employeeHeights, appointmentsWithTop } = useCalendarLayout({
    employees,
    appointments,
    dayInTimeline,
    isMobile
  });

  const { 
    tableRef, 
    handleMouseOver, 
    handleMouseOut, 
    handleScrollY 
  } = useCalendarInteractions({
    dayInTimeline,
    mainScrollRef,
    columnEmployeeRef
  });

  // Notify parent when mounted
  useEffect(() => {
    if (mainScrollRef?.current && onScrollElementMounted) {
      onScrollElementMounted();
    }
  }, [mainScrollRef, onScrollElementMounted]);

  if (isMobile) {
    return (
      <MobileCalendarGrid
        employees={employees}
        appointmentsWithTop={appointmentsWithTop}
        employeeHeights={employeeHeights as any}
        dayInTimeline={dayInTimeline}
        HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
        isFullDay={isFullDay}
        nonWorkingDates={nonWorkingDates}
        events={events}
        onAppointmentMoved={onAppointmentMoved}
        onCellDoubleClick={onCellDoubleClick}
        onAppointmentDoubleClick={onAppointmentDoubleClick}
        onExternalDragDrop={onExternalDragDrop}
        handleContextMenu={handleContextMenu}
      />
    );
  }

  return (
    <DesktopCalendarGrid
      employees={employees}
      appointmentsWithTop={appointmentsWithTop}
      employeeHeights={employeeHeights as any}
      dayInTimeline={dayInTimeline}
      initialTeams={initialTeams}
      calendarConfig={calendarConfig}
      onCalendarConfigChange={onCalendarConfigChange}
      availableConfigs={availableConfigs}
      HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
      isFullDay={isFullDay}
      events={events}
      nonWorkingDates={nonWorkingDates}
      isDisplayWeekend={isDisplayWeekend}
      mainScrollRef={mainScrollRef}
      handleScroll={handleScroll}
      handleScrollY={handleScrollY}
      columnEmployeeRef={columnEmployeeRef}
      tableRef={tableRef}
      handleMouseOver={handleMouseOver}
      handleMouseOut={handleMouseOut}
      onAppointmentMoved={onAppointmentMoved}
      onCellDoubleClick={onCellDoubleClick}
      onAppointmentDoubleClick={onAppointmentDoubleClick}
      onExternalDragDrop={onExternalDragDrop}
      handleContextMenu={handleContextMenu}
    />
  );
};

export default memo(CalendarGrid, (prevProps, nextProps) => {
  return (
    prevProps.employees === nextProps.employees &&
    prevProps.appointments === nextProps.appointments &&
    prevProps.initialTeams === nextProps.initialTeams &&
    prevProps.dayInTimeline === nextProps.dayInTimeline &&
    prevProps.HALF_DAY_INTERVALS === nextProps.HALF_DAY_INTERVALS &&
    prevProps.isFullDay === nextProps.isFullDay &&
    prevProps.nonWorkingDates === nextProps.nonWorkingDates &&
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.isDisplayWeekend === nextProps.isDisplayWeekend
  );
});
