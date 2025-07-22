"use client";
import React, { useState, memo, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays, add, addHours } from 'date-fns';
import AppointmentItem from './AppointmentItem';
import InfoBubble from './InfoBubble';
import { Appointment } from '../types';
import {
  CELL_WIDTH, 
  CELL_HEIGHT, 
  colors, 
  DAY_INTERVALS, 
  HALF_DAY_INTERVALS,
} from '../utils/constants';
import { getNextWorkedDay } from '../utils/dates';
import { useSelectedCell } from '../context/SelectedCellContext';
import { useSelectedAppointment } from '../context/SelectedAppointmentContext';

/**
 * IntervalCell
 * Représente une demi-journée (matin/après-midi) pour un employé à une date donnée.
 * Gère le drag & drop, l'affichage des rendez-vous, les interactions et le style selon le contexte.
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
  date: Date;
  employeeId: number;
  intervalName: 'morning' | 'afternoon';
  intervalStart: Date;
  intervalEnd: Date;
  appointments: (Appointment & { top: number })[];
  isCellActive?: boolean;
  isWeekend: boolean;
  isFerie: boolean;
  isFullDay: boolean; // Indique si la cellule représente une journée complète
  RowHeight?: number; // Hauteur de la ligne pour l'employé, si nécessaire
  nonWorkingDates: Date[]; // Dates non travaillées (week-ends, fériés, etc.)
  isNonWorkingDay: boolean; // Indique si la cellule représente un jour non travaillé
  isMobile: boolean; // Indique si l'affichage est en mode mobile
  includeWeekend?: boolean; // Indique si les week-ends sont visibles.
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon" | "day") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointment?: Appointment | null, cell?: { employeeId: number; date: Date }) => void;
}

// Type pour le drag & drop
interface DragItem {
  id: number;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
  startDate: Date;
  endDate: Date;
  imageUrl: string;
  typeEvent: 'Chantier' | 'Absence' | 'Autre';
  dragOffset?: number;
  width?: number;
}

/**
 * Composant IntervalCell
 * 
 * Affiche une cellule d'intervalle horaire dans un calendrier, gère les rendez-vous, le drag & drop,
 * la sélection, l'affichage d'une bulle d'information, et les interactions utilisateur (clic, double-clic, menu contextuel).
 * 
 * @param {Object} props - Propriétés du composant
 * @param {Date} props.date - Date de la cellule
 * @param {number} [props.employeeId=0] - Identifiant de l'employé associé à la cellule
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
 * @param {boolean} props.includeWeekend - Indique si les week-ends sont visibles.
 * @param {Function} props.onAppointmentMoved - Callback lors du déplacement d'un rendez-vous
 * @param {Function} props.onCellDoubleClick - Callback lors du double-clic sur la cellule
 * @param {Function} props.onAppointmentDoubleClick - Callback lors du double-clic sur un rendez-vous
 * @param {Function} props.onExternalDragDrop - Callback lors du drop d'un élément externe
 * @param {Function} props.handleContextMenu - Callback pour le menu contextuel
 * 
 * @returns {JSX.Element} Cellule d'intervalle horaire avec gestion des rendez-vous et interactions utilisateur
 * 
 * @example
 * <IntervalCell
 *   date={new Date()}
 *   employeeId={1}
 *   intervalName="morning"
 *   intervalStart={new Date()}
 *   intervalEnd={new Date()}
 *   appointments={[]}
 *   isCellActive={true}
 *   isWeekend={false}
 *   isFerie={false}
 *   isFullDay={false}
 *   RowHeight={40}
 *   includeWeekend={false}
 *   nonWorkingDates={[]}
 *   isNonWorkingDay={false}
 *   isMobile={false}
 *   onAppointmentMoved={...}
 *   onCellDoubleClick={...}
 *   onAppointmentDoubleClick={...}
 *   onExternalDragDrop={...}
 *   handleContextMenu={...}
 * />
 * 
 * @remarks
 * - Utilise react-dnd pour le drag & drop.
 * - Affiche une bulle d'information temporaire au clic.
 * - Permet la création de rendez-vous par double-clic.
 * - Gère les jours non travaillés, week-ends et jours fériés.
 * 
 * @ligne
 * // Gestion de l'état local pour la bulle d'info et sa position
 * // Utilisation de useDrop pour gérer le drag & drop sur la cellule
 * // Calcul du style de fond selon l'état de drop et d'activité
 * // Gestion du clic sur la cellule pour afficher la bulle d'info
 * // Gestion du double-clic pour créer un rendez-vous
 * // Rendu JSX de la cellule, des rendez-vous et de la bulle d'info
 */


