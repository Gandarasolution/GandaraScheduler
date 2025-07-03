"use client";
import React, { useState, memo, useCallback, JSX, useRef} from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays } from 'date-fns';
import AppointmentItem from './AppointmentItem';
import InfoBubble from './InfoBubble';
import { Appointment } from '../types';
import { CELL_WIDTH, CELL_HEIGHT } from '../pages/index'
import RightClickComponent from './RightClickComponent';

// Palette de couleurs pour les rendez-vous (par employé)
const colors = [
  'blue-500',
  'emerald-500',
  'amber-400',
  'rose-500',
  'purple-500',
  'pink-400',
  'gray-500',
  'sky-500',
  'orange-400',
  'teal-500',
];

// Props du composant IntervalCell
interface IntervalCellProps {
  date: Date;
  employeeId: number; // Peut être null si la cellule n'est pas active ou pour un jour sans employé
  intervalName: 'morning' | 'afternoon';
  intervalStart: Date;
  intervalEnd: Date;
  appointments: Appointment[];
  isCellActive?: boolean; // Pour gérer l'état actif de la cellule si nécessaire
  isWeekend: boolean; // Pour appliquer des styles de week-end si besoin
  isFerie: boolean; // Pour appliquer des styles de jour férié si besoin
  isHoliday?: (day: Date) => boolean; // Fonction pour vérifier si un jour est férié
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number, resizeDirection?: 'left' | 'right') => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon") => void;
  onAppointmentDoubleClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  handleContextMenu?: (e: React.MouseEvent, origin: 'cell' | 'appointment', appointmentId?: number, cell?: { employeeId: number; date: Date }) => void; // Fonction pour gérer le clic droit
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
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  


  



  // Trouve le prochain jour ouvré (ni week-end ni férié)
  const getNextWeekday = useCallback((date: Date): Date => {
    let next = new Date(date);
    do {
      next = addDays(next, 1);
    } while (next.getDay() === 0 || next.getDay() === 6 || (isHoliday && isHoliday(next))); // 0 = dimanche, 6 = samedi
    return next;
  }, []);

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
        targetDate = getNextWeekday(date);
        targetInterval = 'morning'; // Par défaut, matin du prochain jour ouvré
      }
      
      if (item.sourceType === 'external') {
        console.log(item);
        
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

    if (appointments.length > 0) {
      setBubbleContent(appointments.map((app) => app.title).join(', '));
    } else {
      setBubbleContent(`Créneau du ${format(date, 'dd/MM')} - ${intervalName === 'morning' ? 'Matin' : 'Après-midi'}`);
    }

    setShowInfoBubble(true);
    setBubblePosition({ x: event.clientX, y: event.clientY });

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
        `
      }
      style={{
        width: CELL_WIDTH/2,
        height: CELL_HEIGHT,
      }}
      onContextMenu={(e) => {
        handleContextMenu && !isWeekend ? handleContextMenu(e, 'cell', undefined, { employeeId, date }) 
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
          color={`bg-${colors[app.employeeId as number % colors.length]}`}
          handleContextMenu={(e, origin, appointmentId) => handleContextMenu && handleContextMenu(e, origin, appointmentId)}
        />
      ))}
      {/* Affichage de la bulle d'info si besoin */}
      {isCellActive && showInfoBubble && (
        <InfoBubble
          content={bubbleContent}
          position={bubblePosition}
          onClose={() => setShowInfoBubble(false)}
        />
      )}
    </div>
  );
};

export default memo(IntervalCell);