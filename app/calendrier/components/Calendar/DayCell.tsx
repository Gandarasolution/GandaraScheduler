"use client";
import React, { memo, useMemo, useState } from 'react';
import { format, setHours, setMinutes, setSeconds, setMilliseconds, isSameDay } from 'date-fns';
import { IntervalCell } from '../index';
import { Appointment, HalfDayInterval, Item } from '../../types';
import { getHour, isHoliday } from '../../utils/dates';
import { CELL_HEIGHT, CELL_WIDTH, HALF_DAY_INTERVALS } from '../../utils/constants';
import { fr } from 'date-fns/locale';

/**
 * Props du composant DayCell
 * Représente une cellule de jour pour un employé (ou une équipe) dans la grille du calendrier.
 */
interface DayCellProps {
  dayTs: number;
  employee: { id: number; name: string };
  appointments: (Appointment & { top: number})[];
  intervals: HalfDayInterval[];
  events: Item[];
  isCellActive?: boolean;
  isWeekend: boolean;
  isFullDay?: boolean;
  RowHeight?: number;
  nonWorkingDates?: number[];
  isMobile: boolean;
  isDisplayWeekend?: boolean;
  onAppointmentMoved: (id: number, newStartTs: number, newEndTs: number, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (dateTs: number, employeeId: number, intervalName: 'morning' | 'afternoon' | 'day') => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (
    title: string,
    dateTs: number,
    intervalName: 'morning' | 'afternoon',
    employeeId: number,
    imageUrl: string,
    typeEvent: 'Chantier' | 'Absence' | 'Autre'
  ) => void;
  handleContextMenu?: (
    e: React.MouseEvent,
    origin: 'cell' | 'appointment',
    appointment?: (Appointment) | null,
    cell?: { employeeId: number; date: number }
  ) => void;
  selectedCell?: { employeeId: number; date: number } | null;
  selectedAppointmentId?: number | undefined;
  onSelectCell?: (cell: { employeeId: number; date: number } | null) => void;
  onSelectAppointment?: (appointment: (Appointment) | null) => void;
}

/**
 * Composant React représentant une cellule de jour dans un calendrier.
 *
 * @param {DayCellProps} props - Les propriétés du composant.
 * @param {Date} props.day - La date du jour affiché dans la cellule.
 * @param {{ id: string; name: string }} props.employee - L'employé associé à la cellule.
 * @param {Appointment[]} [props.appointments=[]] - Liste des rendez-vous à afficher dans la cellule.
 * @param {Interval[]} [props.intervals=[]] - Liste des intervalles (matin, après-midi, etc.) pour le jour.
 * @param {boolean} [props.isCellActive=true] - Indique si la cellule est active (cliquable/éditable).
 * @param {boolean} props.isWeekend - Indique si le jour est un week-end.
 * @param {boolean} props.isFullDay - Indique si la cellule couvre toute la journée.
 * @param {number} props.RowHeight - Hauteur de la ligne (optionnelle).
 * @param {Date[]} props.nonWorkingDates - Liste des dates considérées comme non travaillées.
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile.
 * @param {boolean} props.isDisplayWeekend - Indique si les week-ends sont visibles.
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
 */
const DayCell: React.FC<DayCellProps> = ({
  dayTs,
  employee,
  appointments = [],
  intervals = [],
  isCellActive = true,
  events,
  isWeekend,
  isFullDay,
  RowHeight,
  nonWorkingDates,
  isMobile,
  isDisplayWeekend = false,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  handleContextMenu,
  selectedCell,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment,
}) => {
  const day = useMemo(() => dayTs, [dayTs]);
  const [tooltip, setTooltip] = useState<{
    anchor: HTMLElement | null;
    app: Appointment | null;
    et: Item | null;
  } | null>(null);

  const isFerie = useMemo(() => isHoliday(day), [day]);
  const isNonWorkingDay = useMemo(() => nonWorkingDates?.some((date) => isSameDay(date, day)) ?? false, [nonWorkingDates, day]);

  const normalizedAppointments = useMemo(
    () =>
      appointments.map((app) => ({
        ...app,
        startDate: app.startDate,
        endDate: app.endDate,
      })),
    [appointments]
  );

  if (isMobile) {
    const maxVisible = 3;
    const visibleAppointments = normalizedAppointments.slice(0, maxVisible);
    const hiddenCount = normalizedAppointments.length - maxVisible;
    const isToday = isSameDay(day, Date.now());

    return (
      <div
        className={`snap-center day-cell flex flex-col items-start border-gray-200 px-2 py-1 bg-white 
          ${isWeekend ? 'bg-gray-50 text-gray-400' : ''} 
          ${isFerie ? 'bg-yellow-100 text-yellow-700' : ''} 
          ${isNonWorkingDay ? 'bg-red-100 text-red-700' : ''}
          ${isToday ? 'ring-2 ring-blue-400 shadow-md' : ''}
        `}
        key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
        id={format(day, 'yyyy-MM-dd')}
        style={{
          minHeight: CELL_HEIGHT,
          borderRadius: 12,
          margin: 4,
          position: 'relative',
          transition: 'box-shadow 0.2s, background 0.2s',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-base">{format(day, 'd')}</span>
          <span className="text-xs text-gray-500">{format(day, 'EEE', { locale: fr })}</span>
          {isToday && <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Aujourd’hui</span>}
        </div>
        <div className="flex flex-row flex-wrap gap-1">
          {visibleAppointments.map((app) => (
            <span
              key={app.id}
              className={`
                rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm
                transition-all duration-150
                bg-gray-200 text-gray-700
                hover:bg-blue-200 hover:text-blue-900 active:scale-95
                flex items-center gap-1
              `}
              title={events.find((et) => et.id === app.EventId)?.label}
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setTooltip({ anchor: e.currentTarget, app, et: events.find((et) => et.id === app.EventId) || null });
              }}
            >
              {(() => {
                const et = events.find((et) => et.id === app.EventId);
                return et?.label ? (et.label.length > 12 ? et.label.slice(0, 12) + '…' : et.label) : '';
              })()}
            </span>
          ))}
          {hiddenCount > 0 && <span className="rounded-full bg-gray-300 text-gray-700 px-2 py-0.5 text-xs font-semibold">+{hiddenCount}</span>}
        </div>
        {tooltip && tooltip.app && (
          <div
            className="absolute z-[100] min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg p-3.5"
            style={{
              top: tooltip.anchor?.offsetTop ? tooltip.anchor.offsetTop + 28 : 40,
              left: tooltip.anchor?.offsetLeft ?? 0,
              animation: 'fadeIn 0.2s',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold text-sm mb-1">{tooltip?.et?.label}</div>
            {tooltip.app.description && <div className="text-xs mb-1">{tooltip.app.description}</div>}
            <div className="text-xs text-gray-500">
              {(() => {
                const startDate = tooltip.app.startDate;
                const endDate = tooltip.app.endDate;

                const startH = getHour(startDate);
                const endH = getHour(endDate);
                // Comparaisons directes de nombres
                if (startH === HALF_DAY_INTERVALS[0].startHour && endH === HALF_DAY_INTERVALS[0].endHour) return 'Matin';
                if (startH === HALF_DAY_INTERVALS[1].startHour && endH === HALF_DAY_INTERVALS[1].endHour) return 'Après-midi';
                return 'Journée complète';
              })()}
            </div>
            <button className="mt-2 text-xs text-blue-600 underline" onClick={() => setTooltip(null)}>
              Fermer
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`
        calendar-cell p-0 snap-center day-cell flex flex-row border-default
        ${isWeekend ? 'WEEKEND' : isFerie ? 'FERIE' : isNonWorkingDay ? 'NON-WORKING' : ''}
      `}
      key={`${format(day, 'yyyy-MM-dd')}-${employee.id}`}
      id={format(day, 'yyyy-MM-dd')}
      role="gridcell"
      style={{
        width: `${CELL_WIDTH}px`,
        minWidth: `${CELL_WIDTH}px`,
        height: RowHeight ? `${RowHeight}px` : 'auto',
        minHeight: CELL_HEIGHT,
      }}
    >
      {intervals.map((interval) => {
        const intervalStart = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.startHour), 0), 0), 0).getTime();
        const intervalEnd = setMilliseconds(setSeconds(setMinutes(setHours(day, interval.endHour), 0), 0), 0).getTime();
        const intervalAppointments = normalizedAppointments.filter((app) => app.startDate >= intervalStart && app.startDate < intervalEnd);

        return (
          <IntervalCell
            key={`${format(day, 'yyyy-MM-dd')}-${interval.name}-${employee.id}`}
            dateTs={dayTs}
            employee={employee}
            intervalName={interval.name as 'morning' | 'afternoon'}
            intervalStartTs={intervalStart}
            intervalEndTs={intervalEnd}
            appointments={intervalAppointments}
            events={events}
            isFullDay={isFullDay ?? false}
            RowHeight={RowHeight}
            isMobile={isMobile}
            nonWorkingDates={nonWorkingDates || []}
            isNonWorkingDay={isNonWorkingDay}
            isDisplayWeekend={isDisplayWeekend}
            onAppointmentMoved={onAppointmentMoved}
            onCellDoubleClick={onCellDoubleClick}
            onAppointmentDoubleClick={onAppointmentClick}
            onExternalDragDrop={onExternalDragDrop}
            isCellActive={isCellActive}
            isWeekend={isWeekend}
            isFerie={isFerie}
            handleContextMenu={handleContextMenu}
            isSelected={selectedCell?.employeeId === employee.id && selectedCell?.date === intervalStart}
            selectedAppointmentId={selectedAppointmentId}
            onSelectCell={onSelectCell || (() => {})}
            onSelectAppointment={onSelectAppointment || (() => {})}
          />
        );
      })}
    </div>
  );
};

export default memo(DayCell);