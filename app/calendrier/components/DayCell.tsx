"use client";
import React, {memo, useMemo}from 'react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds, isSameDay } from 'date-fns';
import IntervalCell from './IntervalCell';
import { Appointment, HalfDayInterval, } from '../types';
import { isHoliday } from '../utils/dates'; // Assurez-vous d'avoir une fonction isHoliday pour vérifier les jours fériés
import { CELL_HEIGHT, HALF_DAY_INTERVALS, DAY_INTERVALS } from '../utils/constants';

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
  nonWorkingDates?: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  isMobile: boolean; // Indique si l'affichage est en mode mobile
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
}

/**
 * Composant React représentant une cellule de jour dans un calendrier.
 *
 * @param {DayCellProps} props - Les propriétés du composant.
 * @param {Date} props.day - La date du jour affiché dans la cellule.
 * @param {string} props.employeeId - L'identifiant de l'employé associé à la cellule.
 * @param {Appointment[]} [props.appointments=[]] - Liste des rendez-vous à afficher dans la cellule.
 * @param {Interval[]} [props.intervals=[]] - Liste des intervalles (matin, après-midi, etc.) pour le jour.
 * @param {boolean} [props.isCellActive=true] - Indique si la cellule est active (cliquable/éditable).
 * @param {boolean} props.isWeekend - Indique si le jour est un week-end.
 * @param {boolean} props.isFullDay - Indique si la cellule couvre toute la journée.
 * @param {number} props.RowHeight - Hauteur de la ligne (optionnelle).
 * @param {Date[]} props.nonWorkingDates - Liste des dates considérées comme non travaillées.
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile.
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous.
 * @param {Function} props.onCellDoubleClick - Callback lors d'un double-clic sur la cellule.
 * @param {Function} props.onAppointmentClick - Callback lors d'un clic sur un rendez-vous.
 * @param {Function} props.onExternalDragDrop - Callback lors d'un drag & drop externe.
 * @param {Function} props.handleContextMenu - Callback lors de l'ouverture du menu contextuel.
 *
 * @returns {JSX.Element} Un élément JSX représentant la cellule du jour, avec gestion des styles selon le type de jour (férié, week-end, non travaillé).
 *
 * @remarks
 * - Utilise `useMemo` pour optimiser le calcul des jours fériés et non travaillés.
 * - Applique des classes CSS dynamiquement selon l'état de la cellule.
 * - Pour chaque intervalle (matin/après-midi ou journée pleine), affiche un composant `IntervalCell` avec les rendez-vous correspondants.
 * - Les rendez-vous sont filtrés différemment selon le mode mobile ou non.
 * - La hauteur minimale de la cellule est définie par `CELL_HEIGHT`.
 *
 * @example
 * ```tsx
 * <DayCell
 *   day={new Date()}
 *   employeeId="123"
 *   appointments={appointments}
 *   intervals={intervals}
 *   isWeekend={false}
 *   isFullDay={false}
 *   RowHeight={50}
 *   nonWorkingDates={[new Date()]}
 *   isMobile={false}
 *   onAppointmentMoved={handleMove}
 *   onCellDoubleClick={handleDoubleClick}
 *   onAppointmentClick={handleClick}
 *   onExternalDragDrop={handleDrop}
 *   handleContextMenu={handleContextMenu}
 * />
 * ```
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
  nonWorkingDates,
  isMobile,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  handleContextMenu,
}) => {
  
  // Calcul du style de la cellule selon férié/week-end/jour normal
  const isFerie = useMemo(() => isHoliday(day), [day]);
  const isNonWorkingDay = useMemo(() => 
    nonWorkingDates?.some(date => isSameDay(date, day)) ?? false, [nonWorkingDates, day]
  );
  
  return (
    <div 
      className={`
        snap-center day-cell flex flex-row border-gray-200
        ${
        isCellActive
          ? [
              isWeekend ? 'WEEKEND' : '',
              isFerie ? 'FERIE' : '',
              isNonWorkingDay ? 'NON-WORKING' : '',
            ].join(' ')
          : 'bg-gray-200'
        }
      `}
      key={`${format(day, 'yyyy-MM-dd')}-${employeeId}`}
      id={format(day, 'yyyy-MM-dd')}
      style={{ 
        height: 'auto', // Utilise RowHeight si fourni, sinon auto
        minHeight: CELL_HEIGHT, // Hauteur minimale pour la cellule
      }}
    >
      {/* Le numéro du jour est maintenant géré par l'en-tête global dans CalendarGrid */}
      {intervals.map((interval) => {
        // Calcule le début et la fin de l'intervalle (matin/après-midi)
        const intervalStart = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.startHour), 0), 0), 0);
        const intervalEnd = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.endHour), 0), 0), 0);

        
         // Filtre les rendez-vous qui CHEVAUCHENT cet intervalle (et pas seulement ceux qui commencent dedans)
        const intervalAppointments = !isMobile ? appointments.filter((app) =>
          app.startDate >= intervalStart && app.startDate < intervalEnd
        ) : appointments.filter((app) =>
          ((isFullDay ? 
            intervalStart.getHours() === DAY_INTERVALS[0].startHour
            : intervalStart.getHours() === HALF_DAY_INTERVALS[0].startHour
          ) && app.startDate <= intervalStart && app.endDate >= intervalEnd)
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
            isMobile={isMobile}
            nonWorkingDates={nonWorkingDates || []}
            isNonWorkingDay={isNonWorkingDay}
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