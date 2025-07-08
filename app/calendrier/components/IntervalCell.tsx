"use client";
import React, { useState, memo, useCallback, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays } from 'date-fns';
import AppointmentItem from './AppointmentItem';
import InfoBubble from './InfoBubble';
import { Appointment } from '../types';
import { CELL_WIDTH, CELL_HEIGHT, colors } from '../utils/constants';
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
  appointments: Appointment[];
  isCellActive?: boolean;
  isWeekend: boolean;
  isFerie: boolean;
  isHoliday?: (day: Date) => boolean;
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon") => void;
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
 * Représente une demi-journée (matin/après-midi) pour un employé à une date donnée.
 * Gère le drag & drop, l'affichage des rendez-vous, les interactions et le style selon le contexte.
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
  isHoliday,
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

      // Si la cellule est un week-end ou férié, on place sur le prochain jour ouvré
      if (isWeekend || isFerie) {
        targetDate = getNextWorkedDay(date, [
          { name: "morning", startHour: 0, endHour: 12 },
          { name: "afternoon", startHour: 12, endHour: 24 },
        ]);
        targetInterval = 'morning'; // Par défaut, matin du prochain jour ouvré
      }
      

      // Si on a dragOffset et width, on centre l'event sur la cellule cible
      if (item.dragOffset !== undefined && item.width) {
        // Largeur d'une cellule (en px)
        const intervalWidth = CELL_WIDTH / 2;
        // Décalage en nombre de cellules (arrondi)
        const cellOffset = Math.floor(-item.dragOffset / intervalWidth) + 1; // +1 pour centrer sur la cellule
        // Décale la date cible
        targetDate = addDays(targetDate, cellOffset * 0.5); // 0.5 si demi-journée
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
  } else if (employeeId === 0) {
    bgColor = 'bg-gray-200'; // Cellule inactive sans employé
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
      setBubbleContent(`Créneau du ${format(date, 'dd/MM')} - ${intervalName === 'morning' ? 'Matin' : 'Après-midi'}`);
    }
    setShowInfoBubble(true);
    bubblePosition.current = { x: event.clientX, y: event.clientY };
    setTimeout(() => setShowInfoBubble(false), 3000);
  };

  // Double-clic pour créer un rendez-vous
  const handleCellDoubleClick = () => {    
    onCellDoubleClick(date, employeeId, intervalName);
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
        if (isCellActive && !isWeekend && !!employeeId) handleCellDoubleClick();
      }}
      className={`
        relative flex-1 border-b ${isCellActive ? 'border-r' : ''} 
        ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-gray-200  
        ${bgColor} ${canDrop ? 'cursor-pointer' : ''}
        flex flex-row items-start gap-1
        ${isSelected ? 'bg-blue-200' : ''}
        `
      }
      style={{
        width: CELL_WIDTH/2,
        height: CELL_HEIGHT,
        willChange: 'background-color, border-color',
      }}
      onContextMenu={(e) => {
        handleContextMenu && !isWeekend ? handleContextMenu(e, 'cell', undefined, { employeeId, date: intervalStart }) 
        : e.preventDefault();
      }}
      suppressHydrationWarning={true} // Pour éviter les erreurs de rendu côté serveur
    >
      {/* Affichage des rendez-vous de l'intervalle */}
      {isCellActive && appointments.map((app) => (
        <AppointmentItem
          key={app.id}
          appointment={app}
          onDoubleClick={() => onAppointmentDoubleClick(app)}
          onResize={(id,newStartDate, newEndDate, resizeDirection) => {
            // Mets à jour l'event dans le state global
            onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number, resizeDirection);
          }}
          handleContextMenu={(e, origin, appointmentId) => handleContextMenu && handleContextMenu(e, origin, appointmentId)}
          color={colors[app.employeeId as number % colors.length]} // Utilise l'ID de l'employé pour la couleur
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