const IntervalCell: React.FC<IntervalCellProps> = ({
  date,
  employeeId = 0,
  intervalName,
  intervalStart,
  intervalEnd,
  appointments = [],
  isCellActive = true,
  isWeekend,
  isFerie,
  isFullDay,
  RowHeight,
  nonWorkingDates,
  isNonWorkingDay,
  isMobile,
  includeWeekend,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentDoubleClick,
  onExternalDragDrop,
  handleContextMenu
}) => {
  // État pour la bulle d'info (affichée au clic)
  // Utilisation de useRef pour la bulle d'info (meilleure perf, pas de re-render inutile)
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const bubblePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { selectedAppointment, setSelectedAppointment } = useSelectedAppointment();
  const { selectedCell, setSelectedCell } = useSelectedCell();
  const isSelected = selectedCell?.date.getTime() === intervalStart.getTime() && selectedCell?.employeeId === employeeId;

  // Gestion du drop (drag & drop)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!isCellActive) {
        console.warn('Cell is not active, cannot drop item');
        return;
      }

      let targetDate = intervalStart;
      let targetInterval = intervalName;
      // Si on a dragOffset et width, on centre l'event sur la cellule cible
      if (item.dragOffset !== undefined && item.width) {
        // Largeur d'une cellule (en px)
        const intervalWidth = isFullDay ? CELL_WIDTH : CELL_WIDTH / 2;
        // Décalage en nombre de cellules (arrondi)
        const cellOffset = Math.ceil(-item.dragOffset / intervalWidth); // +1 pour centrer sur la cellule
        
        targetDate = isFullDay 
        ? addDays(intervalStart, cellOffset) 
        : addHours(
          intervalStart, 
          cellOffset * HALF_DAY_INTERVALS[0].endHour - HALF_DAY_INTERVALS[0].startHour
        );
              
        // Décale la date cible
        targetDate = getNextWorkedDay(targetDate, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
      }

      
      // Si la cellule est un week-end ou férié, on place sur le prochain jour ouvré
      if (isWeekend || isFerie || isNonWorkingDay ) {        
        targetDate = getNextWorkedDay(date, isFullDay ? DAY_INTERVALS : HALF_DAY_INTERVALS, nonWorkingDates);
        targetInterval = 'morning'; // Par défaut, matin du prochain jour ouvré
      }
      
      if (item.sourceType === 'external') {        
        // Création d'un rendez-vous depuis une source externe
        onExternalDragDrop(
          item.title || 'Nouveau rendez-vous', 
          targetDate, 
          targetInterval, 
          employeeId,
          item.imageUrl,
          item.typeEvent
        );
      } else {
        // Déplacement d'un rendez-vous existant
        const diff = item.endDate.getTime() - item.startDate.getTime(); // Durée du rendez-vous
        const newDate = new Date(targetDate.getTime() + diff);        
        onAppointmentMoved(item.id, targetDate, newDate, employeeId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Détermine le style de fond selon l'état de drop et d'activité
  const isActive = isCellActive && isOver && canDrop;
  let bgColor = '';
  if (isActive) {
    bgColor = 'bg-green-100';
  }

  // Affiche une bulle d'info au clic sur la cellule
  const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isCellActive || isWeekend || !employeeId) return;
    setSelectedCell({ date: intervalStart, employeeId });
    setSelectedAppointment(null);
    if (appointments.length > 0) {
      setBubbleContent(appointments.map((app) => app.title).join(', '));
    } else {
      setBubbleContent(`Créneau du ${format(date, 'dd/MM')} ${!isFullDay ? (intervalName === 'morning' ? '- Matin' : '- Après-midi') : ''}`);
    }
    setShowInfoBubble(true);
    bubblePosition.current = { x: event.clientX, y: event.clientY };
    setTimeout(() => setShowInfoBubble(false), 3000);
  };

  // Double-clic pour créer un rendez-vous
  const handleCellDoubleClick = () => {    
    onCellDoubleClick(date, employeeId, isFullDay ? 'day' : intervalName);
  };

  

  return (
    <div
      ref={
        isCellActive ? (node) => {
          if (node) drop(node);
        } : undefined
      }
      onClick={handleCellClick}
      onDoubleClick={() =>{  
        if (isCellActive && !!employeeId) handleCellDoubleClick();
      }}
      className={`
        relative flex-1 border-b ${isCellActive ? 'border-r' : ''} 
        ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-gray-200  
        ${bgColor} ${canDrop ? 'cursor-pointer' : ''}
        flex flex-row items-start gap-1
        ${isSelected ? 'bg-blue-200' : ''}
        interval-cell
        `
      }
      style={{
        width: !isMobile ? CELL_WIDTH / 2 : undefined,
        height: Math.max(CELL_HEIGHT, RowHeight ?? CELL_HEIGHT),
        willChange: 'background-color, border-color',
      }}
      onContextMenu={(e) => {
        handleContextMenu && !isWeekend && !isFerie ? handleContextMenu(e, 'cell', undefined, { employeeId, date: intervalStart }) 
        : e.preventDefault();
      }}
      suppressHydrationWarning={true} // Pour éviter les erreurs de rendu côté serveur
    >
      
        {isCellActive && appointments.map((app) => (
          <AppointmentItem
            key={app.id}
            appointment={app}
            isFullDay={isFullDay}
            includeWeekend={includeWeekend}
            onDoubleClick={() => onAppointmentDoubleClick(app)}
            onResize={(id, newStartDate, newEndDate, resizeDirection) => {
              onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection);
            }}
            handleContextMenu={(e, origin, appointment) => handleContextMenu && handleContextMenu(e, origin, appointment, { employeeId, date: intervalStart })}
            color={colors[app.employeeId as number % colors.length]}
            isMobile={isMobile}
          />
        ))}
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
};

export default memo(IntervalCell);