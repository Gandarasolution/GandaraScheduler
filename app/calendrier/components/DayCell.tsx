"use client";
import React, {memo}from 'react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import IntervalCell from './IntervalCell';
import { Appointment, HalfDayInterval } from '../types';
import Holidays from 'date-holidays';
const hd = new Holidays('FR'); // 'FR' pour la France
const holidays = hd.getHolidays(new Date().getFullYear());

/**
 * Props du composant DayCell
 * Représente une cellule de jour pour un employé (ou une équipe) dans la grille du calendrier.
 */
interface DayCellProps {
  day: Date;
  employeeId: number;
  appointments: Appointment[];
  intervals: HalfDayInterval[];
  isCellActive?: boolean; // Pour gérer l'état actif de la cellule si nécessaire
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon") => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
  createAppointment?: (title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => void;
  isWeekend: boolean; // Pour appliquer des styles de week-end si besoin
}

/**
 * Composant DayCell
 * Affiche une cellule de jour, divisée en intervalles (matin/après-midi), pour un employé donné.
 * Gère l'affichage des rendez-vous, la détection des jours fériés/week-ends, et les interactions.
 */
const DayCell: React.FC<DayCellProps> = ({
  day,
  employeeId,
  appointments = [],
  intervals = [],
  isCellActive = true,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  createAppointment,
  isWeekend,
}) => {
  // Détermine si le jour est férié (en France)
  function isHoliday(day: Date, holidays: { date: string }[]) {
    const dayStr = format(day, 'yyyy-MM-dd');
    return holidays.some(h => h.date.startsWith(dayStr));
  }

  // Calcul du style de la cellule selon férié/week-end/jour normal
  const isFerie = isHoliday(day, holidays);
  const cellClasses = `flex flex-row border-gray-200 ${
    isFerie ? 'bg-red-100' : isWeekend ? 'bg-sky-50' : 'bg-white'
  }`;

  return (
    <div 
      className={cellClasses + ' snap-center'}
      id={format(day, 'yyyy-MM-dd')}
    >
      {/* Le numéro du jour est maintenant géré par l'en-tête global dans CalendarGrid */}
      {intervals.map((interval) => {
        // Calcule le début et la fin de l'intervalle (matin/après-midi)
        const intervalStart = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.startHour), 0), 0), 0);
        const intervalEnd = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.endHour), 0), 0), 0);

        // Filtre les rendez-vous qui commencent dans cet intervalle
        const intervalAppointments = appointments.filter((app) =>
          app.startDate >= intervalStart && app.startDate < intervalEnd
        );

        // Affiche la cellule d'intervalle (matin/après-midi)
        return (
          <IntervalCell
            key={`${format(day, 'yyyy-MM-dd')}-${interval.name}-${employeeId}`}
            date={day}
            employeeId={employeeId}
            intervalName={interval.name}
            intervalStart={intervalStart}
            intervalEnd={intervalEnd}
            appointments={intervalAppointments}
            onAppointmentMoved={onAppointmentMoved}
            onCellDoubleClick={() => onCellDoubleClick(intervalStart, employeeId, interval.name)}
            onAppointmentClick={onAppointmentClick}
            onExternalDragDrop={onExternalDragDrop}
            isCellActive={isCellActive}
            isWeekend={isWeekend}
            isHoliday={isHoliday}
            isFerie={isFerie}
            holidays={holidays}
            createAppointment={createAppointment}
          />
        );
      })}
    </div>
  );
};

export default memo(DayCell);