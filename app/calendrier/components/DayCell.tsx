"use client";
import React, {memo}from 'react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import IntervalCell from './IntervalCell';
import { Appointment, HalfDayInterval } from '../types';
import { isHoliday } from '../utils/dates'; // Assurez-vous d'avoir une fonction isHoliday pour vérifier les jours fériés
import { CELL_HEIGHT } from '../utils/constants';

/**
 * Props du composant DayCell
 * Représente une cellule de jour pour un employé (ou une équipe) dans la grille du calendrier.
 */
interface DayCellProps {
  day: Date;
  employeeId: number;
  appointments: (Appointment & { top: number })[];
  intervals: HalfDayInterval[];
  isCellActive?: boolean; // Pour gérer l'état actif de la cellule si nécessaire
  isWeekend: boolean; // Pour appliquer des styles de week-end si besoin
  isFullDay?: boolean; // Indique si la cellule représente une journée complète
  RowHeight?: number; // Hauteur de la ligne pour l'employé, si nécessaire
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
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
  isWeekend,
  isFullDay,
  RowHeight,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  handleContextMenu,
}) => {
  
  // Calcul du style de la cellule selon férié/week-end/jour normal
  const isFerie = isHoliday(day);
  const cellClasses = `flex flex-row border-gray-200 
    ${isWeekend ? 'bg-sky-50' : isFerie ? 'bg-red-100' : 'bg-white'}`;
    
  return (
    <div 
      className={cellClasses + ' snap-center'}
      id={format(day, 'yyyy-MM-dd')}
      style={{ 
        height: RowHeight ? `${RowHeight}px` : 'auto', // Utilise RowHeight si fourni, sinon auto
        minHeight: CELL_HEIGHT, // Hauteur minimale pour la cellule
      }}
    >
      {/* Le numéro du jour est maintenant géré par l'en-tête global dans CalendarGrid */}
      {intervals.map((interval) => {
        // Calcule le début et la fin de l'intervalle (matin/après-midi)
        const intervalStart = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.startHour), 0), 0), 0);
        const intervalEnd = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.endHour), 0), 0), 0);

         // Filtre les rendez-vous qui CHEVAUCHENT cet intervalle (et pas seulement ceux qui commencent dedans)
        const intervalAppointments = appointments.filter((app) =>
          app.startDate >= intervalStart && app.startDate < intervalEnd
        );

        return (
          <IntervalCell
            key={`${format(day, 'yyyy-MM-dd')}-${interval.name}-${employeeId}`}
            date={day}
            employeeId={employeeId}
            intervalName={interval.name as 'morning' | 'afternoon'}
            intervalStart={intervalStart}
            intervalEnd={intervalEnd}
            appointments={intervalAppointments}
            isFullDay={isFullDay ?? false}
            RowHeight={RowHeight}
            onAppointmentMoved={onAppointmentMoved}
            onCellDoubleClick={() => onCellDoubleClick(intervalStart, employeeId, interval.name as 'morning' | 'afternoon')}
            onAppointmentDoubleClick={onAppointmentClick}
            onExternalDragDrop={onExternalDragDrop}
            isCellActive={isCellActive}
            isWeekend={isWeekend}
            isFerie={isFerie}
            handleContextMenu={handleContextMenu}
          />
        );
      })}
    </div>
  );
};

export default memo(DayCell);