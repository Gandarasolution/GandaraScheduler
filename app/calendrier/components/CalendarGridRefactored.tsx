/**
 * @fileoverview Composant CalendarGrid refactorisé - Version optimisée et modulaire
 * 
 * Cette version refactorisée sépare les responsabilités en plusieurs modules :
 * - Hooks personnalisés pour la logique métier
 * - Composants séparés pour mobile/desktop
 * - Utilitaires réutilisables
 * - Calculs optimisés avec mémoisation
 * 
 * @component CalendarGrid
 * @author Gandara Solutions
 * @version 2.0.0 (Refactorisé)
 */

"use client";
import React, { memo } from 'react';
import MobileCalendarView from './CalendarGrid/MobileCalendarView';
import DesktopCalendarView from './CalendarGrid/DesktopCalendarView';
import { useEmployeeHeights } from '../hooks/useEmployeeHeights';
import { useAppointmentPositioning } from '../hooks/useAppointmentPositioning';
import { useDimensionManagement } from '../hooks/useDimensionManagement';
import { Appointment, Employee, HalfDayInterval, Groupe, CalendarConfig, Evenement } from '../types';

/**
 * Interface des propriétés du composant CalendarGrid refactorisé
 */
interface CalendarGridProps {
  /** Liste complète des employés */
  employees: Employee[];
  /** Liste de tous les rendez-vous */
  appointments: Appointment[];
  /** Types d'événements disponibles */
  events: Evenement[];
  /** Groupes/équipes disponibles */
  initialTeams: Groupe[];
  /** Dates à afficher dans la timeline */
  dayInTimeline: Date[];
  /** Configuration des créneaux horaires */
  HALF_DAY_INTERVALS: HalfDayInterval[];
  /** Mode d'affichage journée complète */
  isFullDay: boolean;
  /** Dates non-travaillées (week-ends, fériés) */
  nonWorkingDates: Date[];
  /** Interface mobile activée */
  isMobile: boolean;
  /** Inclure les week-ends dans l'affichage mobile */
  includeWeekend: boolean;
  /** Référence pour le scroll principal */
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  /** Gestionnaire d'événement scroll */
  handleScroll: () => void;
  /** Configuration actuelle du calendrier */
  calendarConfig: CalendarConfig;
  /** Callback de modification de configuration */
  onCalendarConfigChange: (config: CalendarConfig) => void;
  /** Configurations disponibles */
  availableConfigs: CalendarConfig[];
  /** Callbacks d'interaction */
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

/**
 * Composant CalendarGrid refactorisé
 * 
 * Avantages de cette version :
 * - 🔧 Modularité : Séparation claire des responsabilités
 * - ⚡ Performance : Calculs optimisés avec hooks mémorisés
 * - 🧪 Testabilité : Logic isolée dans des hooks testables
 * - 📱 Maintenabilité : Composants plus petits et focalisés
 * - 🔄 Réutilisabilité : Hooks et utilitaires réutilisables
 */
const CalendarGrid: React.FC<CalendarGridProps> = ({
  employees,
  appointments,
  events,
  initialTeams,
  dayInTimeline,
  HALF_DAY_INTERVALS,
  isFullDay,
  nonWorkingDates,
  isMobile,
  includeWeekend,
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
}) => {
  // 🎣 Hooks personnalisés pour la logique métier
  const {
    dimensionItems,
    filteredEmployees,
    employeesByDimension,
    openItems,
    toggleItem
  } = useDimensionManagement(employees, calendarConfig, initialTeams);

  const employeeHeights = useEmployeeHeights(
    filteredEmployees, 
    appointments, 
    dayInTimeline, 
    isMobile
  );

  const { appointmentsWithTop } = useAppointmentPositioning(
    filteredEmployees,
    appointments,
    dayInTimeline,
    isMobile
  );

  // 📱 Rendu conditionnel optimisé
  if (isMobile) {
    const displayEmployee = employees[0]; // Premier employé pour la demo mobile
    
    return (
      <MobileCalendarView
        displayEmployee={displayEmployee}
        dayInTimeline={dayInTimeline}
        appointmentsWithTop={appointmentsWithTop}
        employeeHeights={employeeHeights}
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

  // 🖥️ Vue desktop avec composants modulaires
  return (
    <DesktopCalendarView
      dimensionItems={dimensionItems}
      employeesByDimension={employeesByDimension}
      openItems={openItems}
      toggleItem={toggleItem}
      appointmentsWithTop={appointmentsWithTop}
      employeeHeights={employeeHeights}
      dayInTimeline={dayInTimeline}
      HALF_DAY_INTERVALS={HALF_DAY_INTERVALS}
      isFullDay={isFullDay}
      nonWorkingDates={nonWorkingDates}
      includeWeekend={includeWeekend}
      events={events}
      calendarConfig={calendarConfig}
      availableConfigs={availableConfigs}
      onCalendarConfigChange={onCalendarConfigChange}
      mainScrollRef={mainScrollRef}
      handleScroll={handleScroll}
      onAppointmentMoved={onAppointmentMoved}
      onCellDoubleClick={onCellDoubleClick}
      onAppointmentDoubleClick={onAppointmentDoubleClick}
      onExternalDragDrop={onExternalDragDrop}
      handleContextMenu={handleContextMenu}
    />
  );
};

// 🚀 Mémorisation optimisée avec comparaison précise des props
export default memo(CalendarGrid, (prevProps, nextProps) => {
  // Comparaisons optimisées pour éviter les re-rendus inutiles
  const propsToCompare: (keyof CalendarGridProps)[] = [
    'employees', 'appointments', 'events', 'initialTeams', 
    'dayInTimeline', 'HALF_DAY_INTERVALS', 'isFullDay', 
    'nonWorkingDates', 'isMobile', 'includeWeekend'
  ];

  return propsToCompare.every(prop => 
    prevProps[prop] === nextProps[prop]
  ) && prevProps.calendarConfig.id === nextProps.calendarConfig.id;
});