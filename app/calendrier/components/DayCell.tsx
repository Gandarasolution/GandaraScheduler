"use client";
import React, {memo, useRef} from 'react'; // Ajout de useRef
import { format, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { useDrop } from 'react-dnd'; // Ajout de useDrop
import IntervalCell from './IntervalCell';
import { Appointment, HalfDayInterval } from '../types';
import Holidays from 'date-holidays';
// Importez HALF_DAY_INTERVALS depuis votre fichier de constantes (ex: index.ts dans pages)
import { HALF_DAY_INTERVALS } from '../pages/index';

const hd = new Holidays('FR'); // 'FR' pour la France
// Il est préférable de passer les jours fériés en tant que prop ou de les calculer une seule fois à un niveau supérieur
// ou de les mettre en cache pour éviter les recalculs répétés si l'année est toujours la même.
// Pour l'instant, on laisse tel quel pour la compatibilité, mais soyez-en conscient.
const holidays = hd.getHolidays(new Date().getFullYear());

interface DayCellProps {
  day: Date;
  employeeId: number;
  appointments: Appointment[];
  intervals: HalfDayInterval[];
  isCellActive?: boolean; // Pour gérer l'état actif de la cellule si nécessaire
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
  isWeekend: boolean; // Pour appliquer des styles de week-end si besoin
  style?: React.CSSProperties; // <-- AJOUTEZ CETTE LIGNE
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  employeeId,
  appointments = [],
  intervals = [],
  isCellActive = true, // Maintenir la valeur par défaut pour les tests, mais sera gérée par CalendarGrid
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  isWeekend,
  style, // <-- DÉSTRUCTUREZ LA PROP STYLE
}) => {
  function isHoliday(day: Date, holidays: { date: string }[]) {
    const dayStr = format(day, 'yyyy-MM-dd');
    return holidays.some(h => h.date.startsWith(dayStr));
  }

  const isFerie = isHoliday(day, holidays);
  // et les styles passés par react-window pour le positionnement.
  const cellClasses = `flex border-r border-b border-gray-200 ${
    isFerie ? 'bg-red-100' : isWeekend ? 'bg-sky-50' : 'bg-white'
  }`;

  // Ajustez la logique useDrop pour qu'elle soit dans IntervalCell si chaque moitié de journée est droppable.
  // Si DayCell est la cible de drop principale et détermine l'intervalle, gardez-la ici.
  // Pour l'instant, votre IntervalCell gère déjà le drop, donc DayCell n'a pas besoin d'un useDrop.
  // Si vous voulez que la *cellule entière* (matin + après-midi) soit une cible de dépôt, vous pouvez l'ajouter ici.
  // Pour un glisser-déposer plus précis sur Matin/Après-midi, gardez useDrop dans IntervalCell.

  return (
    <div
      className={cellClasses}
      style={style} // <-- APPLIQUEZ LA PROP STYLE ICI
    >
      {intervals.map((interval) => {
        const intervalStart = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.startHour), 0), 0), 0);
        const intervalEnd = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.endHour), 0), 0), 0);

        const intervalAppointments = appointments.filter((app) =>
          app.startDate >= intervalStart && app.startDate < intervalEnd
        );

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
            onCellDoubleClick={() => onCellDoubleClick(intervalStart, employeeId)}
            onAppointmentClick={onAppointmentClick}
            onExternalDragDrop={onExternalDragDrop}
            isCellActive={isCellActive} // Passer l'état d'activité
            isWeekend={isWeekend}
            isHoliday={isFerie}
            holidays={holidays}
          />
        );
      })}
    </div>
  );
};

export default memo(DayCell);