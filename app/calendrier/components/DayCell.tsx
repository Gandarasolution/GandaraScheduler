"use client";
import React, {memo, useMemo, useState}from 'react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds, isSameDay } from 'date-fns';
import IntervalCell from './IntervalCell';
import { Appointment, HalfDayInterval, } from '../types';
import { isHoliday } from '../utils/dates'; // Assurez-vous d'avoir une fonction isHoliday pour vérifier les jours fériés
import { CELL_HEIGHT, HALF_DAY_INTERVALS, DAY_INTERVALS } from '../utils/constants';
import { fr } from 'date-fns/locale';

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
  includeWeekend?: boolean; // Indique si les week-ends doivent être inclus dans la vue mobile
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
 * @param {boolean} props.includeWeekend - Indique si les week-ends sont visibles.
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
 *   includeWeekend={false}
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
  includeWeekend = false,
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
  
  // Affichage mobile compact et lecture seule
  if (isMobile) {
    // On affiche tous les rendez-vous du jour sous forme de pastilles colorées
    const maxVisible = 3; // Nombre max de pastilles affichées
    const visibleAppointments = appointments.slice(0, maxVisible);
    const hiddenCount = appointments.length - maxVisible;
    const isToday = isSameDay(day, new Date());
    // État local pour afficher la bulle d'info
    const [tooltip, setTooltip] = useState<{anchor: HTMLElement | null, app: Appointment | null} | null>(null);
    
    return (
      <div
        className={`snap-center day-cell flex flex-col items-start border-gray-200 px-2 py-1 bg-white 
          ${isWeekend ? 'bg-gray-50 text-gray-400' : ''} 
          ${isFerie ? 'bg-yellow-100 text-yellow-700' : ''} 
          ${isNonWorkingDay ? 'bg-red-100 text-red-700' : ''}
          ${isToday ? 'ring-2 ring-blue-400 shadow-md' : ''}
        `}
        key={`${format(day, 'yyyy-MM-dd')}-${employeeId}`}
        id={format(day, 'yyyy-MM-dd')}
        style={{ 
          minHeight: CELL_HEIGHT, 
          borderRadius: 12, 
          margin: 4, 
          position: 'relative' ,
          transition: 'box-shadow 0.2s, background 0.2s',
        }}
      >
        {/* En-tête du jour */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-base">{format(day, 'd')}</span>
          <span className="text-xs text-gray-500">{format(day, 'EEE', { locale: fr })}</span>
          {isToday && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Aujourd’hui</span>}
        </div>
        {/* Pastilles rendez-vous */}
        <div className="flex flex-row flex-wrap gap-1">
          {visibleAppointments.map((app, idx) => (
            <span
              key={app.id}
              className={`
                rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm
                transition-all duration-150
                bg-gray-200 text-gray-700
                hover:bg-blue-200 hover:text-blue-900 active:scale-95
                flex items-center gap-1
              `}
              title={app.title}
              style={{cursor: 'pointer'}}
              onClick={e => {
                e.stopPropagation();
                setTooltip({anchor: e.currentTarget, app});
              }}
            >
              {app.title.length > 12 ? app.title.slice(0, 12) + '…' : app.title}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="rounded-full bg-gray-300 text-gray-700 px-2 py-0.5 text-xs font-semibold">+{hiddenCount}</span>
          )}
        </div>
        {/* Info-bulle personnalisée */}
        {tooltip && tooltip.app && (
          <div
            style={{
              position: 'absolute',
              top: tooltip.anchor?.offsetTop ? tooltip.anchor.offsetTop + 28 : 40,
              left: tooltip.anchor?.offsetLeft ?? 0,
              zIndex: 100,
              minWidth: 200,
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              padding: 14,
              animation: 'fadeIn 0.2s',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="font-bold text-sm mb-1">{tooltip.app.title}</div>
            {tooltip.app.description && <div className="text-xs mb-1">{tooltip.app.description}</div>}
            <div className="text-xs text-gray-500">
              {
                tooltip.app.startDate.getHours() === HALF_DAY_INTERVALS[0].startHour && tooltip.app.endDate.getHours() === HALF_DAY_INTERVALS[0].endHour
                  ? 'Matin'
                  : tooltip.app.startDate.getHours() === HALF_DAY_INTERVALS[1].startHour && tooltip.app.endDate.getHours() === HALF_DAY_INTERVALS[1].endHour
                    ? 'Après-midi'
                    : 'Journée complète'
              }
            </div>
            <button
              className="mt-2 text-xs text-blue-600 underline"
              onClick={() => setTooltip(null)}
            >
              Fermer
            </button>

          </div>
        )}
      </div>
    );
  }

  // Desktop : rendu classique
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
        height: 'auto',
        minHeight: CELL_HEIGHT,
      }}
    >
      {/* Le numéro du jour est maintenant géré par l'en-tête global dans CalendarGrid */}
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
            intervalName={interval.name as 'morning' | 'afternoon'}
            intervalStart={intervalStart}
            intervalEnd={intervalEnd}
            appointments={intervalAppointments}
            isFullDay={isFullDay ?? false}
            RowHeight={RowHeight}
            isMobile={isMobile}
            nonWorkingDates={nonWorkingDates || []}
            isNonWorkingDay={isNonWorkingDay}
            includeWeekend={includeWeekend}
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