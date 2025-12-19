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
import React, { memo, useEffect, useRef, useState } from 'react';
import { Appointment, Employee, HalfDayInterval, Groupe, CalendarConfig, Item } from '../../types';
import { useCalendarLayout } from '../../hooks/useCalendarLayout';
import { useCalendarInteractions } from '../../hooks/useCalendarInteractions';
import MobileCalendarGrid from './MobileCalendarGrid';
import DesktopCalendarGrid from './DesktopCalendarGrid';
import { CELL_WIDTH } from '../../utils/constants';

interface CalendarGridProps {
  employees: Employee[];
  appointments: Appointment[];
  events: Item[];
  initialTeams: Groupe[];
  dayInTimeline: number[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: number[];
  isMobile: boolean;
  isDisplayWeekend: boolean;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  calendarConfig: CalendarConfig;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  onAppointmentMoved: (id: number, newStartDate: number, newEndDate: number, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  onScrollElementMounted?: () => void; 
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
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
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
}) => {

  const columnEmployeeRef = useRef<HTMLDivElement>(null);
  const [hoverColumnLeft, setHoverColumnLeft] = useState<number | null>(null);
  const hasAutoScrolled = useRef(false);

  // Use custom hooks for logic
  const { employeeHeights, appointmentsWithTop } = useCalendarLayout({
    employees,
    appointments,
    dayInTimeline,
    isMobile
  });

  const { 
    tableRef, 
    handleMouseMove, 
    handleMouseOut, 
    handleScrollY,
    updateHighlightedEmployeeRow 
  } = useCalendarInteractions({
    dayInTimeline,
    mainScrollRef,
    columnEmployeeRef,
    onHoverMove: ({ colLeft }) => {
      setHoverColumnLeft(colLeft >= 0 ? colLeft : null);    }
  });

  // Notify parent when mounted
  useEffect(() => {
    if (mainScrollRef?.current && onScrollElementMounted) {
      onScrollElementMounted();
    }
  }, [mainScrollRef, onScrollElementMounted]);

  // Scroll horizontally to today on initial render (desktop only)
  useEffect(() => {
    if (isMobile) return;
    if (hasAutoScrolled.current) return;
    const scroller = mainScrollRef.current;
    if (!scroller) return;

    const todayIdx = dayInTimeline.findIndex((d) => {
      const now = new Date();
      return new Date(d).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0);
    });
    if (todayIdx < 0) return;

    scroller.scrollLeft = Math.max(0, todayIdx * CELL_WIDTH - scroller.clientWidth / 2 + CELL_WIDTH / 2);
    hasAutoScrolled.current = true;
  }, [dayInTimeline, isMobile, mainScrollRef]);

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
        selectedCell={selectedCell}
        selectedAppointmentId={selectedAppointmentId}
        onSelectCell={onSelectCell}
        onSelectAppointment={onSelectAppointment}
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
      handleMouseOver={handleMouseMove}
      handleMouseOut={handleMouseOut}
      onAppointmentMoved={onAppointmentMoved}
      onCellDoubleClick={onCellDoubleClick}
      onAppointmentDoubleClick={onAppointmentDoubleClick}
      onExternalDragDrop={onExternalDragDrop}
      handleContextMenu={handleContextMenu}
      updateHighlightedEmployeeRow={updateHighlightedEmployeeRow}
      selectedCell={selectedCell}
      selectedAppointmentId={selectedAppointmentId}
      onSelectCell={onSelectCell}
      onSelectAppointment={onSelectAppointment}
      hoverColumnLeft={hoverColumnLeft}
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
    prevProps.isDisplayWeekend === nextProps.isDisplayWeekend &&
    prevProps.selectedCell === nextProps.selectedCell &&
    prevProps.selectedAppointmentId === nextProps.selectedAppointmentId
  );
});
