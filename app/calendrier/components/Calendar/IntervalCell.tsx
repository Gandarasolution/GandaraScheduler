"use client";
import React, { useState, memo, useRef } from 'react';
import { format } from 'date-fns';

import { InfoBubble, AppointmentItem } from '@/app/calendrier/components/index';




import { Appointment, Item } from '../../types';
import {
  CELL_WIDTH,
  CELL_HEIGHT,
} from '../../utils/constants';

/**
 * IntervalCell
 * Représente une demi-journée (matin/après-midi) pour un employé à une date donnée.
 * Gère l'affichage des rendez-vous, les interactions et le style selon le contexte.
 *
 * Props :
 * - date : Date de la cellule
 * - employeeId : ID de l'employé
 * - intervalName : 'morning' | 'afternoon'
 * - intervalStart, intervalEnd : bornes de l'intervalle
 * - appointments : rendez-vous à afficher
 * - isCellActive, isWeekend, isFerie : états de la cellule
 * - isHoliday : fonction utilitaire pour les jours fériés
 * - onAppointmentMoved, onCellDoubleClick, onAppointmentDoubleClick, onExternalDragDrop : callbacks
 * - handleContextMenu : gestion du clic droit
 */


  


// Props du composant IntervalCell
interface IntervalCellProps {
  dateTs: number;
  employee: { id: number; name: string };
  intervalName: 'morning' | 'afternoon';
  intervalStartTs: number;
  intervalEndTs: number;
  appointments: (Appointment & { top: number;})[];
  events: Item[];
  isCellActive?: boolean;
  isWeekend: boolean;
  isFerie: boolean;
  isFullDay: boolean;
  RowHeight?: number;
  nonWorkingDates: number[];
  isNonWorkingDay: boolean;
  isMobile: boolean;
  isDisplayWeekend?: boolean;
  onAppointmentMoved: (id: number, newStartTs: number, newEndTs: number, newEmployeeId: number, resizeDirection?: 'left' | 'right', saveToHistory?: boolean, newPriority?: number) => void;
  onCellDoubleClick: (dateTs: number, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
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
  isSelected: boolean;
  selectedAppointmentId: number | undefined;
  onSelectCell: (cell: { date: number; employeeId: number } | null) => void;
  onSelectAppointment: (appointment: (Appointment) | null) => void;
}

/**
 * Composant IntervalCell
 * 
 * Affiche une cellule d'intervalle horaire dans un calendrier, gère les rendez-vous, le drag & drop,
 * la sélection, l'affichage d'une bulle d'information, et les interactions utilisateur (clic, double-clic, menu contextuel).
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Date} props.date - Date de la cellule
 * @param {{ id: number; name: string }} [props.employee={ id: 0, name: '' }] - Employé associé à la cellule
 * @param {string} props.intervalName - Nom de l'intervalle (ex : 'morning', 'afternoon')
 * @param {Date} props.intervalStart - Date/heure de début de l'intervalle
 * @param {Date} props.intervalEnd - Date/heure de fin de l'intervalle
 * @param {Appointment[]} [props.appointments=[]] - Liste des rendez-vous dans la cellule
 * @param {boolean} [props.isCellActive=true] - Indique si la cellule est active (modifiable)
 * @param {boolean} props.isWeekend - Indique si la cellule correspond à un week-end
 * @param {boolean} props.isFerie - Indique si la cellule correspond à un jour férié
 * @param {boolean} props.isFullDay - Indique si la cellule couvre toute la journée
 * @param {number} props.RowHeight - Hauteur de la ligne (en pixels)
 * @param {Date[]} props.nonWorkingDates - Liste des dates non travaillées
 * @param {boolean} props.isNonWorkingDay - Indique si la cellule est un jour non travaillé
 * @param {boolean} props.isMobile - Indique si l'affichage est mobile
 * @param {boolean} props.isDisplayWeekend - Indique si les week-ends sont visibles.
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur la cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors du drop d'un élément externe
 * @param {Function} props.handleContextMenu - Callback pour le menu contextuel
 * 
 * @returns {JSX.Element} Cellule d'intervalle horaire avec gestion des rendez-vous et interactions utilisateur
 * 
 * 
 * @remarks
 * - Affiche une bulle d'information temporaire au clic.
 * - Permet la création de rendez-vous par double-clic.
 * - Gère les jours non travaillés, week-ends et jours fériés.
 * 
 * @ligne
 * // Gestion de l'état local pour la bulle d'info et sa position
 * // Calcul du style de fond selon l'état d'activité
 * // Gestion du clic sur la cellule pour afficher la bulle d'info
 * // Gestion du double-clic pour créer un rendez-vous
 * // Rendu JSX de la cellule, des rendez-vous et de la bulle d'info
 */


/**
 * Composant IntervalCell
 * Gère le rendu et les interactions locales.
 */
const IntervalCell: React.FC<IntervalCellProps> = memo(({
  dateTs,
  employee = { id: 0, name: '' },
  intervalName,
  intervalStartTs,
  intervalEndTs,
  appointments = [],
  isCellActive = true,
  isWeekend,
  isFerie,
  isFullDay,
  RowHeight,
  events,
  nonWorkingDates,
  isNonWorkingDay,
  isMobile,
  isDisplayWeekend,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu,
  isSelected,
  selectedAppointmentId,
  onSelectCell,
  onSelectAppointment
}) => {
  const intervalStart = intervalStartTs;
  const date = dateTs;
  // État pour la bulle d'info (affichée au clic)
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const bubblePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cellRef = useRef<HTMLDivElement>(null);

  // Affiche une bulle d'info au clic sur la cellule
  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isCellActive || isWeekend || !employee.id) return;
    onSelectCell({ date: intervalStart, employeeId: employee.id });
    onSelectAppointment(null);
    setBubbleContent(`Créneau du ${format(date, 'dd/MM')} ${!isFullDay ? (intervalName === 'morning' ? '- Matin' : '- Après-midi') : ''}`);
    setShowInfoBubble(true);
    const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    bubblePosition.current = {
      x: rect.left,
      y: rect.top
    };    
    setTimeout(() => setShowInfoBubble(false), 3000);
  };

