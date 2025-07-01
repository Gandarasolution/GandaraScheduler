"use client";
import React, { useState, memo, useCallback, JSX} from 'react';
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
  holidays: { date: string }[]; // Liste des jours fériés, si nécessaire
  isHoliday: (day: Date, holidays: { date: string }[]) => boolean; // Fonction pour vérifier si un jour est férié
  onAppointmentMoved: (id: number, newStartDate: Date, newEndDate: Date, newEmployeeId: number) => void;
  onCellDoubleClick: (date: Date, employeeId: number, intervalName: "morning" | "afternoon") => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number, imageUrl: string, typeEvent: 'Chantier' | 'Absence' | 'Autre') => void;
  createAppointment?: (title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => void;
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
  holidays = [],
  isHoliday,
  onAppointmentMoved,
  onCellDoubleClick,
  onAppointmentClick,
  onExternalDragDrop,
  createAppointment,
}) => {
  // État pour la bulle d'info (affichée au clic)
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number, item: { label: string; logo: JSX.Element }[] } | null>(null);
  
  const rightClickItemAppointment = [
  { 
    label: "Modifier", 
    logo: 
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil-fill" viewBox="0 0 16 16">
        <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
      </svg>
  },
  { 
    label: "Supprimer", 
    logo: 
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3-fill" viewBox="0 0 16 16">
        <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
      </svg>,
    action: () => {
     
    }
  },
  {
    label: 'Copier',
    logo:
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
      </svg>,
    action: (id: number) => {

    }
  },
  {
    label: 'Répéter',
    logo:
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-repeat" viewBox="0 0 16 16">
        <path d="M11 5.466V4H5a4 4 0 0 0-3.584 5.777.5.5 0 1 1-.896.446A5 5 0 0 1 5 3h6V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192m3.81.086a.5.5 0 0 1 .67.225A5 5 0 0 1 11 13H5v1.466a.25.25 0 0 1-.41.192l-2.36-1.966a.25.25 0 0 1 0-.384l2.36-1.966a.25.25 0 0 1 .41.192V12h6a4 4 0 0 0 3.585-5.777.5.5 0 0 1 .225-.67Z"/>
      </svg>
  }
]

const rightClickItemCell = [
  {
    label: 'Coller',
    logo:
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-copy" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"/>
      </svg>
  },
  {
    label: 'Ajouter',
    logo:
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-circle-fill" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z"/>
      </svg>
  }
]



  // Trouve le prochain jour ouvré (ni week-end ni férié)
  const getNextWeekday = useCallback((date: Date): Date => {
    let next = new Date(date);
    do {
      next = addDays(next, 1);
    } while (next.getDay() === 0 || next.getDay() === 6 || isHoliday(next, holidays)); // 0 = dimanche, 6 = samedi
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

  // Gère le clic droit pour afficher le menu contextuel
  const handleContextMenu = (e: React.MouseEvent, origin: 'cell' | 'appointment') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item: origin === 'cell' ? rightClickItemCell : rightClickItemAppointment });
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
      className={`relative flex-1 border-b ${isCellActive ? 'border-r' : ''} ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-gray-200  ${bgColor} ${canDrop ? 'cursor-pointer' : ''}
                  flex flex-row items-start gap-1`}
      style={{
        width: CELL_WIDTH/2,
        height: CELL_HEIGHT,
      }}
      onContextMenu={(e) => handleContextMenu(e, 'cell')}
    >
      {/* Affichage des rendez-vous de l'intervalle */}
      {isCellActive && appointments.map((app) => (
        <AppointmentItem
          key={app.id}
          appointment={app}
          onClick={() => onAppointmentClick(app)}
          onResize={(id,newStartDate, newEndDate) => {
            // Mets à jour l'event dans le state global
            onAppointmentMoved(id, newStartDate, newEndDate, app.employeeId as number);
          }}
          color={`bg-${colors[app.employeeId as number % colors.length]}`}
          holidays={holidays}
          isHoliday={isHoliday}
          createAppointment={(title: string, startDate: Date, endDate: Date, employeeId: number, imageUrl?: string) => {
            if (createAppointment) {
              createAppointment(title, startDate, endDate, employeeId, imageUrl);
            }
          }}
          handleContextMenu={(e, origin) => handleContextMenu(e, origin)}
        />
      ))}
      {/* Menu contextuel */}
      <RightClickComponent
        open={!!contextMenu}
        coordinates={contextMenu}
        rightClickItem={contextMenu?.item || []}
        onClose={() => setContextMenu(null)}
      />
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