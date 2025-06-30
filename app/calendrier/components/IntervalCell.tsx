"use client";
import React, { useState, memo, useCallback} from 'react';
import { useDrop } from 'react-dnd';
import { format, addDays, interval } from 'date-fns';
import AppointmentItem from './AppointmentItem';
import InfoBubble from './InfoBubble';
import { Appointment } from '../types';
import { CELL_WIDTH, CELL_HEIGHT } from '../pages/index'


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
  onExternalDragDrop: (title: string, date: Date, intervalName: 'morning' | 'afternoon', employeeId: number) => void;
}

interface DragItem {
  id: number;
  type: 'appointment';
  title?: string;
  sourceType?: 'external';
  startDate: Date;
  endDate: Date;
}



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
}) => {
  const [showInfoBubble, setShowInfoBubble] = useState(false);
  const [bubbleContent, setBubbleContent] = useState('');
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });




  const getNextWeekday = useCallback((date: Date): Date => {
    let next = new Date(date);
    do {
      next = addDays(next, 1);
    } while (next.getDay() === 0 || next.getDay() === 6 || isHoliday(next, holidays)); // 0 = dimanche, 6 = samedi
    return next;
  }, [])

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['appointment', 'external-item'],
    drop: (item: DragItem, monitor) => {
      if (!isCellActive) {
        console.warn('Cell is not active, cannot drop item');
        return;
      }

      let targetDate = intervalStart;
      let targetInterval = intervalName;

      if (isWeekend || isFerie) {
        targetDate = getNextWeekday(date);
        targetInterval = 'morning'; // Par défaut, on place les rendez-vous le matin du jour suivant
      }
      
      if (item.sourceType === 'external') {
        onExternalDragDrop(item.title || 'Nouveau rendez-vous', targetDate, targetInterval, employeeId);
      } else {
        // Si c'est un rendez-vous interne, on le déplace
        const diff = item.endDate.getTime() - item.startDate.getTime(); // Différence en millisecondes
        const newDate = new Date(targetDate.getTime() + diff);
        onAppointmentMoved(item.id, targetDate, newDate, employeeId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isCellActive && isOver && canDrop;
  let bgColor = '';
  if (isActive) {
    bgColor = 'bg-green-100';
  } else if (employeeId === 0) {
    bgColor = 'bg-gray-200'; // Cellule inactive sans employé
  }

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
      onDoubleClick={isCellActive && employeeId ? handleCellDoubleClick : undefined}
      className={`relative flex-1 border-b ${isCellActive ? 'border-r' : ''} ${!isCellActive && canDrop ? 'cursor-not-allowed' : ''} border-gray-200  ${bgColor} ${canDrop ? 'cursor-pointer' : ''}
                  flex flex-row items-start gap-1`}
      style={{
        width: CELL_WIDTH/2,
        height: CELL_HEIGHT,
      }}
    >
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
        />
      ))}

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