  // Double-clic pour créer un rendez-vous
  const handleCellDoubleClick = () => {    
    onCellDoubleClick(intervalStart, employee.id, isFullDay ? 'day' : intervalName);
  };

  const setRefs = (node: HTMLDivElement | null) => {
    cellRef.current = node;
  };

  return (
    <div
      ref={setRefs}
      onClick={handleCellClick}
      onDoubleClick={() => {
        if (isCellActive && !!employee.id) handleCellDoubleClick();
      }}
      className={`
        relative flex-1 border-r border-light
        flex flex-row items-start gap-1
        ${isSelected ? 'bg-blue-200' : ''}
        interval-cell
      `}
      style={{
        width: !isMobile ? CELL_WIDTH / 2 : undefined,
        height: Math.max(CELL_HEIGHT, RowHeight ?? CELL_HEIGHT),
        willChange: 'background-color, border-color',
      }}
      onContextMenu={(e) => {
        handleContextMenu && !isWeekend && !isFerie ? handleContextMenu(e, 'cell', undefined, { employeeId: employee.id, date: intervalStart }) 
        : e.preventDefault();
      }}
      suppressHydrationWarning={true} // Pour éviter les erreurs de rendu côté serveur
    >
        {isCellActive && appointments.map((app) => {
          const event = events.find(et => et.id === app.EventId);
          const chargeeAffaire = event && event.type === 'chantier' ? event.chargeAffaire : '';          
          const normalized = {
            ...app,
            startDate: app.startDate,
            endDate: app.endDate,
          };
          return (
            <AppointmentItem
              key={app.id}
              chargeeAffaire={chargeeAffaire || ''}
              appointment={normalized}
              isFullDay={isFullDay}
              isDisplayWeekend={isDisplayWeekend}
              event={event as Item}
              onDoubleClick={() => {
                onAppointmentDoubleClick(normalized)
              }}
              onResize={(id, newStartDate, newEndDate, resizeDirection) => {
                onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection);
              }}
              handleContextMenu={handleContextMenu ?? (() => {})}
              isMobile={isMobile}
              onClick={() => {
                if (!isMobile) {
                  onSelectAppointment(normalized);
                  onSelectCell(null);
                }
              }}
              isSelected={selectedAppointmentId === app.id}
            />
          )
        })}
      {/* Affichage de la bulle d'info si besoin */}
      {isCellActive && showInfoBubble && (
        <InfoBubble
          content={bubbleContent}
          position={bubblePosition.current}
          onClose={() => setShowInfoBubble(false)}
        />
      )}
    </div>
  );
});


export default memo(IntervalCell);