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
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Appointment, HalfDayInterval, Equipe, CalendarConfig, Item, User, PoleActivite } from '../../types';
import { 
  useCalendarInteractions
 } from '@/app/calendrier/hooks';
import { DesktopCalendarGrid, MobileCalendar } from '@/app/calendrier/components';
import { CELL_WIDTH } from '../../utils/constants';

interface CalendarGridProps {
  employees: User[];
  appointments: Appointment[];
  events: Record<number, Item>;
  initialTeams: Record<number, Equipe>;
  poleActivites: Record<number, PoleActivite>;
  user: User;
  dayInTimeline: number[];
  HALF_DAY_INTERVALS: HalfDayInterval[];
  isFullDay: boolean;
  nonWorkingDates: Record<string, number>;
  isMobile: boolean;
  isDisplayWeekend: boolean;
  tagPlacement?: 'hover' | 'fixed';
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  calendarConfig: CalendarConfig | null;
  onCalendarConfigChange: (config: CalendarConfig) => void;
  availableConfigs: CalendarConfig[];
  onAppointmentMoved: (data: { id: number; newStartDate: number; newEndDate: number; newEmployeeId: number; idRessource: number; resizeDirection?: 'left' | 'right' }, saveToHistory?: boolean, newPriority?: number) => void;
  onCellDoubleClick: (date: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (item: Item, date: number, intervalName: 'morning' | 'afternoon', employeeId: number, priority: number) => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: number }) => void;
  selectedCell: { employeeId: number; date: number } | null;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment: (appointment: Appointment | null) => void;
  onLoadAppointmentsInRange: (startDate: number, endDate: number) => Promise<boolean>;
  mouseUpAfterScroll: () => void;
  onAddAppointment?: (appointment: Appointment, item: Item, includeAllNonWorkingDays: boolean, type: 'create' | 'update') => Promise<{success: boolean}>;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  initialTeams,
  poleActivites,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  events,
  user,
  nonWorkingDates,
  isMobile,
  isDisplayWeekend,
  tagPlacement = 'hover',
  mainScrollRef,
  calendarConfig,
  onCalendarConfigChange,
  availableConfigs,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
  onLoadAppointmentsInRange,
  mouseUpAfterScroll,
  onAddAppointment,
}) => {

  
  const columnEmployeeRef = useRef<HTMLDivElement>(null);
  const [hoverColumnLeft, setHoverColumnLeft] = useState<number | null>(null);
  const hasAutoScrolled = useRef(false);
  


  const handleHoverMove = useCallback(({ colLeft }: { colLeft: number }) => {
    setHoverColumnLeft(colLeft >= 0 ? colLeft : null);
  }, []);

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
    onHoverMove: handleHoverMove
  });

 
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

    scroller.scrollLeft = Math.max(0, todayIdx * CELL_WIDTH);
    hasAutoScrolled.current = true;
  }, [dayInTimeline, isMobile, mainScrollRef]);
    

  if (isMobile) {
    return (
      <MobileCalendar
        employees={employees}
        teams={initialTeams}
        appointments={appointments}
        user={user}
        items={Object.values(events)}
        nonWorkingDates={nonWorkingDates}
        onAddAppointment={onAddAppointment}
      />
    );
  }

  return (
      <DesktopCalendarGrid 
        employees={employees}
        appointments={appointments}
        dayInTimeline={dayInTimeline}
        initialTeams={initialTeams}
        poleActivites={poleActivites}
        calendarConfig={calendarConfig}
        onCalendarConfigChange={onCalendarConfigChange}
        availableConfigs={availableConfigs}
        HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
        isFullDay={isFullDay}
        events={events}
        nonWorkingDates={nonWorkingDates}
        isDisplayWeekend={isDisplayWeekend}
        tagPlacement={tagPlacement}
        mainScrollRef={mainScrollRef}
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
        onLoadAppointmentsInRange={onLoadAppointmentsInRange}
        mouseUpAfterScroll={mouseUpAfterScroll}
      />
  );
};

export default memo(CalendarGrid);
